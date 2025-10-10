use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[derive(Clone)]
pub struct WebSocketEvent {
    pub event: String,
    pub payload: serde_json::Value,
}

// WebSocket communication state
pub struct WebSocketState {
    pub is_connected: bool,
    pub connection_error: Option<String>,
    pub url: String,
    // Store the command sender here too
    pub command_tx: Option<Arc<mpsc::UnboundedSender<String>>>,
}

impl Clone for WebSocketState {
    fn clone(&self) -> Self {
        Self {
            is_connected: self.is_connected,
            connection_error: self.connection_error.clone(),
            url: self.url.clone(),
            command_tx: self.command_tx.clone(),
        }
    }
}

impl Default for WebSocketState {
    fn default() -> Self {
        Self {
            is_connected: false,
            connection_error: None,
            url: "ws://127.0.0.1:8080".to_string(),
            command_tx: None,
        }
    }
}

// Message types for communication
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ClientCommand {
    pub command: String,
    pub payload: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ServerEvent {
    pub event: String,
    pub payload: serde_json::Value,
}

// WebSocket manager to handle connection state and communication
#[derive(Clone)]
pub struct WebSocketManager {
    pub state: Arc<Mutex<WebSocketState>>,
}

impl WebSocketManager {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(WebSocketState::default())),
        }
    }
    
    pub async fn connect(&self, url: &str, event_sender: mpsc::UnboundedSender<WebSocketEvent>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Set the URL in the state
        {
            let mut state = self.state.lock().unwrap();
            state.url = url.to_string();
        }
        
        let (ws_stream, _) = connect_async(url).await?;
        println!("WebSocket connected to: {}", url);
        
        let (mut write, read) = ws_stream.split();
        
        // Create channels for sending messages from UI to WebSocket
        let (tx, mut rx) = mpsc::unbounded_channel::<String>();
        let tx_arc = Arc::new(tx);
        
        // Update connection state with new tx
        {
            let mut state = self.state.lock().unwrap();
            state.is_connected = true;
            state.connection_error = None;
            state.command_tx = Some(tx_arc.clone());
        }
        
        // Spawn task to handle sending messages
        let send_state = self.state.clone();
        let send_task = tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                if let Err(e) = write.send(Message::Text(message)).await {
                    eprintln!("Failed to send message: {}", e);
                    // Update connection state on error
                    {
                        let mut state = send_state.lock().unwrap();
                        state.is_connected = false;
                        state.connection_error = Some(e.to_string());
                    }
                    break;
                }
            }
        });
        
        // Spawn task to handle receiving messages
        let recv_state = self.state.clone();
        let event_sender_clone = event_sender.clone();
        let recv_task = tokio::spawn(async move {
            read.for_each(|message| {
                async {
                    match message {
                        Ok(Message::Text(text)) => {
                            match serde_json::from_str::<ServerEvent>(&text) {
                                Ok(event) => {
                                    // Send event to the UI
                                    let ws_event = WebSocketEvent {
                                        event: event.event,
                                        payload: event.payload,
                                    };
                                    if event_sender_clone.send(ws_event).is_err() {
                                        // UI channel closed
                                    }
                                }
                                Err(e) => {
                                    eprintln!("Failed to parse server event: {}", e);
                                }
                            }
                        }
                        Ok(Message::Close(_)) => {
                            println!("Connection closed by server");
                            {
                                let mut state = recv_state.lock().unwrap();
                                state.is_connected = false;
                                state.connection_error = Some("Connection closed by server".to_string());
                            }
                        }
                        Ok(_) => {} // Ignore other message types
                        Err(e) => {
                            eprintln!("WebSocket error: {}", e);
                            {
                                let mut state = recv_state.lock().unwrap();
                                state.is_connected = false;
                                state.connection_error = Some(e.to_string());
                            }
                        }
                    }
                }
            }).await;
        });
        
        // Wait for tasks in a separate task to not block this function
        let _all_tasks = tokio::spawn(async move {
            let _ = tokio::join!(send_task, recv_task);
        });
        
        // We don't await the tasks here, so we can return immediately
        // The tasks will run in the background
        
        Ok(())
    }
    
    pub fn send_command(&self, command: ClientCommand) -> Result<(), String> {
        let state = self.state.lock().unwrap();
        if let Some(ref tx) = state.command_tx {
            let json_str = serde_json::to_string(&command).map_err(|e| e.to_string())?;
            tx.send(json_str).map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Not connected".to_string())
        }
    }
    
    pub fn disconnect(&self) {
        {
            let mut state = self.state.lock().unwrap();
            state.command_tx = None;
            state.is_connected = false;
            state.connection_error = Some("Disconnected by user".to_string());
        }
    }
    
    pub fn get_state(&self) -> WebSocketState {
        self.state.lock().unwrap().clone()
    }
    
    pub fn is_connected(&self) -> bool {
        self.state.lock().unwrap().is_connected
    }
}

