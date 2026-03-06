use crate::agent_runtime::{
    AgentDefinition, AgentRuntime, AgentStatus, AgentStepResult, ExecutionResult,
};
use crate::audit::{AuditEvent, AuditStore, RunRecord};
use crate::deployment::{
    DeployStrategy, DeploymentEngine, DeploymentRecord, K8sManifest,
    PreviewEnvironment,
};
use crate::git_ops::{GitFileStatus, GitLogEntry, GitOpsEngine, GitResult};
use crate::llm_provider::{
    ChatRequest, ChatResponse, LlmMessage, LlmProviderManager, ProviderConfig, ProviderKind,
};
use crate::mcp_engine::{McpRegistry, McpToolDefinition, McpToolResult};
use crate::policy::{NebulaPolicy, PolicyDecision, PolicyEngine};
use crate::security::{SecurityEngine, SecurityReport, SecurityScanResult};
use crate::telemetry::{
    CollectorConfig, InstrumentationConfig, LogEntry, MetricPoint, Runbook,
    ServiceHealthStatus, TelemetryEngine, TraceSpan,
};
use crate::testing::{
    GateEvaluation, TestCommand, TestResult, TestRun, TestRunType, TestingEngine,
};
use crate::vault::{VaultManager, VaultNote, VaultNoteEntry};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

// ===================================================================
// Project & Workstream Types (kept from original)
// ===================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectData {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub status: String,
    pub vault_path: String,
    pub workstreams: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkstreamData {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub created_at: String,
    pub user_request: String,
    pub current_phase: String,
    pub messages: Vec<MessageData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageData {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: String,
    pub agent_id: Option<String>,
    pub agent_name: Option<String>,
}

static PROJECTS: std::sync::LazyLock<std::sync::Mutex<Vec<ProjectData>>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new(Vec::new()));

static WORKSTREAMS: std::sync::LazyLock<std::sync::Mutex<Vec<WorkstreamData>>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new(Vec::new()));

// ===================================================================
// Project Commands
// ===================================================================

#[tauri::command]
pub fn get_projects() -> Vec<ProjectData> {
    let projects = PROJECTS.lock().unwrap();
    projects.clone()
}

#[tauri::command]
pub fn create_project(name: String, description: String, vault_path: String) -> ProjectData {
    let project = ProjectData {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        created_at: Utc::now().to_rfc3339(),
        status: "active".to_string(),
        vault_path,
        workstreams: Vec::new(),
    };
    let mut projects = PROJECTS.lock().unwrap();
    projects.push(project.clone());
    project
}

#[tauri::command]
pub fn get_project(project_id: String) -> Option<ProjectData> {
    let projects = PROJECTS.lock().unwrap();
    projects.iter().find(|p| p.id == project_id).cloned()
}

// ===================================================================
// Workstream Commands
// ===================================================================

#[tauri::command]
pub fn get_workstreams(project_id: String) -> Vec<WorkstreamData> {
    let workstreams = WORKSTREAMS.lock().unwrap();
    workstreams
        .iter()
        .filter(|w| w.project_id == project_id)
        .cloned()
        .collect()
}

#[tauri::command]
pub fn create_workstream(
    project_id: String,
    title: String,
    user_request: String,
    audit_store: State<'_, AuditStore>,
) -> WorkstreamData {
    let workstream_id = Uuid::new_v4().to_string();
    let _run_id = audit_store.create_run(&project_id, &workstream_id, &user_request);
    let workstream = WorkstreamData {
        id: workstream_id,
        project_id: project_id.clone(),
        title,
        description: String::new(),
        status: "draft".to_string(),
        created_at: Utc::now().to_rfc3339(),
        user_request,
        current_phase: "design".to_string(),
        messages: Vec::new(),
    };
    let mut workstreams = WORKSTREAMS.lock().unwrap();
    workstreams.push(workstream.clone());
    let mut projects = PROJECTS.lock().unwrap();
    if let Some(project) = projects.iter_mut().find(|p| p.id == project_id) {
        project.workstreams.push(workstream.id.clone());
    }
    workstream
}

#[tauri::command]
pub fn send_message(
    workstream_id: String,
    content: String,
    audit_store: State<'_, AuditStore>,
) -> MessageData {
    let message = MessageData {
        id: Uuid::new_v4().to_string(),
        role: "user".to_string(),
        content: content.clone(),
        timestamp: Utc::now().to_rfc3339(),
        agent_id: None,
        agent_name: None,
    };
    let mut workstreams = WORKSTREAMS.lock().unwrap();
    if let Some(ws) = workstreams.iter_mut().find(|w| w.id == workstream_id) {
        ws.messages.push(message.clone());
        let event = crate::audit::AuditEvent {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            run_id: String::new(),
            workstream_id: workstream_id.clone(),
            project_id: ws.project_id.clone(),
            event_type: "user.request".to_string(),
            actor: crate::audit::AuditActor {
                actor_type: "user".to_string(),
                id: "user".to_string(),
                role: None,
                name: "User".to_string(),
            },
            payload: serde_json::json!({ "kind": "user.request", "content": content }),
            parent_event_id: None,
            span_id: None,
            trace_id: None,
        };
        audit_store.record_event(event);
    }
    message
}

// ===================================================================
// Audit Commands
// ===================================================================

#[tauri::command]
pub fn get_audit_log(
    project_id: String,
    limit: Option<usize>,
    audit_store: State<'_, AuditStore>,
) -> Vec<AuditEvent> {
    audit_store.get_events(&project_id, limit.unwrap_or(100))
}

#[tauri::command]
pub fn get_run_record(run_id: String, audit_store: State<'_, AuditStore>) -> Option<RunRecord> {
    audit_store.get_run(&run_id)
}

// ===================================================================
// Policy Commands
// ===================================================================

#[tauri::command]
pub fn get_policy(
    project_id: String,
    policy_engine: State<'_, PolicyEngine>,
) -> Option<NebulaPolicy> {
    policy_engine.get_policy(&project_id)
}

#[tauri::command]
pub fn update_policy(
    project_id: String,
    policy: NebulaPolicy,
    policy_engine: State<'_, PolicyEngine>,
) {
    policy_engine.set_policy(&project_id, policy);
}

#[tauri::command]
pub fn evaluate_permission(
    project_id: String,
    agent_role: String,
    action: String,
    resource: String,
    policy_engine: State<'_, PolicyEngine>,
) -> PolicyDecision {
    policy_engine.evaluate_permission(&project_id, &agent_role, &action, &resource)
}

// ===================================================================
// Vault Commands
// ===================================================================

#[tauri::command]
pub fn read_vault_note(
    project_id: String,
    note_path: String,
    vault_manager: State<'_, VaultManager>,
) -> Result<VaultNote, String> {
    vault_manager
        .read_note(&project_id, &note_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_vault_note(
    project_id: String,
    note_path: String,
    frontmatter: HashMap<String, serde_json::Value>,
    content: String,
    vault_manager: State<'_, VaultManager>,
) -> Result<(), String> {
    vault_manager
        .write_note(&project_id, &note_path, &frontmatter, &content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_vault_notes(
    project_id: String,
    directory: String,
    vault_manager: State<'_, VaultManager>,
) -> Result<Vec<VaultNoteEntry>, String> {
    vault_manager
        .list_notes(&project_id, &directory)
        .map_err(|e| e.to_string())
}

// ===================================================================
// LLM Provider Commands
// ===================================================================

#[tauri::command]
pub fn configure_llm_provider(
    provider: String,
    api_key: String,
    base_url: Option<String>,
    default_model: String,
    llm_manager: State<'_, LlmProviderManager>,
) {
    let kind = match provider.as_str() {
        "openai" => ProviderKind::OpenAI,
        "anthropic" => ProviderKind::Anthropic,
        "google" => ProviderKind::Google,
        "local" => ProviderKind::Local,
        _ => ProviderKind::OpenAI,
    };

    llm_manager.configure_provider(ProviderConfig {
        provider: kind,
        api_key,
        base_url,
        default_model,
        enabled: true,
    });
}

#[tauri::command]
pub fn list_llm_providers(
    llm_manager: State<'_, LlmProviderManager>,
) -> Vec<ProviderConfig> {
    llm_manager.list_providers()
}

#[tauri::command]
pub async fn llm_chat(
    provider: String,
    model: String,
    messages: Vec<LlmMessage>,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
    llm_manager: State<'_, LlmProviderManager>,
) -> Result<ChatResponse, String> {
    let kind = match provider.as_str() {
        "openai" => ProviderKind::OpenAI,
        "anthropic" => ProviderKind::Anthropic,
        "google" => ProviderKind::Google,
        _ => ProviderKind::OpenAI,
    };

    let request = ChatRequest {
        model,
        messages,
        tools: Vec::new(),
        temperature: temperature.unwrap_or(0.7),
        max_tokens: max_tokens.unwrap_or(4096),
    };

    llm_manager
        .chat(&kind, &request)
        .await
        .map_err(|e| e.to_string())
}

// ===================================================================
// MCP Commands
// ===================================================================

#[tauri::command]
pub fn list_mcp_tools(mcp_registry: State<'_, McpRegistry>) -> Vec<McpToolDefinition> {
    mcp_registry.list_all_tools()
}

#[tauri::command]
pub fn list_mcp_tools_for_role(
    role: String,
    mcp_registry: State<'_, McpRegistry>,
) -> Vec<McpToolDefinition> {
    mcp_registry.list_tools_for_role(&role)
}

#[tauri::command]
pub async fn execute_mcp_tool(
    agent_role: String,
    server: String,
    tool: String,
    arguments: serde_json::Value,
    mcp_registry: State<'_, McpRegistry>,
) -> Result<McpToolResult, String> {
    mcp_registry
        .execute_tool(&agent_role, &server, &tool, arguments)
        .await
        .map_err(|e| e.to_string())
}

// ===================================================================
// Git Operations Commands
// ===================================================================

#[tauri::command]
pub fn register_repo(
    project_id: String,
    path: String,
    git_engine: State<'_, GitOpsEngine>,
) {
    git_engine.register_repo(&project_id, std::path::PathBuf::from(path));
}

#[tauri::command]
pub async fn git_status(
    project_id: String,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<Vec<GitFileStatus>, String> {
    git_engine.status(&project_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_create_branch(
    project_id: String,
    branch_name: String,
    from_ref: Option<String>,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<GitResult, String> {
    git_engine
        .create_branch(&project_id, &branch_name, from_ref.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_commit(
    project_id: String,
    message: String,
    files: Vec<String>,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<GitResult, String> {
    let file_refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
    git_engine
        .stage(&project_id, &file_refs)
        .await
        .map_err(|e| e.to_string())?;
    git_engine
        .commit(&project_id, &message)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_push(
    project_id: String,
    remote: String,
    branch: String,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<GitResult, String> {
    git_engine
        .push(&project_id, &remote, &branch)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_diff(
    project_id: String,
    staged: bool,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<String, String> {
    git_engine
        .diff(&project_id, staged)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_log(
    project_id: String,
    limit: Option<u32>,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<Vec<GitLogEntry>, String> {
    git_engine
        .log(&project_id, limit.unwrap_or(20))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_current_branch(
    project_id: String,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<String, String> {
    git_engine
        .current_branch(&project_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_merge(
    project_id: String,
    source_branch: String,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<GitResult, String> {
    git_engine
        .merge(&project_id, &source_branch)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_read_file(
    project_id: String,
    file_path: String,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<String, String> {
    git_engine
        .read_file(&project_id, &file_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_write_file(
    project_id: String,
    file_path: String,
    content: String,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<(), String> {
    git_engine
        .write_file(&project_id, &file_path, &content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_run_command(
    project_id: String,
    command: String,
    timeout_secs: Option<u64>,
    git_engine: State<'_, GitOpsEngine>,
) -> Result<GitResult, String> {
    git_engine
        .run_command(&project_id, &command, timeout_secs.unwrap_or(60))
        .await
        .map_err(|e| e.to_string())
}

// ===================================================================
// Security Commands
// ===================================================================

#[tauri::command]
pub fn security_scan_secrets(
    content: String,
    file_path: String,
    security_engine: State<'_, SecurityEngine>,
) -> Vec<crate::security::SecretFinding> {
    security_engine.scan_secrets(&content, &file_path)
}

#[tauri::command]
pub fn security_scan_injection(
    input: String,
    source: String,
    security_engine: State<'_, SecurityEngine>,
) -> Vec<crate::security::InjectionFinding> {
    security_engine.scan_injection(&input, &source)
}

#[tauri::command]
pub fn security_validate_tool_params(
    tool_name: String,
    params: serde_json::Value,
    security_engine: State<'_, SecurityEngine>,
) -> Vec<crate::security::ToolViolation> {
    security_engine.validate_tool_params(&tool_name, &params)
}

#[tauri::command]
pub fn security_full_scan(
    project_id: String,
    files: Vec<(String, String)>,
    user_inputs: Vec<(String, String)>,
    security_engine: State<'_, SecurityEngine>,
) -> SecurityScanResult {
    security_engine.full_scan(&project_id, &files, &user_inputs)
}

#[tauri::command]
pub fn security_report(
    project_id: String,
    security_engine: State<'_, SecurityEngine>,
) -> SecurityReport {
    security_engine.generate_report(&project_id)
}

#[tauri::command]
pub fn security_redact(
    text: String,
    security_engine: State<'_, SecurityEngine>,
) -> String {
    security_engine.redact_text(&text)
}

// ===================================================================
// Deployment Commands
// ===================================================================

#[tauri::command]
pub fn deploy_create(
    project_id: String,
    service: String,
    environment: String,
    strategy: String,
    image_tag: String,
    deploy_engine: State<'_, DeploymentEngine>,
) -> DeploymentRecord {
    let strat = match strategy.as_str() {
        "canary" => DeployStrategy::Canary,
        "blue_green" => DeployStrategy::BlueGreen,
        "slot_swap" => DeployStrategy::SlotSwap,
        "traffic_shifting" => DeployStrategy::TrafficShifting,
        _ => DeployStrategy::Rolling,
    };
    deploy_engine.create_deployment(&project_id, &service, &environment, strat, &image_tag)
}

#[tauri::command]
pub fn deploy_status(
    deployment_id: String,
    deploy_engine: State<'_, DeploymentEngine>,
) -> Option<DeploymentRecord> {
    deploy_engine.get_deployment(&deployment_id)
}

#[tauri::command]
pub fn deploy_list(
    project_id: String,
    deploy_engine: State<'_, DeploymentEngine>,
) -> Vec<DeploymentRecord> {
    deploy_engine.list_deployments(&project_id)
}

#[tauri::command]
pub fn deploy_rollback(
    deployment_id: String,
    target_revision: Option<String>,
    deploy_engine: State<'_, DeploymentEngine>,
) -> Result<DeploymentRecord, String> {
    deploy_engine
        .rollback_deployment(&deployment_id, target_revision)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn deploy_generate_k8s(
    service: String,
    image: String,
    replicas: u32,
    port: u32,
    strategy: String,
    deploy_engine: State<'_, DeploymentEngine>,
) -> K8sManifest {
    let strat = match strategy.as_str() {
        "canary" => DeployStrategy::Canary,
        "blue_green" => DeployStrategy::BlueGreen,
        _ => DeployStrategy::Rolling,
    };
    deploy_engine.generate_k8s_manifests(&service, &image, replicas, port, &strat)
}

#[tauri::command]
pub fn deploy_create_preview(
    project_id: String,
    branch: String,
    ttl_hours: Option<u32>,
    deploy_engine: State<'_, DeploymentEngine>,
) -> PreviewEnvironment {
    deploy_engine.create_preview(&project_id, &branch, ttl_hours.unwrap_or(24))
}

#[tauri::command]
pub fn deploy_list_previews(
    project_id: String,
    deploy_engine: State<'_, DeploymentEngine>,
) -> Vec<PreviewEnvironment> {
    deploy_engine.list_previews(&project_id)
}

// ===================================================================
// Testing Commands
// ===================================================================

#[tauri::command]
pub fn test_get_commands(
    stack: String,
    testing_engine: State<'_, TestingEngine>,
) -> Option<TestCommand> {
    testing_engine.get_test_commands_for_stack(&stack)
}

#[tauri::command]
pub fn test_list_stacks(
    testing_engine: State<'_, TestingEngine>,
) -> Vec<String> {
    testing_engine.list_supported_stacks()
}

#[tauri::command]
pub fn test_create_run(
    project_id: String,
    run_type: String,
    testing_engine: State<'_, TestingEngine>,
) -> TestRun {
    let rt = match run_type.as_str() {
        "integration" => TestRunType::Integration,
        "security" => TestRunType::Security,
        "performance" => TestRunType::Performance,
        "e2e" => TestRunType::E2e,
        _ => TestRunType::Unit,
    };
    testing_engine.create_test_run(&project_id, rt)
}

#[tauri::command]
pub fn test_record_results(
    run_id: String,
    results: Vec<TestResult>,
    coverage: Option<f64>,
    testing_engine: State<'_, TestingEngine>,
) -> Result<TestRun, String> {
    testing_engine
        .record_test_results(&run_id, results, coverage)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn test_get_run(
    run_id: String,
    testing_engine: State<'_, TestingEngine>,
) -> Option<TestRun> {
    testing_engine.get_test_run(&run_id)
}

#[tauri::command]
pub fn test_list_runs(
    project_id: String,
    testing_engine: State<'_, TestingEngine>,
) -> Vec<TestRun> {
    testing_engine.list_test_runs(&project_id)
}

#[tauri::command]
pub fn test_evaluate_merge_gates(
    project_id: String,
    total: u32,
    passed: u32,
    failed: u32,
    coverage: Option<f64>,
    security_passed: bool,
    docs_updated: bool,
    testing_engine: State<'_, TestingEngine>,
) -> Vec<GateEvaluation> {
    let summary = crate::testing::TestSummary {
        total,
        passed,
        failed,
        skipped: 0,
        errors: 0,
        duration_ms: 0,
        coverage_percent: coverage,
    };
    testing_engine.evaluate_merge_gates(&project_id, &summary, security_passed, docs_updated)
}

#[tauri::command]
pub fn test_evaluate_deploy_gates(
    project_id: String,
    merge_gates_passed: bool,
    integration_tests_passed: bool,
    environment: String,
    testing_engine: State<'_, TestingEngine>,
) -> Vec<GateEvaluation> {
    testing_engine.evaluate_deploy_gates(
        &project_id,
        merge_gates_passed,
        integration_tests_passed,
        &environment,
    )
}

// ===================================================================
// Telemetry Commands
// ===================================================================

#[tauri::command]
pub fn telemetry_start_span(
    operation: String,
    service: String,
    parent_span_id: Option<String>,
    telemetry_engine: State<'_, TelemetryEngine>,
) -> TraceSpan {
    telemetry_engine.start_span(&operation, &service, parent_span_id)
}

#[tauri::command]
pub fn telemetry_end_span(
    span_id: String,
    status: String,
    telemetry_engine: State<'_, TelemetryEngine>,
) {
    telemetry_engine.end_span(&span_id, &status);
}

#[tauri::command]
pub fn telemetry_record_metric(
    name: String,
    value: f64,
    unit: String,
    labels: HashMap<String, String>,
    telemetry_engine: State<'_, TelemetryEngine>,
) {
    telemetry_engine.record_metric(&name, value, &unit, labels);
}

#[tauri::command]
pub fn telemetry_record_log(
    level: String,
    service: String,
    message: String,
    trace_id: Option<String>,
    span_id: Option<String>,
    telemetry_engine: State<'_, TelemetryEngine>,
) {
    telemetry_engine.record_log(&level, &service, &message, trace_id, span_id);
}

#[tauri::command]
pub fn telemetry_query_traces(
    service: String,
    limit: Option<usize>,
    telemetry_engine: State<'_, TelemetryEngine>,
) -> Vec<TraceSpan> {
    telemetry_engine.query_traces(&service, limit.unwrap_or(50))
}

#[tauri::command]
pub fn telemetry_query_metrics(
    name: String,
    limit: Option<usize>,
    telemetry_engine: State<'_, TelemetryEngine>,
) -> Vec<MetricPoint> {
    telemetry_engine.query_metrics(&name, limit.unwrap_or(100))
}

#[tauri::command]
pub fn telemetry_query_logs(
    service: String,
    level: Option<String>,
    limit: Option<usize>,
    telemetry_engine: State<'_, TelemetryEngine>,
) -> Vec<LogEntry> {
    telemetry_engine.query_logs(&service, level.as_deref(), limit.unwrap_or(100))
}

#[tauri::command]
pub fn telemetry_collector_config(
    telemetry_engine: State<'_, TelemetryEngine>,
) -> CollectorConfig {
    telemetry_engine.generate_collector_config()
}

#[tauri::command]
pub fn telemetry_instrumentation_config(
    stack: String,
    telemetry_engine: State<'_, TelemetryEngine>,
) -> InstrumentationConfig {
    telemetry_engine.generate_instrumentation_config(&stack)
}

#[tauri::command]
pub fn telemetry_generate_runbook(
    service: String,
    telemetry_engine: State<'_, TelemetryEngine>,
) -> Runbook {
    telemetry_engine.generate_runbook(&service)
}

#[tauri::command]
pub fn telemetry_health(
    service: String,
    telemetry_engine: State<'_, TelemetryEngine>,
) -> Option<ServiceHealthStatus> {
    telemetry_engine.get_health(&service)
}

#[tauri::command]
pub fn telemetry_all_health(
    telemetry_engine: State<'_, TelemetryEngine>,
) -> Vec<ServiceHealthStatus> {
    telemetry_engine.list_health()
}

// ===================================================================
// Agent Runtime Commands
// ===================================================================

#[tauri::command]
pub fn agent_list(
    agent_runtime: State<'_, AgentRuntime>,
) -> Vec<AgentDefinition> {
    agent_runtime.list_agents()
}

#[tauri::command]
pub fn agent_get(
    agent_id: String,
    agent_runtime: State<'_, AgentRuntime>,
) -> Option<AgentDefinition> {
    agent_runtime.get_agent(&agent_id)
}

#[tauri::command]
pub fn agent_register(
    agent: AgentDefinition,
    agent_runtime: State<'_, AgentRuntime>,
) {
    agent_runtime.register_agent(agent);
}

#[tauri::command]
pub fn agent_statuses(
    agent_runtime: State<'_, AgentRuntime>,
) -> Vec<AgentStatus> {
    agent_runtime.list_agent_statuses()
}

#[tauri::command]
pub fn agent_start_run(
    project_id: String,
    workstream_id: String,
    user_request: String,
    agent_runtime: State<'_, AgentRuntime>,
) -> crate::agent_runtime::AgentExecutionContext {
    agent_runtime.start_run(&project_id, &workstream_id, &user_request, "cto")
}

#[tauri::command]
pub async fn agent_execute_step(
    run_id: String,
    agent_runtime: State<'_, AgentRuntime>,
    llm_manager: State<'_, LlmProviderManager>,
    mcp_registry: State<'_, McpRegistry>,
    security_engine: State<'_, SecurityEngine>,
    audit_store: State<'_, AuditStore>,
) -> Result<AgentStepResult, String> {
    agent_runtime
        .execute_agent_step(
            &run_id,
            &llm_manager,
            &mcp_registry,
            &security_engine,
            &audit_store,
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn agent_complete_run(
    run_id: String,
    status: String,
    agent_runtime: State<'_, AgentRuntime>,
) -> Option<ExecutionResult> {
    agent_runtime.complete_run(&run_id, &status)
}

#[tauri::command]
pub fn agent_advance_phase(
    run_id: String,
    agent_runtime: State<'_, AgentRuntime>,
) -> Option<String> {
    agent_runtime.advance_phase(&run_id).map(|p| p.as_str().to_string())
}
