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