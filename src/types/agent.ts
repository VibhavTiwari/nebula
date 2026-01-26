/**
 * Agent hierarchy and runtime types
 */

import type { AgentRole } from "./policy";

export interface AgentDefinition {
  id: string;
  name: string;
  role: AgentRole;
  level: AgentLevel;
  description: string;

  /** Model to use for this agent */
  modelId: string;

  /** System prompt template */
  systemPrompt: string;

  /** Tools this agent can access (MCP server IDs) */
  tools: string[];

  /** Agents this agent can delegate to */
  delegates: string[];

  /** Maximum iterations before stopping */
  maxIterations: number;

  /** Temperature for model calls */
  temperature: number;
}

export type AgentLevel = 1 | 2 | 3;

export interface AgentInstance {
  id: string;
  definitionId: string;
  runId: string;
  status: AgentStatus;
  startedAt: string;
  completedAt?: string;
  iterations: number;
  currentTask?: string;
  messages: AgentMessage[];
  toolCalls: AgentToolCall[];
}

export type AgentStatus = "idle" | "thinking" | "executing" | "waiting" | "completed" | "failed";

export interface AgentMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  timestamp: string;
  toolCallId?: string;
}

export interface AgentToolCall {
  id: string;
  toolId: string;
  operation: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
  status: "pending" | "executing" | "completed" | "failed";
}

/**
 * Agent graph — for the Agent Builder (Phase 10)
 */
export interface AgentGraph {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: AgentGraphNode[];
  edges: AgentGraphEdge[];
  createdAt: string;
  updatedAt: string;
}

export type AgentGraphNodeType =
  | "agent"
  | "tool-call"
  | "transform"
  | "gate"
  | "question"
  | "deploy-step"
  | "start"
  | "end";

export interface AgentGraphNode {
  id: string;
  type: AgentGraphNodeType;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;

  /** For agent nodes */
  agentDefinitionId?: string;

  /** For tool-call nodes */
  toolId?: string;

  /** Input/output type schema (JSON Schema) */
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface AgentGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;

  /** Condition for conditional routing */
  condition?: EdgeCondition;
}

export interface EdgeCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "matches";
  value: unknown;
}

/**
 * Default agent definitions for the built-in hierarchy
 */
export const DEFAULT_AGENT_HIERARCHY: Omit<AgentDefinition, "modelId">[] = [
  // Level 1: CTO Agent
  {
    id: "cto-agent",
    name: "CTO Agent",
    role: "cto",
    level: 1,
    description:
      "Owns the global plan, decisions, and final reporting. Reads consolidated documentation, dispatches tasks, and enforces policies.",
    systemPrompt: "",
    tools: ["nebula.repository", "nebula.documentation", "nebula.linear", "nebula.deployment", "nebula.observability"],
    delegates: [
      "engineering-head",
      "testing-head",
      "devops-head",
      "security-head",
      "scribing-head",
    ],
    maxIterations: 50,
    temperature: 0.3,
  },
  // Level 2: Department Heads
  {
    id: "engineering-head",
    name: "Engineering Department Head",
    role: "engineering-head",
    level: 2,
    description: "Manages coding agents, reviews architecture decisions, coordinates implementation.",
    systemPrompt: "",
    tools: ["nebula.repository", "nebula.documentation"],
    delegates: ["frontend-worker", "backend-worker", "fullstack-worker"],
    maxIterations: 30,
    temperature: 0.2,
  },
  {
    id: "testing-head",
    name: "Testing Department Head",
    role: "testing-head",
    level: 2,
    description: "Manages testing agents, ensures coverage, produces test reports.",
    systemPrompt: "",
    tools: ["nebula.repository", "nebula.documentation"],
    delegates: ["unit-test-worker", "integration-test-worker", "performance-test-worker", "pentest-worker"],
    maxIterations: 30,
    temperature: 0.1,
  },
  {
    id: "devops-head",
    name: "DevOps Department Head",
    role: "devops-head",
    level: 2,
    description: "Manages deployment pipelines, environment provisioning, and progressive delivery.",
    systemPrompt: "",
    tools: ["nebula.deployment", "nebula.observability", "nebula.documentation"],
    delegates: [],
    maxIterations: 20,
    temperature: 0.1,
  },
  {
    id: "security-head",
    name: "Security Department Head",
    role: "security-head",
    level: 2,
    description: "Runs security checks, enforces security policies, reviews for vulnerabilities.",
    systemPrompt: "",
    tools: ["nebula.repository", "nebula.documentation"],
    delegates: [],
    maxIterations: 20,
    temperature: 0.1,
  },
  {
    id: "scribing-head",
    name: "Scribing Department Head",
    role: "scribing-head",
    level: 2,
    description:
      "Manages documentation, creates and consolidates Level 0/1/2 notes, keeps Obsidian vault current.",
    systemPrompt: "",
    tools: ["nebula.documentation", "nebula.linear"],
    delegates: ["documentation-worker"],
    maxIterations: 20,
    temperature: 0.3,
  },
  // Level 3: Workers
  {
    id: "frontend-worker",
    name: "Front-end Worker Agent",
    role: "frontend-worker",
    level: 3,
    description: "Implements front-end code (React, Next.js, TypeScript).",
    systemPrompt: "",
    tools: ["nebula.repository"],
    delegates: [],
    maxIterations: 50,
    temperature: 0.2,
  },
  {
    id: "backend-worker",
    name: "Back-end Worker Agent",
    role: "backend-worker",
    level: 3,
    description: "Implements back-end code (Python Django, Erlang, Elixir, Rust).",
    systemPrompt: "",
    tools: ["nebula.repository"],
    delegates: [],
    maxIterations: 50,
    temperature: 0.2,
  },
  {
    id: "fullstack-worker",
    name: "Full-stack Worker Agent",
    role: "fullstack-worker",
    level: 3,
    description: "Implements full-stack features across front-end and back-end.",
    systemPrompt: "",
    tools: ["nebula.repository"],
    delegates: [],
    maxIterations: 50,
    temperature: 0.2,
  },
  {
    id: "unit-test-worker",
    name: "Unit Testing Worker Agent",
    role: "unit-test-worker",
    level: 3,
    description: "Writes and runs unit tests.",
    systemPrompt: "",
    tools: ["nebula.repository"],
    delegates: [],
    maxIterations: 30,
    temperature: 0.1,
  },
  {
    id: "integration-test-worker",
    name: "Integration Testing Worker Agent",
    role: "integration-test-worker",
    level: 3,
    description: "Writes and runs integration tests.",
    systemPrompt: "",
    tools: ["nebula.repository"],
    delegates: [],
    maxIterations: 30,
    temperature: 0.1,
  },
  {
    id: "performance-test-worker",
    name: "Performance Testing Worker Agent",
    role: "performance-test-worker",
    level: 3,
    description: "Runs performance benchmarks and load tests.",
    systemPrompt: "",
    tools: ["nebula.repository", "nebula.observability"],
    delegates: [],
    maxIterations: 20,
    temperature: 0.1,
  },
  {
    id: "pentest-worker",
    name: "Penetration Testing Worker Agent",
    role: "pentest-worker",
    level: 3,
    description: "Runs baseline automated security checks.",
    systemPrompt: "",
    tools: ["nebula.repository"],
    delegates: [],
    maxIterations: 20,
    temperature: 0.1,
  },
  {
    id: "documentation-worker",
    name: "Documentation Scribing Worker Agent",
    role: "documentation-worker",
    level: 3,
    description: "Writes Level 0 documentation notes after each change.",
    systemPrompt: "",
    tools: ["nebula.documentation"],
    delegates: [],
    maxIterations: 10,
    temperature: 0.3,
  },
];
