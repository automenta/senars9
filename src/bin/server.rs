use app::cycle::clock::IterativeClock;
use app::ws_server::WsServer;
use app::System;
use std::sync::{Arc, Mutex};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let clock = Box::new(IterativeClock::new());
    let system = Arc::new(Mutex::new(System::new(clock)));

    let server = WsServer::new("127.0.0.1:9001", system).await?;
    server.run().await;

    Ok(())
}