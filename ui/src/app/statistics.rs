use eframe::egui;
use egui_plot::{Line, Plot, PlotPoints};

pub fn render(ui: &mut egui::Ui, app: &mut crate::MyApp) {
    if let Some(connection) = app.connections.get_mut(app.active_tab_index) {
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
                plot_ui.line(Line::new(PlotPoints::from(
                    connection.statistics.cpu_usage.clone(),
                )));
            });

        Plot::new("Task Processing Rate")
            .view_aspect(2.0)
            .show(ui, |plot_ui| {
                plot_ui.line(Line::new(PlotPoints::from(
                    connection.statistics.task_processing_rate.clone(),
                )));
            });
    }
}
