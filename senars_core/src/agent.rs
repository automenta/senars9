use crate::{events::Event, System};
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;

/// The `Agent` struct is a wrapper around the `System` that provides a unified,
/// high-level API for interacting with the cognitive architecture. It manages
/// the system's state, orchestrates the cognitive cycle, and broadcasts events.
pub struct Agent {
    system: Arc<Mutex<System>>,
    event_tx: broadcast::Sender<Event>,
}

impl Agent {
    /// Creates a new `Agent` with a `System` instance and initializes the event bus.
    pub fn new(system: System) -> Self {
        let (event_tx, _) = broadcast::channel(100); // Event bus with capacity for 100 messages
        Self {
            system: Arc::new(Mutex::new(system)),
            event_tx,
        }
    }

    /// Allows other components to subscribe to system events.
    pub fn subscribe(&self) -> broadcast::Receiver<Event> {
        self.event_tx.subscribe()
    }

    /// Adds a Narsese task to the system's memory and broadcasts a `TaskAdded` event.
    pub fn add_task(&self, narsese: &str) {
        let mut system = self.system.lock().unwrap();
        system.input(narsese);

        // Broadcast the event
        let event = Event::TaskAdded {
            narsese: narsese.to_string(),
        };
        // It's okay if sending fails because there are no subscribers yet.
        let _ = self.event_tx.send(event);
    }

    /// Executes a single cognitive cycle and broadcasts a `CycleCompleted` event.
    pub fn tick(&self) {
        let mut system = self.system.lock().unwrap();
        system.tick();

        // Broadcast the event
        let event = Event::CycleCompleted {
            cycle: system.runtime.clock.get_time(),
        };
        // It's okay if sending fails because there are no subscribers yet.
        let _ = self.event_tx.send(event);
    }
}