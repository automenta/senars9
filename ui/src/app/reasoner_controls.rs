use eframe::egui;

pub fn render(ui: &mut egui::Ui, app: &mut crate::MyApp) {
    let mut start_stop_clicked = false;
    let mut throttle_changed = false;

    if let Some(connection) = app.connections.get_mut(app.active_tab_index) {
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
        app.start_stop_reasoner();
    }

    if throttle_changed {
        if let Some(connection) = app.connections.get(app.active_tab_index) {
            app.set_cpu_throttle(connection.cpu_throttle);
        }
    }
}
