use eframe::egui;

pub fn render(ui: &mut egui::Ui, app: &mut crate::MyApp) {
    if let Some(connection) = app.connections.get_mut(app.active_tab_index) {
        ui.collapsing("Activity Log", |ui| {
            let mut auto_scroll = ui
                .ctx()
                .memory_mut(|mem| *mem.data.get_temp_mut_or(egui::Id::new("auto_scroll"), true));

            // Add log controls
            ui.horizontal(|ui| {
                if ui.button("Clear Log").clicked() {
                    connection.log_buffer.entries.clear();
                }

                ui.checkbox(&mut auto_scroll, "Auto-scroll");
                ui.ctx().memory_mut(|mem| {
                    mem.data
                        .insert_temp(egui::Id::new("auto_scroll"), auto_scroll);
                });
            });

            // Create a custom painter for animated log entries
            egui::ScrollArea::vertical()
                .auto_shrink([false, false])
                .max_height(200.0) // Set a default height
                .stick_to_bottom(auto_scroll)
                .show(ui, |ui| {
                    ui.set_width(ui.available_width());

                    for (idx, entry) in connection.log_buffer.entries.iter().enumerate() {
                        // Determine color based on log level
                        let mut color = match &entry.level {
                            crate::LogLevel::Info => egui::Color32::LIGHT_GRAY,
                            crate::LogLevel::Warning => egui::Color32::YELLOW,
                            crate::LogLevel::Error => egui::Color32::RED,
                            crate::LogLevel::Success => egui::Color32::GREEN,
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
                                crate::LogLevel::Info => "ℹ",
                                crate::LogLevel::Warning => "⚠",
                                crate::LogLevel::Error => "✗",
                                crate::LogLevel::Success => "✓",
                            };

                            // Add a colored icon
                            ui.colored_label(color, icon);

                            // Timestamp
                            let timestamp_str = entry
                                .timestamp
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis()
                                .to_string();
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
