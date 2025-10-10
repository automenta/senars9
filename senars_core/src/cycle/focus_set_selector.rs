use crate::data_structures::task::Task;
use std::sync::Arc;

/// Selects a set of tasks to focus on for the current cycle.
///
/// This component implements an advanced selection algorithm that considers not only
/// a task's intrinsic priority but also its urgency and the system's need for
/// cognitive diversity.
#[derive(Debug, Clone)]
pub struct FocusSetSelector {
    /// The maximum number of tasks to include in the focus set.
    pub max_size: usize,
    /// A threshold below which tasks are not considered for the focus set,
    /// regardless of other factors.
    pub priority_threshold: f32,
    /// A weighting factor to control how much urgency (i.e., how long a task
    /// has been waiting) contributes to its selection score.
    pub urgency_weight: f32,
    /// A weighting factor to encourage selecting tasks with varying complexity,
    /// promoting cognitive diversity.
    pub diversity_factor: f32,
}

impl FocusSetSelector {
    /// Creates a new `FocusSetSelector` with the given parameters.
    pub fn new(
        max_size: usize,
        priority_threshold: f32,
        urgency_weight: f32,
        diversity_factor: f32,
    ) -> Self {
        Self {
            max_size,
            priority_threshold,
            urgency_weight,
            diversity_factor,
        }
    }

    /// Selects the focus set from a list of candidate tasks.
    ///
    /// # Arguments
    /// * `tasks` - A slice of all tasks currently in memory.
    /// * `current_time` - The current system timestamp, used for urgency calculations.
    ///
    /// # Returns
    /// A `Vec` containing the selected tasks, sorted by their composite score.
    pub fn select(&self, tasks: &[Arc<Task>], current_time: u64) -> Vec<Arc<Task>> {
        if tasks.is_empty() {
            return vec![];
        }

        // 1. Filter tasks that don't meet the minimum priority threshold.
        let candidates: Vec<Arc<Task>> = tasks
            .iter()
            .filter(|task| task.get_priority() >= self.priority_threshold)
            .cloned()
            .collect();

        if candidates.is_empty() {
            return vec![];
        }

        // 2. Calculate normalization factors for urgency and diversity.
        let max_urgency = candidates
            .iter()
            .map(|task| current_time.saturating_sub(task.get_accessed_at()) as f32)
            .fold(0.0, f32::max);

        let max_diversity = candidates
            .iter()
            .map(|task| task.term.complexity as f32)
            .fold(0.0, f32::max);

        // 3. Calculate composite scores for all candidate tasks.
        let mut scored_tasks: Vec<_> = candidates
            .into_iter()
            .map(|task| {
                let urgency = if max_urgency > 0.0 {
                    (current_time.saturating_sub(task.get_accessed_at()) as f32) / max_urgency
                } else {
                    0.0
                };

                let diversity = if max_diversity > 0.0 {
                    task.term.complexity as f32 / max_diversity
                } else {
                    0.0
                };

                let score = task.get_priority()
                    + self.urgency_weight * urgency
                    + self.diversity_factor * diversity;

                (score, task)
            })
            .collect();

        // 4. Sort tasks by their composite score in descending order.
        scored_tasks.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

        // 5. Take the top `max_size` tasks and return them.
        scored_tasks
            .into_iter()
            .take(self.max_size)
            .map(|(_, task)| task)
            .collect()
    }
}

impl Default for FocusSetSelector {
    /// Provides a default configuration for the `FocusSetSelector`.
    ///
    /// These values are chosen to provide a balanced selection strategy.
    fn default() -> Self {
        Self {
            max_size: 5,
            priority_threshold: 0.1,
            urgency_weight: 0.2,
            diversity_factor: 0.1,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data_structures::{punctuation::Punctuation, term::Term, term_type::TermType};

    // Helper to create a test task with specific priority, access time, and complexity.
    fn create_test_task(priority: f32, accessed_at: u64, complexity: usize) -> Arc<Task> {
        let term = Arc::new(Term {
            name: format!("term{}", complexity),
            term_type: TermType::Atom,
            complexity: complexity as u64,
            subject: None,
            predicate: None,
            components: None,
            hash: format!("hash{}", complexity),
        });
        let task = Task::new(term, Punctuation::Belief, None, 0, accessed_at);
        task.set_priority(priority);
        task.set_accessed_at(accessed_at);
        Arc::new(task)
    }

    #[test]
    fn test_select_empty_tasks() {
        let selector = FocusSetSelector::default();
        let tasks = vec![];
        let selected = selector.select(&tasks, 100);
        assert!(selected.is_empty());
    }

    #[test]
    fn test_priority_threshold() {
        let mut selector = FocusSetSelector::default();
        selector.priority_threshold = 0.6;

        let task1 = create_test_task(0.7, 0, 1);
        let task2 = create_test_task(0.5, 0, 1);
        let tasks = vec![task1.clone(), task2.clone()];

        let selected = selector.select(&tasks, 100);
        assert_eq!(selected.len(), 1);
        assert_eq!(*selected[0], *task1);
    }

    #[test]
    fn test_max_size() {
        let mut selector = FocusSetSelector::default();
        selector.max_size = 2;

        let tasks = vec![
            create_test_task(0.9, 0, 1),
            create_test_task(0.8, 0, 1),
            create_test_task(0.7, 0, 1),
        ];

        let selected = selector.select(&tasks, 100);
        assert_eq!(selected.len(), 2);
    }

    #[test]
    fn test_urgency_weight() {
        let mut selector = FocusSetSelector::default();
        selector.urgency_weight = 1.0; // Maximize urgency effect
        selector.diversity_factor = 0.0; // Disable diversity effect

        // task2 has lower priority but is much older (more urgent)
        let task1 = create_test_task(0.6, 90, 1);
        let task2 = create_test_task(0.5, 10, 1);
        let tasks = vec![task1.clone(), task2.clone()];

        let selected = selector.select(&tasks, 100);
        // task2 should be selected first due to high urgency score
        assert_eq!(*selected[0], *task2);
    }

    #[test]
    fn test_diversity_weight() {
        let mut selector = FocusSetSelector::default();
        selector.urgency_weight = 0.0; // Disable urgency
        selector.diversity_factor = 1.0; // Maximize diversity

        // task2 has lower priority but higher complexity (more diverse)
        let task1 = create_test_task(0.6, 100, 2);
        let task2 = create_test_task(0.5, 100, 10);
        let tasks = vec![task1.clone(), task2.clone()];

        let selected = selector.select(&tasks, 100);
        // task2 should be selected first due to high diversity score
        assert_eq!(*selected[0], *task2);
    }
}