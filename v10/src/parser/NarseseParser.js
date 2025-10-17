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
        const term = this.parseTerm(termPart);
        return {term, punctuation, truthValue, taskType: this.getTaskType(punctuation)};
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
            return this.parseSet(trimmed, 'EXTENSIONAL_SET');
        }

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            return this.parseSet(trimmed, 'INTENSIONAL_SET');
        }

        return {components: [trimmed]};
    }

    parseCompound(inner) {
        // Handle nested compound terms first
        if (inner.includes('(') && inner.includes(')')) {
            return this.parseNestedCompound(inner);
        }

        const parsers = [
            {
                match: s => s.startsWith('--, '),
                parse: s => ({operator: '--', components: [this.parseTermData(s.slice(4).trim())]})
            },
            {
                match: s => s.startsWith('&, '),
                parse: s => ({operator: '&', components: this.parseList(s.slice(3).trim())})
            },
            {
                match: s => s.startsWith('|, '),
                parse: s => ({operator: '|', components: this.parseList(s.slice(3).trim())})
            },
            {
                match: s => s.startsWith('&/, '),
                parse: s => ({operator: '&/', components: this.parseList(s.slice(4).trim())})
            },
            {match: s => s.includes(' --> '), parse: s => this.parseBinary(s, ' --> ', '-->')},
            {match: s => s.includes(' <-> '), parse: s => this.parseBinary(s, ' <-> ', '<->')},
            {match: s => s.includes(' ==> '), parse: s => this.parseBinary(s, ' ==> ', '==>')},
            {match: s => s.includes(' <=> '), parse: s => this.parseBinary(s, ' <=> ', '<=>')},
            {match: s => s.includes(' ^ '), parse: s => this.parseBinary(s, ' ^ ', '^')},
            {match: s => s.includes(' {{-- '), parse: s => this.parseBinary(s, ' {{-- ', '{{--')},
            {match: s => s.includes(' --}} '), parse: s => this.parseBinary(s, ' --}} ', '--}}')}
        ];

        for (const parser of parsers) {
            if (parser.match(inner)) {
                return parser.parse(inner);
            }
        }

        // Product: comma-separated terms
        const components = this.parseList(inner);
        return components.length > 1 ? {operator: ',', components} : {components: [inner]};
    }

    parseNestedCompound(inner) {
        // Find the main operator that's not nested
        const operators = [' --> ', ' <-> ', ' ==> ', ' <=> ', ' ^ ', ' {{-- ', ' --}} '];
        let mainOp = null;
        let mainOpIndex = -1;

        for (const op of operators) {
            const index = inner.indexOf(op);
            if (index !== -1) {
                // Check if this operator is at the top level (not nested)
                const before = inner.substring(0, index);
                const parenDepth = (before.match(/\(/g) || []).length - (before.match(/\)/g) || []).length;
                if (parenDepth === 0) {
                    if (mainOpIndex === -1 || index < mainOpIndex) {
                        mainOp = op;
                        mainOpIndex = index;
                    }
                }
            }
        }

        if (mainOp) {
            const [left, right] = inner.split(mainOp).map(s => s.trim());
            return {
                operator: this.getOperatorSymbol(mainOp),
                components: [this.parseTermData(left), this.parseTermData(right)]
            };
        }

        // Fallback to regular parsing
        return this.parseCompoundSimple(inner);
    }

    parseCompoundSimple(inner) {
        const parsers = [
            {
                match: s => s.startsWith('--, '),
                parse: s => ({operator: '--', components: [this.parseTermData(s.slice(4).trim())]})
            },
            {
                match: s => s.startsWith('&, '),
                parse: s => ({operator: '&', components: this.parseList(s.slice(3).trim())})
            },
            {
                match: s => s.startsWith('|, '),
                parse: s => ({operator: '|', components: this.parseList(s.slice(3).trim())})
            },
            {
                match: s => s.startsWith('&/, '),
                parse: s => ({operator: '&/', components: this.parseList(s.slice(4).trim())})
            },
            {match: s => s.includes(' --> '), parse: s => this.parseBinary(s, ' --> ', '-->')},
            {match: s => s.includes(' <-> '), parse: s => this.parseBinary(s, ' <-> ', '<->')},
            {match: s => s.includes(' ==> '), parse: s => this.parseBinary(s, ' ==> ', '==>')},
            {match: s => s.includes(' <=> '), parse: s => this.parseBinary(s, ' <=> ', '<=>')},
            {match: s => s.includes(' ^ '), parse: s => this.parseBinary(s, ' ^ ', '^')},
            {match: s => s.includes(' {{-- '), parse: s => this.parseBinary(s, ' {{-- ', '{{--')},
            {match: s => s.includes(' --}} '), parse: s => this.parseBinary(s, ' --}} ', '--}}')}
        ];

        for (const parser of parsers) {
            if (parser.match(inner)) {
                return parser.parse(inner);
            }
        }

        // Product: comma-separated terms
        const components = this.parseList(inner);
        return components.length > 1 ? {operator: ',', components} : {components: [inner]};
    }

    parseBinary(str, op, operator) {
        const [left, right] = str.split(op).map(s => s.trim());
        return {operator, components: [this.parseTermData(left), this.parseTermData(right)]};
    }

    parseSet(str, type) {
        const inner = str.slice(1, -1).trim();
        return {operator: type === 'EXTENSIONAL_SET' ? '{}' : '[]', components: this.parseList(inner)};
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
        // Look for truth value at the end - more specific pattern for valid truth values
        const truthMatch = input.match(/(.+?)\s*(%[0-9]*\.?[0-9]+%;[0-9]*\.?[0-9]+%)\s*([.?!]?)\s*$/);
        if (truthMatch) {
            const [, termPart, truthStr, punct] = truthMatch;
            const punctuation = punct || '.';
            const truthValue = this.parseTruth(truthStr);
            return {termPart: termPart.trim(), punctuation, truthValue};
        }

        // No truth value, just extract punctuation
        const punctMatch = input.match(/(.+?)\s*([.?!])\s*$/);
        if (punctMatch) {
            const [, termPart, punctuation] = punctMatch;
            return {termPart: termPart.trim(), punctuation, truthValue: null};
        }

        throw new Error('Missing punctuation');
    }

    parseTruth(truthStr) {
        const clean = truthStr.replace(/%/g, '');
        const [f, c] = clean.split(';').map(Number);
        if (isNaN(f) || f < 0 || f > 1) throw new Error(`Invalid frequency: ${f}`);
        if (isNaN(c) || c < 0 || c > 1) throw new Error(`Invalid confidence: ${c}`);
        return {frequency: f, confidence: c};
    }

    getTaskType(punct) {
        return punct === '.' ? 'BELIEF' : punct === '!' ? 'GOAL' : punct === '?' ? 'QUESTION' : 'BELIEF';
    }

    getOperatorSymbol(op) {
        const symbols = {
            ' --> ': '-->',
            ' <-> ': '<->',
            ' ==> ': '==>',
            ' <=> ': '<=>',
            ' ^ ': '^',
            ' {{-- ': '{{--',
            ' --}} ': '--}}'
        };
        return symbols[op] || op;
    }
}
