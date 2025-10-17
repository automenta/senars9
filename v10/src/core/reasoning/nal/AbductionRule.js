import { NALRule } from './NALRule.js';
import { Term } from '../../term/Term.js';

/**
 * Abduction Rule: If <a --> b> and <b> then <a>
 * Implements abductive inference in NAL
 */
export class AbductionRule extends NALRule {
    constructor() {
        super('abduction', {
            name: 'Abduction Rule',
            description: 'Performs abductive inference: If <a --> b> and <b> then <a>',
            priority: 0.6,
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
        // Abduction works differently - we can apply it to either:
        // 1. An inheritance statement when we find a matching predicate: <a --> b> + <b> => <a>
        // 2. A simple term when we find a matching inheritance: <b> + <a --> b> => <a>
        
        // Check if the task is an inheritance statement (<a --> b>)
        if (task.term && task.term.isCompound && task.term.operator === '-->') {
            return task.term.components && task.term.components.length === 2;
        }
        
        // Or if it's a simple term that could match a predicate
        return task.term && task.term.isAtomic;
    }

    /**
     * Apply the abduction rule
     * @param {Object} task - The primary task
     * @param {Object} context - Context containing related tasks and memory
     * @returns {Array} - Array of derived tasks
     */
    async _apply(task, context) {
        const results = [];
        
        // If this is an inheritance statement <a --> b>, look for a task matching <b>
        if (task.term && task.term.isCompound && task.term.operator === '-->') {
            if (task.term.components.length !== 2) return results;
            
            const [subject, predicate] = task.term.components;
            const complementaryTasks = this._findComplementaryTasks(predicate, context);
            
            for (const compTask of complementaryTasks) {
                // Unify the predicate of the inheritance with the complementary task
                const bindings = this._unify(predicate, compTask.term);
                
                if (bindings) {
                    // Create the derived conclusion: subject
                    const derivedTerm = this._substitute(subject, bindings);
                    const derivedTruth = this._calculateTruth(task.truth, compTask.truth);
                    
                    results.push(this._createDerivedTask(task, {
                        term: derivedTerm,
                        truth: derivedTruth,
                        type: compTask.type, // Use same type as the complementary task
                        priority: task.priority * compTask.priority * this.priority
                    }));
                }
            }
        } 
        // If this is a simple term, look for inheritance statements where it matches the predicate
        else if (task.term && task.term.isAtomic) {
            const inheritanceTasks = this._findInheritanceTasks(task, context);
            
            for (const inheritanceTask of inheritanceTasks) {
                if (inheritanceTask.term.isCompound && 
                    inheritanceTask.term.operator === '-->' && 
                    inheritanceTask.term.components.length === 2) {
                    
                    const [subject, predicate] = inheritanceTask.term.components;
                    
                    // Unify the task term with the predicate of the inheritance
                    const bindings = this._unify(predicate, task.term);
                    
                    if (bindings) {
                        // Create the derived conclusion: subject
                        const derivedTerm = this._substitute(subject, bindings);
                        const derivedTruth = this._calculateTruth(inheritanceTask.truth, task.truth);
                        
                        results.push(this._createDerivedTask(inheritanceTask, {
                            term: derivedTerm,
                            truth: derivedTruth,
                            type: task.type, // Use same type as the original task
                            priority: inheritanceTask.priority * task.priority * this.priority
                        }));
                    }
                }
            }
        }

        return results;
    }

    /**
     * Find tasks that have terms matching the given predicate
     * @param {Term} predicate - The predicate term to match against
     * @param {Object} context - Context containing available tasks
     * @returns {Array} - Array of matching tasks
     */
    _findComplementaryTasks(predicate, context) {
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
        
        // Filter tasks that match the predicate (considering variables)
        return tasks.filter(task => {
            if (!task || !task.term) return false;
            
            // Check if the task term matches the predicate (considering variables)
            const bindings = this._unify(predicate, task.term);
            return bindings !== null;
        });
    }

    /**
     * Find inheritance tasks where the predicate matches the given task term
     * @param {Object} task - The task whose term we're trying to match as a predicate
     * @param {Object} context - Context containing available tasks
     * @returns {Array} - Array of matching inheritance tasks
     */
    _findInheritanceTasks(task, context) {
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
        
        // Filter tasks that are inheritance statements
        return tasks.filter(t => {
            if (!t || !t.term || !t.term.isCompound || t.term.operator !== '-->') return false;
            
            if (t.term.components.length !== 2) return false;
            
            // Check if the predicate matches the task term
            const [, predicate] = t.term.components;
            const bindings = this._unify(predicate, task.term);
            return bindings !== null;
        });
    }
}