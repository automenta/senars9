use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use serde::{Deserialize, Serialize};
use std::{
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::broadcast,
};
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};

use crate::System;

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

/// The main WebSocket server struct.
///
/// It manages incoming connections and broadcasts events to all connected clients.
pub struct WsServer {
    system: Arc<Mutex<System>>,
    listener: TcpListener,
    event_tx: broadcast::Sender<ServerEvent>,
}

impl WsServer {
    /// Creates a new `WsServer` and binds it to the specified address.
    pub async fn new(
        addr: &str,
        system: Arc<Mutex<System>>,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(addr).await?;
        let (event_tx, _) = broadcast::channel(100);
        println!("WebSocket server listening on: {}", addr);
        Ok(WsServer {
            system,
            listener,
            event_tx,
        })
    }

    /// Starts the server's main loop, accepting new connections.
    pub async fn run(&self) {
        while let Ok((stream, addr)) = self.listener.accept().await {
            let system = Arc::clone(&self.system);
            let event_tx = self.event_tx.clone();
            tokio::spawn(Self::handle_connection(stream, addr, system, event_tx));
        }
    }

    /// Handles an individual client connection.
    /// This is an associated function, not a method, so it can be safely
    /// spawned as a static task.
    async fn handle_connection(
        stream: TcpStream,
        addr: SocketAddr,
        system: Arc<Mutex<System>>,
        event_tx: broadcast::Sender<ServerEvent>,
    ) {
        println!("Incoming TCP connection from: {}", addr);
        match accept_async(stream).await {
            Ok(ws_stream) => {
                println!("WebSocket connection established: {}", addr);
                let (ws_sender, ws_receiver) = ws_stream.split();
                let event_rx = event_tx.subscribe();

                // Spawn a task to handle outgoing messages (broadcasted events)
                tokio::spawn(Self::write_to_socket(ws_sender, event_rx));

                // Handle incoming messages from this client
                Self::read_from_socket(
                    ws_receiver,
                    addr,
                    system,
                    event_tx,
                )
                .await;
            }
            Err(e) => println!("Error during the websocket handshake occurred: {}", e),
        }
        println!("Connection closed: {}", addr);
    }

    /// Reads messages from a client's WebSocket stream and processes them as commands.
    async fn read_from_socket(
        mut receiver: SplitStream<WebSocketStream<TcpStream>>,
        addr: SocketAddr,
        system: Arc<Mutex<System>>,
        event_tx: broadcast::Sender<ServerEvent>,
    ) {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    println!("Received command from {}: {}", addr, text);
                    match serde_json::from_str::<ClientCommand>(&text) {
                        Ok(cmd) => {
                            // Here you would handle the command, e.g., by calling a method on `system`.
                            // For now, we'll just echo it back as an event.
                            let mut sys = system.lock().unwrap();
                            if cmd.command == "input" {
                                if let Some(narsese) = cmd.payload.as_str() {
                                    sys.input(narsese);
                                    let response = ServerEvent {
                                        event: "input_received".to_string(),
                                        payload: serde_json::json!({ "narsese": narsese }),
                                    };
                                    // Broadcast the event to all clients
                                    if event_tx.send(response).is_err() {
                                        eprintln!("Failed to broadcast event");
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("Failed to parse command from {}: {}", addr, e);
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    println!("Received close frame from {}", addr);
                    break;
                }
                Err(e) => {
                    eprintln!(
                        "Error receiving message from {}: {}",
                        addr,
                        e
                    );
                    break;
                }
                _ => {} // Ignore other message types
            }
        }
    }

    /// Writes messages to a client's WebSocket stream from the broadcast channel.
    async fn write_to_socket(
        mut sender: SplitSink<WebSocketStream<TcpStream>, Message>,
        mut receiver: broadcast::Receiver<ServerEvent>,
    ) {
        while let Ok(event) = receiver.recv().await {
            if let Ok(json) = serde_json::to_string(&event) {
                if sender.send(Message::Text(json)).await.is_err() {
                    // Client disconnected
                    break;
                }
            }
        }
    }
}