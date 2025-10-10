use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use std::{net::SocketAddr, sync::Arc};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::broadcast,
};
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};

use crate::{
    agent::Agent,
    events::{ClientCommand, Event, ServerEvent},
};

/// The main WebSocket server struct.
///
/// It manages incoming connections and broadcasts events to all connected clients.
pub struct WsServer {
    agent: Arc<Agent>,
    listener: TcpListener,
    event_tx: broadcast::Sender<ServerEvent>,
}

impl WsServer {
    /// Creates a new `WsServer` and binds it to the specified address.
    pub async fn new(
        addr: &str,
        agent: Arc<Agent>,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(addr).await?;
        let (event_tx, _) = broadcast::channel(100);
        println!("WebSocket server listening on: {}", addr);
        Ok(WsServer {
            agent,
            listener,
            event_tx,
        })
    }

    /// Starts the server's main loop, accepting new connections and broadcasting system events.
    pub async fn run(&self) {
        // Subscribe to the agent's event bus to receive system-level events.
        let mut system_event_rx = self.agent.subscribe();
        let server_event_tx = self.event_tx.clone();

        // Spawn a dedicated task to listen for system events, translate them
        // to server events, and broadcast them to all connected clients.
        tokio::spawn(async move {
            while let Ok(event) = system_event_rx.recv().await {
                let server_event = match event {
                    Event::TaskAdded { narsese } => ServerEvent {
                        event: "task_added".to_string(),
                        payload: serde_json::json!({ "narsese": narsese }),
                    },
                    Event::CycleCompleted { cycle } => ServerEvent {
                        event: "cycle_completed".to_string(),
                        payload: serde_json::json!({ "cycle": cycle }),
                    },
                };

                // Broadcast the translated event to all WebSocket clients.
                // It's okay if this fails; it just means there are no active clients.
                let _ = server_event_tx.send(server_event);
            }
        });

        while let Ok((stream, addr)) = self.listener.accept().await {
            let agent = Arc::clone(&self.agent);
            let event_tx = self.event_tx.clone();
            tokio::spawn(Self::handle_connection(stream, addr, agent, event_tx));
        }
    }

    /// Handles an individual client connection.
    async fn handle_connection(
        stream: TcpStream,
        addr: SocketAddr,
        agent: Arc<Agent>,
        event_tx: broadcast::Sender<ServerEvent>,
    ) {
        println!("Incoming TCP connection from: {}", addr);
        match accept_async(stream).await {
            Ok(ws_stream) => {
                println!("WebSocket connection established: {}", addr);
                let (ws_sender, ws_receiver) = ws_stream.split();
                let event_rx = event_tx.subscribe();

                // Spawn a task to handle outgoing messages (broadcasted events).
                tokio::spawn(Self::write_to_socket(ws_sender, event_rx));

                // Handle incoming messages from this client.
                Self::read_from_socket(ws_receiver, addr, agent).await;
            }
            Err(e) => println!("Error during the websocket handshake occurred: {}", e),
        }
        println!("Connection closed: {}", addr);
    }

    /// Reads messages from a client's WebSocket stream and processes them as commands.
    async fn read_from_socket(
        mut receiver: SplitStream<WebSocketStream<TcpStream>>,
        addr: SocketAddr,
        agent: Arc<Agent>,
    ) {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    println!("Received command from {}: {}", addr, text);
                    match serde_json::from_str::<ClientCommand>(&text) {
                        Ok(cmd) => {
                            // Delegate command processing to the agent.
                            if cmd.command == "input" {
                                if let Some(narsese) = cmd.payload.as_str() {
                                    // The agent will broadcast a `TaskAdded` event, which is
                                    // handled by the listener task in `run()`.
                                    agent.add_task(narsese);
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
                    eprintln!("Error receiving message from {}: {}", addr, e);
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
                    // Client disconnected.
                    break;
                }
            }
        }
    }
}