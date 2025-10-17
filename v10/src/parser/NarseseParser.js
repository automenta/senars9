/**
 * NarseseParser - Comprehensive parser for Narsese syntax
 * Handles parsing of terms, punctuation, and truth values as specified in DESIGN.md
 */

import { TermFactory } from '../core/term/TermFactory.js';

export class NarseseParser {
  constructor() {
    this.termFactory = new TermFactory();
  }

  /**
   * Parse a complete Narsese statement
   * @param {string} narseseString - The Narsese string to parse
   * @returns {Object} - Parsed statement with term, punctuation, and truth value
   */
  parse(narseseString) {
    if (typeof narseseString !== 'string') {
      throw new Error('NarseseParser.parse requires a string input');
    }

    const trimmed = narseseString.trim();
    if (trimmed.length === 0) {
      throw new Error('Empty input string');
    }

    // Find punctuation and truth value
    const { termPart, punctuation, truthValue } = this._splitStatement(trimmed);

    // Parse the term
    const term = this.termFactory.create(termPart);

    // Determine task type from punctuation
    const taskType = this._getTaskType(punctuation);

    return {
      term,
      punctuation,
      truthValue,
      taskType,
      originalString: narseseString
    };
  }

  /**
   * Parse just a term (without punctuation or truth value)
   * @param {string} termString - The term string to parse
   * @returns {Term} - Parsed term
   */
  parseTerm(termString) {
    return this.termFactory.create(termString);
  }

  /**
   * Split statement into term, punctuation, and truth value parts
   * @param {string} statement - The statement to split
   * @returns {Object} - Object with termPart, punctuation, and truthValue
   */
  _splitStatement(statement) {
    // Find truth value first (it comes at the end)
    const truthMatch = statement.match(/(%[^%]+%)(\s*[.?!]\s*)?$/);
    let truthValue = null;
    let remainingStatement = statement;

    if (truthMatch) {
      truthValue = this._parseTruthValue(truthMatch[1]);
      remainingStatement = statement.substring(0, truthMatch.index).trim();
    }

    // Find punctuation
    const punctuationMatch = remainingStatement.match(/[.?!]\s*$/);
    let punctuation = '.';
    let termPart = remainingStatement;

    if (punctuationMatch) {
      punctuation = punctuationMatch[0].trim();
      termPart = remainingStatement.substring(0, punctuationMatch.index).trim();
    }

    return {
      termPart,
      punctuation,
      truthValue
    };
  }

  /**
   * Parse truth value from %f;c% format
   * @param {string} truthString - Truth value string (without % delimiters)
   * @returns {Object} - Parsed truth value object
   */
  _parseTruthValue(truthString) {
    // Remove % delimiters if present
    const cleanTruth = truthString.replace(/%/g, '');

    // Split by semicolon
    const parts = cleanTruth.split(';');
    if (parts.length !== 2) {
      throw new Error(`Invalid truth value format: ${truthString}`);
    }

    const frequency = parseFloat(parts[0]);
    const confidence = parseFloat(parts[1]);

    // Validate ranges
    if (isNaN(frequency) || frequency < 0 || frequency > 1) {
      throw new Error(`Invalid frequency value: ${parts[0]}`);
    }

    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new Error(`Invalid confidence value: ${parts[1]}`);
    }

    return {
      frequency,
      confidence
    };
  }

  /**
   * Determine task type from punctuation
   * @param {string} punctuation - Punctuation character
   * @returns {string} - Task type (BELIEF, GOAL, QUESTION)
   */
  _getTaskType(punctuation) {
    switch (punctuation) {
      case '.': return 'BELIEF';
      case '!': return 'GOAL';
      case '?': return 'QUESTION';
      default: return 'BELIEF'; // Default to belief
    }
  }

  /**
   * Parse atomic term (word or quoted string)
   * @param {string} token - Token to parse
   * @returns {Term} - Parsed atomic term
   */
  _parseAtomicTerm(token) {
    // Handle quoted terms
    if ((token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))) {
      const content = token.slice(1, -1);
      return this.termFactory.createAtomic(content);
    }

    // Handle variables (starting with ? or $)
    if (token.startsWith('?') || token.startsWith('$')) {
      return this.termFactory.createVariable(token);
    }

    // Regular atomic term
    return this.termFactory.createAtomic(token);
  }

  /**
   * Parse compound term from tokens
   * @param {Array} tokens - Array of tokens
   * @returns {Term} - Parsed compound term
   */
  _parseCompoundTerm(tokens) {
    if (tokens.length < 3) {
      throw new Error('Compound term requires at least 3 tokens');
    }

    const operator = tokens[0];
    const subTerms = [];

    // Parse sub-terms (everything between first and last token)
    for (let i = 1; i < tokens.length - 1; i++) {
      subTerms.push(this._parseTermFromTokens([tokens[i]]));
    }

    return this.termFactory.createCompound(operator, subTerms);
  }

  /**
   * Parse term from token array
   * @param {Array} tokens - Array of tokens representing a term
   * @returns {Term} - Parsed term
   */
  _parseTermFromTokens(tokens) {
    if (tokens.length === 0) {
      throw new Error('Empty token array');
    }

    // Single token - atomic term
    if (tokens.length === 1) {
      return this._parseAtomicTerm(tokens[0]);
    }

    // Check if it's a compound term (starts and ends with parentheses)
    if (tokens[0] === '(' && tokens[tokens.length - 1] === ')') {
      return this._parseCompoundTerm(tokens);
    }

    // Multiple tokens without parentheses - treat as separate terms
    if (tokens.length > 1) {
      const terms = tokens.map(token => this._parseAtomicTerm(token));
      return this.termFactory.createCompound('&', terms); // Default to conjunction
    }

    throw new Error(`Cannot parse term from tokens: ${tokens.join(' ')}`);
  }

  /**
   * Tokenize a term string
   * @param {string} termString - String to tokenize
   * @returns {Array} - Array of tokens
   */
  _tokenize(termString) {
    const tokens = [];
    let current = '';
    let parenDepth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < termString.length; i++) {
      const char = termString[i];

      if (inQuotes) {
        if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
          if (current) {
            tokens.push(current);
            current = '';
          }
        } else {
          current += char;
        }
        continue;
      }

      switch (char) {
        case '"':
        case "'":
          inQuotes = true;
          quoteChar = char;
          if (current) {
            tokens.push(current);
            current = '';
          }
          break;

        case '(':
          if (current) {
            tokens.push(current);
            current = '';
          }
          parenDepth++;
          tokens.push(char);
          break;

        case ')':
          if (current) {
            tokens.push(current);
            current = '';
          }
          parenDepth--;
          tokens.push(char);
          break;

        case ',':
          if (parenDepth > 0) {
            if (current) {
              tokens.push(current);
              current = '';
            }
            tokens.push(char);
          } else {
            current += char;
          }
          break;

        case ' ':
        case '\t':
        case '\n':
          if (current) {
            tokens.push(current);
            current = '';
          }
          break;

        default:
          current += char;
          break;
      }
    }

    if (inQuotes) {
      throw new Error('Unclosed quote in term string');
    }

    if (parenDepth > 0) {
      throw new Error('Unclosed parenthesis in term string');
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Validate Narsese syntax without full parsing
   * @param {string} narseseString - String to validate
   * @returns {boolean} - True if syntax is valid
   */
  isValidSyntax(narseseString) {
    try {
      this.parse(narseseString);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detailed error information for invalid syntax
   * @param {string} narseseString - String to analyze
   * @returns {Object} - Error information
   */
  getSyntaxError(narseseString) {
    try {
      this.parse(narseseString);
      return null;
    } catch (error) {
      return {
        message: error.message,
        input: narseseString,
        type: 'SYNTAX_ERROR'
      };
    }
  }
}