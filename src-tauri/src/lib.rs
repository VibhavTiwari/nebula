use tauri::Manager;

mod commands;
mod policy;
mod audit;
mod vault;
mod llm_provider;
mod mcp_engine;
mod git_ops;
mod security;
mod deployment;
mod testing;
mod telemetry;
mod agent_runtime;
mod agents;

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

            // ---- Core services (existing) ----
            let audit_store = audit::AuditStore::new();
            app.manage(audit_store);

            let policy_engine = policy::PolicyEngine::new();
            app.manage(policy_engine);

            let vault_manager = vault::VaultManager::new();
            app.manage(vault_manager);

            // ---- LLM Provider Manager ----
            let llm_manager = llm_provider::LlmProviderManager::new();
            app.manage(llm_manager);

            // ---- MCP Registry ----
            let mcp_registry = mcp_engine::McpRegistry::new();
            mcp_registry.register_defaults();
            app.manage(mcp_registry);

            // ---- Git Operations Engine ----
            let git_engine = git_ops::GitOpsEngine::new();
            app.manage(git_engine);

            // ---- Security Engine ----
            let security_engine = security::SecurityEngine::new();
            app.manage(security_engine);

            // ---- Deployment Engine ----
            let deploy_engine = deployment::DeploymentEngine::new();
            app.manage(deploy_engine);

            // ---- Testing Engine ----
            let testing_engine = testing::TestingEngine::new();
            app.manage(testing_engine);

            // ---- Telemetry Engine ----
            let telemetry_engine = telemetry::TelemetryEngine::new();
            app.manage(telemetry_engine);

            // ---- Agent Runtime ----
            let agent_runtime = agent_runtime::AgentRuntime::new();
            agents::register_all_agents(&agent_runtime);
            app.manage(agent_runtime);

            tracing::info!("All Nebula backend services initialized");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Project & Workstream
            commands::get_projects,
            commands::create_project,
            commands::get_project,
            commands::get_workstreams,
            commands::create_workstream,
            commands::send_message,
            // Audit
            commands::get_audit_log,
            commands::get_run_record,
            // Policy
            commands::get_policy,
            commands::update_policy,
            commands::evaluate_permission,
            // Vault
            commands::read_vault_note,
            commands::write_vault_note,
            commands::list_vault_notes,
            // LLM Providers
            commands::configure_llm_provider,
            commands::list_llm_providers,
            commands::llm_chat,
            // MCP
            commands::list_mcp_tools,
            commands::list_mcp_tools_for_role,
            commands::execute_mcp_tool,
            // Git Operations
            commands::register_repo,
            commands::git_status,
            commands::git_create_branch,
            commands::git_commit,
            commands::git_push,
            commands::git_diff,
            commands::git_log,
            commands::git_current_branch,
            commands::git_merge,
            commands::git_read_file,
            commands::git_write_file,
            commands::git_run_command,
            // Security
            commands::security_scan_secrets,
            commands::security_scan_injection,
            commands::security_validate_tool_params,
            commands::security_full_scan,
            commands::security_report,
            commands::security_redact,
            // Deployment
            commands::deploy_create,
            commands::deploy_status,
            commands::deploy_list,
            commands::deploy_rollback,
            commands::deploy_generate_k8s,
            commands::deploy_create_preview,
            commands::deploy_list_previews,
            // Testing
            commands::test_get_commands,
            commands::test_list_stacks,
            commands::test_create_run,
            commands::test_record_results,
            commands::test_get_run,
            commands::test_list_runs,
            commands::test_evaluate_merge_gates,
            commands::test_evaluate_deploy_gates,
            // Telemetry
            commands::telemetry_start_span,
            commands::telemetry_end_span,
            commands::telemetry_record_metric,
            commands::telemetry_record_log,
            commands::telemetry_query_traces,
            commands::telemetry_query_metrics,
            commands::telemetry_query_logs,
            commands::telemetry_collector_config,
            commands::telemetry_instrumentation_config,
            commands::telemetry_generate_runbook,
            commands::telemetry_health,
            commands::telemetry_all_health,
            // Agent Runtime
            commands::agent_list,
            commands::agent_get,
            commands::agent_register,
            commands::agent_statuses,
            commands::agent_start_run,
            commands::agent_execute_step,
            commands::agent_complete_run,
            commands::agent_advance_phase,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nebula");
}
