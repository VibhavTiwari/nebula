/**
 * ExecutionContext - Manages state during workflow execution
 */

import {
  ExecutionContextInterface,
  ExecutionContextState,
  ExecutionLog,
  ExecutionStatus,
  NodeExecutionResult,
  VariableType,
} from './types';

export class ExecutionContext implements ExecutionContextInterface {
  private variables: Record<string, VariableType>;
  private input: Record<string, VariableType>;
  private output: Record<string, VariableType>;
  private currentNodeId: string | null;
  private executionPath: string[];
  private history: NodeExecutionResult[];
  private status: ExecutionStatus;
  private startTime: number;
  private iterationCounts: Record<string, number>;
  private logs: ExecutionLog[];

  constructor(initialState?: Partial<ExecutionContextState>) {
    this.variables = initialState?.variables ?? {};
    this.input = initialState?.input ?? {};
    this.output = initialState?.output ?? {};
    this.currentNodeId = initialState?.currentNodeId ?? null;
    this.executionPath = initialState?.executionPath ?? [];
    this.history = initialState?.history ?? [];
    this.status = initialState?.status ?? 'pending';
    this.startTime = initialState?.startTime ?? Date.now();
    this.iterationCounts = initialState?.iterationCounts ?? {};
    this.logs = [];
  }

  // ============================================================================
  // Variable Management
  // ============================================================================

  getVariable(name: string): VariableType {
    // Support dot notation for nested access
    if (name.includes('.')) {
      return this.getNestedValue(name);
    }

    // Check special namespaces
    if (name === 'input') {
      return this.input;
    }
    if (name === 'output') {
      return this.output;
    }
    if (name.startsWith('input.')) {
      const key = name.substring(6);
      return this.input[key];
    }
    if (name.startsWith('output.')) {
      const key = name.substring(7);
      return this.output[key];
    }

    return this.variables[name];
  }

  private getNestedValue(path: string): VariableType {
    const parts = path.split('.');
    let current: VariableType = this.variables;

    // Check if starting with special namespace
    if (parts[0] === 'input') {
      current = this.input;
      parts.shift();
    } else if (parts[0] === 'output') {
      current = this.output;
      parts.shift();
    } else if (parts[0] === 'state') {
      current = this.variables;
      parts.shift();
    }

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, VariableType>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  setVariable(name: string, value: VariableType): void {
    // Support dot notation for nested setting
    if (name.includes('.')) {
      this.setNestedValue(name, value);
      return;
    }

    this.variables[name] = value;
    this.log('debug', `Variable set: ${name}`, { value });
  }

  private setNestedValue(path: string, value: VariableType): void {
    const parts = path.split('.');
    let target: Record<string, VariableType>;

    // Determine the root object
    if (parts[0] === 'input') {
      target = this.input;
      parts.shift();
    } else if (parts[0] === 'output') {
      target = this.output;
      parts.shift();
    } else if (parts[0] === 'state') {
      target = this.variables;
      parts.shift();
    } else {
      target = this.variables;
    }

    // Navigate to the parent of the final key
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in target) || typeof target[part] !== 'object') {
        target[part] = {};
      }
      target = target[part] as Record<string, VariableType>;
    }

    // Set the final value
    const finalKey = parts[parts.length - 1];
    target[finalKey] = value;
    this.log('debug', `Variable set: ${path}`, { value });
  }

  hasVariable(name: string): boolean {
    if (name.includes('.')) {
      return this.getNestedValue(name) !== undefined;
    }
    return name in this.variables;
  }

  getAllVariables(): Record<string, VariableType> {
    return { ...this.variables };
  }

  // ============================================================================
  // Input/Output Management
  // ============================================================================

  getInput(): Record<string, VariableType> {
    return { ...this.input };
  }

  setInput(input: Record<string, VariableType>): void {
    this.input = { ...input };
    this.log('debug', 'Input set', { input });
  }

  getOutput(): Record<string, VariableType> {
    return { ...this.output };
  }

  setOutput(key: string, value: VariableType): void {
    this.output[key] = value;
    this.log('debug', `Output set: ${key}`, { value });
  }

  // ============================================================================
  // State Management
  // ============================================================================

  getCurrentNodeId(): string | null {
    return this.currentNodeId;
  }

  setCurrentNodeId(nodeId: string): void {
    this.currentNodeId = nodeId;
  }

  getExecutionPath(): string[] {
    return [...this.executionPath];
  }

  addToExecutionPath(nodeId: string): void {
    this.executionPath.push(nodeId);
  }

  // ============================================================================
  // History Management
  // ============================================================================

  getHistory(): NodeExecutionResult[] {
    return [...this.history];
  }

  addToHistory(result: NodeExecutionResult): void {
    this.history.push(result);
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  getStatus(): ExecutionStatus {
    return this.status;
  }

  setStatus(status: ExecutionStatus): void {
    this.status = status;
    this.log('debug', `Status changed to: ${status}`);
  }

  // ============================================================================
  // Iteration Tracking (for loops)
  // ============================================================================

  getIterationCount(loopId: string): number {
    return this.iterationCounts[loopId] ?? 0;
  }

  incrementIterationCount(loopId: string): number {
    const current = this.getIterationCount(loopId);
    this.iterationCounts[loopId] = current + 1;
    return this.iterationCounts[loopId];
  }

  resetIterationCount(loopId: string): void {
    this.iterationCounts[loopId] = 0;
  }

  // ============================================================================
  // Logging
  // ============================================================================

  log(
    level: ExecutionLog['level'],
    message: string,
    data?: Record<string, unknown>
  ): void {
    const log: ExecutionLog = {
      timestamp: Date.now(),
      level,
      message,
      nodeId: this.currentNodeId ?? undefined,
      data,
    };
    this.logs.push(log);
  }

  getLogs(): ExecutionLog[] {
    return [...this.logs];
  }

  // ============================================================================
  // State Snapshot
  // ============================================================================

  getState(): ExecutionContextState {
    return {
      variables: { ...this.variables },
      input: { ...this.input },
      output: { ...this.output },
      currentNodeId: this.currentNodeId,
      executionPath: [...this.executionPath],
      history: [...this.history],
      status: this.status,
      startTime: this.startTime,
      iterationCounts: { ...this.iterationCounts },
    };
  }

  clone(): ExecutionContextInterface {
    const cloned = new ExecutionContext({
      variables: JSON.parse(JSON.stringify(this.variables)),
      input: JSON.parse(JSON.stringify(this.input)),
      output: JSON.parse(JSON.stringify(this.output)),
      currentNodeId: this.currentNodeId,
      executionPath: [...this.executionPath],
      history: [...this.history],
      status: this.status,
      startTime: this.startTime,
      iterationCounts: { ...this.iterationCounts },
    });

    // Copy logs
    for (const log of this.logs) {
      cloned.log(log.level, log.message, log.data);
    }

    return cloned;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get the elapsed time since execution started
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Reset the context for a new execution
   */
  reset(): void {
    this.variables = {};
    this.output = {};
    this.currentNodeId = null;
    this.executionPath = [];
    this.history = [];
    this.status = 'pending';
    this.startTime = Date.now();
    this.iterationCounts = {};
    this.logs = [];
  }

  /**
   * Create a sub-context for nested execution (e.g., inside loops)
   */
  createSubContext(): ExecutionContext {
    return new ExecutionContext({
      variables: JSON.parse(JSON.stringify(this.variables)),
      input: JSON.parse(JSON.stringify(this.input)),
      output: {},
      currentNodeId: null,
      executionPath: [],
      history: [],
      status: 'pending',
      startTime: Date.now(),
      iterationCounts: {},
    });
  }

  /**
   * Merge results from a sub-context back into this context
   */
  mergeSubContext(subContext: ExecutionContext): void {
    // Merge variables
    const subState = subContext.getState();
    for (const [key, value] of Object.entries(subState.variables)) {
      this.variables[key] = value;
    }

    // Merge outputs
    for (const [key, value] of Object.entries(subState.output)) {
      this.output[key] = value;
    }

    // Merge logs
    for (const log of subContext.getLogs()) {
      this.logs.push(log);
    }

    // Merge history
    for (const result of subState.history) {
      this.history.push(result);
    }
  }
}
