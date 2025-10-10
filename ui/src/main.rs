use eframe::egui;
use egui_dock::{DockArea, DockState, Style, TabViewer};
use egui_plot::{Line, Plot, PlotPoints};
use rand::Rng;
use serde::Deserialize;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use senars_core::agent::Agent;

mod websocket;
use websocket::{WebSocketManager, WebSocketEvent};

// Define the different tabs that can be docked
enum MyTab {
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
struct InputHistory {
    entries: Vec<String>,
    current_index: Option<usize>,
    max_entries: usize,
    original_input: String, // Store the input before history navigation
}

// Log entries for the animated activity log
#[derive(Default)]
struct LogBuffer {
    entries: Vec<LogEntry>,
    max_entries: usize,
}

#[derive(Clone, Deserialize)]
struct LogEntry {
    timestamp: std::time::SystemTime,
    message: String,
    level: LogLevel,
}

#[derive(Clone, Deserialize, Debug)]
enum LogLevel {
    Info,
    Warning,
    Error,
    Success,
}

// Statistics structure for animated charts
struct Statistics {
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
enum TaskType {
    Goal,
    Question,
    Quest,
}

// Task tree structure for active tasks
#[derive(Default)]
struct TaskTree {
    root_tasks: Vec<TaskNode>,
}

#[derive(Clone, Deserialize)]
struct TaskNode {
    id: String,
    narsese: String,
    priority: f32,
    task_type: TaskType,
    children: Vec<TaskNode>,
    created_at: std::time::SystemTime,
}

// Represents a single connection tab
struct Connection {
    id: usize,
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
    fn new(id: usize, name: String) -> Self {
        Self {
            id,
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
            connections: vec![Connection::new(0, "Connection 1".to_string())],
            active_tab_index: 0,
            next_connection_id: 1,
            dock_state,
            runtime: None,
            log_sender: None,
            log_receiver: None,
            ws_event_sender: None,
            ws_event_receiver: None,
        }
    }
}

struct MyApp {
    connections: Vec<Connection>,
    active_tab_index: usize,
    next_connection_id: usize,
    dock_state: DockState<MyTab>,

    // Tokio runtime for async operations
    runtime: Option<Runtime>,
    
    // Channels for updating UI from async tasks
    log_sender: Option<mpsc::UnboundedSender<LogEntry>>,
    log_receiver: Option<mpsc::UnboundedReceiver<LogEntry>>,
    
    // Channels for WebSocket events
    ws_event_sender: Option<mpsc::UnboundedSender<WebSocketEvent>>,
    ws_event_receiver: Option<mpsc::UnboundedReceiver<WebSocketEvent>>,
}

impl MyApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        let runtime = Runtime::new().unwrap();
        
        // Create channels for updating UI from async tasks
        let (log_tx, log_rx) = mpsc::unbounded_channel::<LogEntry>();
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
            connections: vec![Connection::new(0, "Connection 1".to_string())],
            active_tab_index: 0,
            next_connection_id: 1,
            dock_state,
            log_sender: Some(log_tx),
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
            MyTab::Connection => self.render_connection_section(ui),
            MyTab::ReasonerControls => self.render_reasoner_controls_section(ui),
            MyTab::Input => self.render_input_section(ui),
            MyTab::Log => self.render_log_section(ui),
            MyTab::TaskTree => self.render_task_tree_section(ui),
            MyTab::ConceptMap => {
                ui.label("Concept Map (disabled due to dependency issues)");
            }
            MyTab::Statistics => {
                if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
                    let now = ui.input(|i| i.time);
                    if now - connection.statistics.last_update > 1.0 {
                        connection.statistics.last_update = now;
                        let cpu_usage = &mut connection.statistics.cpu_usage;
                        cpu_usage.push([now, rand::random::<f64>() * 100.0]);
                        while cpu_usage.len() > 100 {
                            cpu_usage.remove(0);
                        }

                        let task_processing_rate = &mut connection.statistics.task_processing_rate;
                        task_processing_rate.push([now, rand::random::<f64>() * 50.0]);
                        while task_processing_rate.len() > 100 {
                            task_processing_rate.remove(0);
                        }
                    }

                    Plot::new("CPU Usage")
                        .view_aspect(2.0)
                        .show(ui, |plot_ui| {
                            plot_ui.line(Line::new(PlotPoints::from(connection.statistics.cpu_usage.clone())));
                        });

                    Plot::new("Task Processing Rate")
                        .view_aspect(2.0)
                        .show(ui, |plot_ui| {
                            plot_ui.line(Line::new(PlotPoints::from(connection.statistics.task_processing_rate.clone())));
                        });
                }
            }
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
    
    fn setup_local_agent(&mut self) {
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
    
    fn add_log_entry(&mut self, message: String, level: LogLevel) {
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
    
    fn send_input_to_agent(&mut self) {
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
    
    fn render_input_section(&mut self, ui: &mut egui::Ui) {
        let mut send_input = false;
        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            ui.horizontal(|ui| {
                ui.label("Input:");
                let response = ui.text_edit_singleline(&mut connection.input_text);

                if ui.button("Send").clicked() ||
                   (response.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter) && !i.modifiers.shift)) {
                    send_input = true;
                }
                
                if ui.button("Clear").clicked() {
                    connection.input_text.clear();
                }
            });

            // Add command history navigation with arrow keys
            if ui.memory(|mem| mem.focused().is_some()) {
                let input = ui.input(|i| i.clone());
                if input.key_pressed(egui::Key::ArrowUp) {
                    // Navigate up in history
                    if connection.input_history.entries.is_empty() {
                        return;
                    }

                    match connection.input_history.current_index {
                        None => {
                            // Store the original input before navigating
                            connection.input_history.original_input = connection.input_text.clone();

                            // Start at the most recent entry
                            connection.input_history.current_index = Some(connection.input_history.entries.len() - 1);
                            if let Some(idx) = connection.input_history.current_index {
                                if idx < connection.input_history.entries.len() {
                                    connection.input_text = connection.input_history.entries[idx].clone();
                                }
                            }
                        }
                        Some(mut idx) if idx > 0 => {
                            idx -= 1;
                            connection.input_history.current_index = Some(idx);
                            if idx < connection.input_history.entries.len() {
                                connection.input_text = connection.input_history.entries[idx].clone();
                            }
                        }
                        _ => {} // Already at the beginning
                    }
                } else if input.key_pressed(egui::Key::ArrowDown) {
                    // Navigate down in history
                    if let Some(idx) = connection.input_history.current_index {
                        if idx < connection.input_history.entries.len() - 1 {
                            let new_idx = idx + 1;
                            connection.input_history.current_index = Some(new_idx);
                            if new_idx < connection.input_history.entries.len() {
                                connection.input_text = connection.input_history.entries[new_idx].clone();
                            }
                        } else {
                            // Restore the original input if we go past the last history item
                            connection.input_history.current_index = None;
                            connection.input_text = connection.input_history.original_input.clone();
                        }
                    }
                }
            }

            // Render input history
            if !connection.input_history.entries.is_empty() {
                ui.collapsing("Input History", |ui| {
                    ui.horizontal(|ui| {
                        if ui.button("↑").clicked() {
                            // Navigate up in history
                            if connection.input_history.entries.is_empty() {
                                return;
                            }

                            match connection.input_history.current_index {
                                None => {
                                    // Start at the most recent entry
                                    connection.input_history.current_index = Some(connection.input_history.entries.len() - 1);
                                    if let Some(idx) = connection.input_history.current_index {
                                        if idx < connection.input_history.entries.len() {
                                            connection.input_text = connection.input_history.entries[idx].clone();
                                        }
                                    }
                                }
                                Some(mut idx) if idx > 0 => {
                                    idx -= 1;
                                    connection.input_history.current_index = Some(idx);
                                    if idx < connection.input_history.entries.len() {
                                        connection.input_text = connection.input_history.entries[idx].clone();
                                    }
                                }
                                _ => {} // Already at the beginning
                            }
                        }

                        if ui.button("↓").clicked() {
                            // Navigate down in history
                            if let Some(idx) = connection.input_history.current_index {
                                if idx < connection.input_history.entries.len() - 1 {
                                    let new_idx = idx + 1;
                                    connection.input_history.current_index = Some(new_idx);
                                    if new_idx < connection.input_history.entries.len() {
                                        connection.input_text = connection.input_history.entries[new_idx].clone();
                                    }
                                } else {
                                    // Clear the input if we go past the last history item
                                    connection.input_history.current_index = None;
                                    connection.input_text.clear();
                                }
                            }
                        }

                        if ui.button("Clear History").clicked() {
                            connection.input_history.entries.clear();
                            connection.input_history.current_index = None;
                        }
                    });
                    
                    // Show recent entries
                    for (idx, entry) in connection.input_history.entries.iter().rev().take(20).enumerate() {
                        ui.horizontal(|ui| {
                            ui.label(format!("{}: ", connection.input_history.entries.len() - idx));
                            if ui.selectable_label(false, entry).clicked() {
                                connection.input_text = entry.clone();
                                connection.input_history.current_index = Some(connection.input_history.entries.len() - idx - 1);
                            }
                        });
                    }
                });
            }
        }

        if send_input {
            self.send_input_to_agent();
        }
    }
    
    fn render_log_section(&mut self, ui: &mut egui::Ui) {
        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            ui.collapsing("Activity Log", |ui| {
                // Add log controls
                ui.horizontal(|ui| {
                    if ui.button("Clear Log").clicked() {
                        connection.log_buffer.entries.clear();
                    }
                    
                    let mut auto_scroll = ui.ctx().memory_mut(|mem| {
                        *mem.data.get_temp_mut_or(egui::Id::new("auto_scroll"), true)
                    });
                    ui.checkbox(&mut auto_scroll, "Auto-scroll");
                    ui.ctx().memory_mut(|mem| {
                        mem.data.insert_temp(egui::Id::new("auto_scroll"), auto_scroll);
                    });
                });

                // Create a custom painter for animated log entries
                egui::ScrollArea::vertical()
                    .auto_shrink([false, false])
                    .max_height(200.0) // Set a default height
                    .stick_to_bottom(true)
                    .show(ui, |ui| {
                        ui.set_width(ui.available_width());
                        
                        for (idx, entry) in connection.log_buffer.entries.iter().enumerate() {
                            // Determine color based on log level
                            let mut color = match &entry.level {
                                LogLevel::Info => egui::Color32::LIGHT_GRAY,
                                LogLevel::Warning => egui::Color32::YELLOW,
                                LogLevel::Error => egui::Color32::RED,
                                LogLevel::Success => egui::Color32::GREEN,
                            };

                            // Animate fade-in for new entries
                            let age = std::time::SystemTime::now()
                                .duration_since(entry.timestamp)
                                .unwrap_or_default()
                                .as_secs_f32();

                            let animation_duration = 0.5; // seconds
                            if age < animation_duration {
                                // Easing function for a smoother animation (ease-out quad)
                                let t = age / animation_duration;
                                let animation_progress = 1.0 - (1.0 - t) * (1.0 - t);
                                color = color.linear_multiply(animation_progress);
                            }
                            
                            ui.horizontal(|ui| {
                                // Icon based on log level
                                let icon = match &entry.level {
                                    LogLevel::Info => "ℹ",
                                    LogLevel::Warning => "⚠",
                                    LogLevel::Error => "✗",
                                    LogLevel::Success => "✓",
                                };

                                // Add a colored icon
                                ui.colored_label(color, icon);

                                // Timestamp
                                let timestamp_str = entry.timestamp.duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default().as_millis().to_string();
                                let mut timestamp_label_color = color;
                                timestamp_label_color = timestamp_label_color.linear_multiply(0.7);
                                ui.colored_label(timestamp_label_color, format!("[{}]", timestamp_str))
                                 .on_hover_text("Timestamp");

                                // Message content
                                ui.colored_label(color, &entry.message);

                                // Add a small amount of spacing
                                ui.allocate_space(egui::Vec2::new(4.0, 0.0));
                            });
                            
                            // Add a subtle separator between entries
                            if idx < connection.log_buffer.entries.len() - 1 {
                                ui.add(egui::Separator::default().horizontal());
                            }
                        }
                    });
            });
        }
    }
    
    fn render_task_tree_section(&mut self, ui: &mut egui::Ui) {
        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            ui.collapsing("Active Tasks", |ui| {
                ui.horizontal(|ui| {
                    if ui.button("Add Sample Task").clicked() {
                        let task_count = connection.task_tree.root_tasks.len() + 1;
                        let sample_task = TaskNode {
                            id: format!("task_{}", task_count),
                            narsese: format!("<concept_{} --> attribute_{}>", task_count, task_count),
                            priority: 0.5,
                            task_type: TaskType::Goal,
                            children: vec![
                                TaskNode {
                                    id: format!("child_{}", task_count),
                                    narsese: "<sub_concept --> sub_attribute>".to_string(),
                                    priority: 0.3,
                                    task_type: TaskType::Question,
                                    children: vec![],
                                    created_at: std::time::SystemTime::now(),
                                }
                            ],
                            created_at: std::time::SystemTime::now(),
                        };
                        connection.task_tree.root_tasks.push(sample_task);
                    }

                    if ui.button("Clear All Tasks").clicked() {
                        connection.task_tree.root_tasks.clear();
                    }

                    if ui.button("Add Random Child").clicked() {
                        if !connection.task_tree.root_tasks.is_empty() {
                            let mut rng = rand::thread_rng();
                            let task_index = rng.gen_range(0..connection.task_tree.root_tasks.len());
                            let child_task = TaskNode {
                                id: format!("child_{}", connection.task_tree.root_tasks.len() + 1),
                                narsese: "<new_concept --> new_attribute>".to_string(),
                                priority: rng.gen_range(0.0..1.0),
                                task_type: TaskType::Quest,
                                children: vec![],
                                created_at: std::time::SystemTime::now(),
                            };
                            connection.task_tree.root_tasks[task_index].children.push(child_task);
                        }
                    }
                });

                // Add a sample task if none exists (for demonstration)
                if connection.task_tree.root_tasks.is_empty() {
                    let sample_task = TaskNode {
                        id: "sample_task_1".to_string(),
                        narsese: "<bird --> flyer>".to_string(),
                        priority: 0.8,
                        task_type: TaskType::Goal,
                        children: vec![
                            TaskNode {
                                id: "child_1".to_string(),
                                narsese: "<penguin --> bird>".to_string(),
                                priority: 0.6,
                                task_type: TaskType::Quest,
                                children: vec![],
                                created_at: std::time::SystemTime::now(),
                            }
                        ],
                        created_at: std::time::SystemTime::now(),
                    };
                    connection.task_tree.root_tasks.push(sample_task);
                }
                
                // Render task tree recursively
                let mut root_tasks = std::mem::take(&mut connection.task_tree.root_tasks);
                for task in &mut root_tasks {
                    Self::render_task_node_recursive(ui, task, 0);
                }
                connection.task_tree.root_tasks = root_tasks;
            });
        }
    }

    fn render_task_node_recursive(ui: &mut egui::Ui, task: &mut TaskNode, depth: usize) {
        let indent = " ".repeat(depth * 2);

        ui.horizontal(|ui| {
            ui.label(format!("{}└─", indent));

            // Visual indicator for priority
            let priority_color = if task.priority > 0.7 {
                egui::Color32::GREEN
            } else if task.priority > 0.3 {
                egui::Color32::YELLOW
            } else {
                egui::Color32::RED
            };
            ui.colored_label(priority_color, "●");

            // Icon for task type
            let task_icon = match task.task_type {
                TaskType::Goal => "🎯",
                TaskType::Question => "❓",
                TaskType::Quest => "❔",
            };
            ui.label(task_icon);

            // Task Narsese and priority slider
            ui.label(&task.narsese);
            ui.add(egui::Slider::new(&mut task.priority, 0.0..=1.0).show_value(false));

            // Button to show more details
            if ui.button("i").on_hover_text("Show Details").clicked() {
                // This is a simplified way to show a popup.
                // A more robust solution would manage popup state in the app struct.
                let popup_id = ui.make_persistent_id(&task.id);
                ui.memory_mut(|mem| mem.toggle_popup(popup_id));

                egui::popup::show_tooltip_at_pointer(ui.ctx(), popup_id, |ui| {
                    ui.label(format!("ID: {}", task.id));
                    ui.label(format!("Narsese: {}", task.narsese));
                    ui.label(format!("Priority: {:.2}", task.priority));
                    ui.label(format!("Type: {:?}", task.task_type));
                    ui.label(format!("Created At: {:?}", task.created_at));
                });
            }
        });

        // Recursively render children
        for child in &mut task.children {
            Self::render_task_node_recursive(ui, child, depth + 1);
        }
    }
    
    fn render_connection_section(&mut self, ui: &mut egui::Ui) {
        let mut connect = false;
        let mut disconnect = false;
        let mut setup_local = false;

        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            ui.collapsing("Connection", |ui| {
                ui.horizontal(|ui| {
                    ui.label("WebSocket URL:");
                    let mut url = connection.ws_manager.get_state().url;
                    let response = ui.text_edit_singleline(&mut url);
                    if response.changed() {
                        let mut state = connection.ws_manager.state.lock().unwrap();
                        state.url = url;
                    }

                    if ui.button("Connect").clicked() {
                        connect = true;
                    }

                    if ui.button("Disconnect").clicked() {
                        disconnect = true;
                    }

                    if ui.button("Local Agent").clicked() {
                        setup_local = true;
                    }
                });
                
                // Display connection status
                let state = connection.ws_manager.get_state();
                
                if let Some(ref error) = state.connection_error {
                    ui.colored_label(egui::Color32::RED, format!("Error: {}", error));
                }
                
                let status_text = if state.is_connected {
                    format!("Connected to: {}", state.url)
                } else if connection.local_agent.is_some() {
                    "Local agent active".to_string()
                } else {
                    "Not connected".to_string()
                };

                let status_color = if state.is_connected {
                    egui::Color32::GREEN
                } else if connection.local_agent.is_some() {
                    egui::Color32::YELLOW
                } else {
                    egui::Color32::RED
                };

                ui.colored_label(status_color, status_text);
            });
        }

        if connect {
            self.connect_websocket();
        }
        if disconnect {
            if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
                connection.ws_manager.disconnect();
            }
            self.add_log_entry("Disconnected from WebSocket".to_string(), LogLevel::Info);
        }
        if setup_local {
            self.setup_local_agent();
        }
    }

    fn render_reasoner_controls_section(&mut self, ui: &mut egui::Ui) {
        let mut start_stop_clicked = false;
        let mut throttle_changed = false;

        if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
            ui.collapsing("Reasoner Controls", |ui| {
                ui.horizontal(|ui| {
                    if ui.button(if connection.is_running { "Stop" } else { "Start" }).clicked() {
                        start_stop_clicked = true;
                    }

                    ui.label("CPU Throttle:");
                    if ui.add(egui::Slider::new(&mut connection.cpu_throttle, 0.0..=1.0)).changed() {
                        throttle_changed = true;
                    }
                });
            });
        }

        if start_stop_clicked {
            if let Some(connection) = self.connections.get_mut(self.active_tab_index) {
                connection.is_running = !connection.is_running;
                let command = if connection.is_running { "start_reasoner" } else { "stop_reasoner" };
                let cmd = websocket::ClientCommand {
                    command: command.to_string(),
                    payload: serde_json::Value::Null,
                };
                if let Err(e) = connection.ws_manager.send_command(cmd) {
                    self.add_log_entry(format!("Failed to send command: {}", e), LogLevel::Error);
                }
            }
        }

        if throttle_changed {
            if let Some(connection) = self.connections.get(self.active_tab_index) {
                let cmd = websocket::ClientCommand {
                    command: "set_cpu_throttle".to_string(),
                    payload: serde_json::json!(connection.cpu_throttle),
                };
                if let Err(e) = connection.ws_manager.send_command(cmd) {
                    self.add_log_entry(format!("Failed to set CPU throttle: {}", e), LogLevel::Error);
                }
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
                    self.connections.push(Connection::new(new_id, format!("Connection {}", new_id + 1)));
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
                    self.connections.push(Connection::new(new_id, format!("Connection {}", new_id + 1)));
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
    fn render_testing_section(&mut self, ui: &mut egui::Ui) {
        ui.collapsing("Testing & Validation", |ui| {
            ui.horizontal(|ui| {
                if ui.button("Take Screenshot").clicked() {
                    self.capture_screenshot(ui.ctx());
                    self.add_log_entry("Screenshot taken".to_string(), LogLevel::Info);
                }
                
                if ui.button("Start Recording").clicked() {
                    self.start_recording();
                    self.add_log_entry("Recording started".to_string(), LogLevel::Info);
                }
                
                if ui.button("Stop Recording").clicked() {
                    self.stop_recording();
                    self.add_log_entry("Recording stopped".to_string(), LogLevel::Info);
                }
            });
            
            ui.label("Testing capabilities for validation and debugging.");
            ui.label("Screenshots and recordings help validate UI behavior.");
        });
    }
    
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