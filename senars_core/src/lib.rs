pub mod agent;
pub mod components;
pub mod cycle;
pub mod data_structures;
pub mod events;
pub mod memory;
pub mod parser;
pub mod reasoning;
pub mod ws_server;

use crate::components::{
    analysis_engine::AnalysisEngine, config_service::ConfigService, plan_executor::PlanExecutor,
    resource_manager::ResourceManager, strategy_registry::StrategyRegistry,
};
use crate::cycle::clock::Clock;
use crate::cycle::context::CycleContext;
use crate::cycle::focus_set_selector::FocusSetSelector;
use crate::cycle::run_single_cycle;
use crate::memory::Memory;
use crate::parser::parse;
use crate::reasoning::Reasoner;

/// The main orchestrator for the SeNARS system.
///
/// This struct owns all the core components (`Memory`, `Reasoner`, `Clock`, `FocusSetSelector`)
/// and provides the primary public API for interacting with the system.
pub struct System {
    // Core components
    pub runtime: Runtime,

    // Unified frameworks
    pub analysis_engine: AnalysisEngine,
    pub config_service: ConfigService,
    pub plan_executor: PlanExecutor,
    pub resource_manager: ResourceManager,
    pub strategy_registry: StrategyRegistry,
}

impl System {
    /// Creates a new `System` with the given clock and default components.
    ///
    /// # Arguments
    /// * `clock` - A boxed `Clock` trait object (e.g., `Box::new(IterativeClock::new())`).
    pub fn new(clock: Box<dyn Clock>) -> Self {
        System {
            // Core components
            runtime: Runtime::new(clock),
            // Unified frameworks
            analysis_engine: AnalysisEngine::new(),
            config_service: ConfigService::new(),
            plan_executor: PlanExecutor::new(),
            resource_manager: ResourceManager::new(),
            strategy_registry: StrategyRegistry::new(),
        }
    }

    /// Parses a Narsese string and adds the resulting task to memory.
    ///
    /// The new task and any newly created concepts are timestamped with the
    /// clock's current time.
    ///
    /// # Arguments
    /// * `narsese_input` - The Narsese string to parse (e.g., "(cat --> mammal).").
    pub fn input(&mut self, narsese_input: &str) {
        self.runtime.input(narsese_input);
    }

    /// Runs a single cognitive cycle.
    ///
    /// This method is the "heartbeat" of the system. It advances the clock,
    /// gets the current time, and then executes one full reasoning cycle.
    pub fn tick(&mut self) {
        self.runtime.tick();
    }
}

/// The `Runtime` struct owns the core components that are actively used during
/// the cognitive cycle.
pub struct Runtime {
    pub memory: Memory,
    pub reasoner: Reasoner,
    pub clock: Box<dyn Clock>,
    pub focus_set_selector: FocusSetSelector,
}

impl Runtime {
    /// Creates a new `Runtime` with the given clock and default components.
    pub fn new(clock: Box<dyn Clock>) -> Self {
        Self {
            memory: Memory::new(),
            reasoner: Reasoner::new(),
            clock,
            focus_set_selector: FocusSetSelector::default(),
        }
    }

    /// Parses a Narsese string and adds the resulting task to memory.
    pub fn input(&mut self, narsese_input: &str) {
        let current_time = self.clock.get_time();
        match parse(narsese_input, current_time) {
            Ok(task) => self.memory.add_task(task, current_time),
            Err(e) => {
                // In a real application, this should use a proper logging framework.
                eprintln!("Failed to parse input: {}", e);
            }
        }
    }

    /// Runs a single cognitive cycle.
    pub fn tick(&mut self) {
        // First, advance the clock's state.
        self.clock.tick();

        // Then, get the new current time and create the context for this cycle.
        let current_time = self.clock.get_time();
        let context = CycleContext { current_time };

        // Run one full cognitive cycle with the consistent context.
        run_single_cycle(
            &mut self.memory,
            &self.reasoner,
            &self.focus_set_selector,
            &context,
        );
    }
}