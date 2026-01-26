use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

/// Policy engine — enforces what agents can do per project.
/// Machine-enforced, versioned policy file per project.
pub struct PolicyEngine {
    policies: Mutex<HashMap<String, NebulaPolicy>>,
}

impl PolicyEngine {
    pub fn new() -> Self {
        Self {
            policies: Mutex::new(HashMap::new()),
        }
    }

    pub fn get_policy(&self, project_id: &str) -> Option<NebulaPolicy> {
        let policies = self.policies.lock().unwrap();
        policies.get(project_id).cloned()
    }

    pub fn set_policy(&self, project_id: &str, policy: NebulaPolicy) {
        let mut policies = self.policies.lock().unwrap();
        policies.insert(project_id.to_string(), policy);
    }

    pub fn evaluate_permission(
        &self,
        project_id: &str,
        agent_role: &str,
        action: &str,
        resource: &str,
    ) -> PolicyDecision {
        let policies = self.policies.lock().unwrap();
        let policy = match policies.get(project_id) {
            Some(p) => p,
            None => {
                return PolicyDecision {
                    allowed: false,
                    reason: "No policy found for project".to_string(),
                }
            }
        };

        // Check tool permissions
        if let Some(role_perms) = policy.tool_permissions.role_permissions.get(agent_role) {
            for perm in role_perms {
                if matches_tool(action, &perm.tool_id) && matches_scope(resource, &perm.resource_scope)
                {
                    return PolicyDecision {
                        allowed: true,
                        reason: format!("Allowed by role permission for {}", agent_role),
                    };
                }
            }
        }

        // Check default permissions
        for perm in &policy.tool_permissions.default_permissions {
            if matches_tool(action, &perm.tool_id) && matches_scope(resource, &perm.resource_scope) {
                return PolicyDecision {
                    allowed: true,
                    reason: "Allowed by default permission".to_string(),
                };
            }
        }

        PolicyDecision {
            allowed: false,
            reason: format!(
                "No matching permission for agent={}, action={}, resource={}",
                agent_role, action, resource
            ),
        }
    }
}

fn matches_tool(action: &str, pattern: &str) -> bool {
    if pattern.ends_with(".*") {
        let prefix = &pattern[..pattern.len() - 2];
        action.starts_with(prefix)
    } else {
        action == pattern
    }
}

fn matches_scope(resource: &str, scopes: &[String]) -> bool {
    for scope in scopes {
        if scope == "**" {
            return true;
        }
        if resource.starts_with(scope.trim_end_matches("**")) {
            return true;
        }
        if resource == scope {
            return true;
        }
    }
    false
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyDecision {
    pub allowed: bool,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NebulaPolicy {
    pub version: String,
    pub project_id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
    pub agents: AgentPolicy,
    pub repositories: RepositoryPolicy,
    pub deployment: DeploymentPolicy,
    pub gates: GatePolicy,
    pub data_classification: DataClassificationPolicy,
    pub tool_permissions: ToolPermissionPolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPolicy {
    pub merge_to_main: AgentPermission,
    pub deploy_permissions: HashMap<String, AgentPermission>,
    pub max_concurrent_runs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPermission {
    pub allowed: bool,
    pub allowed_agent_roles: Vec<String>,
    pub require_approval: bool,
    pub approvers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryPolicy {
    pub default_access: String,
    pub write_scopes: Vec<RepositoryWriteScope>,
    pub auto_merge_branches: Vec<String>,
    pub branch_pattern: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryWriteScope {
    pub repository_pattern: String,
    pub allowed_paths: Vec<String>,
    pub denied_paths: Vec<String>,
    pub allowed_agent_roles: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentPolicy {
    pub environments: HashMap<String, EnvironmentPolicy>,
    pub progressive_delivery: ProgressiveDeliveryPolicy,
    pub rollback: RollbackPolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentPolicy {
    pub enabled: bool,
    pub auto_deploy_allowed: bool,
    pub required_gates: Vec<String>,
    pub max_blast_radius: f64,
    pub deployment_strategy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressiveDeliveryPolicy {
    pub canary_steps: Vec<f64>,
    pub step_interval: u64,
    pub evaluation_metrics: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackPolicy {
    pub auto_rollback: bool,
    pub triggers: Vec<RollbackTrigger>,
    pub rollback_timeout: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollbackTrigger {
    pub metric: String,
    pub condition: String,
    pub threshold: f64,
    pub window: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatePolicy {
    pub merge_gates: Vec<Gate>,
    pub deploy_gates: Vec<Gate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gate {
    pub id: String,
    pub name: String,
    pub gate_type: String,
    pub required: bool,
    pub config: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataClassificationPolicy {
    pub default_classification: String,
    pub provider_rules: Vec<ProviderDataRule>,
    pub redaction_patterns: Vec<RedactionPattern>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderDataRule {
    pub provider: String,
    pub allowed_classifications: Vec<String>,
    pub data_retention_days: u32,
    pub encryption_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedactionPattern {
    pub name: String,
    pub pattern: String,
    pub replacement: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolPermissionPolicy {
    pub default_permissions: Vec<ToolPermission>,
    pub role_permissions: HashMap<String, Vec<ToolPermission>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolPermission {
    pub tool_id: String,
    pub operations: Vec<String>,
    pub resource_scope: Vec<String>,
}
