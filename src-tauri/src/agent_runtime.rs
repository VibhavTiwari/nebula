use crate::audit::{AuditActor, AuditEvent, AuditStore};
use crate::llm_provider::{ChatRequest, LlmMessage, LlmProviderManager, ProviderKind, ToolDefinition};
use crate::mcp_engine::{McpRegistry, McpToolResult};
use crate::security::SecurityEngine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDefinition {
    pub id: String,
    pub name: String,
    pub role: AgentRole,
    pub level: AgentLevel,
    pub system_prompt: String,
    pub model: String,
    pub provider: String,
    pub temperature: f64,
    pub max_tokens: u32,
    pub allowed_tools: Vec<String>,
    pub max_iterations: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentRole {
    Cto,
    Engineering,
    Testing,
    Devops,
    Security,
    Scribing,
    FrontendWorker,
    BackendWorker,
    FullstackWorker,
    UnitTestWorker,
    IntegrationTestWorker,
    PerformanceTestWorker,
    DocumentationWorker,
}

impl AgentRole {
    pub fn as_str(&self) -> &str {
        match self {
            AgentRole::Cto => "cto",
            AgentRole::Engineering => "engineering",
            AgentRole::Testing => "testing",
            AgentRole::Devops => "devops",
            AgentRole::Security => "security",
            AgentRole::Scribing => "scribing",
            AgentRole::FrontendWorker => "frontend_worker",
            AgentRole::BackendWorker => "backend_worker",
            AgentRole::FullstackWorker => "fullstack_worker",
            AgentRole::UnitTestWorker => "unit_test_worker",
            AgentRole::IntegrationTestWorker => "integration_test_worker",
            AgentRole::PerformanceTestWorker => "performance_test_worker",
            AgentRole::DocumentationWorker => "documentation_worker",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentLevel {
    L1Cto,
    L2DepartmentHead,
    L3Worker,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExecutionPhase {
    Design,
    Build,
    Test,
    Deploy,
    Document,
}

impl ExecutionPhase {
    pub fn next(&self) -> Option<ExecutionPhase> {
        match self {
            ExecutionPhase::Design => Some(ExecutionPhase::Build),
            ExecutionPhase::Build => Some(ExecutionPhase::Test),
            ExecutionPhase::Test => Some(ExecutionPhase::Deploy),
            ExecutionPhase::Deploy => Some(ExecutionPhase::Document),
            ExecutionPhase::Document => None,
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            ExecutionPhase::Design => "design",
            ExecutionPhase::Build => "build",
            ExecutionPhase::Test => "test",
            ExecutionPhase::Deploy => "deploy",
            ExecutionPhase::Document => "document",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub id: String,
    pub from_agent: String,
    pub to_agent: String,
    pub content: String,
    pub message_type: String, // "delegation", "result", "question", "status"
    pub timestamp: String,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentExecutionContext {
    pub run_id: String,
    pub project_id: String,
    pub workstream_id: String,
    pub user_request: String,
    pub current_phase: ExecutionPhase,
    pub agent_id: String,
    pub conversation: Vec<LlmMessage>,
    pub tool_results: Vec<McpToolResult>,
    pub delegations: Vec<DelegationRecord>,
    pub iteration: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DelegationRecord {
    pub id: String,
    pub from_agent: String,
    pub to_agent: String,
    pub task: String,
    pub status: String, // "pending", "in_progress", "completed", "failed"
    pub result: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub run_id: String,
    pub status: String,
    pub phases_completed: Vec<String>,
    pub agent_outputs: HashMap<String, String>,
    pub tool_calls_made: u32,
    pub delegations_made: u32,
    pub total_tokens_used: u32,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatus {
    pub agent_id: String,
    pub agent_name: String,
    pub role: String,
    pub status: String, // "idle", "thinking", "executing_tool", "delegating", "waiting", "done"
    pub current_task: Option<String>,
    pub iterations_used: u32,
    pub last_updated: String,
}

// ---------------------------------------------------------------------------
// Agent Runtime
// ---------------------------------------------------------------------------

pub struct AgentRuntime {
    agents: Mutex<HashMap<String, AgentDefinition>>,
    active_runs: Mutex<HashMap<String, AgentExecutionContext>>,
    agent_statuses: Mutex<HashMap<String, AgentStatus>>,
    messages: Mutex<Vec<AgentMessage>>,
}

impl AgentRuntime {
    pub fn new() -> Self {
        let runtime = Self {
            agents: Mutex::new(HashMap::new()),
            active_runs: Mutex::new(HashMap::new()),
            agent_statuses: Mutex::new(HashMap::new()),
            messages: Mutex::new(Vec::new()),
        };

        // Register default agents
        runtime.register_default_agents();

        runtime
    }

    fn register_default_agents(&self) {
        // These are registered by the agents module — see agents/mod.rs
        // This is just a placeholder for the runtime to start with no agents
    }

    /// Register an agent definition
    pub fn register_agent(&self, agent: AgentDefinition) {
        let id = agent.id.clone();
        let status = AgentStatus {
            agent_id: id.clone(),
            agent_name: agent.name.clone(),
            role: agent.role.as_str().to_string(),
            status: "idle".into(),
            current_task: None,
            iterations_used: 0,
            last_updated: chrono::Utc::now().to_rfc3339(),
        };

        let mut agents = self.agents.lock().unwrap();
        agents.insert(id.clone(), agent);

        let mut statuses = self.agent_statuses.lock().unwrap();
        statuses.insert(id, status);
    }

    /// Get an agent definition
    pub fn get_agent(&self, agent_id: &str) -> Option<AgentDefinition> {
        let agents = self.agents.lock().unwrap();
        agents.get(agent_id).cloned()
    }

    /// List all registered agents
    pub fn list_agents(&self) -> Vec<AgentDefinition> {
        let agents = self.agents.lock().unwrap();
        agents.values().cloned().collect()
    }

    /// Get agent status
    pub fn get_agent_status(&self, agent_id: &str) -> Option<AgentStatus> {
        let statuses = self.agent_statuses.lock().unwrap();
        statuses.get(agent_id).cloned()
    }

    /// List all agent statuses
    pub fn list_agent_statuses(&self) -> Vec<AgentStatus> {
        let statuses = self.agent_statuses.lock().unwrap();
        statuses.values().cloned().collect()
    }

    /// Update agent status
    pub fn update_agent_status(
        &self,
        agent_id: &str,
        status: &str,
        task: Option<String>,
    ) {
        let mut statuses = self.agent_statuses.lock().unwrap();
        if let Some(s) = statuses.get_mut(agent_id) {
            s.status = status.to_string();
            s.current_task = task;
            s.last_updated = chrono::Utc::now().to_rfc3339();
        }
    }

    /// Start a new execution run
    pub fn start_run(
        &self,
        project_id: &str,
        workstream_id: &str,
        user_request: &str,
        starting_agent_id: &str,
    ) -> AgentExecutionContext {
        let run_id = uuid::Uuid::new_v4().to_string();

        let ctx = AgentExecutionContext {
            run_id: run_id.clone(),
            project_id: project_id.to_string(),
            workstream_id: workstream_id.to_string(),
            user_request: user_request.to_string(),
            current_phase: ExecutionPhase::Design,
            agent_id: starting_agent_id.to_string(),
            conversation: Vec::new(),
            tool_results: Vec::new(),
            delegations: Vec::new(),
            iteration: 0,
        };

        let mut runs = self.active_runs.lock().unwrap();
        runs.insert(run_id, ctx.clone());

        ctx
    }

    /// Get an active run context
    pub fn get_run(&self, run_id: &str) -> Option<AgentExecutionContext> {
        let runs = self.active_runs.lock().unwrap();
        runs.get(run_id).cloned()
    }

    /// Advance phase in a run
    pub fn advance_phase(&self, run_id: &str) -> Option<ExecutionPhase> {
        let mut runs = self.active_runs.lock().unwrap();
        if let Some(ctx) = runs.get_mut(run_id) {
            if let Some(next) = ctx.current_phase.next() {
                ctx.current_phase = next.clone();
                return Some(next);
            }
        }
        None
    }

    /// Execute a single agent step (one LLM call + optional tool execution)
    pub async fn execute_agent_step(
        &self,
        run_id: &str,
        llm_manager: &LlmProviderManager,
        mcp_registry: &McpRegistry,
        security_engine: &SecurityEngine,
        audit_store: &AuditStore,
    ) -> Result<AgentStepResult, AgentRuntimeError> {
        // Get the run context
        let ctx = {
            let runs = self.active_runs.lock().unwrap();
            runs.get(run_id)
                .cloned()
                .ok_or(AgentRuntimeError::RunNotFound(run_id.into()))?
        };

        // Get the agent definition
        let agent = self
            .get_agent(&ctx.agent_id)
            .ok_or(AgentRuntimeError::AgentNotFound(ctx.agent_id.clone()))?;

        // Update status
        self.update_agent_status(&agent.id, "thinking", Some(ctx.user_request.clone()));

        // Security: scan user request for injection
        let injections = security_engine.scan_injection(&ctx.user_request, "user_request");
        if !injections.is_empty() {
            let msg = format!(
                "Blocked: {} prompt injection attempt(s) detected",
                injections.len()
            );
            self.update_agent_status(&agent.id, "blocked", Some(msg.clone()));
            return Err(AgentRuntimeError::SecurityBlock(msg));
        }

        // Build conversation messages
        let mut messages = vec![LlmMessage {
            role: "system".to_string(),
            content: agent.system_prompt.clone(),
        }];

        // Add existing conversation
        messages.extend(ctx.conversation.clone());

        // If first iteration, add user request
        if ctx.iteration == 0 {
            messages.push(LlmMessage {
                role: "user".to_string(),
                content: format!(
                    "[Phase: {}] User Request: {}",
                    ctx.current_phase.as_str(),
                    ctx.user_request
                ),
            });
        }

        // Get available tools for this agent's role
        let tools = mcp_registry.list_tools_for_role(agent.role.as_str());
        let tool_defs: Vec<ToolDefinition> = tools
            .iter()
            .map(|t| ToolDefinition {
                name: format!("{}.{}", t.server, t.name),
                description: t.description.clone(),
                parameters: t.parameters.clone(),
            })
            .collect();

        // Add delegation tool
        let mut all_tool_defs = tool_defs;
        if agent.level != AgentLevel::L3Worker {
            all_tool_defs.push(ToolDefinition {
                name: "delegate_to_agent".into(),
                description: "Delegate a sub-task to a department head or worker agent".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "target_agent_id": { "type": "string", "description": "ID of the agent to delegate to" },
                        "task": { "type": "string", "description": "Task description for the target agent" },
                        "context": { "type": "string", "description": "Additional context for the task" }
                    },
                    "required": ["target_agent_id", "task"]
                }),
            });
        }

        // Determine provider
        let provider_kind = match agent.provider.as_str() {
            "openai" => ProviderKind::OpenAI,
            "anthropic" => ProviderKind::Anthropic,
            "google" => ProviderKind::Google,
            _ => ProviderKind::OpenAI,
        };

        // Make the LLM call
        let request = ChatRequest {
            model: agent.model.clone(),
            messages,
            tools: all_tool_defs,
            temperature: agent.temperature,
            max_tokens: agent.max_tokens,
        };

        let response = llm_manager
            .chat(&provider_kind, &request)
            .await
            .map_err(|e| AgentRuntimeError::LlmError(e.to_string()))?;

        // Record the agent decision in audit
        let audit_event = AuditEvent {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            run_id: run_id.to_string(),
            workstream_id: ctx.workstream_id.clone(),
            project_id: ctx.project_id.clone(),
            event_type: "agent.decision".to_string(),
            actor: AuditActor {
                actor_type: "agent".to_string(),
                id: agent.id.clone(),
                role: Some(agent.role.as_str().to_string()),
                name: agent.name.clone(),
            },
            payload: serde_json::json!({
                "kind": "agent.decision",
                "phase": ctx.current_phase.as_str(),
                "iteration": ctx.iteration,
                "content": response.content,
                "tool_calls": response.tool_calls.len(),
                "tokens": response.usage,
            }),
            parent_event_id: None,
            span_id: None,
            trace_id: None,
        };
        audit_store.record_event(audit_event);

        // Process tool calls
        let mut tool_results = Vec::new();
        let mut delegations = Vec::new();

        for tc in &response.tool_calls {
            if tc.name == "delegate_to_agent" {
                // Handle delegation
                let target_id = tc.arguments["target_agent_id"]
                    .as_str()
                    .unwrap_or("")
                    .to_string();
                let task = tc.arguments["task"]
                    .as_str()
                    .unwrap_or("")
                    .to_string();

                let delegation = DelegationRecord {
                    id: uuid::Uuid::new_v4().to_string(),
                    from_agent: agent.id.clone(),
                    to_agent: target_id.clone(),
                    task: task.clone(),
                    status: "pending".into(),
                    result: None,
                    created_at: chrono::Utc::now().to_rfc3339(),
                    completed_at: None,
                };

                delegations.push(delegation);

                // Record delegation in audit
                let deleg_event = AuditEvent {
                    id: uuid::Uuid::new_v4().to_string(),
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    run_id: run_id.to_string(),
                    workstream_id: ctx.workstream_id.clone(),
                    project_id: ctx.project_id.clone(),
                    event_type: "agent.delegation".to_string(),
                    actor: AuditActor {
                        actor_type: "agent".to_string(),
                        id: agent.id.clone(),
                        role: Some(agent.role.as_str().to_string()),
                        name: agent.name.clone(),
                    },
                    payload: serde_json::json!({
                        "kind": "agent.delegation",
                        "target_agent": target_id,
                        "task": task,
                    }),
                    parent_event_id: None,
                    span_id: None,
                    trace_id: None,
                };
                audit_store.record_event(deleg_event);
            } else {
                // Execute MCP tool
                self.update_agent_status(
                    &agent.id,
                    "executing_tool",
                    Some(tc.name.clone()),
                );

                // Security: validate tool params
                let violations =
                    security_engine.validate_tool_params(&tc.name, &tc.arguments);
                if !violations.is_empty() {
                    tool_results.push(McpToolResult {
                        call_id: tc.id.clone(),
                        server: "security".into(),
                        tool: tc.name.clone(),
                        success: false,
                        output: serde_json::json!(null),
                        error: Some(format!(
                            "Security violation: {}",
                            violations[0].description
                        )),
                        duration_ms: 0,
                    });
                    continue;
                }

                // Parse server.tool format
                let parts: Vec<&str> = tc.name.splitn(2, '.').collect();
                if parts.len() == 2 {
                    // Re-join for dotted server names like "nebula.repository"
                    let tool_parts: Vec<&str> = tc.name.rsplitn(2, '.').collect();
                    let tool_name = tool_parts[0];
                    let server_name = tool_parts[1];

                    let result = mcp_registry
                        .execute_tool(
                            agent.role.as_str(),
                            server_name,
                            tool_name,
                            tc.arguments.clone(),
                        )
                        .await;

                    match result {
                        Ok(r) => {
                            // Record tool call in audit
                            let tool_event = AuditEvent {
                                id: uuid::Uuid::new_v4().to_string(),
                                timestamp: chrono::Utc::now().to_rfc3339(),
                                run_id: run_id.to_string(),
                                workstream_id: ctx.workstream_id.clone(),
                                project_id: ctx.project_id.clone(),
                                event_type: "tool.call".to_string(),
                                actor: AuditActor {
                                    actor_type: "agent".to_string(),
                                    id: agent.id.clone(),
                                    role: Some(agent.role.as_str().to_string()),
                                    name: agent.name.clone(),
                                },
                                payload: serde_json::json!({
                                    "kind": "tool.call",
                                    "tool": tc.name,
                                    "success": r.success,
                                    "duration_ms": r.duration_ms,
                                }),
                                parent_event_id: None,
                                span_id: None,
                                trace_id: None,
                            };
                            audit_store.record_event(tool_event);

                            tool_results.push(r);
                        }
                        Err(e) => {
                            tool_results.push(McpToolResult {
                                call_id: tc.id.clone(),
                                server: server_name.into(),
                                tool: tool_name.into(),
                                success: false,
                                output: serde_json::json!(null),
                                error: Some(e.to_string()),
                                duration_ms: 0,
                            });
                        }
                    }
                }
            }
        }

        // Update run context
        {
            let mut runs = self.active_runs.lock().unwrap();
            if let Some(run_ctx) = runs.get_mut(run_id) {
                run_ctx.iteration += 1;
                run_ctx.tool_results.extend(tool_results.clone());
                run_ctx.delegations.extend(delegations.clone());

                // Add assistant message to conversation
                run_ctx.conversation.push(LlmMessage {
                    role: "assistant".to_string(),
                    content: response.content.clone(),
                });

                // If there were tool results, add them as context
                if !tool_results.is_empty() {
                    let tool_output = tool_results
                        .iter()
                        .map(|r| {
                            format!(
                                "[Tool: {}.{}] Success: {} Output: {}",
                                r.server,
                                r.tool,
                                r.success,
                                serde_json::to_string(&r.output).unwrap_or_default()
                            )
                        })
                        .collect::<Vec<_>>()
                        .join("\n");

                    run_ctx.conversation.push(LlmMessage {
                        role: "user".to_string(),
                        content: format!("Tool results:\n{}", tool_output),
                    });
                }
            }
        }

        // Determine if we need more iterations
        let needs_more = !response.tool_calls.is_empty() && ctx.iteration < agent.max_iterations;

        self.update_agent_status(
            &agent.id,
            if needs_more { "thinking" } else { "done" },
            None,
        );

        Ok(AgentStepResult {
            agent_id: agent.id,
            response_content: response.content,
            tool_results,
            delegations,
            tokens_used: response.usage.total_tokens,
            phase: ctx.current_phase.as_str().to_string(),
            iteration: ctx.iteration,
            needs_more_iterations: needs_more,
            finish_reason: response.finish_reason,
        })
    }

    /// Complete a run
    pub fn complete_run(&self, run_id: &str, status: &str) -> Option<ExecutionResult> {
        let mut runs = self.active_runs.lock().unwrap();
        let ctx = runs.remove(run_id)?;

        Some(ExecutionResult {
            run_id: run_id.to_string(),
            status: status.to_string(),
            phases_completed: vec![ctx.current_phase.as_str().to_string()],
            agent_outputs: HashMap::new(),
            tool_calls_made: ctx.tool_results.len() as u32,
            delegations_made: ctx.delegations.len() as u32,
            total_tokens_used: 0,
            duration_ms: 0,
        })
    }

    /// Send a message between agents
    pub fn send_agent_message(
        &self,
        from_agent: &str,
        to_agent: &str,
        content: &str,
        message_type: &str,
    ) -> AgentMessage {
        let msg = AgentMessage {
            id: uuid::Uuid::new_v4().to_string(),
            from_agent: from_agent.to_string(),
            to_agent: to_agent.to_string(),
            content: content.to_string(),
            message_type: message_type.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            metadata: HashMap::new(),
        };

        let mut messages = self.messages.lock().unwrap();
        messages.push(msg.clone());
        msg
    }

    /// Get messages for an agent
    pub fn get_agent_messages(&self, agent_id: &str) -> Vec<AgentMessage> {
        let messages = self.messages.lock().unwrap();
        messages
            .iter()
            .filter(|m| m.to_agent == agent_id || m.from_agent == agent_id)
            .cloned()
            .collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStepResult {
    pub agent_id: String,
    pub response_content: String,
    pub tool_results: Vec<McpToolResult>,
    pub delegations: Vec<DelegationRecord>,
    pub tokens_used: u32,
    pub phase: String,
    pub iteration: u32,
    pub needs_more_iterations: bool,
    pub finish_reason: String,
}

#[derive(Debug, thiserror::Error)]
pub enum AgentRuntimeError {
    #[error("Run not found: {0}")]
    RunNotFound(String),
    #[error("Agent not found: {0}")]
    AgentNotFound(String),
    #[error("LLM error: {0}")]
    LlmError(String),
    #[error("Security block: {0}")]
    SecurityBlock(String),
    #[error("Max iterations reached")]
    MaxIterations,
}

impl Serialize for AgentRuntimeError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
