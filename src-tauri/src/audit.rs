use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

/// Immutable audit log store.
/// Records every action from user requests to agent decisions, tool calls,
/// code changes, tests, deployments, and documentation writes.
pub struct AuditStore {
    events: Mutex<Vec<AuditEvent>>,
    runs: Mutex<HashMap<String, RunRecord>>,
}

impl AuditStore {
    pub fn new() -> Self {
        Self {
            events: Mutex::new(Vec::new()),
            runs: Mutex::new(HashMap::new()),
        }
    }

    /// Append an event to the immutable log
    pub fn record_event(&self, event: AuditEvent) {
        let mut events = self.events.lock().unwrap();

        // Also add to run record if run exists
        if let Ok(mut runs) = self.runs.lock() {
            if let Some(run) = runs.get_mut(&event.run_id) {
                run.events.push(event.clone());
            }
        }

        events.push(event);
    }

    /// Create a new run record
    pub fn create_run(
        &self,
        project_id: &str,
        workstream_id: &str,
        user_request: &str,
    ) -> String {
        let run_id = Uuid::new_v4().to_string();
        let run = RunRecord {
            id: run_id.clone(),
            project_id: project_id.to_string(),
            workstream_id: workstream_id.to_string(),
            started_at: Utc::now().to_rfc3339(),
            completed_at: None,
            status: "running".to_string(),
            user_request: user_request.to_string(),
            events: Vec::new(),
            summary: None,
        };

        let mut runs = self.runs.lock().unwrap();
        runs.insert(run_id.clone(), run);

        // Record the run start event
        let event = AuditEvent {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            run_id: run_id.clone(),
            workstream_id: workstream_id.to_string(),
            project_id: project_id.to_string(),
            event_type: "run.started".to_string(),
            actor: AuditActor {
                actor_type: "user".to_string(),
                id: "system".to_string(),
                role: None,
                name: "User".to_string(),
            },
            payload: serde_json::json!({
                "kind": "run",
                "status": "started",
                "input": user_request
            }),
            parent_event_id: None,
            span_id: None,
            trace_id: None,
        };

        let mut events = self.events.lock().unwrap();
        events.push(event);

        run_id
    }

    /// Complete a run
    pub fn complete_run(&self, run_id: &str, status: &str) {
        let mut runs = self.runs.lock().unwrap();
        if let Some(run) = runs.get_mut(run_id) {
            run.completed_at = Some(Utc::now().to_rfc3339());
            run.status = status.to_string();
            run.summary = Some(Self::compute_summary(&run.events));
        }
    }

    /// Get a run record
    pub fn get_run(&self, run_id: &str) -> Option<RunRecord> {
        let runs = self.runs.lock().unwrap();
        runs.get(run_id).cloned()
    }

    /// Get all events for a project
    pub fn get_events(&self, project_id: &str, limit: usize) -> Vec<AuditEvent> {
        let events = self.events.lock().unwrap();
        events
            .iter()
            .filter(|e| e.project_id == project_id)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    fn compute_summary(events: &[AuditEvent]) -> RunSummary {
        let mut summary = RunSummary {
            total_events: events.len() as u32,
            agent_decisions: 0,
            tool_calls: 0,
            code_changes: 0,
            tests_run: 0,
            tests_passed: 0,
            tests_failed: 0,
            gates_passed: 0,
            gates_failed: 0,
            deployments_completed: 0,
            documentation_updates: 0,
            linear_updates: 0,
            duration: 0,
        };

        for event in events {
            match event.event_type.as_str() {
                "agent.decision" => summary.agent_decisions += 1,
                "tool.call" => summary.tool_calls += 1,
                "code.write" | "code.commit" => summary.code_changes += 1,
                "test.started" => summary.tests_run += 1,
                "test.passed" => summary.tests_passed += 1,
                "test.failed" => summary.tests_failed += 1,
                "gate.passed" => summary.gates_passed += 1,
                "gate.failed" => summary.gates_failed += 1,
                "deploy.completed" => summary.deployments_completed += 1,
                "documentation.write" => summary.documentation_updates += 1,
                "linear.issue.created" | "linear.issue.updated" => summary.linear_updates += 1,
                _ => {}
            }
        }

        summary
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub id: String,
    pub timestamp: String,
    pub run_id: String,
    pub workstream_id: String,
    pub project_id: String,
    pub event_type: String,
    pub actor: AuditActor,
    pub payload: serde_json::Value,
    pub parent_event_id: Option<String>,
    pub span_id: Option<String>,
    pub trace_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditActor {
    pub actor_type: String,
    pub id: String,
    pub role: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunRecord {
    pub id: String,
    pub project_id: String,
    pub workstream_id: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub status: String,
    pub user_request: String,
    pub events: Vec<AuditEvent>,
    pub summary: Option<RunSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunSummary {
    pub total_events: u32,
    pub agent_decisions: u32,
    pub tool_calls: u32,
    pub code_changes: u32,
    pub tests_run: u32,
    pub tests_passed: u32,
    pub tests_failed: u32,
    pub gates_passed: u32,
    pub gates_failed: u32,
    pub deployments_completed: u32,
    pub documentation_updates: u32,
    pub linear_updates: u32,
    pub duration: u64,
}
