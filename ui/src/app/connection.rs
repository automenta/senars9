use eframe::egui;

// The render function is now a free function, taking `app` as a mutable reference.
pub fn render(ui: &mut egui::Ui, app: &mut crate::MyApp) {
    let mut connect = false;
    let mut disconnect = false;
    let mut setup_local = false;

    if let Some(connection) = app.connections.get_mut(app.active_tab_index) {
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
        app.connect_websocket();
    }
    if disconnect {
        app.disconnect_websocket();
    }
    if setup_local {
        app.setup_local_agent();
    }
}
