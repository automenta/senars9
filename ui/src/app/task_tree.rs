use crate::{TaskNode, TaskType};
use eframe::egui;
use rand::Rng;

pub fn render(ui: &mut egui::Ui, app: &mut crate::MyApp) {
    if let Some(connection) = app.connections.get_mut(app.active_tab_index) {
        ui.collapsing("Active Tasks", |ui| {
            ui.horizontal(|ui| {
                if ui.button("Add Sample Task").clicked() {
                    let task_count = connection.task_tree.root_tasks.len() + 1;
                    let sample_task = TaskNode {
                        id: format!("task_{}", task_count),
                        narsese: format!("<concept_{} --> attribute_{}>", task_count, task_count),
                        priority: 0.5,
                        task_type: TaskType::Goal,
                        children: vec![TaskNode {
                            id: format!("child_{}", task_count),
                            narsese: "<sub_concept --> sub_attribute>".to_string(),
                            priority: 0.3,
                            task_type: TaskType::Question,
                            children: vec![],
                            created_at: std::time::SystemTime::now(),
                        }],
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
                        connection.task_tree.root_tasks[task_index]
                            .children
                            .push(child_task);
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
                    children: vec![TaskNode {
                        id: "child_1".to_string(),
                        narsese: "<penguin --> bird>".to_string(),
                        priority: 0.6,
                        task_type: TaskType::Quest,
                        children: vec![],
                        created_at: std::time::SystemTime::now(),
                    }],
                    created_at: std::time::SystemTime::now(),
                };
                connection.task_tree.root_tasks.push(sample_task);
            }

            // Render task tree recursively
            let mut root_tasks = std::mem::take(&mut connection.task_tree.root_tasks);
            for task in &mut root_tasks {
                render_task_node_recursive(ui, task, 0);
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
        render_task_node_recursive(ui, child, depth + 1);
    }
}
