//! Defines the `CycleContext` struct, which holds all cycle-specific data.

/// A parameter object that contains all the relevant data for a single cognitive cycle.
///
/// This is created at the beginning of each cycle and passed down to all relevant
/// functions to ensure they operate on a consistent snapshot of the cycle's state.
#[derive(Debug, Clone, Copy)]
pub struct CycleContext {
    /// The timestamp of the current cognitive cycle.
    pub current_time: u64,
    // NOTE: Other cycle-specific variables can be added here in the future,
    // such as cycle-level configuration or focus set information.
}