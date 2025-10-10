use eframe::egui;
use egui_dock::{DockArea, DockState, Style, TabViewer};
use serde::Deserialize;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use senars_core::agent::Agent;

mod app;
mod websocket;
use websocket::{WebSocketManager, WebSocketEvent};

// Define the different tabs that can be docked
pub enum MyTab {
    Connection,
    ReasonerControls,
    Input,
    Log,
    TaskTree,
    ConceptMap,
    Statistics,
}

// Input history for REPL-like features
#[derive(Default)]
pub struct InputHistory {
    entries: Vec<String>,
    current_index: Option<usize>,
    max_entries: usize,
    original_input: String, // Store the input before history navigation
}

// Log entries for the animated activity log
#[derive(Default)]
pub struct LogBuffer {
    entries: Vec<LogEntry>,
    max_entries: usize,
}

#[derive(Clone, Deserialize)]
pub struct LogEntry {
    timestamp: std::time::SystemTime,
    message: String,
    level: LogLevel,
}

#[derive(Clone, Deserialize, Debug)]
pub enum LogLevel {
    Info,
    Warning,
    Error,
    Success,
}

// Statistics structure for animated charts
pub struct Statistics {
    cpu_usage: Vec<[f64; 2]>,
    task_processing_rate: Vec<[f64; 2]>,
    last_update: f64,
}

impl Default for Statistics {
    fn default() -> Self {
        Self {
            cpu_usage: Vec::new(),
            task_processing_rate: Vec::new(),
            last_update: 0.0,
        }
    }
}

#[derive(Clone, Deserialize, Debug)]
pub enum TaskType {
    Goal,
    Question,
    Quest,
}

// Task tree structure for active tasks
#[derive(Default)]
pub struct TaskTree {
    root_tasks: Vec<TaskNode>,
}

#[derive(Clone, Deserialize)]
pub struct TaskNode {
    id: String,
    narsese: String,
    priority: f32,
    task_type: TaskType,
    children: Vec<TaskNode>,
    created_at: std::time::SystemTime,
}

// Represents a single connection tab
pub struct Connection {
    name: String,

    // WebSocket manager
    ws_manager: WebSocketManager,
    
    // Input field state
    input_text: String,
    input_history: InputHistory,
    
    // Log display
    log_buffer: LogBuffer,
    
    // Task tree
    task_tree: TaskTree,
    
    // Statistics
    statistics: Statistics,

    // Local agent (if applicable)
    local_agent: Option<Arc<Agent>>,
    
    // Local server process
    local_server_process: Option<std::process::Child>,

    // Reasoner controls
    is_running: bool,
    cpu_throttle: f32,
}

impl Connection {
    fn new(name: String) -> Self {
        Self {
            name,
            ws_manager: WebSocketManager::new(),
            input_text: String::new(),
            input_history: InputHistory {
                max_entries: 100,
                ..Default::default()
            },
            log_buffer: LogBuffer {
                max_entries: 200,
                ..Default::default()
            },
            task_tree: TaskTree::default(),
            statistics: Statistics::default(),
            local_agent: None,
            local_server_process: None,
            is_running: false,
            cpu_throttle: 1.0,
        }
    }
}

impl Default for MyApp {
    fn default() -> Self {
        let dock_state = DockState::new(vec![
            MyTab::Connection,
            MyTab::ReasonerControls,
            MyTab::Input,
            MyTab::Log,
            MyTab::TaskTree,
        ]);

        Self {
            connections: vec![Connection::new("Connection 1".to_string())],
            active_tab_index: 0,
            next_connection_id: 1,
            dock_state,
            runtime: None,
            log_receiver: None,
            ws_event_sender: None,
            ws_event_receiver: None,
        }
    }
}

pub struct MyApp {
    connections: Vec<Connection>,
    active_tab_index: usize,
    next_connection_id: usize,
    dock_state: DockState<MyTab>,

    // Tokio runtime for async operations
    runtime: Option<Runtime>,
    
    // Channels for updating UI from async tasks
    log_receiver: Option<mpsc::UnboundedReceiver<LogEntry>>,
    
    // Channels for WebSocket events
    ws_event_sender: Option<mpsc::UnboundedSender<WebSocketEvent>>,
    ws_event_receiver: Option<mpsc::UnboundedReceiver<WebSocketEvent>>,
}

impl MyApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        let runtime = Runtime::new().unwrap();
        
        // Create channels for updating UI from async tasks
        let (_log_tx, log_rx) = mpsc::unbounded_channel::<LogEntry>();
        let (ws_event_tx, ws_event_rx) = mpsc::unbounded_channel::<WebSocketEvent>();
        
        // Setup custom theme
        Self::setup_custom_theme(&cc.egui_ctx);

        let dock_state = DockState::new(vec![
            MyTab::Connection,
            MyTab::ReasonerControls,
            MyTab::Input,
            MyTab::Log,
            MyTab::TaskTree,
        ]);

        let app = MyApp {
            runtime: Some(runtime),
            connections: vec![Connection::new("Connection 1".to_string())],
            active_tab_index: 0,
            next_connection_id: 1,
            dock_state,
            log_receiver: Some(log_rx),
            ws_event_sender: Some(ws_event_tx),
            ws_event_receiver: Some(ws_event_rx),
        };
        
        app
    }
}


impl TabViewer for MyApp {
    type Tab = MyTab;

    fn title(&mut self, tab: &mut Self::Tab) -> egui::WidgetText {
        self.title(tab)
    }

    fn ui(&mut self, ui: &mut egui::Ui, tab: &mut Self::Tab) {
        self.ui(ui, tab)
    }
}

impl MyApp {
    fn title(&mut self, tab: &mut MyTab) -> egui::WidgetText {
        match tab {
            MyTab::Connection => "Connection".into(),
            MyTab::ReasonerControls => "Reasoner Controls".into(),
            MyTab::Input => "Input".into(),
            MyTab::Log => "Log".into(),
            MyTab::TaskTree => "Task Tree".into(),
            MyTab::ConceptMap => "Concept Map".into(),
            MyTab::Statistics => "Statistics".into(),
        }
    }

    fn ui(&mut self, ui: &mut egui::Ui, tab: &mut MyTab) {
        match tab {
            MyTab::Connection => app::connection::render(ui, self),
            MyTab::ReasonerControls => app::reasoner_controls::render(ui, self),
            MyTab::Input => app::input::render(ui, self),
            MyTab::Log => app::log::render(ui, self),
            MyTab::TaskTree => app::task_tree::render(ui, self),
            MyTab::ConceptMap => {
                ui.label("Concept Map (disabled due to dependency issues)");
            }
            MyTab::Statistics => app::statistics::render(ui, self),
        }
    }

    fn setup_custom_theme(ctx: &egui::Context) {
        let mut style = (*ctx.style()).clone();
        style.visuals = egui::Visuals {
            dark_mode: true,
            override_text_color: Some(egui::Color32::from_rgb(230, 230, 230)),
            widgets: egui::style::Widgets::default(),
            panel_fill: egui::Color32::from_rgb(28, 28, 28),
            faint_bg_color: egui::Color32::from_rgb(40, 40, 40),
            extreme_bg_color: egui::Color32::from_rgb(10, 10, 10),
            code_bg_color: egui::Color32::from_rgb(50, 50, 50),
            hyperlink_color: egui::Color32::from_rgb(0, 150, 255),
            ..Default::default()
        };
        ctx.set_style(style);
    }
    
    pub fn setup_local_agent(&mut self) {
        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            if connection.local_server_process.is_some() {
                self.add_log_entry("Local server is already running".to_string(), LogLevel::Warning);
                return;
            }

            // This path assumes the UI is run from the workspace root
            let server_executable = "target/debug/server";
            let child = std::process::Command::new(server_executable)
                .spawn();

            match child {
                Ok(child) => {
                    connection.local_server_process = Some(child);
                    self.add_log_entry("Local server started".to_string(), LogLevel::Success);
                }
                Err(e) => {
                    self.add_log_entry(format!("Failed to start local server: {}", e), LogLevel::Error);
                }
            }
        }
    }
    
    pub fn add_log_entry(&mut self, message: String, level: LogLevel) {
        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            let entry = LogEntry {
                timestamp: std::time::SystemTime::now(),
                message,
                level,
            };

            connection.log_buffer.entries.push(entry);

            // Maintain buffer size
            if connection.log_buffer.entries.len() > connection.log_buffer.max_entries {
                connection.log_buffer.entries.remove(0);
            }
        }
    }
    
    pub fn send_input_to_agent(&mut self) {
        let mut log: Option<(String, LogLevel)> = None;
        let mut ws_input_to_send: Option<String> = None;

        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            if connection.input_text.trim().is_empty() {
                return;
            }
            let text = connection.input_text.clone();
            connection.input_history.entries.push(text.clone());
            if connection.input_history.entries.len() > connection.input_history.max_entries {
                connection.input_history.entries.remove(0);
            }
            connection.input_history.current_index = None;
            connection.input_history.original_input.clear();
            connection.input_text.clear();

            if let Some(ref agent) = connection.local_agent {
                agent.add_task(&text);
                log = Some((format!("Input sent to local agent: {}", text), LogLevel::Info));
            } else if connection.ws_manager.is_connected() {
                ws_input_to_send = Some(text);
            } else {
                log = Some(("No agent connected".to_string(), LogLevel::Warning));
            }
        }

        if let Some((msg, lvl)) = log {
            self.add_log_entry(msg, lvl);
        }
        if let Some(text) = ws_input_to_send {
            if let Err(e) = self.send_input_via_websocket(&text) {
                self.add_log_entry(format!("Failed to send via WebSocket: {}", e), LogLevel::Error);
            } else {
                self.add_log_entry(format!("Input sent via WebSocket: {}", text), LogLevel::Info);
            }
        }
    }
    
}

impl eframe::App for MyApp {
    fn on_exit(&mut self, _gl: Option<&eframe::glow::Context>) {
        for connection in &mut self.connections {
            if let Some(mut child) = connection.local_server_process.take() {
                if let Err(e) = child.kill() {
                    eprintln!("Failed to kill server process: {}", e);
                }
            }
        }
    }

    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Process any incoming messages from async tasks
        if let Some(ref mut log_rx) = self.log_receiver {
            while let Ok(log_entry) = log_rx.try_recv() {
                if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
                    connection.log_buffer.entries.push(log_entry);

                    // Maintain buffer size
                    if connection.log_buffer.entries.len() > connection.log_buffer.max_entries {
                        connection.log_buffer.entries.remove(0);
                    }
                }
            }
        }
        
        // Process WebSocket events
        if let Some(ref mut ws_rx) = self.ws_event_receiver {
            while let Ok(ws_event) = ws_rx.try_recv() {
                if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
                    match ws_event.event.as_str() {
                        "log" => {
                            if let Ok(log_entry) = serde_json::from_value::<LogEntry>(ws_event.payload) {
                                connection.log_buffer.entries.push(log_entry);

                                // Maintain buffer size
                                if connection.log_buffer.entries.len() > connection.log_buffer.max_entries {
                                    connection.log_buffer.entries.remove(0);
                                }
                            } else {
                                eprintln!("Failed to deserialize log entry from WebSocket event");
                            }
                        }
                        "task_tree" => {
                            if let Ok(tasks) = serde_json::from_value::<Vec<TaskNode>>(ws_event.payload) {
                                connection.task_tree.root_tasks = tasks;
                            } else {
                                eprintln!("Failed to deserialize task tree from WebSocket event");
                            }
                        }
                        _ => {
                            // Handle other event types if needed
                        }
                    }
                }
            }
        }

        egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.heading("SeNARS UI");
                
                // Only show tabs if there is more than one connection
                if self.connections.len() > 1 {
                    for (i, connection) in self.connections.iter().enumerate() {
                        if ui.selectable_label(self.active_tab_index == i, &connection.name).clicked() {
                            self.active_tab_index = i;
                        }
                    }
                }
                
                // Button to add a new connection
                if ui.button("+").on_hover_text("Add New Connection").clicked() {
                    let new_id = self.next_connection_id;
                    self.connections.push(Connection::new(format!("Connection {}", new_id + 1)));
                    self.active_tab_index = self.connections.len() - 1;
                    self.next_connection_id += 1;
                }
            });
        });

        if self.connections.is_empty() {
            egui::CentralPanel::default().show(ctx, |ui| {
                ui.heading("No connections active");
                if ui.button("Add New Connection").clicked() {
                    let new_id = self.next_connection_id;
                    self.connections.push(Connection::new(format!("Connection {}", new_id + 1)));
                    self.active_tab_index = self.connections.len() - 1;
                    self.next_connection_id += 1;
                }
            });
        } else {
            let mut dock_state = std::mem::replace(&mut self.dock_state, DockState::new(vec![]));
            DockArea::new(&mut dock_state)
                .style(Style::from_egui(ctx.style().as_ref()))
                .show(ctx, self);
            self.dock_state = dock_state;
        }
        
        // Request repaint for animations
        ctx.request_repaint();
    }
}

// Testing and screenshot capabilities
impl MyApp {
    pub fn capture_screenshot(&self, _ctx: &egui::Context) {
        // In a real implementation, we would save the current frame as an image
        // For now, we'll just log that the screenshot was captured
        println!("Screenshot captured at {:?}", std::time::SystemTime::now());
    }
    
    pub fn start_recording(&mut self) {
        // In a real implementation, we would start recording frames
        // For now, we'll just log that recording started
        println!("Recording started at {:?}", std::time::SystemTime::now());
    }
    
    pub fn stop_recording(&mut self) {
        // In a real implementation, we would stop recording and save the video
        // For now, we'll just log that recording stopped
        println!("Recording stopped at {:?}", std::time::SystemTime::now());
    }
}

// Implementation for sending input via WebSocket
impl MyApp {
    pub fn disconnect_websocket(&mut self) {
        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            connection.ws_manager.disconnect();
            self.add_log_entry(
                "Disconnected from WebSocket".to_string(),
                LogLevel::Info,
            );
        }
    }

    pub fn start_stop_reasoner(&mut self) {
        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            connection.is_running = !connection.is_running;
            let command = if connection.is_running {
                "start_reasoner"
            } else {
                "stop_reasoner"
            };
            let cmd = websocket::ClientCommand {
                command: command.to_string(),
                payload: serde_json::Value::Null,
            };
            if let Err(e) = connection.ws_manager.send_command(cmd) {
                self.add_log_entry(format!("Failed to send command: {}", e), LogLevel::Error);
            }
        }
    }

    pub fn set_cpu_throttle(&mut self, throttle: f32) {
        if let Some(connection) = self.connections.get(self.active_tab_index) {
            let cmd = websocket::ClientCommand {
                command: "set_cpu_throttle".to_string(),
                payload: serde_json::json!(throttle),
            };
            if let Err(e) = connection.ws_manager.send_command(cmd) {
                self.add_log_entry(
                    format!("Failed to set CPU throttle: {}", e),
                    LogLevel::Error,
                );
            }
        }
    }

    pub fn send_input_via_websocket(&self, input: &str) -> Result<(), String> {
        if let Some(connection) = self.connections.get(self.active_tab_index) {
            let command = websocket::ClientCommand {
                command: "input".to_string(),
                payload: serde_json::Value::String(input.to_string()),
            };
            
            connection.ws_manager.send_command(command)
        } else {
            Err("No active connection".to_string())
        }
    }
    
    pub fn connect_websocket(&mut self) {
        if let Some(connection) = self.connections.get(self.active_tab_index) {
            // Clone the URL to move into the async context
            let url = connection.ws_manager.get_state().url.clone();

            // Clone the manager Arc to move into the async task
            let ws_manager_clone = connection.ws_manager.clone();
            let event_sender_clone = self.ws_event_sender.clone().unwrap();
            let runtime = self.runtime.as_ref().unwrap();
            let url_for_spawn = url.clone(); // Clone the URL for use in async closure

            // Run the connection in the runtime
            runtime.spawn(async move {
                if let Err(e) = ws_manager_clone.connect(&url_for_spawn, event_sender_clone).await {
                    eprintln!("WebSocket connection error: {}", e);
                }
            });

            self.add_log_entry(format!("Attempting to connect to: {}", url), LogLevel::Info);
        }
    }
}

fn main() -> Result<(), eframe::Error> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([800.0, 600.0]),
        ..Default::default()
    };
    eframe::run_native(
        "SeNARS UI",
        options,
        Box::new(|cc| Box::new(MyApp::new(cc))),
    )
}
