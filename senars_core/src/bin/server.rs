use senars_core::{agent::Agent, cycle::clock::IterativeClock, ws_server::WsServer, System};
use std::{env, sync::Arc, thread, time::Duration};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Get the cycle delay from an environment variable or use a default.
    let cycle_delay_ms = env::var("CYCLE_DELAY_MS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(10);

    // Create the core system and wrap it in the Agent.
    let clock = Box::new(IterativeClock::new());
    let system = System::new(clock);
    let agent = Arc::new(Agent::new(system));

    // Clone the agent Arc for the cognitive cycle thread.
    let agent_for_cycle = Arc::clone(&agent);

    // Spawn a dedicated thread for the cognitive cycle (the "heartbeat").
    thread::spawn(move || loop {
        agent_for_cycle.tick();
        thread::sleep(Duration::from_millis(cycle_delay_ms));
    });

    // The main thread will run the WebSocket server.
    let server = WsServer::new("127.0.0.1:9001", agent).await?;
    server.run().await;

    Ok(())
}