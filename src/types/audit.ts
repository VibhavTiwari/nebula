/**
 * Nebula Audit Log Schema v1
 *
 * Immutable event model for complete traceability of all actions.
 * Every run produces a complete audit trail: agent decisions, tool calls,
 * code changes, tests, deployments, and documentation writes.
 */

export interface AuditEvent {
  /** Unique event ID */
  id: string;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** The run this event belongs to */
  runId: string;

  /** The workstream this event belongs to */
  workstreamId: string;

  /** The project this event belongs to */
  projectId: string;

  /** Event type */
  type: AuditEventType;

  /** The actor (user or agent) */
  actor: AuditActor;

  /** Event-specific payload */
  payload: AuditPayload;

  /** Parent event ID (for hierarchical tracing) */
  parentEventId?: string;

  /** Span ID for OpenTelemetry correlation */
  spanId?: string;

  /** Trace ID for OpenTelemetry correlation */
  traceId?: string;
}

export type AuditEventType =
  | "run.started"
  | "run.completed"
  | "run.failed"
  | "agent.decision"
  | "agent.delegation"
  | "agent.handoff"
  | "tool.call"
  | "tool.result"
  | "code.read"
  | "code.write"
  | "code.commit"
  | "code.branch.create"
  | "code.merge"
  | "code.rollback"
  | "test.started"
  | "test.passed"
  | "test.failed"
  | "test.report"
  | "gate.evaluated"
  | "gate.passed"
  | "gate.failed"
  | "deploy.started"
  | "deploy.progressed"
  | "deploy.completed"
  | "deploy.rolled-back"
  | "deploy.failed"
  | "documentation.read"
  | "documentation.write"
  | "documentation.consolidated"
  | "linear.issue.created"
  | "linear.issue.updated"
  | "figma.design.ingested"
  | "policy.evaluated"
  | "policy.violation"
  | "user.request"
  | "user.approval"
  | "user.rejection";

export interface AuditActor {
  type: "user" | "agent";
  id: string;
  role?: string;
  name: string;
}

export type AuditPayload =
  | RunPayload
  | AgentDecisionPayload
  | AgentDelegationPayload
  | ToolCallPayload
  | ToolResultPayload
  | CodeChangePayload
  | TestPayload
  | GatePayload
  | DeployPayload
  | DocumentationPayload
  | LinearPayload
  | FigmaPayload
  | PolicyPayload
  | UserRequestPayload;

export interface RunPayload {
  kind: "run";
  status: "started" | "completed" | "failed";
  input?: string;
  output?: string;
  error?: string;
  duration?: number;
}

export interface AgentDecisionPayload {
  kind: "agent.decision";
  decision: string;
  reasoning: string;
  context: string[];
  alternatives: string[];
}

export interface AgentDelegationPayload {
  kind: "agent.delegation";
  fromAgent: string;
  toAgent: string;
  taskDescription: string;
  constraints: string[];
}

export interface ToolCallPayload {
  kind: "tool.call";
  toolId: string;
  operation: string;
  parameters: Record<string, unknown>;
}

export interface ToolResultPayload {
  kind: "tool.result";
  toolId: string;
  operation: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface CodeChangePayload {
  kind: "code.change";
  action: "read" | "write" | "commit" | "branch" | "merge" | "rollback";
  repository: string;
  branch?: string;
  files: FileChange[];
  commitHash?: string;
  message?: string;
}

export interface FileChange {
  path: string;
  action: "added" | "modified" | "deleted" | "renamed";
  additions?: number;
  deletions?: number;
  oldPath?: string;
}

export interface TestPayload {
  kind: "test";
  action: "started" | "passed" | "failed" | "report";
  testType: "unit" | "integration" | "e2e" | "performance" | "security";
  suiteName: string;
  totalTests?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  duration?: number;
  coveragePercent?: number;
  failures?: TestFailure[];
}

export interface TestFailure {
  testName: string;
  message: string;
  stack?: string;
}

export interface GatePayload {
  kind: "gate";
  gateId: string;
  gateName: string;
  gateType: string;
  result: "passed" | "failed";
  details: string;
}

export interface DeployPayload {
  kind: "deploy";
  action: "started" | "progressed" | "completed" | "rolled-back" | "failed";
  environment: "preview" | "staging" | "production";
  cloud: "azure" | "aws";
  strategy: "canary" | "blue-green" | "rolling" | "slot-swap";
  version: string;
  trafficPercent?: number;
  healthStatus?: string;
  rollbackReason?: string;
}

export interface DocumentationPayload {
  kind: "documentation";
  action: "read" | "write" | "consolidated";
  level: 0 | 1 | 2;
  notePath: string;
  service?: string;
  changesSummary?: string;
}

export interface LinearPayload {
  kind: "linear";
  action: "created" | "updated";
  issueId: string;
  issueTitle: string;
  status?: string;
  url?: string;
}

export interface FigmaPayload {
  kind: "figma";
  action: "ingested";
  fileId: string;
  fileName: string;
  components: string[];
}

export interface PolicyPayload {
  kind: "policy";
  action: "evaluated" | "violation";
  policyRule: string;
  result: "allowed" | "denied";
  reason: string;
}

export interface UserRequestPayload {
  kind: "user.request";
  action: "request" | "approval" | "rejection";
  content: string;
  attachments?: string[];
}

/**
 * Run record — aggregated view of an entire agent run
 */
export interface RunRecord {
  id: string;
  projectId: string;
  workstreamId: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed";
  userRequest: string;
  events: AuditEvent[];
  summary?: RunSummary;
}

export interface RunSummary {
  totalEvents: number;
  agentDecisions: number;
  toolCalls: number;
  codeChanges: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  gatesPassed: number;
  gatesFailed: number;
  deploymentsCompleted: number;
  documentationUpdates: number;
  linearUpdates: number;
  duration: number;
}

/**
 * Create a new audit event
 */
export function createAuditEvent(
  params: Omit<AuditEvent, "id" | "timestamp">
): AuditEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...params,
  };
}

/**
 * Create a new run record
 */
export function createRunRecord(
  projectId: string,
  workstreamId: string,
  userRequest: string
): RunRecord {
  return {
    id: crypto.randomUUID(),
    projectId,
    workstreamId,
    startedAt: new Date().toISOString(),
    status: "running",
    userRequest,
    events: [],
  };
}
