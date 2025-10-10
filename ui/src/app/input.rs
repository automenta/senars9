use eframe::egui;

pub fn render(ui: &mut egui::Ui, app: &mut crate::MyApp) {
    let mut send_input = false;
    if let Some(connection) = app.connections.get_mut(app.active_tab_index) {
        ui.horizontal(|ui| {
            ui.label("Input:");
            let response = ui.text_edit_singleline(&mut connection.input_text);

            if ui.button("Send").clicked()
                || (response.lost_focus()
                    && ui.input(|i| i.key_pressed(egui::Key::Enter) && !i.modifiers.shift))
            {
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
                        connection.input_history.current_index =
                            Some(connection.input_history.entries.len() - 1);
                        if let Some(idx) = connection.input_history.current_index {
                            if idx < connection.input_history.entries.len() {
                                connection.input_text =
                                    connection.input_history.entries[idx].clone();
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
                            connection.input_text =
                                connection.input_history.entries[new_idx].clone();
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
                    if ui.button("Clear History").clicked() {
                        connection.input_history.entries.clear();
                        connection.input_history.current_index = None;
                    }
                });

                // Show recent entries
                for (idx, entry) in connection.input_history.entries.iter().rev().take(20).enumerate()
                {
                    ui.horizontal(|ui| {
                        ui.label(format!(
                            "{}: ",
                            connection.input_history.entries.len() - idx
                        ));
                        if ui.selectable_label(false, entry).clicked() {
                            connection.input_text = entry.clone();
                            connection.input_history.current_index =
                                Some(connection.input_history.entries.len() - idx - 1);
                        }
                    });
                }
            });
        }
    }

    if send_input {
        app.send_input_to_agent();
    }
}
