use tauri::Manager;

mod commands;
mod policy;
mod audit;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let _handle = app.handle().clone();
            tracing_subscriber::fmt::init();
            tracing::info!("Nebula IDE starting...");

            // Initialize the audit log
            let audit_store = audit::AuditStore::new();
            app.manage(audit_store);

            // Initialize the policy engine
            let policy_engine = policy::PolicyEngine::new();
            app.manage(policy_engine);

            // Initialize the vault manager
            let vault_manager = vault::VaultManager::new();
            app.manage(vault_manager);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_projects,
            commands::create_project,
            commands::get_project,
            commands::get_workstreams,
            commands::create_workstream,
            commands::send_message,
            commands::get_audit_log,
            commands::get_policy,
            commands::update_policy,
            commands::read_vault_note,
            commands::write_vault_note,
            commands::list_vault_notes,
            commands::get_run_record,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nebula");
}
