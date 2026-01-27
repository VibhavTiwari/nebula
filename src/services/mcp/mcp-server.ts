/**
 * MCP Server Framework — Phase 3
 *
 * Model Context Protocol server implementation for Nebula.
 * Provides tool connectivity for agents via the MCP standard.
 */

import type { ToolDefinition, MCPToolRegistry } from "@/services/agents/agent-runtime";

/**
 * MCP Tool Registry — manages available tools and permissions
 */
export class NebulaMCPRegistry implements MCPToolRegistry {
  private servers: Map<string, MCPServerInstance> = new Map();
  private rolePermissions: Map<string, Set<string>> = new Map();

  /**
   * Register an MCP server
   */
  registerServer(server: MCPServerInstance): void {
    this.servers.set(server.id, server);
  }

  /**
   * Set tool permissions for an agent role
   */
  setRolePermissions(role: string, allowedToolPatterns: string[]): void {
    this.rolePermissions.set(role, new Set(allowedToolPatterns));
  }

  /**
   * Get available tools for an agent based on their role
   */
  getToolsForAgent(agentRole: string): ToolDefinition[] {
    const allowed = this.rolePermissions.get(agentRole);
    const tools: ToolDefinition[] = [];

    for (const server of this.servers.values()) {
      for (const tool of server.tools) {
        const toolId = `${server.id}.${tool.name}`;

        // Check if agent is allowed to use this tool
        if (allowed && !isToolAllowed(toolId, allowed)) {
          continue;
        }

        tools.push({
          type: "function",
          function: {
            name: toolId,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        });
      }
    }

    return tools;
  }

  /**
   * Execute a tool call
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, unknown>,
    agentRole: string
  ): Promise<unknown> {
    // Parse server.tool format
    const dotIndex = toolName.indexOf(".");
    if (dotIndex === -1) {
      throw new Error(`Invalid tool name format: ${toolName}. Expected 'server.tool'.`);
    }

    const serverId = toolName.substring(0, dotIndex);
    const toolId = toolName.substring(dotIndex + 1);

    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server not found: ${serverId}`);
    }

    // Check permissions
    const allowed = this.rolePermissions.get(agentRole);
    if (allowed && !isToolAllowed(toolName, allowed)) {
      throw new Error(
        `Agent role '${agentRole}' does not have permission to use tool '${toolName}'`
      );
    }

    // Execute the tool
    return server.execute(toolId, parameters);
  }

  /**
   * Get all registered servers
   */
  getServers(): MCPServerInstance[] {
    return Array.from(this.servers.values());
  }
}

/**
 * Base class for MCP server implementations
 */
export abstract class MCPServerInstance {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: "nebula-provided" | "user-provided";
  abstract readonly tools: MCPToolDefinition[];

  constructor(params: {
    id: string;
    name: string;
    description: string;
    type: "nebula-provided" | "user-provided";
  }) {
    this.id = params.id;
    this.name = params.name;
    this.description = params.description;
    this.type = params.type;
  }

  abstract execute(
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<unknown>;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Check if a tool is allowed by the permission patterns
 */
function isToolAllowed(toolId: string, allowedPatterns: Set<string>): boolean {
  for (const pattern of allowedPatterns) {
    if (pattern === "**" || pattern === "*") return true;
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -2);
      if (toolId.startsWith(prefix)) return true;
    }
    if (pattern === toolId) return true;
  }
  return false;
}

/**
 * Create the default Nebula MCP registry with built-in servers
 */
export function createDefaultMCPRegistry(): NebulaMCPRegistry {
  const registry = new NebulaMCPRegistry();

  // Register built-in servers
  registry.registerServer(new RepositoryMCPServer());
  registry.registerServer(new DocumentationMCPServer());
  registry.registerServer(new LinearMCPServer());
  registry.registerServer(new DeploymentMCPServer());
  registry.registerServer(new ObservabilityMCPServer());

  // Set default role permissions
  registry.setRolePermissions("cto", ["nebula.*"]);
  registry.setRolePermissions("engineering-head", [
    "nebula.repository.*",
    "nebula.documentation.*",
  ]);
  registry.setRolePermissions("testing-head", [
    "nebula.repository.read",
    "nebula.repository.run_tests",
    "nebula.documentation.*",
  ]);
  registry.setRolePermissions("devops-head", [
    "nebula.deployment.*",
    "nebula.observability.*",
    "nebula.documentation.*",
  ]);
  registry.setRolePermissions("security-head", [
    "nebula.repository.read",
    "nebula.repository.scan",
    "nebula.documentation.*",
  ]);
  registry.setRolePermissions("scribing-head", [
    "nebula.documentation.*",
    "nebula.linear.*",
  ]);
  registry.setRolePermissions("frontend-worker", [
    "nebula.repository.read",
    "nebula.repository.write",
    "nebula.repository.commit",
  ]);
  registry.setRolePermissions("backend-worker", [
    "nebula.repository.read",
    "nebula.repository.write",
    "nebula.repository.commit",
  ]);
  registry.setRolePermissions("fullstack-worker", [
    "nebula.repository.read",
    "nebula.repository.write",
    "nebula.repository.commit",
  ]);
  registry.setRolePermissions("unit-test-worker", [
    "nebula.repository.read",
    "nebula.repository.write",
    "nebula.repository.run_tests",
  ]);
  registry.setRolePermissions("integration-test-worker", [
    "nebula.repository.read",
    "nebula.repository.run_tests",
  ]);
  registry.setRolePermissions("performance-test-worker", [
    "nebula.repository.read",
    "nebula.observability.read",
  ]);
  registry.setRolePermissions("pentest-worker", ["nebula.repository.read"]);
  registry.setRolePermissions("documentation-worker", [
    "nebula.documentation.*",
  ]);

  return registry;
}

// ── Built-in MCP Server Implementations ──

class RepositoryMCPServer extends MCPServerInstance {
  readonly tools: MCPToolDefinition[] = [
    {
      name: "read",
      description: "Read file contents from a repository",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root" },
          repository: { type: "string", description: "Repository name" },
        },
        required: ["path"],
      },
    },
    {
      name: "write",
      description: "Write content to a file in a repository",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
          repository: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
    {
      name: "commit",
      description: "Commit changes to the repository",
      inputSchema: {
        type: "object",
        properties: {
          message: { type: "string" },
          files: { type: "array", items: { type: "string" } },
          repository: { type: "string" },
        },
        required: ["message"],
      },
    },
    {
      name: "create_branch",
      description: "Create a new branch",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          repository: { type: "string" },
        },
        required: ["name"],
      },
    },
    {
      name: "merge",
      description: "Merge a branch to target",
      inputSchema: {
        type: "object",
        properties: {
          source: { type: "string" },
          target: { type: "string" },
          repository: { type: "string" },
        },
        required: ["source", "target"],
      },
    },
    {
      name: "diff",
      description: "Get diff between branches or commits",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          repository: { type: "string" },
        },
        required: ["from", "to"],
      },
    },
    {
      name: "run_tests",
      description: "Run tests in the repository",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["unit", "integration", "e2e"] },
          path: { type: "string" },
          repository: { type: "string" },
        },
      },
    },
    {
      name: "scan",
      description: "Run security scan on the repository",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["secrets", "dependencies", "static-analysis"] },
          repository: { type: "string" },
        },
      },
    },
  ];

  constructor() {
    super({
      id: "nebula.repository",
      name: "Repository Server",
      description: "Read/write repository files, branches, and merges (gated by policy)",
      type: "nebula-provided",
    });
  }

  async execute(toolName: string, parameters: Record<string, unknown>): Promise<unknown> {
    // Implementation delegates to GitService (Phase 4)
    return { status: "ok", tool: toolName, params: parameters };
  }
}

class DocumentationMCPServer extends MCPServerInstance {
  readonly tools: MCPToolDefinition[] = [
    {
      name: "read_note",
      description: "Read a documentation note from the Obsidian vault",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Note path relative to vault" },
        },
        required: ["path"],
      },
    },
    {
      name: "write_note",
      description: "Write a documentation note to the Obsidian vault",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
          level: { type: "number", enum: [0, 1, 2] },
          frontmatter: { type: "object" },
        },
        required: ["path", "content", "level"],
      },
    },
    {
      name: "list_notes",
      description: "List notes in a vault directory",
      inputSchema: {
        type: "object",
        properties: {
          directory: { type: "string" },
        },
        required: ["directory"],
      },
    },
    {
      name: "consolidate",
      description: "Consolidate Level 0 notes into a Level 1 note",
      inputSchema: {
        type: "object",
        properties: {
          service: { type: "string" },
        },
        required: ["service"],
      },
    },
  ];

  constructor() {
    super({
      id: "nebula.documentation",
      name: "Documentation Server",
      description: "Read/write Obsidian vault documentation notes",
      type: "nebula-provided",
    });
  }

  async execute(toolName: string, parameters: Record<string, unknown>): Promise<unknown> {
    return { status: "ok", tool: toolName, params: parameters };
  }
}

class LinearMCPServer extends MCPServerInstance {
  readonly tools: MCPToolDefinition[] = [
    {
      name: "create_issue",
      description: "Create a Linear issue",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "number" },
        },
        required: ["title"],
      },
    },
    {
      name: "update_issue",
      description: "Update a Linear issue status",
      inputSchema: {
        type: "object",
        properties: {
          issueId: { type: "string" },
          status: { type: "string" },
          comment: { type: "string" },
        },
        required: ["issueId"],
      },
    },
    {
      name: "list_issues",
      description: "List Linear issues",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  ];

  constructor() {
    super({
      id: "nebula.linear",
      name: "Linear Server",
      description: "Create/update Linear tickets",
      type: "nebula-provided",
    });
  }

  async execute(toolName: string, parameters: Record<string, unknown>): Promise<unknown> {
    return { status: "ok", tool: toolName, params: parameters };
  }
}

class DeploymentMCPServer extends MCPServerInstance {
  readonly tools: MCPToolDefinition[] = [
    {
      name: "deploy",
      description: "Trigger a deployment",
      inputSchema: {
        type: "object",
        properties: {
          environment: { type: "string", enum: ["preview", "staging", "production"] },
          service: { type: "string" },
          version: { type: "string" },
          strategy: { type: "string", enum: ["canary", "blue-green", "rolling"] },
        },
        required: ["environment", "service", "version"],
      },
    },
    {
      name: "status",
      description: "Get deployment status",
      inputSchema: {
        type: "object",
        properties: {
          deploymentId: { type: "string" },
        },
        required: ["deploymentId"],
      },
    },
    {
      name: "rollback",
      description: "Rollback a deployment",
      inputSchema: {
        type: "object",
        properties: {
          deploymentId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["deploymentId"],
      },
    },
  ];

  constructor() {
    super({
      id: "nebula.deployment",
      name: "Deployment Server",
      description: "Trigger deployments, query status, rollback",
      type: "nebula-provided",
    });
  }

  async execute(toolName: string, parameters: Record<string, unknown>): Promise<unknown> {
    return { status: "ok", tool: toolName, params: parameters };
  }
}

class ObservabilityMCPServer extends MCPServerInstance {
  readonly tools: MCPToolDefinition[] = [
    {
      name: "query_traces",
      description: "Query distributed traces",
      inputSchema: {
        type: "object",
        properties: {
          service: { type: "string" },
          operation: { type: "string" },
          timeRange: { type: "string" },
        },
      },
    },
    {
      name: "query_metrics",
      description: "Query metrics",
      inputSchema: {
        type: "object",
        properties: {
          metric: { type: "string" },
          service: { type: "string" },
          timeRange: { type: "string" },
        },
        required: ["metric"],
      },
    },
    {
      name: "query_logs",
      description: "Query logs",
      inputSchema: {
        type: "object",
        properties: {
          service: { type: "string" },
          level: { type: "string" },
          query: { type: "string" },
          timeRange: { type: "string" },
        },
      },
    },
  ];

  constructor() {
    super({
      id: "nebula.observability",
      name: "Observability Server",
      description: "Query traces, logs, and metrics",
      type: "nebula-provided",
    });
  }

  async execute(toolName: string, parameters: Record<string, unknown>): Promise<unknown> {
    return { status: "ok", tool: toolName, params: parameters };
  }
}
