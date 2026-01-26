/**
 * Nebula Policy Schema v1
 *
 * Machine-enforced policy per project that defines what agents can do.
 * This is the core governance mechanism for autonomous operations.
 */

export interface NebulaPolicy {
  version: "1.0";
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;

  /** Agent-level permissions */
  agents: AgentPolicy;

  /** Repository access controls */
  repositories: RepositoryPolicy;

  /** Deployment controls */
  deployment: DeploymentPolicy;

  /** Required gates before merge/deploy */
  gates: GatePolicy;

  /** Data classification and model routing */
  dataClassification: DataClassificationPolicy;

  /** Tool permissions per agent */
  toolPermissions: ToolPermissionPolicy;
}

export interface AgentPolicy {
  /** Which agents can merge to main branch */
  mergeToMain: AgentPermission;

  /** Which agents can deploy to environments */
  deployPermissions: Record<Environment, AgentPermission>;

  /** Maximum concurrent agent runs */
  maxConcurrentRuns: number;

  /** Agent-specific overrides */
  overrides: Record<string, AgentOverride>;
}

export interface AgentPermission {
  allowed: boolean;
  allowedAgentRoles: AgentRole[];
  requireApproval: boolean;
  approvers: string[];
}

export type AgentRole =
  | "cto"
  | "engineering-head"
  | "testing-head"
  | "devops-head"
  | "security-head"
  | "scribing-head"
  | "frontend-worker"
  | "backend-worker"
  | "fullstack-worker"
  | "unit-test-worker"
  | "integration-test-worker"
  | "performance-test-worker"
  | "pentest-worker"
  | "documentation-worker";

export interface AgentOverride {
  agentId: string;
  role: AgentRole;
  additionalPermissions?: string[];
  restrictions?: string[];
}

export interface RepositoryPolicy {
  /** Default repository access mode */
  defaultAccess: "read" | "read-write";

  /** Per-repository write scopes */
  writeScopes: RepositoryWriteScope[];

  /** Branches that can be merged to automatically */
  autoMergeBranches: string[];

  /** Branch naming convention */
  branchPattern: string;
}

export interface RepositoryWriteScope {
  repositoryPattern: string;
  allowedPaths: string[];
  deniedPaths: string[];
  allowedAgentRoles: AgentRole[];
}

export type Environment = "preview" | "staging" | "production";

export interface DeploymentPolicy {
  /** Environments and their deployment controls */
  environments: Record<Environment, EnvironmentPolicy>;

  /** Progressive delivery configuration */
  progressiveDelivery: ProgressiveDeliveryPolicy;

  /** Rollback configuration */
  rollback: RollbackPolicy;
}

export interface EnvironmentPolicy {
  enabled: boolean;
  autoDeployAllowed: boolean;
  requiredGates: string[];
  maxBlastRadius: number;
  deploymentStrategy: "canary" | "blue-green" | "rolling" | "slot-swap";
}

export interface ProgressiveDeliveryPolicy {
  /** Canary step sizes (percentages) */
  canarySteps: number[];

  /** Time between canary steps (seconds) */
  stepInterval: number;

  /** Metrics to evaluate at each step */
  evaluationMetrics: string[];
}

export interface RollbackPolicy {
  /** Automatic rollback enabled */
  autoRollback: boolean;

  /** Conditions that trigger rollback */
  triggers: RollbackTrigger[];

  /** Maximum time to wait before rollback (seconds) */
  rollbackTimeout: number;
}

export interface RollbackTrigger {
  metric: string;
  condition: "greater_than" | "less_than" | "equals";
  threshold: number;
  window: number;
}

export interface GatePolicy {
  /** Hard gates that must pass before merge */
  mergeGates: Gate[];

  /** Hard gates that must pass before deploy */
  deployGates: Gate[];
}

export interface Gate {
  id: string;
  name: string;
  type: GateType;
  required: boolean;
  config: Record<string, unknown>;
}

export type GateType =
  | "build"
  | "unit-test"
  | "integration-test"
  | "static-analysis"
  | "dependency-check"
  | "security-scan"
  | "secret-scan"
  | "documentation"
  | "performance"
  | "custom";

export interface DataClassificationPolicy {
  /** Default classification for new projects */
  defaultClassification: DataClassification;

  /** Per-provider data routing rules */
  providerRules: ProviderDataRule[];

  /** Redaction rules for logs and telemetry */
  redactionPatterns: RedactionPattern[];
}

export type DataClassification = "public" | "internal" | "confidential" | "regulated";

export interface ProviderDataRule {
  provider: string;
  allowedClassifications: DataClassification[];
  dataRetentionDays: number;
  encryptionRequired: boolean;
}

export interface RedactionPattern {
  name: string;
  pattern: string;
  replacement: string;
}

export interface ToolPermissionPolicy {
  /** Default tool access for all agents */
  defaultPermissions: ToolPermission[];

  /** Per-agent-role tool permissions */
  rolePermissions: Record<AgentRole, ToolPermission[]>;
}

export interface ToolPermission {
  /** MCP server or tool identifier */
  toolId: string;

  /** Allowed operations */
  operations: ("read" | "write" | "execute" | "delete")[];

  /** Resource scope (paths, repos, etc.) */
  resourceScope: string[];
}

/**
 * Default policy factory
 */
export function createDefaultPolicy(projectId: string, name: string): NebulaPolicy {
  return {
    version: "1.0",
    projectId,
    name,
    description: `Default policy for ${name}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agents: {
      mergeToMain: {
        allowed: true,
        allowedAgentRoles: ["cto", "engineering-head"],
        requireApproval: false,
        approvers: [],
      },
      deployPermissions: {
        preview: {
          allowed: true,
          allowedAgentRoles: ["cto", "engineering-head", "devops-head"],
          requireApproval: false,
          approvers: [],
        },
        staging: {
          allowed: true,
          allowedAgentRoles: ["cto", "devops-head"],
          requireApproval: false,
          approvers: [],
        },
        production: {
          allowed: true,
          allowedAgentRoles: ["cto"],
          requireApproval: false,
          approvers: [],
        },
      },
      maxConcurrentRuns: 5,
      overrides: {},
    },
    repositories: {
      defaultAccess: "read-write",
      writeScopes: [],
      autoMergeBranches: ["main"],
      branchPattern: "nebula/{{workstream}}/{{change-id}}",
    },
    deployment: {
      environments: {
        preview: {
          enabled: true,
          autoDeployAllowed: true,
          requiredGates: ["build", "unit-test"],
          maxBlastRadius: 0,
          deploymentStrategy: "rolling",
        },
        staging: {
          enabled: true,
          autoDeployAllowed: true,
          requiredGates: ["build", "unit-test", "integration-test", "security-scan"],
          maxBlastRadius: 0,
          deploymentStrategy: "blue-green",
        },
        production: {
          enabled: true,
          autoDeployAllowed: true,
          requiredGates: [
            "build",
            "unit-test",
            "integration-test",
            "static-analysis",
            "dependency-check",
            "security-scan",
            "secret-scan",
            "documentation",
          ],
          maxBlastRadius: 10,
          deploymentStrategy: "canary",
        },
      },
      progressiveDelivery: {
        canarySteps: [5, 10, 25, 50, 100],
        stepInterval: 300,
        evaluationMetrics: ["error_rate", "latency_p99", "cpu_usage"],
      },
      rollback: {
        autoRollback: true,
        triggers: [
          { metric: "error_rate", condition: "greater_than", threshold: 5, window: 60 },
          { metric: "latency_p99", condition: "greater_than", threshold: 2000, window: 60 },
        ],
        rollbackTimeout: 600,
      },
    },
    gates: {
      mergeGates: [
        { id: "build", name: "Build Succeeds", type: "build", required: true, config: {} },
        { id: "unit-test", name: "Unit Tests Pass", type: "unit-test", required: true, config: {} },
        {
          id: "integration-test",
          name: "Integration Tests Pass",
          type: "integration-test",
          required: true,
          config: {},
        },
        {
          id: "static-analysis",
          name: "Static Analysis Clean",
          type: "static-analysis",
          required: true,
          config: {},
        },
        {
          id: "dependency-check",
          name: "Dependency Check",
          type: "dependency-check",
          required: true,
          config: {},
        },
        {
          id: "security-scan",
          name: "Security Scan",
          type: "security-scan",
          required: true,
          config: {},
        },
        {
          id: "secret-scan",
          name: "Secret Scanning",
          type: "secret-scan",
          required: true,
          config: {},
        },
        {
          id: "documentation",
          name: "Documentation Updated",
          type: "documentation",
          required: true,
          config: { minLevel: 0 },
        },
      ],
      deployGates: [
        { id: "build", name: "Build Succeeds", type: "build", required: true, config: {} },
        { id: "unit-test", name: "Unit Tests Pass", type: "unit-test", required: true, config: {} },
        {
          id: "integration-test",
          name: "Integration Tests Pass",
          type: "integration-test",
          required: true,
          config: {},
        },
        {
          id: "security-scan",
          name: "Security Scan",
          type: "security-scan",
          required: true,
          config: {},
        },
      ],
    },
    dataClassification: {
      defaultClassification: "internal",
      providerRules: [
        {
          provider: "azure-openai",
          allowedClassifications: ["public", "internal", "confidential"],
          dataRetentionDays: 30,
          encryptionRequired: true,
        },
        {
          provider: "amazon-bedrock",
          allowedClassifications: ["public", "internal"],
          dataRetentionDays: 0,
          encryptionRequired: true,
        },
        {
          provider: "openai-api",
          allowedClassifications: ["public"],
          dataRetentionDays: 30,
          encryptionRequired: false,
        },
      ],
      redactionPatterns: [
        {
          name: "api-key",
          pattern: "(?i)(api[_-]?key|apikey)\\s*[=:]\\s*['\"]?([a-zA-Z0-9_\\-]{20,})",
          replacement: "$1=***REDACTED***",
        },
        {
          name: "password",
          pattern: "(?i)(password|passwd|pwd)\\s*[=:]\\s*['\"]?([^\\s'\"]+)",
          replacement: "$1=***REDACTED***",
        },
        {
          name: "connection-string",
          pattern: "(?i)(connection[_-]?string|conn[_-]?str)\\s*[=:]\\s*['\"]?([^\\s'\"]+)",
          replacement: "$1=***REDACTED***",
        },
      ],
    },
    toolPermissions: {
      defaultPermissions: [
        {
          toolId: "nebula.documentation",
          operations: ["read"],
          resourceScope: ["**"],
        },
      ],
      rolePermissions: {
        cto: [
          { toolId: "nebula.*", operations: ["read", "write", "execute"], resourceScope: ["**"] },
        ],
        "engineering-head": [
          {
            toolId: "nebula.repository",
            operations: ["read", "write"],
            resourceScope: ["**"],
          },
          {
            toolId: "nebula.documentation",
            operations: ["read", "write"],
            resourceScope: ["**"],
          },
        ],
        "testing-head": [
          { toolId: "nebula.repository", operations: ["read"], resourceScope: ["**"] },
          {
            toolId: "nebula.documentation",
            operations: ["read", "write"],
            resourceScope: ["**/tests/**"],
          },
        ],
        "devops-head": [
          {
            toolId: "nebula.deployment",
            operations: ["read", "write", "execute"],
            resourceScope: ["**"],
          },
          {
            toolId: "nebula.observability",
            operations: ["read"],
            resourceScope: ["**"],
          },
        ],
        "security-head": [
          { toolId: "nebula.*", operations: ["read"], resourceScope: ["**"] },
          {
            toolId: "nebula.repository",
            operations: ["read", "write"],
            resourceScope: ["**/security/**"],
          },
        ],
        "scribing-head": [
          {
            toolId: "nebula.documentation",
            operations: ["read", "write"],
            resourceScope: ["**"],
          },
          { toolId: "nebula.linear", operations: ["read", "write"], resourceScope: ["**"] },
        ],
        "frontend-worker": [
          {
            toolId: "nebula.repository",
            operations: ["read", "write"],
            resourceScope: ["**/src/**", "**/public/**"],
          },
        ],
        "backend-worker": [
          {
            toolId: "nebula.repository",
            operations: ["read", "write"],
            resourceScope: ["**/src/**", "**/lib/**"],
          },
        ],
        "fullstack-worker": [
          {
            toolId: "nebula.repository",
            operations: ["read", "write"],
            resourceScope: ["**"],
          },
        ],
        "unit-test-worker": [
          {
            toolId: "nebula.repository",
            operations: ["read", "write"],
            resourceScope: ["**/tests/**", "**/src/**"],
          },
        ],
        "integration-test-worker": [
          {
            toolId: "nebula.repository",
            operations: ["read", "write"],
            resourceScope: ["**/tests/**"],
          },
        ],
        "performance-test-worker": [
          { toolId: "nebula.repository", operations: ["read"], resourceScope: ["**"] },
          {
            toolId: "nebula.observability",
            operations: ["read"],
            resourceScope: ["**"],
          },
        ],
        "pentest-worker": [
          { toolId: "nebula.repository", operations: ["read"], resourceScope: ["**"] },
        ],
        "documentation-worker": [
          {
            toolId: "nebula.documentation",
            operations: ["read", "write"],
            resourceScope: ["**"],
          },
        ],
      },
    },
  };
}
