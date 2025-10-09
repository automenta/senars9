use app::{agent::Agent, cycle::clock::IterativeClock, ws_server::WsServer, System};
use std::{sync::Arc, thread, time::Duration};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create the core system and wrap it in the Agent.
    let clock = Box::new(IterativeClock::new());
    let system = System::new(clock);
    let agent = Arc::new(Agent::new(system));

    // Clone the agent Arc for the cognitive cycle thread.
    let agent_for_cycle = Arc::clone(&agent);

    // Spawn a dedicated thread for the cognitive cycle (the "heartbeat").
    thread::spawn(move || loop {
        agent_for_cycle.tick();
        // TODO: Make the cycle rate configurable.
        thread::sleep(Duration::from_millis(10));
    });

    // The main thread will run the WebSocket server.
    let server = WsServer::new("127.0.0.1:9001", agent).await?;
    server.run().await;

    Ok(())
}