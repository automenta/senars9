use eframe::egui;
use serde::Deserialize;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tokio::sync::mpsc;
use senars_core::{agent::Agent, System, cycle::clock::IterativeClock};

mod websocket;
use websocket::{WebSocketManager, WebSocketEvent};

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

#[derive(Clone, Deserialize)]
enum LogLevel {
    Info,
    Warning,
    Error,
    Success,
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
    children: Vec<TaskNode>,
    created_at: std::time::SystemTime,
}

#[derive(Default)]
struct MyApp {
    // WebSocket manager
    ws_manager: Option<WebSocketManager>,
    
    // Input field state
    input_text: String,
    input_history: InputHistory,
    
    // Log display
    log_buffer: LogBuffer,
    
    // Task tree
    task_tree: TaskTree,
    
    // Local system (for local connections)
    local_agent: Option<Arc<Agent>>,
    
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

        let mut app = MyApp {
            runtime: Some(runtime),
            ws_manager: Some(WebSocketManager::new()),
            log_sender: Some(log_tx),
            log_receiver: Some(log_rx),
            ws_event_sender: Some(ws_event_tx),
            ws_event_receiver: Some(ws_event_rx),
            ..Default::default()
        };
        
        app.input_history.max_entries = 100;
        app.log_buffer.max_entries = 200;
        
        app
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
        let system = System::new(Box::new(IterativeClock::new()));
        let agent = Agent::new(system);
        self.local_agent = Some(Arc::new(agent));
        self.add_log_entry("Local agent initialized".to_string(), LogLevel::Success);
    }
    
    fn add_log_entry(&mut self, message: String, level: LogLevel) {
        let entry = LogEntry {
            timestamp: std::time::SystemTime::now(),
            message,
            level,
        };
        
        self.log_buffer.entries.push(entry);
        
        // Maintain buffer size
        if self.log_buffer.entries.len() > self.log_buffer.max_entries {
            self.log_buffer.entries.remove(0);
        }
    }
    
    fn send_input_to_agent(&mut self) {
        if !self.input_text.trim().is_empty() {
            // Add to history
            self.input_history.entries.push(self.input_text.clone());
            if self.input_history.entries.len() > self.input_history.max_entries {
                self.input_history.entries.remove(0);
            }
            
            // Reset history navigation
            self.input_history.current_index = None;
            self.input_history.original_input.clear();
            
            // Send to local agent if available
            if let Some(ref agent) = self.local_agent {
                agent.add_task(&self.input_text);
                self.add_log_entry(format!("Input sent to local agent: {}", self.input_text), LogLevel::Info);
            } 
            // Check if we have WebSocket connection
            else if let Some(ref ws_manager) = self.ws_manager {
                if ws_manager.is_connected() {
                    if let Err(e) = self.send_input_via_websocket(&self.input_text) {
                        self.add_log_entry(format!("Failed to send via WebSocket: {}", e), LogLevel::Error);
                    } else {
                        self.add_log_entry(format!("Input sent via WebSocket: {}", self.input_text), LogLevel::Info);
                    }
                } else {
                    self.add_log_entry("No agent connected".to_string(), LogLevel::Warning);
                }
            } else {
                self.add_log_entry("No agent connected".to_string(), LogLevel::Warning);
            }
            
            // Clear input
            self.input_text.clear();
        }
    }
    
    fn render_input_section(&mut self, ui: &mut egui::Ui) {
        ui.horizontal(|ui| {
            ui.label("Input:");
            let response = ui.text_edit_singleline(&mut self.input_text);
            
            if ui.button("Send").clicked() || 
               (response.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter) && !i.modifiers.shift)) {
                self.send_input_to_agent();
            }
            
            if ui.button("Clear").clicked() {
                self.input_text.clear();
            }
        });
        
        // Add command history navigation with arrow keys
        if ui.memory(|mem| mem.focused().is_some()) {
            let input = ui.input(|i| i.clone());
            if input.key_pressed(egui::Key::ArrowUp) {
                // Navigate up in history
                if self.input_history.entries.is_empty() {
                    return;
                }
                
                match self.input_history.current_index {
                    None => {
                        // Store the original input before navigating
                        self.input_history.original_input = self.input_text.clone();

                        // Start at the most recent entry
                        self.input_history.current_index = Some(self.input_history.entries.len() - 1);
                        if let Some(idx) = self.input_history.current_index {
                            if idx < self.input_history.entries.len() {
                                self.input_text = self.input_history.entries[idx].clone();
                            }
                        }
                    }
                    Some(mut idx) if idx > 0 => {
                        idx -= 1;
                        self.input_history.current_index = Some(idx);
                        if idx < self.input_history.entries.len() {
                            self.input_text = self.input_history.entries[idx].clone();
                        }
                    }
                    _ => {} // Already at the beginning
                }
            } else if input.key_pressed(egui::Key::ArrowDown) {
                // Navigate down in history
                if let Some(idx) = self.input_history.current_index {
                    if idx < self.input_history.entries.len() - 1 {
                        let new_idx = idx + 1;
                        self.input_history.current_index = Some(new_idx);
                        if new_idx < self.input_history.entries.len() {
                            self.input_text = self.input_history.entries[new_idx].clone();
                        }
                    } else {
                        // Restore the original input if we go past the last history item
                        self.input_history.current_index = None;
                        self.input_text = self.input_history.original_input.clone();
                    }
                }
            }
        }
        
        // Render input history
        if !self.input_history.entries.is_empty() {
            ui.collapsing("Input History", |ui| {
                ui.horizontal(|ui| {
                    if ui.button("↑").clicked() {
                        // Navigate up in history
                        if self.input_history.entries.is_empty() {
                            return;
                        }
                        
                        match self.input_history.current_index {
                            None => {
                                // Start at the most recent entry
                                self.input_history.current_index = Some(self.input_history.entries.len() - 1);
                                if let Some(idx) = self.input_history.current_index {
                                    if idx < self.input_history.entries.len() {
                                        self.input_text = self.input_history.entries[idx].clone();
                                    }
                                }
                            }
                            Some(mut idx) if idx > 0 => {
                                idx -= 1;
                                self.input_history.current_index = Some(idx);
                                if idx < self.input_history.entries.len() {
                                    self.input_text = self.input_history.entries[idx].clone();
                                }
                            }
                            _ => {} // Already at the beginning
                        }
                    }
                    
                    if ui.button("↓").clicked() {
                        // Navigate down in history
                        if let Some(idx) = self.input_history.current_index {
                            if idx < self.input_history.entries.len() - 1 {
                                let new_idx = idx + 1;
                                self.input_history.current_index = Some(new_idx);
                                if new_idx < self.input_history.entries.len() {
                                    self.input_text = self.input_history.entries[new_idx].clone();
                                }
                            } else {
                                // Clear the input if we go past the last history item
                                self.input_history.current_index = None;
                                self.input_text.clear();
                            }
                        }
                    }
                    
                    if ui.button("Clear History").clicked() {
                        self.input_history.entries.clear();
                        self.input_history.current_index = None;
                    }
                });
                
                // Show recent entries
                for (idx, entry) in self.input_history.entries.iter().rev().take(20).enumerate() {
                    ui.horizontal(|ui| {
                        ui.label(format!("{}: ", self.input_history.entries.len() - idx));
                        if ui.selectable_label(false, entry).clicked() {
                            self.input_text = entry.clone();
                            self.input_history.current_index = Some(self.input_history.entries.len() - idx - 1);
                        }
                    });
                }
            });
        }
    }
    
    fn render_log_section(&mut self, ui: &mut egui::Ui) {
        ui.collapsing("Activity Log", |ui| {
            // Add log controls
            ui.horizontal(|ui| {
                if ui.button("Clear Log").clicked() {
                    self.log_buffer.entries.clear();
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
                    
                    for (idx, entry) in self.log_buffer.entries.iter().enumerate() {
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
                        if idx < self.log_buffer.entries.len() - 1 {
                            ui.add(egui::Separator::default().horizontal());
                        }
                    }
                });
        });
    }
    
    fn render_task_tree_section(&mut self, ui: &mut egui::Ui) {
        ui.collapsing("Active Tasks", |ui| {
            ui.horizontal(|ui| {
                if ui.button("Add Sample Task").clicked() {
                    let task_count = self.task_tree.root_tasks.len() + 1;
                    let sample_task = TaskNode {
                        id: format!("task_{}", task_count),
                        narsese: format!("<concept_{} --> attribute_{}>", task_count, task_count),
                        priority: 0.5,
                        children: vec![
                            TaskNode {
                                id: format!("child_{}", task_count),
                                narsese: "<sub_concept --> sub_attribute>".to_string(),
                                priority: 0.3,
                                children: vec![],
                                created_at: std::time::SystemTime::now(),
                            }
                        ],
                        created_at: std::time::SystemTime::now(),
                    };
                    self.task_tree.root_tasks.push(sample_task);
                }
                
                if ui.button("Clear All Tasks").clicked() {
                    self.task_tree.root_tasks.clear();
                }
            });
            
            // Add a sample task if none exists (for demonstration)
            if self.task_tree.root_tasks.is_empty() {
                let sample_task = TaskNode {
                    id: "sample_task_1".to_string(),
                    narsese: "<bird --> flyer>".to_string(),
                    priority: 0.8,
                    children: vec![
                        TaskNode {
                            id: "child_1".to_string(),
                            narsese: "<penguin --> bird>".to_string(),
                            priority: 0.6,
                            children: vec![],
                            created_at: std::time::SystemTime::now(),
                        }
                    ],
                    created_at: std::time::SystemTime::now(),
                };
                self.task_tree.root_tasks.push(sample_task);
            }
            
            // Render task tree recursively
            let mut root_tasks = std::mem::take(&mut self.task_tree.root_tasks);
            for task in &mut root_tasks {
                Self::render_task_node_recursive(ui, task, 0);
            }
            self.task_tree.root_tasks = root_tasks;
        });
    }

    fn render_task_node_recursive(ui: &mut egui::Ui, task: &mut TaskNode, depth: usize) {
        let indent = " ".repeat(depth * 2);

        if task.children.is_empty() {
            // Render a leaf node
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
                
                // Task Narsese and priority slider
                ui.label(&task.narsese);
                ui.add(egui::Slider::new(&mut task.priority, 0.0..=1.0).show_value(false));
                ui.label(format!("(ID: {})", task.id));
            });
        } else {
            // Render a branch node (with children)
            egui::CollapsingHeader::new(format!("{}{} {}", indent, "▼", task.narsese))
                .default_open(true)
                .show(ui, |ui| {
                    // Render the parent task's details inside the collapsing header
                    ui.horizontal(|ui| {
                        let priority_color = if task.priority > 0.7 {
                            egui::Color32::GREEN
                        } else if task.priority > 0.3 {
                            egui::Color32::YELLOW
                        } else {
                            egui::Color32::RED
                        };
                        ui.colored_label(priority_color, "●");
                        ui.label("Priority:");
                        ui.add(egui::Slider::new(&mut task.priority, 0.0..=1.0).show_value(true));
                        ui.label(format!("(ID: {})", task.id));
                    });

                    // Recursively render children
                    for child in &mut task.children {
                        Self::render_task_node_recursive(ui, child, depth + 1);
                    }
                });
        }
    }
    
    fn render_connection_section(&mut self, ui: &mut egui::Ui) {
        ui.collapsing("Connection", |ui| {
            ui.horizontal(|ui| {
                ui.label("WebSocket URL:");
                let ws_manager = self.ws_manager.as_ref().unwrap();
                let state = ws_manager.get_state();
                
                let mut url = state.url;
                let response = ui.text_edit_singleline(&mut url);
                if response.changed() {
                    // Update the URL in the WebSocket manager
                    let mut ws_state = ws_manager.state.lock().unwrap();
                    ws_state.url = url.clone();
                }
                
                if ui.button("Connect").clicked() {
                    self.connect_websocket();
                }
                
                if ui.button("Disconnect").clicked() {
                    if let Some(ref mut ws_manager) = self.ws_manager {
                        ws_manager.disconnect();
                        self.add_log_entry("Disconnected from WebSocket".to_string(), LogLevel::Info);
                    }
                }
                
                if ui.button("Local Agent").clicked() {
                    self.setup_local_agent();
                }
            });
            
            // Display connection status
            let ws_manager = self.ws_manager.as_ref().unwrap();
            let state = ws_manager.get_state();
            
            if let Some(ref error) = state.connection_error {
                ui.colored_label(egui::Color32::RED, format!("Error: {}", error));
            }
            
            let status_text = if state.is_connected {
                format!("Connected to: {}", state.url)
            } else if self.local_agent.is_some() {
                "Local agent active".to_string()
            } else {
                "Not connected".to_string()
            };
            
            let status_color = if state.is_connected {
                egui::Color32::GREEN
            } else if self.local_agent.is_some() {
                egui::Color32::YELLOW
            } else {
                egui::Color32::RED
            };
            
            ui.colored_label(status_color, status_text);
        });
    }
}

impl eframe::App for MyApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Process any incoming messages from async tasks
        // Process any incoming messages from async tasks
        if let Some(ref mut log_rx) = self.log_receiver {
            while let Ok(log_entry) = log_rx.try_recv() {
                self.log_buffer.entries.push(log_entry);
                
                // Maintain buffer size
                if self.log_buffer.entries.len() > self.log_buffer.max_entries {
                    self.log_buffer.entries.remove(0);
                }
            }
        }
        
        // Process WebSocket events
        if let Some(ref mut ws_rx) = self.ws_event_receiver {
            while let Ok(ws_event) = ws_rx.try_recv() {
                match ws_event.event.as_str() {
                    "log" => {
                        if let Ok(log_entry) = serde_json::from_value::<LogEntry>(ws_event.payload) {
                            self.log_buffer.entries.push(log_entry);

                            // Maintain buffer size
                            if self.log_buffer.entries.len() > self.log_buffer.max_entries {
                                self.log_buffer.entries.remove(0);
                            }
                        } else {
                            eprintln!("Failed to deserialize log entry from WebSocket event");
                        }
                    }
                    "task_tree" => {
                        if let Ok(tasks) = serde_json::from_value::<Vec<TaskNode>>(ws_event.payload) {
                            self.task_tree.root_tasks = tasks;
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

        egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.heading("SeNARS UI");
                
                // Status indicator
                let ws_manager = self.ws_manager.as_ref().unwrap();
                let state = ws_manager.get_state();
                
                let status_color = if state.is_connected {
                    egui::Color32::GREEN
                } else if self.local_agent.is_some() {
                    egui::Color32::YELLOW
                } else {
                    egui::Color32::RED
                };
                
                ui.colored_label(status_color, "●");
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            // Connection section
            self.render_connection_section(ui);
            
            ui.separator();
            
            // Input section
            self.render_input_section(ui);
            
            ui.separator();
            
            // Log section
            self.render_log_section(ui);
            
            ui.separator();
            
            // Task tree section
            self.render_task_tree_section(ui);
            
            ui.separator();
            
            // Testing section
            self.render_testing_section(ui);
        });
        
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
        if let Some(ref ws_manager) = self.ws_manager {
            let command = websocket::ClientCommand {
                command: "input".to_string(),
                payload: serde_json::Value::String(input.to_string()),
            };
            
            ws_manager.send_command(command)
        } else {
            Err("WebSocket manager not initialized".to_string())
        }
    }
    
    pub fn connect_websocket(&mut self) {
        // Clone the URL to move into the async context
        let ws_state = self.ws_manager.as_ref().unwrap().get_state();
        let url = ws_state.url.clone();
        
        // Clone the manager Arc to move into the async task
        let ws_manager_clone = self.ws_manager.clone().unwrap();
        let event_sender_clone = self.ws_event_sender.clone().unwrap();
        let runtime = self.runtime.as_ref().unwrap().clone();
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