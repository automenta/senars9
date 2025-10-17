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

        if (trimmed.startsWith('(')) {
            if (!trimmed.endsWith(')')) {
                throw new Error('Unclosed parenthesis');
            }
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
        // Find the main operator that's not nested
        const operators = [' --> ', ' <-> ', ' ==> ', ' <=> ', ' ^ ', ' {{-- ', ' --}} '];
        let mainOp = null;
        let mainOpIndex = -1;

        let parenDepth = 0;
        for (let i = 0; i < inner.length; i++) {
            if (inner[i] === '(') parenDepth++;
            else if (inner[i] === ')') parenDepth--;
            else if (parenDepth === 0) {
                for (const op of operators) {
                    if (inner.substring(i, i + op.length) === op) {
                        if (mainOpIndex === -1 || i < mainOpIndex) {
                            mainOp = op;
                            mainOpIndex = i;
                        }
                    }
                }
            }
        }

        if (mainOp) {
            const left = inner.substring(0, mainOpIndex).trim();
            const right = inner.substring(mainOpIndex + mainOp.length).trim();
            return {
                operator: this.getOperatorSymbol(mainOp),
                components: [this.parseTermData(left), this.parseTermData(right)]
            };
        }

        const prefixParsers = [
            {prefix: '--, ', operator: '--', arity: 1},
            {prefix: '&, ', operator: '&', arity: -1},
            {prefix: '|, ', operator: '|', arity: -1},
            {prefix: '&/, ', operator: '&/', arity: -1}
        ];

        for (const parser of prefixParsers) {
            if (inner.startsWith(parser.prefix)) {
                const content = inner.slice(parser.prefix.length).trim();
                const components = this.parseList(content);
                if (parser.arity === 1 && components.length === 1) {
                    return {operator: parser.operator, components};
                }
                return {operator: parser.operator, components};
            }
        }

        // Product: comma-separated terms
        const components = this.parseList(inner);
        if (components.length > 1) {
            return {operator: ',', components};
        } else if (components.length === 1) {
            return {components: [inner]};
        } else {
            throw new Error('Invalid compound term');
        }
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
