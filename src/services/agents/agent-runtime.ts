/**
 * Agent Runtime — Phase 3
 *
 * The execution engine for the hierarchical agent swarm.
 * Implements the CTO Agent orchestrator pattern with department heads
 * and worker agents, coordinated through the Obsidian documentation lattice.
 */

import type {
  AgentDefinition,
  AgentInstance,
  AgentStatus,
  AgentMessage,
  AgentToolCall,
} from "@/types/agent";
import type { AuditEvent } from "@/types/audit";
import type { NebulaPolicy } from "@/types/policy";
import { DEFAULT_AGENT_HIERARCHY } from "@/types/agent";

export interface AgentRuntimeConfig {
  /** Model provider configuration */
  modelProvider: ModelProvider;

  /** Policy to enforce */
  policy: NebulaPolicy;

  /** Available MCP tools */
  mcpTools: MCPToolRegistry;

  /** Audit event callback */
  onAuditEvent: (event: Omit<AuditEvent, "id" | "timestamp">) => void;

  /** Agent status change callback */
  onAgentStatusChange: (agentId: string, status: AgentStatus) => void;

  /** Message callback (for streaming to UI) */
  onMessage: (agentId: string, message: AgentMessage) => void;
}

export interface ModelProvider {
  id: string;
  name: string;
  chat(params: ChatParams): Promise<ChatResponse>;
}

export interface ChatParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  finishReason: "stop" | "tool_calls" | "length";
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface MCPToolRegistry {
  getToolsForAgent(agentRole: string): ToolDefinition[];
  executeTool(
    toolName: string,
    parameters: Record<string, unknown>,
    agentRole: string
  ): Promise<unknown>;
}

/**
 * The Agent Runtime orchestrates agent execution.
 */
export class AgentRuntime {
  private config: AgentRuntimeConfig;
  private agents: Map<string, AgentDefinition> = new Map();
  private instances: Map<string, AgentInstance> = new Map();
  private runId: string = "";

  constructor(config: AgentRuntimeConfig) {
    this.config = config;

    // Register default agent hierarchy
    for (const agentDef of DEFAULT_AGENT_HIERARCHY) {
      this.agents.set(agentDef.id, {
        ...agentDef,
        modelId: "default",
      });
    }
  }

  /**
   * Execute a user request through the agent hierarchy.
   * Entry point: CTO Agent receives the request and orchestrates.
   */
  async executeRequest(params: {
    runId: string;
    projectId: string;
    workstreamId: string;
    userRequest: string;
    context: string;
  }): Promise<AgentExecutionResult> {
    this.runId = params.runId;

    // Record run start
    this.config.onAuditEvent({
      runId: params.runId,
      workstreamId: params.workstreamId,
      projectId: params.projectId,
      type: "run.started",
      actor: { type: "user", id: "user", name: "User" },
      payload: { kind: "run", status: "started", input: params.userRequest },
    });

    try {
      // Start with CTO Agent
      const result = await this.runAgent("cto-agent", {
        task: params.userRequest,
        context: params.context,
        projectId: params.projectId,
        workstreamId: params.workstreamId,
      });

      // Record run completion
      this.config.onAuditEvent({
        runId: params.runId,
        workstreamId: params.workstreamId,
        projectId: params.projectId,
        type: "run.completed",
        actor: { type: "agent", id: "cto-agent", role: "cto", name: "CTO Agent" },
        payload: { kind: "run", status: "completed", output: result.summary },
      });

      return {
        success: true,
        summary: result.summary,
        evidence: result.evidence,
        agentTraces: Array.from(this.instances.values()),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.config.onAuditEvent({
        runId: params.runId,
        workstreamId: params.workstreamId,
        projectId: params.projectId,
        type: "run.failed",
        actor: { type: "agent", id: "cto-agent", role: "cto", name: "CTO Agent" },
        payload: { kind: "run", status: "failed", error: errorMsg },
      });

      return {
        success: false,
        summary: `Run failed: ${errorMsg}`,
        evidence: [],
        agentTraces: Array.from(this.instances.values()),
      };
    }
  }

  /**
   * Run a single agent with a task.
   */
  private async runAgent(
    agentId: string,
    params: {
      task: string;
      context: string;
      projectId: string;
      workstreamId: string;
    }
  ): Promise<AgentRunResult> {
    const definition = this.agents.get(agentId);
    if (!definition) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Check policy permissions
    this.checkPermission(definition.role, "execute", params.projectId);

    // Create agent instance
    const instance: AgentInstance = {
      id: `${agentId}-${Date.now()}`,
      definitionId: agentId,
      runId: this.runId,
      status: "thinking",
      startedAt: new Date().toISOString(),
      iterations: 0,
      currentTask: params.task,
      messages: [],
      toolCalls: [],
    };

    this.instances.set(instance.id, instance);
    this.config.onAgentStatusChange(instance.id, "thinking");

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(definition, params.context);

    // Agent message loop
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: params.task },
    ];

    const tools = this.config.mcpTools.getToolsForAgent(definition.role);
    const evidence: Array<Record<string, unknown>> = [];

    for (let i = 0; i < definition.maxIterations; i++) {
      instance.iterations = i + 1;

      // Call the model
      const response = await this.config.modelProvider.chat({
        model: definition.modelId,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: definition.temperature,
        maxTokens: 4096,
      });

      // Record the agent's response
      const agentMsg: AgentMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.content,
        timestamp: new Date().toISOString(),
      };
      instance.messages.push(agentMsg);
      this.config.onMessage(instance.id, agentMsg);

      // Record decision in audit log
      this.config.onAuditEvent({
        runId: this.runId,
        workstreamId: params.workstreamId,
        projectId: params.projectId,
        type: "agent.decision",
        actor: {
          type: "agent",
          id: agentId,
          role: definition.role,
          name: definition.name,
        },
        payload: {
          kind: "agent.decision",
          decision: response.content.slice(0, 500),
          reasoning: "",
          context: [],
          alternatives: [],
        },
      });

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        instance.status = "executing";
        this.config.onAgentStatusChange(instance.id, "executing");

        for (const tc of response.toolCalls) {
          const toolCall: AgentToolCall = {
            id: tc.id,
            toolId: tc.name,
            operation: tc.name,
            parameters: tc.arguments,
            startedAt: new Date().toISOString(),
            status: "executing",
          };
          instance.toolCalls.push(toolCall);

          // Record tool call in audit log
          this.config.onAuditEvent({
            runId: this.runId,
            workstreamId: params.workstreamId,
            projectId: params.projectId,
            type: "tool.call",
            actor: {
              type: "agent",
              id: agentId,
              role: definition.role,
              name: definition.name,
            },
            payload: {
              kind: "tool.call",
              toolId: tc.name,
              operation: tc.name,
              parameters: tc.arguments,
            },
          });

          // Execute the tool
          try {
            const result = await this.config.mcpTools.executeTool(
              tc.name,
              tc.arguments,
              definition.role
            );
            toolCall.result = result;
            toolCall.status = "completed";
            toolCall.completedAt = new Date().toISOString();

            // Add tool result to messages
            messages.push({
              role: "tool",
              content: JSON.stringify(result),
            });

            evidence.push({
              toolCall: tc.name,
              result,
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            toolCall.error = errorMsg;
            toolCall.status = "failed";
            toolCall.completedAt = new Date().toISOString();

            messages.push({
              role: "tool",
              content: `Error: ${errorMsg}`,
            });
          }
        }
      }

      // Check if agent wants to delegate to sub-agents
      if (response.content.includes("[DELEGATE:")) {
        const delegations = parseDelegations(response.content);
        for (const delegation of delegations) {
          if (definition.delegates.includes(delegation.agentId)) {
            this.config.onAuditEvent({
              runId: this.runId,
              workstreamId: params.workstreamId,
              projectId: params.projectId,
              type: "agent.delegation",
              actor: {
                type: "agent",
                id: agentId,
                role: definition.role,
                name: definition.name,
              },
              payload: {
                kind: "agent.delegation",
                fromAgent: agentId,
                toAgent: delegation.agentId,
                taskDescription: delegation.task,
                constraints: [],
              },
            });

            const subResult = await this.runAgent(delegation.agentId, {
              task: delegation.task,
              context: params.context,
              projectId: params.projectId,
              workstreamId: params.workstreamId,
            });

            messages.push({
              role: "user",
              content: `[Result from ${delegation.agentId}]: ${subResult.summary}`,
            });

            evidence.push(...subResult.evidence);
          }
        }
      }

      // Check if done
      if (response.finishReason === "stop" && !response.toolCalls) {
        break;
      }

      messages.push({ role: "assistant", content: response.content });
    }

    instance.status = "completed";
    instance.completedAt = new Date().toISOString();
    this.config.onAgentStatusChange(instance.id, "completed");

    return {
      summary:
        instance.messages[instance.messages.length - 1]?.content || "No output",
      evidence,
    };
  }

  /**
   * Check if an agent has permission for an action
   */
  private checkPermission(
    agentRole: string,
    _action: string,
    _projectId: string
  ): void {
    // Policy enforcement will be fully implemented in Phase 11
    // For now, all agents are allowed to execute within their defined scope
    const rolePerms =
      this.config.policy.toolPermissions.rolePermissions[agentRole as keyof typeof this.config.policy.toolPermissions.rolePermissions];
    if (!rolePerms && agentRole !== "cto") {
      // Check default permissions
      const defaultPerms = this.config.policy.toolPermissions.defaultPermissions;
      if (defaultPerms.length === 0) {
        throw new Error(
          `Agent role '${agentRole}' has no permissions configured`
        );
      }
    }
  }

  /**
   * Build system prompt for an agent
   */
  private buildSystemPrompt(
    definition: AgentDefinition,
    context: string
  ): string {
    const delegateList = definition.delegates.length > 0
      ? `You can delegate tasks to: ${definition.delegates.join(", ")}. Use [DELEGATE:agent-id] Task description [/DELEGATE] syntax.`
      : "You cannot delegate to sub-agents.";

    return `You are ${definition.name} in the Nebula IDE agent hierarchy.

Role: ${definition.description}
Level: ${definition.level} (${definition.level === 1 ? "Orchestrator" : definition.level === 2 ? "Department Head" : "Worker"})

${delegateList}

Available tools: ${definition.tools.join(", ")}

## Guidelines
- Always explain your reasoning before taking action
- Record evidence for every change you make
- Follow the project's policy constraints
- Update documentation after every change (Level 0 notes minimum)
- Report progress clearly and concisely

## Current Context
${context}`;
  }

  /**
   * Register a custom agent definition
   */
  registerAgent(definition: AgentDefinition): void {
    this.agents.set(definition.id, definition);
  }

  /**
   * Get all registered agent definitions
   */
  getAgentDefinitions(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all active agent instances
   */
  getActiveInstances(): AgentInstance[] {
    return Array.from(this.instances.values());
  }
}

interface AgentRunResult {
  summary: string;
  evidence: Array<Record<string, unknown>>;
}

export interface AgentExecutionResult {
  success: boolean;
  summary: string;
  evidence: Array<Record<string, unknown>>;
  agentTraces: AgentInstance[];
}

/**
 * Parse delegation commands from agent output
 */
function parseDelegations(
  content: string
): Array<{ agentId: string; task: string }> {
  const regex = /\[DELEGATE:([^\]]+)\]\s*([\s\S]*?)\s*\[\/DELEGATE\]/g;
  const delegations: Array<{ agentId: string; task: string }> = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    delegations.push({
      agentId: match[1].trim(),
      task: match[2].trim(),
    });
  }

  return delegations;
}
