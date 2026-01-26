use crate::audit::{AuditEvent, AuditStore, RunRecord};
use crate::policy::{NebulaPolicy, PolicyEngine};
use crate::vault::{VaultManager, VaultNote, VaultNoteEntry};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

/// Project data stored in memory (will be persisted to vault in later phases)
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

// In-memory store for projects and workstreams (will be replaced with vault persistence)
static PROJECTS: std::sync::LazyLock<std::sync::Mutex<Vec<ProjectData>>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new(Vec::new()));

static WORKSTREAMS: std::sync::LazyLock<std::sync::Mutex<Vec<WorkstreamData>>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new(Vec::new()));

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

    // Create a run for this workstream
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

    // Update project workstream list
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

        // Record user message in audit log
        let event = AuditEvent {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            run_id: String::new(), // Will be populated by agent runtime
            workstream_id: workstream_id.clone(),
            project_id: ws.project_id.clone(),
            event_type: "user.request".to_string(),
            actor: crate::audit::AuditActor {
                actor_type: "user".to_string(),
                id: "user".to_string(),
                role: None,
                name: "User".to_string(),
            },
            payload: serde_json::json!({
                "kind": "user.request",
                "action": "request",
                "content": content
            }),
            parent_event_id: None,
            span_id: None,
            trace_id: None,
        };
        audit_store.record_event(event);
    }

    message
}

#[tauri::command]
pub fn get_audit_log(
    project_id: String,
    limit: Option<usize>,
    audit_store: State<'_, AuditStore>,
) -> Vec<AuditEvent> {
    audit_store.get_events(&project_id, limit.unwrap_or(100))
}

#[tauri::command]
pub fn get_policy(project_id: String, policy_engine: State<'_, PolicyEngine>) -> Option<NebulaPolicy> {
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

#[tauri::command]
pub fn get_run_record(run_id: String, audit_store: State<'_, AuditStore>) -> Option<RunRecord> {
    audit_store.get_run(&run_id)
}
