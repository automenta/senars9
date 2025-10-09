import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

/**
 * NarseseTranslator - Bidirectional conversion between Narsese and JavaScript
 * 
 * Enables seamless conversion between NARS formal language (Narsese) and
 * JavaScript objects, allowing integration with LLM components and other
 * JavaScript-based functionality while maintaining NARS compatibility.
 */
class NarseseTranslator extends Component {
  constructor() {
    super();
    
    this.config = {
      enableValidation: DEFAULTS.NARSESE_VALIDATION ?? true,
      maxTermDepth: DEFAULTS.NARSESE_MAX_DEPTH ?? 10,
      enableMacros: DEFAULTS.NARSESE_MACROS ?? true
    };
    
    this.stats = {
      narseseToJs: 0,
      jsToNarsese: 0,
      validationErrors: 0,
      conversionsAttempted: 0
    };
    
    this.macros = new Map();
    this._initMacros();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.config = { ...this.config, ...config };
    this.stats = { narseseToJs: 0, jsToNarsese: 0, validationErrors: 0, conversionsAttempted: 0 };
  }

  _initMacros() {
    const patterns = {
      inheritance: { pattern: /<([^>]+)-->([^>]+)>/, op: '-->', type: 'inheritance' },
      implication: { pattern: /<([^>]+)=\/>([^>]+)>/, op: '=/>', type: 'implication' },
      equivalence: { pattern: /<([^>]+)<=>([^>]+)>/, op: '<=>', type: 'equivalence' },
      product: { pattern: /\(([^)]+)\*([^)]+)\)/, op: '*', type: 'product' },
      extIntersection: { pattern: /\(([^)]+)\|([^)]+)\)/, op: '|', type: 'extensional_intersection' },
      intIntersection: { pattern: /\(([^)]+)&([^)]+)\)/, op: '&', type: 'intensional_intersection' }
    };

    for (const [name, meta] of Object.entries(patterns)) {
      this.macros.set(name, {
        pattern: meta.pattern,
        toJs: (m) => this._createObj(meta.type, m, meta.op),
        toNarsese: (obj) => this._formatObj(obj, meta.op)
      });
    }
  }

  _createObj(type, matches, op) {
    const [, a, b] = matches;
    switch (type) {
      case 'inheritance': return { type, subject: a?.trim(), predicate: b?.trim(), operator: op };
      case 'implication': return { type, antecedent: a?.trim(), consequent: b?.trim(), operator: op };
      case 'equivalence': return { type, term1: a?.trim(), term2: b?.trim(), operator: op };
      case 'product':
      case 'extensional_intersection':
      case 'intensional_intersection': return { type, elements: [a?.trim(), b?.trim()], operator: op };
      default: return { type, a: a?.trim(), b: b?.trim(), operator: op };
    }
  }

  _formatObj(obj, op) {
    switch (obj.type) {
      case 'inheritance': return `<${obj.subject} ${op} ${obj.predicate}>`;
      case 'implication': return `<${obj.antecedent} ${op} ${obj.consequent}>`;
      case 'equivalence': return `<${obj.term1} ${op} ${obj.term2}>`;
      case 'product':
      case 'extensional_intersection':
      case 'intensional_intersection': return `(${obj.elements?.join(` ${op} `)})`;
      default: return obj.term ? (obj.punctuation ? `${obj.term}${obj.punctuation}` : obj.term) : JSON.stringify(obj);
    }
  }

  narseseToJs(narsese) {
    this.stats.conversionsAttempted++;
    if (!narsese || typeof narsese !== 'string') {
      this.stats.validationErrors++;
      throw new Error('Input must be a valid Narsese string');
    }

    narsese = narsese.trim();
    
    if (this._isComplex(narsese)) return this._parseComplex(narsese);
    
    for (const [name, macro] of this.macros) {
      const matches = macro.pattern.exec(narsese);
      if (matches) {
        const result = macro.toJs(matches);
        this.stats.narseseToJs++;
        return result;
      }
    }

    const result = {
      type: 'simple_term',
      value: narsese,
      punctuation: this._extractPunct(narsese),
      term: this._removePunct(narsese)
    };
    this.stats.narseseToJs++;
    return result;
  }

  jsToNarsese(jsObj) {
    this.stats.conversionsAttempted++;
    if (!jsObj || typeof jsObj !== 'object') {
      this.stats.validationErrors++;
      throw new Error('Input must be a valid JavaScript object');
    }

    const formatters = {
      inheritance: (o) => `<${o.subject} --> ${o.predicate}>`,
      implication: (o) => `<${o.antecedent} =/> ${o.consequent}>`,
      equivalence: (o) => `<${o.term1} <=> ${o.term2}>`,
      product: (o) => `(${o.elements.join(' * ')})`,
      extensional_intersection: (o) => `(${o.elements.join(' | ')})`,
      intensional_intersection: (o) => `(${o.elements.join(' & ')})`,
      compound: (o) => this._formatCompound(o),
      statement: (o) => this._formatStatement(o)
    };

    const formatter = formatters[jsObj.type];
    return formatter ? formatter(jsObj) : this._formatSimpleTerm(jsObj);
  }

  _isComplex(expr) {
    return expr.includes('(') && expr.includes(')') || 
           expr.includes('<') && expr.includes('>') ||
           expr.includes(' --> ') || expr.includes(' =/> ') || expr.includes(' <=> ');
  }

  _parseComplex(narsese) {
    if (narsese.startsWith('(') && narsese.endsWith(')')) return this._parseCompound(narsese);
    if (narsese.startsWith('<') && narsese.endsWith('>')) return this._parseStatement(narsese);
    
    for (const op of ['==>', '=/>', '<=>', '*']) {
      if (narsese.includes(op)) return this._parseByOp(narsese, op);
    }
    
    return { type: 'simple_term', value: narsese, punctuation: this._extractPunct(narsese), term: this._removePunct(narsese) };
  }

  _parseCompound(termStr) {
    const inner = termStr.substring(1, termStr.length - 1);
    const types = { '*': 'product', ' | ': 'extensional_intersection', ' & ': 'intensional_intersection' };
    
    for (const [op, type] of Object.entries(types)) {
      if (inner.includes(op)) {
        return { type, elements: inner.split(op).map(e => e.trim()), operator: op.trim() };
      }
    }
    return { type: 'simple_term', value: termStr, punctuation: this._extractPunct(termStr), term: this._removePunct(termStr) };
  }

  _parseStatement(stmtStr) {
    const inner = stmtStr.substring(1, stmtStr.length - 1);
    const ops = { ' --> ': { type: 'inheritance', fields: ['subject', 'predicate'] }, 
                  ' =/> ': { type: 'implication', fields: ['antecedent', 'consequent'] },
                  ' <=> ': { type: 'equivalence', fields: ['term1', 'term2'] } };

    for (const [op, { type, fields }] of Object.entries(ops)) {
      if (inner.includes(op)) {
        const parts = inner.split(op);
        return { type, [fields[0]]: parts[0].trim(), [fields[1]]: parts[1].trim(), operator: op.trim() };
      }
    }
    return { type: 'simple_statement', value: stmtStr, punctuation: this._extractPunct(stmtStr), statement: this._removePunct(stmtStr) };
  }

  _parseByOp(expr, op) {
    const parts = expr.split(op);
    switch (op) {
      case '*': return { type: 'product', elements: parts.map(p => p.trim()), operator: op };
      case ' --> ': return { type: 'inheritance', subject: parts[0].trim(), predicate: parts[1].trim(), operator: '-->' };
      case ' =/> ': return { type: 'implication', antecedent: parts[0].trim(), consequent: parts[1].trim(), operator: '=/>' };
      case ' <=> ': return { type: 'equivalence', term1: parts[0].trim(), term2: parts[1].trim(), operator: '<=>' };
      default: return { type: 'unknown', expression: expr, operator: op };
    }
  }

  _formatCompound(obj) {
    switch (obj.operator) {
      case '*': return `(${obj.elements.join(' * ')})`;
      case '|': return `(${obj.elements.join(' | ')})`;
      case '&': return `(${obj.elements.join(' & ')})`;
      default: return obj.value || obj.toString();
    }
  }

  _formatStatement(obj) {
    switch (obj.operator) {
      case '-->': return `<${obj.subject} --> ${obj.predicate}>`;
      case '=/': return `<${obj.antecedent} =/> ${obj.consequent}>`;
      case '<=>': return `<${obj.term1} <=> ${obj.term2}>`;
      default: return obj.value || obj.toString();
    }
  }

  _formatSimpleTerm(obj) {
    if (obj.term) return obj.punctuation ? `${obj.term}${obj.punctuation}` : obj.term;
    return obj.toString ? obj.toString() : JSON.stringify(obj);
  }

  _extractPunct(term) {
    if (typeof term !== 'string') return null;
    const lastChar = term.charAt(term.length - 1);
    return lastChar === '.' || lastChar === '?' || lastChar === '!' ? lastChar : null;
  }

  _removePunct(term) {
    if (typeof term !== 'string') return term;
    const lastChar = term.charAt(term.length - 1);
    return lastChar === '.' || lastChar === '?' || lastChar === '!' ? term.substring(0, term.length - 1) : term;
  }

  validateNarsese(narsese) {
    if (!narsese || typeof narsese !== 'string') return false;
    try {
      this.narseseToJs(narsese);
      return true;
    } catch (error) {
      this.stats.validationErrors++;
      return false;
    }
  }

  applyMacros(narsese) {
    if (!this.config.enableMacros) return narsese;
    
    let result = narsese;
    for (const [name, macro] of this.macros) {
      result = result.replace(macro.pattern, (match) => {
        try {
          const matches = macro.pattern.exec(match);
          if (matches) {
            const jsObj = macro.toJs(matches);
            return macro.toNarsese(jsObj);
          }
        } catch (error) {
          Logger.warn(`Macro application failed for ${name}: ${error.message}`);
        }
        return match;
      });
    }
    return result;
  }

  getStats() {
    const attempted = this.stats.conversionsAttempted;
    return {
      ...this.stats,
      validationErrorRate: attempted ? this.stats.validationErrors / attempted : 0,
      narseseToJsRate: attempted ? this.stats.narseseToJs / attempted : 0,
      jsToNarseseRate: attempted ? this.stats.jsToNarsese / attempted : 0
    };
  }

  taskToJs(task) {
    if (!task?.term) throw new Error('Task must have a term property');
    const termObj = this.narseseToJs(task.term);
    return { ...task, term: termObj, originalTerm: task.term };
  }

  jsToTask(jsTask) {
    if (!jsTask?.term) throw new Error('JS task must have a term property');
    
    const narseseTerm = typeof jsTask.term === 'string' ? jsTask.term : this.jsToNarsese(jsTask.term);
    return { ...jsTask, term: narseseTerm, originalTerm: jsTask.originalTerm || jsTask.term };
  }

  batchNarseseToJs(narseseTerms) {
    if (!Array.isArray(narseseTerms)) throw new Error('Input must be an array of Narsese strings');
    return narseseTerms.map(term => this._tryConvert(() => this.narseseToJs(term), term));
  }

  batchJsToNarsese(jsObjects) {
    if (!Array.isArray(jsObjects)) throw new Error('Input must be an array of JavaScript objects');
    return jsObjects.map(obj => this._tryConvert(() => this.jsToNarsese(obj), obj));
  }

  _tryConvert(converter, original) {
    try {
      return { original, converted: converter(), success: true };
    } catch (error) {
      return { original, error: error.message, success: false };
    }
  }
}

export default NarseseTranslator;