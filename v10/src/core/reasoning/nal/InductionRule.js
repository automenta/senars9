import { NALRule } from './NALRule.js';
import { Term } from '../../term/Term.js';

/**
 * Induction Rule: If <a --> b> and <b --> a> then <a <-> b>
 * Implements inductive inference in NAL
 */
export class InductionRule extends NALRule {
    constructor() {
        super('induction', {
            name: 'Induction Rule',
            description: 'Performs inductive inference: If <a --> b> and <b --> a> then <a <-> b>',
            priority: 0.7,
            category: 'syllogistic'
        });
    }

    /**
     * Check if this rule can be applied to the given task
     * @param {Object} task - The task to check
     * @param {Object} context - Context containing available tasks
     * @returns {boolean} - Whether the rule can be applied
     */
    _matches(task, context) {
        // Check if the task is an inheritance statement (<a --> b>)
        if (!task.term || !task.term.isCompound || task.term.operator !== '-->') {
            return false;
        }

        return task.term.components && task.term.components.length === 2;
    }

    /**
     * Apply the induction rule
     * @param {Object} task - The primary task
     * @param {Object} context - Context containing related tasks and memory
     * @returns {Array} - Array of derived tasks
     */
    async _apply(task, context) {
        const results = [];
        
        // Verify the task structure: <a --> b>
        if (!task.term || !task.term.isCompound || task.term.operator !== '-->') {
            return results;
        }

        if (task.term.components.length !== 2) {
            return results;
        }

        const [subject, predicate] = task.term.components;

        // Look for a reverse inheritance statement: <b --> a>
        const complementaryTasks = this._findReverseTasks(subject, predicate, context);
        
        for (const compTask of complementaryTasks) {
            // Verify the reverse relationship: <b --> a>
            if (compTask.term.isCompound && compTask.term.operator === '-->' && 
                compTask.term.components.length === 2) {
                
                const [revSubject, revPredicate] = compTask.term.components;
                
                // Check if it's truly the reverse: <b --> a> where task is <a --> b>
                if (this._termsMatch(revSubject, predicate) && this._termsMatch(revPredicate, subject)) {
                    // Create the derived conclusion: <a <-> b> (similarity)
                    const derivedTerm = new Term('compound', 'SIMILARITY', [subject, predicate], '<->');
                    const derivedTruth = this._calculateTruth(task.truth, compTask.truth);
                    
                    results.push(this._createDerivedTask(task, {
                        term: derivedTerm,
                        truth: derivedTruth,
                        type: 'BELIEF', // Similarity is typically a belief
                        priority: task.priority * compTask.priority * this.priority
                    }));
                }
            }
        }

        return results;
    }

    /**
     * Find reverse tasks that match the given terms
     * @param {Term} subject - The subject of the original task
     * @param {Term} predicate - The predicate of the original task
     * @param {Object} context - Context containing available tasks
     * @returns {Array} - Array of matching reverse tasks
     */
    _findReverseTasks(subject, predicate, context) {
        const memory = context.memory;
        const focus = context.focus;
        
        if (!memory && !focus) return [];
        
        const tasks = [];
        
        // Collect tasks from memory and focus
        if (memory && memory.getAllTasks) {
            tasks.push(...memory.getAllTasks());
        }
        
        if (focus && focus.getCurrentTasks) {
            tasks.push(...focus.getCurrentTasks());
        }
        
        // Filter tasks that are potential reverses: <b --> a>
        return tasks.filter(task => {
            if (!task || !task.term || !task.term.isCompound || task.term.operator !== '-->') return false;
            
            if (task.term.components.length !== 2) return false;
            
            const [compSubject, compPredicate] = task.term.components;
            
            // Check if it's the reverse: <b --> a> where we have <a --> b>
            return this._termsMatch(compSubject, predicate) && this._termsMatch(compPredicate, subject);
        });
    }

    /**
     * Check if two terms match (with variable binding support)
     * @param {Term} t1 - First term
     * @param {Term} t2 - Second term
     * @returns {boolean} - Whether the terms match
     */
    _termsMatch(t1, t2) {
        const bindings = this._unify(t1, t2);
        return bindings !== null;
    }
}