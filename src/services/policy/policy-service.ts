/**
 * Policy Service — Phase 0/4
 *
 * Client-side policy engine that mirrors the Rust backend.
 * Evaluates permissions for agents before tool execution.
 */

import type { NebulaPolicy, AgentRole, Gate, GateType } from "@/types/policy";
import { createDefaultPolicy } from "@/types/policy";

export class PolicyService {
  private policies: Map<string, NebulaPolicy> = new Map();

  /**
   * Load or create policy for a project
   */
  getOrCreatePolicy(projectId: string, projectName: string): NebulaPolicy {
    const existing = this.policies.get(projectId);
    if (existing) return existing;

    const policy = createDefaultPolicy(projectId, projectName);
    this.policies.set(projectId, policy);
    return policy;
  }

  /**
   * Update a project's policy
   */
  updatePolicy(projectId: string, policy: NebulaPolicy): void {
    policy.updatedAt = new Date().toISOString();
    this.policies.set(projectId, policy);
  }

  /**
   * Check if an agent can perform an action
   */
  canAgentPerform(
    projectId: string,
    agentRole: AgentRole,
    action: string,
    resource: string
  ): PolicyDecision {
    const policy = this.policies.get(projectId);
    if (!policy) {
      return { allowed: false, reason: "No policy found" };
    }

    // Check role-specific permissions
    const rolePerms = policy.toolPermissions.rolePermissions[agentRole];
    if (rolePerms) {
      for (const perm of rolePerms) {
        if (matchesTool(action, perm.toolId) && matchesScope(resource, perm.resourceScope)) {
          return { allowed: true, reason: `Allowed by ${agentRole} role permissions` };
        }
      }
    }

    // Check default permissions
    for (const perm of policy.toolPermissions.defaultPermissions) {
      if (matchesTool(action, perm.toolId) && matchesScope(resource, perm.resourceScope)) {
        return { allowed: true, reason: "Allowed by default permissions" };
      }
    }

    return {
      allowed: false,
      reason: `No permission for ${agentRole} to ${action} on ${resource}`,
    };
  }

  /**
   * Check if merge to main is allowed
   */
  canMergeToMain(projectId: string, agentRole: AgentRole): PolicyDecision {
    const policy = this.policies.get(projectId);
    if (!policy) return { allowed: false, reason: "No policy found" };

    const mergePolicy = policy.agents.mergeToMain;
    if (!mergePolicy.allowed) {
      return { allowed: false, reason: "Merge to main is disabled" };
    }

    if (!mergePolicy.allowedAgentRoles.includes(agentRole)) {
      return { allowed: false, reason: `Role ${agentRole} cannot merge to main` };
    }

    return { allowed: true, reason: "Merge permitted" };
  }

  /**
   * Check if deployment to an environment is allowed
   */
  canDeploy(
    projectId: string,
    agentRole: AgentRole,
    environment: "preview" | "staging" | "production"
  ): PolicyDecision {
    const policy = this.policies.get(projectId);
    if (!policy) return { allowed: false, reason: "No policy found" };

    const envPolicy = policy.deployment.environments[environment];
    if (!envPolicy || !envPolicy.enabled) {
      return { allowed: false, reason: `Environment ${environment} is disabled` };
    }

    if (!envPolicy.autoDeployAllowed) {
      return { allowed: false, reason: `Auto-deploy to ${environment} is disabled` };
    }

    const deployPerm = policy.agents.deployPermissions[environment];
    if (!deployPerm?.allowed || !deployPerm.allowedAgentRoles.includes(agentRole)) {
      return { allowed: false, reason: `Role ${agentRole} cannot deploy to ${environment}` };
    }

    return { allowed: true, reason: "Deployment permitted" };
  }

  /**
   * Get required gates for an action
   */
  getRequiredGates(
    projectId: string,
    action: "merge" | "deploy"
  ): Gate[] {
    const policy = this.policies.get(projectId);
    if (!policy) return [];

    return action === "merge"
      ? policy.gates.mergeGates.filter((g) => g.required)
      : policy.gates.deployGates.filter((g) => g.required);
  }

  /**
   * Evaluate gates for a set of results
   */
  evaluateGates(
    projectId: string,
    action: "merge" | "deploy",
    results: Map<string, boolean>
  ): GateEvaluation {
    const requiredGates = this.getRequiredGates(projectId, action);
    const failures: string[] = [];
    const passes: string[] = [];

    for (const gate of requiredGates) {
      const passed = results.get(gate.id);
      if (passed === undefined || !passed) {
        failures.push(gate.name);
      } else {
        passes.push(gate.name);
      }
    }

    return {
      passed: failures.length === 0,
      totalGates: requiredGates.length,
      passedGates: passes,
      failedGates: failures,
    };
  }
}

interface PolicyDecision {
  allowed: boolean;
  reason: string;
}

interface GateEvaluation {
  passed: boolean;
  totalGates: number;
  passedGates: string[];
  failedGates: string[];
}

function matchesTool(action: string, pattern: string): boolean {
  if (pattern.endsWith(".*")) {
    return action.startsWith(pattern.slice(0, -2));
  }
  if (pattern === "*" || pattern === "**") return true;
  return action === pattern;
}

function matchesScope(resource: string, scopes: string[]): boolean {
  for (const scope of scopes) {
    if (scope === "**") return true;
    if (resource.startsWith(scope.replace("**", ""))) return true;
    if (resource === scope) return true;
  }
  return false;
}
