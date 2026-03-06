use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// MCP Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolDefinition {
    pub server: String,
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolCall {
    pub id: String,
    pub server: String,
    pub tool: String,
    pub arguments: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolResult {
    pub call_id: String,
    pub server: String,
    pub tool: String,
    pub success: bool,
    pub output: serde_json::Value,
    pub error: Option<String>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpPermission {
    pub tool_pattern: String,
    pub operations: Vec<String>,
    pub resource_scopes: Vec<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum McpError {
    #[error("Server not found: {0}")]
    ServerNotFound(String),
    #[error("Tool not found: {0}.{1}")]
    ToolNotFound(String, String),
    #[error("Permission denied: agent={0} tool={1}.{2}")]
    PermissionDenied(String, String, String),
    #[error("Execution error: {0}")]
    ExecutionError(String),
}

impl Serialize for McpError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ---------------------------------------------------------------------------
// MCP Server trait
// ---------------------------------------------------------------------------

#[async_trait]
pub trait McpServer: Send + Sync {
    fn server_name(&self) -> &str;
    fn list_tools(&self) -> Vec<McpToolDefinition>;
    async fn execute_tool(
        &self,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value, McpError>;
}

// ---------------------------------------------------------------------------
// Built-in MCP Servers
// ---------------------------------------------------------------------------

/// Repository MCP Server — git operations
pub struct RepositoryMcpServer {
    name: String,
}

impl RepositoryMcpServer {
    pub fn new() -> Self {
        Self {
            name: "nebula.repository".into(),
        }
    }
}

#[async_trait]
impl McpServer for RepositoryMcpServer {
    fn server_name(&self) -> &str {
        &self.name
    }

    fn list_tools(&self) -> Vec<McpToolDefinition> {
        vec![
            McpToolDefinition {
                server: self.name.clone(),
                name: "read_file".into(),
                description: "Read file contents at a given path".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": { "type": "string", "description": "File path relative to repo root" },
                        "ref": { "type": "string", "description": "Git ref (branch/commit)" }
                    },
                    "required": ["path"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "write_file".into(),
                description: "Write content to a file".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": { "type": "string" },
                        "content": { "type": "string" }
                    },
                    "required": ["path", "content"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "create_branch".into(),
                description: "Create a new git branch".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "branch_name": { "type": "string" },
                        "from_ref": { "type": "string" }
                    },
                    "required": ["branch_name"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "commit".into(),
                description: "Stage and commit changes".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "message": { "type": "string" },
                        "files": { "type": "array", "items": { "type": "string" } }
                    },
                    "required": ["message"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "diff".into(),
                description: "Get diff of changes".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "staged": { "type": "boolean" },
                        "ref_from": { "type": "string" },
                        "ref_to": { "type": "string" }
                    }
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "merge".into(),
                description: "Merge a branch into current".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "source_branch": { "type": "string" },
                        "strategy": { "type": "string" }
                    },
                    "required": ["source_branch"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "run_command".into(),
                description: "Run a shell command in the repo directory".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "command": { "type": "string" },
                        "timeout_secs": { "type": "integer" }
                    },
                    "required": ["command"]
                }),
            },
        ]
    }

    async fn execute_tool(
        &self,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value, McpError> {
        // Delegate to git_ops via shell commands
        match tool_name {
            "read_file" | "write_file" | "create_branch" | "commit" | "diff" | "merge"
            | "run_command" => Ok(serde_json::json!({
                "status": "delegated",
                "tool": tool_name,
                "arguments": arguments,
                "note": "Execution delegated to git_ops engine"
            })),
            _ => Err(McpError::ToolNotFound(
                self.name.clone(),
                tool_name.into(),
            )),
        }
    }
}

/// Documentation MCP Server — Obsidian vault operations
pub struct DocumentationMcpServer {
    name: String,
}

impl DocumentationMcpServer {
    pub fn new() -> Self {
        Self {
            name: "nebula.documentation".into(),
        }
    }
}

#[async_trait]
impl McpServer for DocumentationMcpServer {
    fn server_name(&self) -> &str {
        &self.name
    }

    fn list_tools(&self) -> Vec<McpToolDefinition> {
        vec![
            McpToolDefinition {
                server: self.name.clone(),
                name: "read_note".into(),
                description: "Read a note from the Obsidian vault".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": { "type": "string" },
                        "project_id": { "type": "string" }
                    },
                    "required": ["path", "project_id"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "write_note".into(),
                description: "Write a note to the vault with frontmatter".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": { "type": "string" },
                        "project_id": { "type": "string" },
                        "frontmatter": { "type": "object" },
                        "content": { "type": "string" }
                    },
                    "required": ["path", "project_id", "content"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "list_notes".into(),
                description: "List all notes in a vault directory".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "project_id": { "type": "string" },
                        "directory": { "type": "string" }
                    },
                    "required": ["project_id"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "consolidate_notes".into(),
                description: "Consolidate Level 0 notes into Level 1/2 summaries".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "project_id": { "type": "string" },
                        "source_level": { "type": "integer" },
                        "target_level": { "type": "integer" }
                    },
                    "required": ["project_id", "source_level", "target_level"]
                }),
            },
        ]
    }

    async fn execute_tool(
        &self,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value, McpError> {
        match tool_name {
            "read_note" | "write_note" | "list_notes" | "consolidate_notes" => {
                Ok(serde_json::json!({
                    "status": "delegated",
                    "tool": tool_name,
                    "arguments": arguments,
                    "note": "Execution delegated to vault manager"
                }))
            }
            _ => Err(McpError::ToolNotFound(self.name.clone(), tool_name.into())),
        }
    }
}

/// Linear MCP Server — issue tracking
pub struct LinearMcpServer {
    name: String,
}

impl LinearMcpServer {
    pub fn new() -> Self {
        Self {
            name: "nebula.linear".into(),
        }
    }
}

#[async_trait]
impl McpServer for LinearMcpServer {
    fn server_name(&self) -> &str {
        &self.name
    }

    fn list_tools(&self) -> Vec<McpToolDefinition> {
        vec![
            McpToolDefinition {
                server: self.name.clone(),
                name: "create_issue".into(),
                description: "Create a Linear issue".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "title": { "type": "string" },
                        "description": { "type": "string" },
                        "priority": { "type": "integer", "minimum": 0, "maximum": 4 },
                        "labels": { "type": "array", "items": { "type": "string" } },
                        "team_id": { "type": "string" }
                    },
                    "required": ["title"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "update_issue".into(),
                description: "Update a Linear issue status".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "issue_id": { "type": "string" },
                        "status": { "type": "string" },
                        "comment": { "type": "string" }
                    },
                    "required": ["issue_id"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "list_issues".into(),
                description: "List issues with filters".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "status": { "type": "string" },
                        "assignee": { "type": "string" },
                        "limit": { "type": "integer" }
                    }
                }),
            },
        ]
    }

    async fn execute_tool(
        &self,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value, McpError> {
        match tool_name {
            "create_issue" | "update_issue" | "list_issues" => Ok(serde_json::json!({
                "status": "delegated",
                "tool": tool_name,
                "arguments": arguments,
                "note": "Execution delegated to Linear service"
            })),
            _ => Err(McpError::ToolNotFound(self.name.clone(), tool_name.into())),
        }
    }
}

/// Deployment MCP Server
pub struct DeploymentMcpServer {
    name: String,
}

impl DeploymentMcpServer {
    pub fn new() -> Self {
        Self {
            name: "nebula.deployment".into(),
        }
    }
}

#[async_trait]
impl McpServer for DeploymentMcpServer {
    fn server_name(&self) -> &str {
        &self.name
    }

    fn list_tools(&self) -> Vec<McpToolDefinition> {
        vec![
            McpToolDefinition {
                server: self.name.clone(),
                name: "deploy".into(),
                description: "Deploy a service to an environment".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "service": { "type": "string" },
                        "environment": { "type": "string" },
                        "strategy": { "type": "string", "enum": ["rolling", "canary", "blue-green"] },
                        "image_tag": { "type": "string" }
                    },
                    "required": ["service", "environment"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "status".into(),
                description: "Get deployment status".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "deployment_id": { "type": "string" }
                    },
                    "required": ["deployment_id"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "rollback".into(),
                description: "Rollback a deployment".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "deployment_id": { "type": "string" },
                        "target_revision": { "type": "string" }
                    },
                    "required": ["deployment_id"]
                }),
            },
        ]
    }

    async fn execute_tool(
        &self,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value, McpError> {
        match tool_name {
            "deploy" | "status" | "rollback" => Ok(serde_json::json!({
                "status": "delegated",
                "tool": tool_name,
                "arguments": arguments,
                "note": "Execution delegated to deployment engine"
            })),
            _ => Err(McpError::ToolNotFound(self.name.clone(), tool_name.into())),
        }
    }
}

/// Observability MCP Server
pub struct ObservabilityMcpServer {
    name: String,
}

impl ObservabilityMcpServer {
    pub fn new() -> Self {
        Self {
            name: "nebula.observability".into(),
        }
    }
}

#[async_trait]
impl McpServer for ObservabilityMcpServer {
    fn server_name(&self) -> &str {
        &self.name
    }

    fn list_tools(&self) -> Vec<McpToolDefinition> {
        vec![
            McpToolDefinition {
                server: self.name.clone(),
                name: "query_traces".into(),
                description: "Query distributed traces".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "service": { "type": "string" },
                        "time_range": { "type": "string" },
                        "limit": { "type": "integer" }
                    },
                    "required": ["service"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "query_metrics".into(),
                description: "Query service metrics".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "metric_name": { "type": "string" },
                        "service": { "type": "string" },
                        "time_range": { "type": "string" }
                    },
                    "required": ["metric_name"]
                }),
            },
            McpToolDefinition {
                server: self.name.clone(),
                name: "query_logs".into(),
                description: "Query structured logs".into(),
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "service": { "type": "string" },
                        "level": { "type": "string" },
                        "query": { "type": "string" },
                        "time_range": { "type": "string" }
                    },
                    "required": ["service"]
                }),
            },
        ]
    }

    async fn execute_tool(
        &self,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<serde_json::Value, McpError> {
        match tool_name {
            "query_traces" | "query_metrics" | "query_logs" => Ok(serde_json::json!({
                "status": "delegated",
                "tool": tool_name,
                "arguments": arguments,
                "note": "Execution delegated to telemetry engine"
            })),
            _ => Err(McpError::ToolNotFound(self.name.clone(), tool_name.into())),
        }
    }
}

// ---------------------------------------------------------------------------
// MCP Registry — manages all servers with role-based permissions
// ---------------------------------------------------------------------------

pub struct McpRegistry {
    servers: Mutex<HashMap<String, Box<dyn McpServer>>>,
    role_permissions: Mutex<HashMap<String, Vec<McpPermission>>>,
}

impl McpRegistry {
    pub fn new() -> Self {
        Self {
            servers: Mutex::new(HashMap::new()),
            role_permissions: Mutex::new(Self::default_role_permissions()),
        }
    }

    pub fn register_server(&self, server: Box<dyn McpServer>) {
        let name = server.server_name().to_string();
        let mut servers = self.servers.lock().unwrap();
        servers.insert(name, server);
    }

    pub fn register_defaults(&self) {
        self.register_server(Box::new(RepositoryMcpServer::new()));
        self.register_server(Box::new(DocumentationMcpServer::new()));
        self.register_server(Box::new(LinearMcpServer::new()));
        self.register_server(Box::new(DeploymentMcpServer::new()));
        self.register_server(Box::new(ObservabilityMcpServer::new()));
    }

    pub fn list_all_tools(&self) -> Vec<McpToolDefinition> {
        let servers = self.servers.lock().unwrap();
        servers.values().flat_map(|s| s.list_tools()).collect()
    }

    pub fn list_tools_for_role(&self, role: &str) -> Vec<McpToolDefinition> {
        let all_tools = self.list_all_tools();
        let perms = self.role_permissions.lock().unwrap();
        let role_perms = match perms.get(role) {
            Some(p) => p.clone(),
            None => return Vec::new(),
        };

        all_tools
            .into_iter()
            .filter(|tool| {
                let full_name = format!("{}.{}", tool.server, tool.name);
                role_perms.iter().any(|p| matches_pattern(&full_name, &p.tool_pattern))
            })
            .collect()
    }

    pub async fn execute_tool(
        &self,
        agent_role: &str,
        server_name: &str,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<McpToolResult, McpError> {
        // Check permissions — drop guard before any await
        let full_name = format!("{}.{}", server_name, tool_name);
        {
            let perms = self.role_permissions.lock().unwrap();
            let role_perms = perms.get(agent_role);
            let allowed = role_perms.map_or(false, |rp| {
                rp.iter().any(|p| matches_pattern(&full_name, &p.tool_pattern))
            });
            if !allowed {
                return Err(McpError::PermissionDenied(
                    agent_role.into(),
                    server_name.into(),
                    tool_name.into(),
                ));
            }
        } // perms guard dropped here

        // Check server exists and get the tool list (no await while holding lock)
        let server_exists = {
            let servers = self.servers.lock().unwrap();
            servers.contains_key(server_name)
        };

        if !server_exists {
            return Err(McpError::ServerNotFound(server_name.into()));
        }

        // Execute tool — for built-in servers, the result is synchronous JSON
        // We build the result outside the lock to satisfy Send requirements
        let start = std::time::Instant::now();
        let exec_result = {
            let servers = self.servers.lock().unwrap();
            let server = servers.get(server_name).unwrap();
            // All built-in MCP servers return immediately (no real async I/O)
            // Use block_in_place for the async trait method
            let tool_name_owned = tool_name.to_string();
            let args_clone = arguments.clone();

            // Since our MCP servers don't do real async work, we can safely
            // build a synchronous result. We call the method and get a future,
            // but we need to handle it without holding the guard across await.
            // For now, return the delegation JSON directly.
            let tools = server.list_tools();
            let tool_exists = tools.iter().any(|t| t.name == tool_name_owned);
            if tool_exists {
                Ok(serde_json::json!({
                    "status": "delegated",
                    "server": server_name,
                    "tool": tool_name_owned,
                    "arguments": args_clone,
                    "note": "Execution delegated to backend engine"
                }))
            } else {
                Err(McpError::ToolNotFound(server_name.to_string(), tool_name_owned))
            }
        }; // servers guard dropped here

        let duration = start.elapsed().as_millis() as u64;

        match exec_result {
            Ok(output) => Ok(McpToolResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                server: server_name.into(),
                tool: tool_name.into(),
                success: true,
                output,
                error: None,
                duration_ms: duration,
            }),
            Err(e) => Ok(McpToolResult {
                call_id: uuid::Uuid::new_v4().to_string(),
                server: server_name.into(),
                tool: tool_name.into(),
                success: false,
                output: serde_json::json!(null),
                error: Some(e.to_string()),
                duration_ms: duration,
            }),
        }
    }

    fn default_role_permissions() -> HashMap<String, Vec<McpPermission>> {
        let mut perms = HashMap::new();

        // CTO — full access to everything
        perms.insert(
            "cto".into(),
            vec![McpPermission {
                tool_pattern: "**".into(),
                operations: vec!["*".into()],
                resource_scopes: vec!["**".into()],
            }],
        );

        // Engineering Head — repo, docs, linear
        perms.insert(
            "engineering".into(),
            vec![
                McpPermission {
                    tool_pattern: "nebula.repository.*".into(),
                    operations: vec!["read".into(), "write".into(), "execute".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.documentation.*".into(),
                    operations: vec!["read".into(), "write".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.linear.*".into(),
                    operations: vec!["read".into(), "write".into()],
                    resource_scopes: vec!["**".into()],
                },
            ],
        );

        // Testing Head — repo (read), run tests
        perms.insert(
            "testing".into(),
            vec![
                McpPermission {
                    tool_pattern: "nebula.repository.read_file".into(),
                    operations: vec!["read".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.repository.run_command".into(),
                    operations: vec!["execute".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.repository.diff".into(),
                    operations: vec!["read".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.linear.*".into(),
                    operations: vec!["read".into(), "write".into()],
                    resource_scopes: vec!["**".into()],
                },
            ],
        );

        // DevOps Head — deployment, observability, repo (read)
        perms.insert(
            "devops".into(),
            vec![
                McpPermission {
                    tool_pattern: "nebula.deployment.*".into(),
                    operations: vec!["*".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.observability.*".into(),
                    operations: vec!["read".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.repository.read_file".into(),
                    operations: vec!["read".into()],
                    resource_scopes: vec!["**".into()],
                },
            ],
        );

        // Security Head — repo (read), observability
        perms.insert(
            "security".into(),
            vec![
                McpPermission {
                    tool_pattern: "nebula.repository.read_file".into(),
                    operations: vec!["read".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.repository.run_command".into(),
                    operations: vec!["execute".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.observability.*".into(),
                    operations: vec!["read".into()],
                    resource_scopes: vec!["**".into()],
                },
            ],
        );

        // Scribing Head — docs (full), repo (read)
        perms.insert(
            "scribing".into(),
            vec![
                McpPermission {
                    tool_pattern: "nebula.documentation.*".into(),
                    operations: vec!["*".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.repository.read_file".into(),
                    operations: vec!["read".into()],
                    resource_scopes: vec!["**".into()],
                },
                McpPermission {
                    tool_pattern: "nebula.linear.*".into(),
                    operations: vec!["read".into()],
                    resource_scopes: vec!["**".into()],
                },
            ],
        );

        perms
    }
}

fn matches_pattern(name: &str, pattern: &str) -> bool {
    if pattern == "**" || pattern == "*" {
        return true;
    }
    if pattern.ends_with(".*") {
        let prefix = &pattern[..pattern.len() - 2];
        return name.starts_with(prefix);
    }
    if pattern.ends_with(".**") {
        let prefix = &pattern[..pattern.len() - 3];
        return name.starts_with(prefix);
    }
    name == pattern
}
