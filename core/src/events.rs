use serde::{Deserialize, Serialize};

/// Represents a command sent from a client to the server.
#[derive(Serialize, Deserialize, Debug)]
pub struct ClientCommand {
    pub command: String,
    pub payload: serde_json::Value,
}

/// Represents an event sent from the server to clients.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ServerEvent {
    pub event: String,
    pub payload: serde_json::Value,
}

/// Represents a system-level event that can be broadcast to listeners.
///
/// This enum is used for decoupled communication between the core `System`
/// and other components like the `WsServer`.
#[derive(Debug, Clone)]
pub enum Event {
    /// Dispatched when a new task is added to the system's memory.
    ///
    /// Contains the Narsese string of the added task.
    TaskAdded { narsese: String },

    /// Dispatched after a full cognitive cycle has been completed.
    ///
    /// Contains the cycle number (timestamp) of the completed cycle.
    CycleCompleted { cycle: u64 },
}