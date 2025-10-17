import { NALRule } from './NALRule.js';
import { Term } from '../../term/Term.js';

/**
 * Deduction Rule: If <a --> b> and <a> then <b>
 * Implements the fundamental deductive inference in NAL
 */
export class DeductionRule extends NALRule {
    constructor() {
        super('deduction', {
            name: 'Deduction Rule',
            description: 'Performs deductive inference: If <a --> b> and <a> then <b>',
            priority: 0.9,
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

        // For deduction, we need another task that matches the subject of our inheritance
        // This would be handled in the context, so we just verify the task structure here
        return task.term.components && task.term.components.length === 2;
    }

    /**
     * Apply the deduction rule
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

        // Look for a matching statement that has the subject as its term
        // This would typically be a task like <a> which matches our subject
        const complementaryTasks = this._findComplementaryTasks(subject, context);
        
        for (const compTask of complementaryTasks) {
            // Unify the subject of the inheritance with the complementary task
            const bindings = this._unify(subject, compTask.term);
            
            if (bindings) {
                // Create the derived conclusion: predicate
                const derivedTerm = predicate;
                const derivedTruth = this._calculateTruth(task.truth, compTask.truth);
                
                results.push(this._createDerivedTask(task, {
                    term: derivedTerm,
                    truth: derivedTruth,
                    type: compTask.type, // Use same type as the complementary task
                    priority: task.priority * compTask.priority * this.priority
                }));
            }
        }

        return results;
    }

    /**
     * Find tasks that have terms matching the given subject
     * @param {Term} subject - The subject term to match against
     * @param {Object} context - Context containing available tasks
     * @returns {Array} - Array of matching tasks
     */
    _findComplementaryTasks(subject, context) {
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
        
        // Filter tasks that match the subject
        return tasks.filter(task => {
            if (!task || !task.term) return false;
            
            // Check if the task term matches the subject (considering variables)
            const bindings = this._unify(subject, task.term);
            return bindings !== null;
        });
    }
}