/**
 * MCP Node Executor
 *
 * Executes MCP (Model Context Protocol) server tool calls.
 * Currently a mock implementation - to be integrated with actual MCP servers.
 */

import {
  ExecutionContextInterface,
  MCPNodeConfig,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  ValidationError,
  ValidationResult,
  VariableType,
} from '../types';

export interface MCPToolResult {
  success: boolean;
  data?: VariableType;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface MCPServerProvider {
  /**
   * Call a tool on an MCP server
   */
  callTool(
    serverId: string,
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<MCPToolResult>;

  /**
   * Check if a server is available
   */
  isServerAvailable(serverId: string): Promise<boolean>;

  /**
   * Get available tools for a server
   */
  getServerTools(serverId: string): Promise<string[]>;
}

/**
 * Mock MCP server provider for testing
 */
export class MockMCPServerProvider implements MCPServerProvider {
  private mockServers: Map<
    string,
    {
      tools: Map<string, (params: Record<string, unknown>) => Promise<MCPToolResult>>;
    }
  > = new Map();

  constructor() {
    // Set up some default mock servers
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    // Mock file system server
    this.registerServer('filesystem', {
      read_file: async (params) => ({
        success: true,
        data: `Mock file content for: ${params['path']}`,
        metadata: { path: params['path'], size: 1024 },
      }),
      write_file: async (params) => ({
        success: true,
        data: { written: true, path: params['path'] },
      }),
      list_directory: async (params) => ({
        success: true,
        data: ['file1.txt', 'file2.txt', 'folder1/'],
        metadata: { path: params['path'] },
      }),
    });

    // Mock web search server
    this.registerServer('web_search', {
      search: async (params) => ({
        success: true,
        data: [
          { title: 'Result 1', url: 'https://example.com/1', snippet: 'Mock result 1' },
          { title: 'Result 2', url: 'https://example.com/2', snippet: 'Mock result 2' },
        ],
        metadata: { query: params['query'], resultCount: 2 },
      }),
    });

    // Mock database server
    this.registerServer('database', {
      query: async (params) => ({
        success: true,
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        metadata: { sql: params['sql'], rowCount: 2 },
      }),
      insert: async (params) => ({
        success: true,
        data: { insertedId: 123 },
        metadata: { table: params['table'] },
      }),
    });

    // Mock email server
    this.registerServer('email', {
      send: async (params) => ({
        success: true,
        data: { messageId: `msg-${Date.now()}`, sent: true },
        metadata: { to: params['to'], subject: params['subject'] },
      }),
      read_inbox: async () => ({
        success: true,
        data: [
          { id: 'msg-1', from: 'test@example.com', subject: 'Test Email', preview: 'Mock email content...' },
        ],
        metadata: { count: 1 },
      }),
    });
  }

  /**
   * Register a mock server with its tools
   */
  registerServer(
    serverId: string,
    tools: Record<string, (params: Record<string, unknown>) => Promise<MCPToolResult>>
  ): void {
    const toolMap = new Map<string, (params: Record<string, unknown>) => Promise<MCPToolResult>>();
    for (const [name, handler] of Object.entries(tools)) {
      toolMap.set(name, handler);
    }
    this.mockServers.set(serverId, { tools: toolMap });
  }

  async callTool(
    serverId: string,
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<MCPToolResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    const server = this.mockServers.get(serverId);

    if (!server) {
      return {
        success: false,
        error: `Server not found: ${serverId}`,
      };
    }

    const tool = server.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName} on server ${serverId}`,
      };
    }

    try {
      return await tool(parameters);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async isServerAvailable(serverId: string): Promise<boolean> {
    return this.mockServers.has(serverId);
  }

  async getServerTools(serverId: string): Promise<string[]> {
    const server = this.mockServers.get(serverId);
    if (!server) {
      return [];
    }
    return Array.from(server.tools.keys());
  }
}

export class MCPExecutor implements NodeExecutor<MCPNodeConfig> {
  readonly nodeType = 'mcp' as const;

  private mcpProvider: MCPServerProvider;

  constructor(mcpProvider?: MCPServerProvider) {
    this.mcpProvider = mcpProvider ?? new MockMCPServerProvider();
  }

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: MCPNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;

    context.log('info', `Executing MCP node: ${node.label ?? nodeId}`, {
      serverId: config.serverId,
      toolName: config.toolName,
    });

    // Interpolate parameters
    const interpolatedParams = this.interpolateParameters(config.parameters, context);

    const inputs = {
      serverId: config.serverId,
      toolName: config.toolName,
      parameters: interpolatedParams,
    };

    try {
      // Check if server is available
      const isAvailable = await this.mcpProvider.isServerAvailable(config.serverId);
      if (!isAvailable) {
        throw new Error(`MCP server not available: ${config.serverId}`);
      }

      context.log('debug', `Calling MCP tool: ${config.serverId}/${config.toolName}`, {
        parameters: interpolatedParams,
      });

      // Call the tool
      const result = await this.mcpProvider.callTool(
        config.serverId,
        config.toolName,
        interpolatedParams
      );

      if (!result.success) {
        throw new Error(result.error ?? 'MCP tool call failed');
      }

      context.log('info', `MCP tool call completed`, {
        success: result.success,
        hasData: result.data !== undefined,
      });

      // Store result in context
      const outputVariable = config.outputVariable ?? 'mcpResult';
      context.setVariable(outputVariable, result.data);
      context.setOutput('result', result.data);

      if (result.metadata) {
        context.setVariable(`${outputVariable}_metadata`, result.metadata);
      }

      return {
        nodeId,
        nodeType: 'mcp',
        status: 'completed',
        inputs,
        outputs: {
          result: result.data,
          metadata: result.metadata,
        },
        startTime,
        endTime: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `MCP execution failed: ${errorMessage}`, {
        nodeId,
        serverId: config.serverId,
        toolName: config.toolName,
        error: errorMessage,
      });

      return {
        nodeId,
        nodeType: 'mcp',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'MCP_EXECUTION_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
          details: {
            serverId: config.serverId,
            toolName: config.toolName,
          },
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: MCPNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate server ID
    if (!config.serverId || config.serverId.trim() === '') {
      errors.push({
        field: 'serverId',
        message: 'Server ID is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Validate tool name
    if (!config.toolName || config.toolName.trim() === '') {
      errors.push({
        field: 'toolName',
        message: 'Tool name is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Validate parameters - must be an object
    if (config.parameters !== undefined && config.parameters !== null) {
      if (typeof config.parameters !== 'object' || Array.isArray(config.parameters)) {
        errors.push({
          field: 'parameters',
          message: 'Parameters must be an object',
          code: 'INVALID_TYPE',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private interpolateParameters(
    params: Record<string, unknown>,
    context: ExecutionContextInterface
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      result[key] = this.interpolateValue(value, context);
    }

    return result;
  }

  private interpolateValue(
    value: unknown,
    context: ExecutionContextInterface
  ): unknown {
    if (typeof value === 'string') {
      // Check if it's a variable reference
      if (value.startsWith('{{') && value.endsWith('}}')) {
        const varName = value.slice(2, -2).trim();
        return context.getVariable(varName);
      }

      // Interpolate embedded variables
      return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const varValue = context.getVariable(varName.trim());

        if (varValue === undefined || varValue === null) {
          return match;
        }

        if (typeof varValue === 'object') {
          return JSON.stringify(varValue);
        }

        return String(varValue);
      });
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.interpolateValue(item, context));
    }

    if (typeof value === 'object' && value !== null) {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.interpolateValue(v, context);
      }
      return result;
    }

    return value;
  }

  /**
   * Set the MCP server provider
   */
  setMCPProvider(provider: MCPServerProvider): void {
    this.mcpProvider = provider;
  }

  /**
   * Get available servers (for UI integration)
   */
  getAvailableServers(): string[] {
    if (this.mcpProvider instanceof MockMCPServerProvider) {
      // For mock provider, return known servers
      return ['filesystem', 'web_search', 'database', 'email'];
    }
    return [];
  }
}
