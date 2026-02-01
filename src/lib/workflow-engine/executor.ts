/**
 * Workflow Executor
 *
 * Main execution engine that traverses workflow graphs and executes nodes.
 */

import { ExecutionContext } from './context';
import {
  AgentExecutor,
  ClassifyExecutor,
  FileSearchExecutor,
  GuardrailsExecutor,
  IfElseExecutor,
  MCPExecutor,
  SetStateExecutor,
  TransformExecutor,
  UserApprovalExecutor,
  WhileExecutor,
} from './nodes';
import {
  EdgeDefinition,
  ExecutionContextInterface,
  ExecutionResult,
  LLMProvider,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  NodeType,
  VariableType,
  WorkflowDefinition,
  WorkflowExecutorOptions,
} from './types';

// Default limits
const DEFAULT_MAX_EXECUTION_TIME = 300000; // 5 minutes
const DEFAULT_MAX_NODE_EXECUTIONS = 1000;

export class WorkflowExecutor {
  private workflow: WorkflowDefinition;
  private options: WorkflowExecutorOptions;
  private nodeExecutors: Map<NodeType, NodeExecutor>;
  private context: ExecutionContext;
  private nodeMap: Map<string, NodeDefinition>;
  private edgeMap: Map<string, EdgeDefinition[]>;
  private reverseEdgeMap: Map<string, EdgeDefinition[]>;
  private executionCount: number = 0;
  private startTime: number = 0;

  constructor(workflow: WorkflowDefinition, options: WorkflowExecutorOptions = {}) {
    this.workflow = workflow;
    this.options = {
      maxExecutionTime: DEFAULT_MAX_EXECUTION_TIME,
      maxNodeExecutions: DEFAULT_MAX_NODE_EXECUTIONS,
      ...options,
    };

    // Initialize context
    this.context = new ExecutionContext({
      variables: workflow.variables ?? {},
    });

    // Build node and edge maps for quick lookup
    this.nodeMap = new Map();
    for (const node of workflow.nodes) {
      this.nodeMap.set(node.id, node);
    }

    this.edgeMap = new Map();
    this.reverseEdgeMap = new Map();
    for (const edge of workflow.edges) {
      // Forward edges (source -> targets)
      const sourceEdges = this.edgeMap.get(edge.source) ?? [];
      sourceEdges.push(edge);
      this.edgeMap.set(edge.source, sourceEdges);

      // Reverse edges (target -> sources)
      const targetEdges = this.reverseEdgeMap.get(edge.target) ?? [];
      targetEdges.push(edge);
      this.reverseEdgeMap.set(edge.target, targetEdges);
    }

    // Initialize node executors
    this.nodeExecutors = new Map();
    this.initializeExecutors();
  }

  private initializeExecutors(): void {
    const llmProvider = this.options.llmProvider;

    // Register all node executors
    const agentExecutor = new AgentExecutor(llmProvider);
    const classifyExecutor = new ClassifyExecutor(llmProvider);
    const guardrailsExecutor = new GuardrailsExecutor(llmProvider);

    this.nodeExecutors.set('agent', agentExecutor);
    this.nodeExecutors.set('classify', classifyExecutor);
    this.nodeExecutors.set('if-else', new IfElseExecutor());
    this.nodeExecutors.set('while', new WhileExecutor());
    this.nodeExecutors.set('transform', new TransformExecutor());
    this.nodeExecutors.set('set-state', new SetStateExecutor());
    this.nodeExecutors.set('user-approval', new UserApprovalExecutor());
    this.nodeExecutors.set('guardrails', guardrailsExecutor);
    this.nodeExecutors.set('file-search', new FileSearchExecutor());
    this.nodeExecutors.set('mcp', new MCPExecutor());
  }

  /**
   * Run the workflow with the given input
   */
  async run(input: Record<string, VariableType> = {}): Promise<ExecutionResult> {
    this.startTime = Date.now();
    this.executionCount = 0;

    // Reset and initialize context
    this.context.reset();
    this.context.setInput(input);
    this.context.setStatus('running');

    this.context.log('info', `Starting workflow execution: ${this.workflow.name}`, {
      workflowId: this.workflow.id,
      inputKeys: Object.keys(input),
    });

    // Initialize workflow variables
    if (this.workflow.variables) {
      for (const [key, value] of Object.entries(this.workflow.variables)) {
        this.context.setVariable(key, value);
      }
    }

    const nodeResults = new Map<string, NodeExecutionResult>();

    try {
      // Find the start node
      const startNode = this.findStartNode();
      if (!startNode) {
        throw new Error('No start node found in workflow');
      }

      // Execute the workflow starting from the start node
      await this.executeFromNode(startNode, nodeResults);

      // Check final status
      const status = this.context.getStatus();

      this.context.log('info', `Workflow execution completed with status: ${status}`, {
        executionTime: Date.now() - this.startTime,
        nodeExecutions: this.executionCount,
      });

      return {
        success: status === 'completed',
        status,
        outputs: this.context.getOutput(),
        logs: this.context.getLogs(),
        executionTime: Date.now() - this.startTime,
        nodeResults,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.context.log('error', `Workflow execution failed: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });

      this.context.setStatus('failed');

      return {
        success: false,
        status: 'failed',
        outputs: this.context.getOutput(),
        error: {
          code: 'WORKFLOW_EXECUTION_ERROR',
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
        logs: this.context.getLogs(),
        executionTime: Date.now() - this.startTime,
        nodeResults,
      };
    }
  }

  /**
   * Resume a paused workflow (e.g., after user approval)
   */
  async resume(
    nodeId: string,
    resumeData?: Record<string, VariableType>
  ): Promise<ExecutionResult> {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // Merge resume data into context
    if (resumeData) {
      for (const [key, value] of Object.entries(resumeData)) {
        this.context.setVariable(key, value);
      }
    }

    this.context.setStatus('running');
    const nodeResults = new Map<string, NodeExecutionResult>();

    // Re-execute from the paused node
    await this.executeFromNode(node, nodeResults);

    const status = this.context.getStatus();

    return {
      success: status === 'completed',
      status,
      outputs: this.context.getOutput(),
      logs: this.context.getLogs(),
      executionTime: Date.now() - this.startTime,
      nodeResults,
    };
  }

  /**
   * Execute workflow starting from a specific node
   */
  private async executeFromNode(
    startNode: NodeDefinition,
    nodeResults: Map<string, NodeExecutionResult>
  ): Promise<void> {
    const queue: NodeDefinition[] = [startNode];
    const visited = new Set<string>();

    while (queue.length > 0) {
      // Check execution limits
      this.checkLimits();

      const currentNode = queue.shift()!;

      // Skip if already visited in this execution cycle
      // (unless it's a while loop that needs re-evaluation)
      if (visited.has(currentNode.id) && currentNode.type !== 'while') {
        continue;
      }

      this.context.setCurrentNodeId(currentNode.id);
      this.context.addToExecutionPath(currentNode.id);

      // Fire onNodeStart callback
      if (this.options.onNodeStart) {
        this.options.onNodeStart(currentNode, this.context);
      }

      // Execute the node
      const result = await this.executeNode(currentNode);
      nodeResults.set(currentNode.id, result);
      this.context.addToHistory(result);
      this.executionCount++;

      // Fire onNodeComplete callback
      if (this.options.onNodeComplete) {
        this.options.onNodeComplete(currentNode, result);
      }

      // Handle result
      if (result.status === 'failed') {
        this.context.setStatus('failed');
        return;
      }

      if (result.status === 'waiting') {
        // Workflow is paused (e.g., waiting for user approval)
        this.context.setStatus('waiting');

        // Handle waiting callback
        if (this.options.onWaitingForApproval && currentNode.type === 'user-approval') {
          const approved = await this.options.onWaitingForApproval(currentNode, this.context);

          if (approved) {
            UserApprovalExecutor.approve(currentNode.id);
          } else {
            UserApprovalExecutor.reject(currentNode.id);
          }

          // Re-queue the node to process the approval
          queue.unshift(currentNode);
          continue;
        }

        return;
      }

      // Mark as visited for non-loop nodes
      if (currentNode.type !== 'while') {
        visited.add(currentNode.id);
      }

      // Determine next nodes
      const nextNodes = this.getNextNodes(currentNode, result);

      // Handle while loop continuation
      if (currentNode.type === 'while' && result.status === 'running') {
        // Execute body nodes first, then re-check the while condition
        const bodyNodes = result.nextNodes ?? [];

        for (const bodyNodeId of bodyNodes) {
          const bodyNode = this.nodeMap.get(bodyNodeId);
          if (bodyNode) {
            queue.push(bodyNode);
          }
        }

        // Add the while node back to re-check condition after body
        queue.push(currentNode);
        continue;
      }

      // Add next nodes to queue
      for (const nextNode of nextNodes) {
        if (!visited.has(nextNode.id) || nextNode.type === 'while') {
          queue.push(nextNode);
        }
      }

      // Check for end node
      if (currentNode.type === 'end') {
        this.context.setStatus('completed');
        return;
      }
    }

    // If we get here without hitting an end node, mark as completed
    if (this.context.getStatus() === 'running') {
      this.context.setStatus('completed');
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: NodeDefinition): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    // Handle special node types
    if (node.type === 'start') {
      return this.executeStartNode(node, startTime);
    }

    if (node.type === 'end') {
      return this.executeEndNode(node, startTime);
    }

    // Get the executor for this node type
    const executor = this.nodeExecutors.get(node.type);

    if (!executor) {
      this.context.log('error', `No executor found for node type: ${node.type}`);

      return {
        nodeId: node.id,
        nodeType: node.type,
        status: 'failed',
        inputs: {},
        outputs: {},
        error: {
          code: 'EXECUTOR_NOT_FOUND',
          message: `No executor registered for node type: ${node.type}`,
          nodeId: node.id,
        },
        startTime,
        endTime: Date.now(),
      };
    }

    try {
      // Validate config if validator exists
      if (executor.validate) {
        const validation = executor.validate(node.config);
        if (!validation.valid) {
          this.context.log('error', `Node configuration validation failed`, {
            nodeId: node.id,
            errors: validation.errors,
          });

          return {
            nodeId: node.id,
            nodeType: node.type,
            status: 'failed',
            inputs: {},
            outputs: {},
            error: {
              code: 'VALIDATION_ERROR',
              message: `Configuration validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
              nodeId: node.id,
              details: { validationErrors: validation.errors },
            },
            startTime,
            endTime: Date.now(),
          };
        }
      }

      // Execute the node
      return await executor.execute(node, this.context, node.config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.context.log('error', `Node execution error: ${errorMessage}`, {
        nodeId: node.id,
        nodeType: node.type,
      });

      return {
        nodeId: node.id,
        nodeType: node.type,
        status: 'failed',
        inputs: {},
        outputs: {},
        error: {
          code: 'NODE_EXECUTION_ERROR',
          message: errorMessage,
          nodeId: node.id,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  /**
   * Execute a start node
   */
  private executeStartNode(node: NodeDefinition, startTime: number): NodeExecutionResult {
    this.context.log('info', 'Executing start node');

    // Start node just passes through input
    const input = this.context.getInput();

    return {
      nodeId: node.id,
      nodeType: 'start',
      status: 'completed',
      inputs: {},
      outputs: { input },
      startTime,
      endTime: Date.now(),
    };
  }

  /**
   * Execute an end node
   */
  private executeEndNode(node: NodeDefinition, startTime: number): NodeExecutionResult {
    this.context.log('info', 'Executing end node');

    // End node collects all outputs
    const outputs = this.context.getOutput();
    const variables = this.context.getAllVariables();

    // Apply output mapping if configured
    const config = node.config as { outputMapping?: Record<string, string> };
    if (config.outputMapping) {
      for (const [outputKey, variablePath] of Object.entries(config.outputMapping)) {
        const value = this.context.getVariable(variablePath);
        this.context.setOutput(outputKey, value);
      }
    }

    return {
      nodeId: node.id,
      nodeType: 'end',
      status: 'completed',
      inputs: { variables, collectedOutputs: outputs },
      outputs: this.context.getOutput(),
      startTime,
      endTime: Date.now(),
    };
  }

  /**
   * Get the next nodes to execute based on edges and result
   */
  private getNextNodes(
    currentNode: NodeDefinition,
    result: NodeExecutionResult
  ): NodeDefinition[] {
    const nextNodes: NodeDefinition[] = [];
    const edges = this.edgeMap.get(currentNode.id) ?? [];

    // Check if result specifies next nodes (for branching)
    if (result.nextNodes && result.nextNodes.length > 0) {
      // Result specified which output handle(s) to follow
      for (const handleOrId of result.nextNodes) {
        // First, check if it's a direct node ID
        const directNode = this.nodeMap.get(handleOrId);
        if (directNode) {
          nextNodes.push(directNode);
          continue;
        }

        // Otherwise, find edges matching the output handle
        for (const edge of edges) {
          if (edge.sourceHandle === handleOrId) {
            const targetNode = this.nodeMap.get(edge.target);
            if (targetNode) {
              nextNodes.push(targetNode);
            }
          }
        }
      }
    } else {
      // Follow all outgoing edges
      for (const edge of edges) {
        const targetNode = this.nodeMap.get(edge.target);
        if (targetNode) {
          nextNodes.push(targetNode);
        }
      }
    }

    return nextNodes;
  }

  /**
   * Find the start node in the workflow
   */
  private findStartNode(): NodeDefinition | undefined {
    return this.workflow.nodes.find((node) => node.type === 'start');
  }

  /**
   * Check execution limits
   */
  private checkLimits(): void {
    // Check execution time
    const elapsed = Date.now() - this.startTime;
    if (elapsed > (this.options.maxExecutionTime ?? DEFAULT_MAX_EXECUTION_TIME)) {
      throw new Error(
        `Workflow execution timeout: exceeded ${this.options.maxExecutionTime}ms`
      );
    }

    // Check node execution count
    if (this.executionCount >= (this.options.maxNodeExecutions ?? DEFAULT_MAX_NODE_EXECUTIONS)) {
      throw new Error(
        `Workflow execution limit: exceeded ${this.options.maxNodeExecutions} node executions`
      );
    }
  }

  /**
   * Get the current execution context
   */
  getContext(): ExecutionContextInterface {
    return this.context;
  }

  /**
   * Get workflow definition
   */
  getWorkflow(): WorkflowDefinition {
    return this.workflow;
  }

  /**
   * Update LLM provider
   */
  setLLMProvider(provider: LLMProvider): void {
    this.options.llmProvider = provider;

    // Update executors that use LLM
    const agentExecutor = this.nodeExecutors.get('agent') as AgentExecutor | undefined;
    if (agentExecutor) {
      agentExecutor.setLLMProvider(provider);
    }

    const classifyExecutor = this.nodeExecutors.get('classify') as ClassifyExecutor | undefined;
    if (classifyExecutor) {
      classifyExecutor.setLLMProvider(provider);
    }

    const guardrailsExecutor = this.nodeExecutors.get('guardrails') as GuardrailsExecutor | undefined;
    if (guardrailsExecutor) {
      guardrailsExecutor.setLLMProvider(provider);
    }
  }

  /**
   * Register a custom node executor
   */
  registerExecutor(executor: NodeExecutor): void {
    this.nodeExecutors.set(executor.nodeType, executor);
  }

  /**
   * Validate the workflow definition
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for start node
    const startNodes = this.workflow.nodes.filter((n) => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have a start node');
    } else if (startNodes.length > 1) {
      errors.push('Workflow can only have one start node');
    }

    // Check for end node
    const endNodes = this.workflow.nodes.filter((n) => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Workflow must have at least one end node');
    }

    // Check for orphan nodes (no incoming or outgoing edges, except start/end)
    for (const node of this.workflow.nodes) {
      if (node.type === 'start') {
        // Start should have no incoming edges
        const incoming = this.reverseEdgeMap.get(node.id) ?? [];
        if (incoming.length > 0) {
          errors.push(`Start node "${node.id}" should not have incoming edges`);
        }
        continue;
      }

      if (node.type === 'end') {
        // End should have no outgoing edges
        const outgoing = this.edgeMap.get(node.id) ?? [];
        if (outgoing.length > 0) {
          errors.push(`End node "${node.id}" should not have outgoing edges`);
        }
        continue;
      }

      // Other nodes should have at least one incoming edge
      const incoming = this.reverseEdgeMap.get(node.id) ?? [];
      if (incoming.length === 0) {
        errors.push(`Node "${node.id}" has no incoming edges (orphan node)`);
      }
    }

    // Validate individual node configs
    for (const node of this.workflow.nodes) {
      if (node.type === 'start' || node.type === 'end') continue;

      const executor = this.nodeExecutors.get(node.type);
      if (executor?.validate) {
        const result = executor.validate(node.config);
        if (!result.valid) {
          for (const error of result.errors) {
            errors.push(`Node "${node.id}": ${error.message}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
