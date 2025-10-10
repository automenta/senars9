//! Defines the `Clock` trait and its implementations for managing time in the system.
//!
//! This module provides a flexible way to handle time, allowing the system to run
//! with a simulated, step-by-step clock (for testing) or a real-time clock.

/// A trait for a time source.
pub trait Clock: Send + Sync {
    /// Returns the current time as a u64 timestamp.
    fn get_time(&self) -> u64;
    /// Advances the clock's state, if applicable.
    fn tick(&mut self);
}

/// A clock that increments a counter on each `tick`.
///
/// This is useful for simulations and testing, where time advances in discrete steps.
#[derive(Debug, Default)]
pub struct IterativeClock {
    time: u64,
}

impl IterativeClock {
    /// Creates a new `IterativeClock` starting at time 0.
    pub fn new() -> Self {
        IterativeClock { time: 0 }
    }
}

impl Clock for IterativeClock {
    fn get_time(&self) -> u64 {
        self.time
    }

    /// Advances the clock by one time unit.
    fn tick(&mut self) {
        self.time += 1;
    }
}

/// A clock that provides the current real-world time as a Unix timestamp.
///
/// This is used for real-time applications where the system needs to interact
/// with the external world.
#[derive(Debug, Default)]
pub struct UnixTimeClock;

impl UnixTimeClock {
    /// Creates a new `UnixTimeClock`.
    pub fn new() -> Self {
        UnixTimeClock
    }
}

impl Clock for UnixTimeClock {
    fn get_time(&self) -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }

    /// The `tick` method is a no-op for the real-time clock, as time
    /// advances automatically.
    fn tick(&mut self) {
        // No-op
    }
}