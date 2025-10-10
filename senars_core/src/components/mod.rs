//! Defines the foundational `Component` trait for all system components.

pub mod analysis_engine;
pub mod config_service;
pub mod plan_executor;
pub mod resource_manager;
pub mod strategy_registry;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;

// Placeholders for detailed monitoring structs. These can be expanded later.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentHealth {
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentMetrics {
    pub data: HashMap<String, u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentStatus {
    pub is_running: bool,
}

/// A generic event handler function.
/// The `on` and `off` methods are not included in this initial trait definition
/// to simplify the architecture. A full event bus can be added later.
pub type EventHandler = Box<dyn Fn(serde_json::Value) + Send + Sync>;

/// The `Component` trait defines a common interface for all major parts of the SeNARS system.
///
/// This ensures that components have a consistent lifecycle, health monitoring,
/// and (in the future) event handling mechanism.
#[async_trait]
pub trait Component: Send + Sync {
    /// Initializes the component with its configuration.
    /// This is called once before the component is started.
    async fn initialize(&mut self, config: ComponentConfig) -> Result<(), Box<dyn Error>>;

    /// Starts the component's main logic.
    async fn start(&mut self) -> Result<(), Box<dyn Error>>;

    /// Stops the component's main logic.
    async fn stop(&mut self) -> Result<(), Box<dyn Error>>;

    /// Cleans up any resources used by the component.
    async fn destroy(&mut self) -> Result<(), Box<dyn Error>>;

    /// Returns the current health of the component.
    fn get_health(&self) -> ComponentHealth;

    /// Returns performance metrics from the component.
    fn get_metrics(&self) -> ComponentMetrics;

    /// Returns the current operational status of the component.
    fn get_status(&self) -> ComponentStatus;

    /// Emits an event from the component.
    /// In a real implementation, this would likely use a dedicated event bus.
    fn emit(&self, event: String, data: serde_json::Value);
}

/// Configuration for a component, loaded at initialization.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentConfig {
    pub name: String,
    pub version: String,
    pub dependencies: Vec<String>,
    pub config: HashMap<String, serde_json::Value>,
}