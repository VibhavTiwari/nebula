/**
 * Nebula Workflow Execution Engine
 *
 * A TypeScript-based execution engine for running agent workflows.
 *
 * @example
 * ```typescript
 * import { WorkflowExecutor, MockLLMProvider } from './workflow-engine';
 *
 * const workflow = {
 *   id: 'my-workflow',
 *   name: 'My Workflow',
 *   nodes: [
 *     { id: 'start', type: 'start', config: {} },
 *     { id: 'agent', type: 'agent', config: { instructions: 'Process the input' } },
 *     { id: 'end', type: 'end', config: {} },
 *   ],
 *   edges: [
 *     { id: 'e1', source: 'start', target: 'agent' },
 *     { id: 'e2', source: 'agent', target: 'end' },
 *   ],
 * };
 *
 * const executor = new WorkflowExecutor(workflow, {
 *   llmProvider: new MockLLMProvider(),
 * });
 *
 * const result = await executor.run({ input: 'Hello' });
 * console.log(result.outputs);
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

export type {
  // Basic types
  VariableType,
  NodeType,
  ExecutionStatus,

  // Workflow definition
  WorkflowDefinition,
  NodeDefinition,
  EdgeDefinition,
  NodeConfig,

  // Node configurations
  StartNodeConfig,
  EndNodeConfig,
  AgentNodeConfig,
  ClassifyNodeConfig,
  ClassifyCategory,
  IfElseNodeConfig,
  IfElseCondition,
  WhileNodeConfig,
  TransformNodeConfig,
  SetStateNodeConfig,
  UserApprovalNodeConfig,
  GuardrailsNodeConfig,
  GuardrailRule,
  FileSearchNodeConfig,
  MCPNodeConfig,

  // Execution types
  ExecutionResult,
  NodeExecutionResult,
  ExecutionError,
  ExecutionLog,
  ExecutionContextState,

  // Interfaces
  NodeExecutor,
  ExecutionContextInterface,
  ValidationResult,
  ValidationError,

  // LLM types
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMTool,
  LLMToolCall,
  LLMProvider,

  // Options
  WorkflowExecutorOptions,
} from './types';

// ============================================================================
// Core Classes
// ============================================================================

export { ExecutionContext } from './context';
export { WorkflowExecutor } from './executor';

// ============================================================================
// Expression Evaluator
// ============================================================================

export {
  ExpressionEvaluator,
  ExpressionError,
  evaluateExpression,
  evaluateCondition,
} from './expression-evaluator';

// ============================================================================
// LLM Providers
// ============================================================================

export {
  MockLLMProvider,
  OpenAIProvider,
  AnthropicProvider,
  ProviderRegistry,
  providerRegistry,
  createMockProvider,
  createToolCallingMockProvider,
} from './llm-provider';

export type {
  MockLLMProviderOptions,
  OpenAIProviderConfig,
  AnthropicProviderConfig,
} from './llm-provider';

// ============================================================================
// Node Executors
// ============================================================================

export {
  AgentExecutor,
  ClassifyExecutor,
  IfElseExecutor,
  WhileExecutor,
  TransformExecutor,
  SetStateExecutor,
  UserApprovalExecutor,
  GuardrailsExecutor,
  FileSearchExecutor,
  MCPExecutor,
  MockVectorStoreProvider,
  MockMCPServerProvider,
} from './nodes';

export type {
  ApprovalState,
  GuardrailValidationResult,
  FileSearchResult,
  VectorStoreProvider,
  MCPToolResult,
  MCPServerProvider,
} from './nodes';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a simple workflow with start and end nodes
 */
export function createWorkflow(
  name: string,
  nodes: Array<Omit<import('./types').NodeDefinition, 'id'> & { id?: string }>,
  edges: Array<Omit<import('./types').EdgeDefinition, 'id'> & { id?: string }>
): import('./types').WorkflowDefinition {
  // Auto-generate IDs if not provided
  const processedNodes = nodes.map((node, index) => ({
    ...node,
    id: node.id ?? `node-${index}`,
  }));

  const processedEdges = edges.map((edge, index) => ({
    ...edge,
    id: edge.id ?? `edge-${index}`,
  }));

  return {
    id: `workflow-${Date.now()}`,
    name,
    nodes: processedNodes as import('./types').NodeDefinition[],
    edges: processedEdges as import('./types').EdgeDefinition[],
  };
}

/**
 * Create a basic linear workflow with predefined structure
 */
export function createLinearWorkflow(
  name: string,
  agentInstructions: string
): import('./types').WorkflowDefinition {
  return createWorkflow(
    name,
    [
      { id: 'start', type: 'start', config: {} },
      {
        id: 'agent',
        type: 'agent',
        config: {
          instructions: agentInstructions,
          outputVariable: 'response',
        },
      },
      { id: 'end', type: 'end', config: {} },
    ],
    [
      { id: 'e1', source: 'start', target: 'agent' },
      { id: 'e2', source: 'agent', target: 'end' },
    ]
  );
}

/**
 * Validate a workflow definition
 *
 * Example usage:
 * ```typescript
 * import { WorkflowExecutor } from './workflow-engine';
 * const executor = new WorkflowExecutor(workflow);
 * const { valid, errors } = executor.validate();
 * ```
 */
export { WorkflowExecutor as WorkflowValidator } from './executor';
