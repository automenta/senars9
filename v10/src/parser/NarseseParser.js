import {TermFactory} from '../core/term/TermFactory.js';

export class NarseseParser {
    constructor() {
        this.termFactory = new TermFactory();
    }

    parse(input) {
        if (typeof input !== 'string') throw new Error('Input must be string');
        const trimmed = input.trim();
        if (!trimmed) throw new Error('Empty input');

        const {termPart, punctuation, truthValue} = this.splitStatement(trimmed);
        return {
            term: this.parseTerm(termPart),
            punctuation,
            truthValue,
            taskType: this.getTaskType(punctuation)
        };
    }

    parseTerm(input) {
        const data = this.parseTermData(input);
        return this.termFactory.create(data);
    }

    parseTermData(input) {
        const trimmed = input.trim();

        if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            return this.parseCompound(trimmed.slice(1, -1).trim());
        }

        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            return this.parseSet(trimmed, '{}');
        }

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            return this.parseSet(trimmed, '[]');
        }

        return {components: [trimmed]};
    }

    parseCompound(inner) {
        // Look for infix operators first
        const infixResult = this._findInfixOperator(inner);
        if (infixResult) return infixResult;

        // Check for prefix operators like negation, conjunction, etc.
        const prefixResult = this._findPrefixOperator(inner);
        if (prefixResult) return prefixResult;

        // Product: comma-separated terms
        const components = this.parseList(inner);
        return components.length > 1 ? {operator: ',', components} : {components: [inner]};
    }

    _findInfixOperator(inner) {
        const operators = [' --> ', ' <-> ', ' ==> ', ' <=> ', ' ^ ', ' {{-- ', ' --}} '];
        let mainOp = null;
        let mainOpIndex = -1;

        let parenDepth = 0;
        for (let i = 0; i < inner.length; i++) {
            if (inner[i] === '(') parenDepth++;
            else if (inner[i] === ')') parenDepth--;
            else if (parenDepth === 0) {
                for (const op of operators) {
                    if (inner.startsWith(op, i)) {
                        if (mainOpIndex === -1 || i < mainOpIndex) {
                            mainOp = op;
                            mainOpIndex = i;
                        }
                    }
                }
            }
        }

        if (mainOp !== null) {
            const left = inner.substring(0, mainOpIndex).trim();
            const right = inner.substring(mainOpIndex + mainOp.length).trim();
            return {
                operator: this.getOperatorSymbol(mainOp),
                components: [this.parseTermData(left), this.parseTermData(right)]
            };
        }
        return null;
    }

    _findPrefixOperator(inner) {
        const prefixOps = [
            ['--, ', '--'],
            ['&, ', '&'],
            ['|, ', '|'],
            ['&/, ', '&/']
        ];

        for (const [prefix, op] of prefixOps) {
            if (inner.startsWith(prefix)) {
                const content = inner.slice(prefix.length).trim();
                const components = this.parseList(content);
                return {operator: op, components};
            }
        }
        return null;
    }

    parseBinary(str, op, operator) {
        const [left, right] = str.split(op).map(s => s.trim());
        return {operator, components: [this.parseTermData(left), this.parseTermData(right)]};
    }

    parseSet(str, operator) {
        const inner = str.slice(1, -1).trim();
        return {operator, components: this.parseList(inner)};
    }

    parseList(str) {
        if (!str) return [];

        const parts = [];
        let current = '';
        let depth = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (char === '(' || char === '[' || char === '{') depth++;
            else if (char === ')' || char === ']' || char === '}') depth--;
            else if (char === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }

        if (current.trim()) parts.push(current.trim());
        return parts.map(part => this.parseTermData(part));
    }

    splitStatement(input) {
        let termPart = input;
        let punctuation = null;
        let truthValue = null;

        const truthRegex = /%([0-9]*\.?[0-9]+);([0-9]*\.?[0-9]+)%/;
        const truthMatch = termPart.match(truthRegex);

        if (truthMatch) {
            truthValue = this.parseTruth(truthMatch[0]);
            termPart = (termPart.slice(0, truthMatch.index) + termPart.slice(truthMatch.index + truthMatch[0].length)).trim();
        } else if (termPart.includes('%')) {
            throw new Error('Invalid truth value format');
        }

        const lastChar = termPart.slice(-1);
        if (['.', '!', '?'].includes(lastChar)) {
            punctuation = lastChar;
            termPart = termPart.slice(0, -1).trim();
        }

        if (!punctuation) {
            throw new Error('Missing punctuation');
        }

        if (!termPart) {
            throw new Error('Missing term');
        }

        return {termPart, punctuation, truthValue};
    }

    parseTruth(truthStr) {
        const clean = truthStr.replace(/%/g, '');
        const parts = clean.split(';');
        if (parts.length !== 2) throw new Error('Invalid truth value format');
        const [f, c] = parts.map(s => s.trim()).map(Number);
        if (isNaN(f) || f < 0 || f > 1) throw new Error(`Invalid frequency: ${f}`);
        if (isNaN(c) || c < 0 || c > 1) throw new Error(`Invalid confidence: ${c}`);
        return {frequency: f, confidence: c};
    }

    getTaskType = (punct) => ({'.': 'BELIEF', '!': 'GOAL', '?': 'QUESTION'}[punct] || 'BELIEF');

    getOperatorSymbol = (op) => ({
        ' --> ': '-->',
        ' <-> ': '<->',
        ' ==> ': '==>',
        ' <=> ': '<=>',
        ' ^ ': '^',
        ' & ': '&',
        ' {{-- ': '{{--',
        ' --}} ': '--}}'
    }[op] || op);
}
