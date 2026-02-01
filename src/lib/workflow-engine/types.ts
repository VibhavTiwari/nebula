/**
 * Core types for the Nebula Workflow Execution Engine
 */

// ============================================================================
// Basic Types
// ============================================================================

export type VariableType = string | number | boolean | object | null | undefined;

export type NodeType =
  | 'start'
  | 'end'
  | 'agent'
  | 'classify'
  | 'if-else'
  | 'while'
  | 'transform'
  | 'set-state'
  | 'user-approval'
  | 'guardrails'
  | 'file-search'
  | 'mcp';

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'waiting'
  | 'cancelled';

// ============================================================================
// Workflow Definition Types
// ============================================================================

export interface NodeDefinition {
  id: string;
  type: NodeType;
  label?: string;
  config: NodeConfig;
  position?: { x: number; y: number };
}

export interface EdgeDefinition {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version?: string;
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
  variables?: Record<string, VariableType>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Node Configuration Types
// ============================================================================

export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | AgentNodeConfig
  | ClassifyNodeConfig
  | IfElseNodeConfig
  | WhileNodeConfig
  | TransformNodeConfig
  | SetStateNodeConfig
  | UserApprovalNodeConfig
  | GuardrailsNodeConfig
  | FileSearchNodeConfig
  | MCPNodeConfig;

export interface StartNodeConfig {
  inputSchema?: Record<string, unknown>;
}

export interface EndNodeConfig {
  outputMapping?: Record<string, string>;
}

export interface AgentNodeConfig {
  instructions: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
  outputVariable?: string;
}

export interface ClassifyNodeConfig {
  categories: ClassifyCategory[];
  inputVariable?: string;
  outputVariable?: string;
  model?: string;
}

export interface ClassifyCategory {
  id: string;
  name: string;
  description?: string;
  examples?: string[];
  outputHandle?: string;
}

export interface IfElseNodeConfig {
  conditions: IfElseCondition[];
  elseOutputHandle?: string;
}

export interface IfElseCondition {
  id: string;
  expression: string;
  label?: string;
  outputHandle: string;
}

export interface WhileNodeConfig {
  condition: string;
  maxIterations?: number;
  bodyNodes?: string[];
}

export interface TransformNodeConfig {
  code: string;
  inputVariables?: string[];
  outputVariable?: string;
}

export interface SetStateNodeConfig {
  variable: string;
  valueType: 'string' | 'number' | 'boolean' | 'json' | 'expression';
  value: string;
}

export interface UserApprovalNodeConfig {
  message: string;
  approveLabel?: string;
  rejectLabel?: string;
  timeout?: number;
  timeoutAction?: 'approve' | 'reject' | 'fail';
}

export interface GuardrailsNodeConfig {
  rules: GuardrailRule[];
  mode: 'input' | 'output' | 'both';
  onFail: 'block' | 'warn' | 'continue';
}

export interface GuardrailRule {
  id: string;
  name: string;
  type: 'regex' | 'keyword' | 'llm' | 'custom';
  config: Record<string, unknown>;
  message?: string;
}

export interface FileSearchNodeConfig {
  vectorStoreIds: string[];
  query?: string;
  queryVariable?: string;
  maxResults?: number;
  outputVariable?: string;
}

export interface MCPNodeConfig {
  serverId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  outputVariable?: string;
}

// ============================================================================
// Execution Types
// ============================================================================

export interface ExecutionResult {
  success: boolean;
  status: ExecutionStatus;
  outputs: Record<string, VariableType>;
  error?: ExecutionError;
  logs: ExecutionLog[];
  executionTime: number;
  nodeResults: Map<string, NodeExecutionResult>;
}

export interface NodeExecutionResult {
  nodeId: string;
  nodeType: NodeType;
  status: ExecutionStatus;
  inputs: Record<string, VariableType>;
  outputs: Record<string, VariableType>;
  error?: ExecutionError;
  startTime: number;
  endTime?: number;
  nextNodes?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExecutionError {
  code: string;
  message: string;
  nodeId?: string;
  stack?: string;
  details?: Record<string, unknown>;
}

export interface ExecutionLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Execution Context Types
// ============================================================================

export interface ExecutionContextState {
  variables: Record<string, VariableType>;
  input: Record<string, VariableType>;
  output: Record<string, VariableType>;
  currentNodeId: string | null;
  executionPath: string[];
  history: NodeExecutionResult[];
  status: ExecutionStatus;
  startTime: number;
  iterationCounts: Record<string, number>;
}

// ============================================================================
// Node Executor Interface
// ============================================================================

export interface NodeExecutor<T extends NodeConfig = NodeConfig> {
  readonly nodeType: NodeType;

  execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: T
  ): Promise<NodeExecutionResult>;

  validate?(config: T): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ============================================================================
// Execution Context Interface
// ============================================================================

export interface ExecutionContextInterface {
  // Variable management
  getVariable(name: string): VariableType;
  setVariable(name: string, value: VariableType): void;
  hasVariable(name: string): boolean;
  getAllVariables(): Record<string, VariableType>;

  // Input/Output
  getInput(): Record<string, VariableType>;
  setInput(input: Record<string, VariableType>): void;
  getOutput(): Record<string, VariableType>;
  setOutput(key: string, value: VariableType): void;

  // State management
  getCurrentNodeId(): string | null;
  setCurrentNodeId(nodeId: string): void;
  getExecutionPath(): string[];
  addToExecutionPath(nodeId: string): void;

  // History
  getHistory(): NodeExecutionResult[];
  addToHistory(result: NodeExecutionResult): void;

  // Status
  getStatus(): ExecutionStatus;
  setStatus(status: ExecutionStatus): void;

  // Iteration tracking (for loops)
  getIterationCount(loopId: string): number;
  incrementIterationCount(loopId: string): number;
  resetIterationCount(loopId: string): void;

  // Logging
  log(level: ExecutionLog['level'], message: string, data?: Record<string, unknown>): void;
  getLogs(): ExecutionLog[];

  // State snapshot
  getState(): ExecutionContextState;
  clone(): ExecutionContextInterface;
}

// ============================================================================
// LLM Provider Types
// ============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: LLMTool[];
  stopSequences?: string[];
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  toolCalls?: LLMToolCall[];
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMProvider {
  readonly name: string;
  readonly models: string[];

  chat(request: LLMRequest): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
}

// ============================================================================
// Workflow Executor Options
// ============================================================================

export interface WorkflowExecutorOptions {
  llmProvider?: LLMProvider;
  maxExecutionTime?: number;
  maxNodeExecutions?: number;
  onNodeStart?: (node: NodeDefinition, context: ExecutionContextInterface) => void;
  onNodeComplete?: (node: NodeDefinition, result: NodeExecutionResult) => void;
  onLog?: (log: ExecutionLog) => void;
  onWaitingForApproval?: (
    node: NodeDefinition,
    context: ExecutionContextInterface
  ) => Promise<boolean>;
}
