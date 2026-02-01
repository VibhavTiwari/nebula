/**
 * useWorkflowExecution Hook
 *
 * Provides a reactive interface for executing workflows and tracking progress.
 * Integrates with the Nebula workflow engine for real-time execution monitoring.
 */

import { useState, useCallback, useRef, useMemo } from "react";
import type { Node, Edge } from "reactflow";
import {
  WorkflowExecutor,
  MockLLMProvider,
  type WorkflowDefinition,
  type NodeDefinition,
  type EdgeDefinition,
  type ExecutionResult,
  type NodeExecutionResult,
  type LLMProvider,
  type VariableType,
} from "@/lib/workflow-engine";

// ── Types ──

export interface ExecutionState {
  isRunning: boolean;
  isPaused: boolean;
  currentNodeId: string | null;
  completedNodes: Set<string>;
  failedNodes: Set<string>;
  logs: ExecutionLogEntry[];
  nodeResults: Map<string, NodeExecutionResult>;
  result: ExecutionResult | null;
  error: Error | null;
  startTime: number | null;
  endTime: number | null;
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  nodeId?: string;
  nodeType?: string;
  nodeLabel?: string;
  data?: Record<string, unknown>;
  duration?: number;
}

export interface NodeExecutionInfo {
  nodeId: string;
  nodeType: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startTime?: number;
  endTime?: number;
  duration?: number;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
}

export interface WorkflowExecutionOptions {
  llmProvider?: LLMProvider;
  maxExecutionTime?: number;
  maxNodeExecutions?: number;
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, result: NodeExecutionResult) => void;
  onLog?: (log: ExecutionLogEntry) => void;
}

export interface UseWorkflowExecutionReturn {
  // State
  isRunning: boolean;
  isPaused: boolean;
  currentNodeId: string | null;
  completedNodes: string[];
  failedNodes: string[];
  logs: ExecutionLogEntry[];
  result: ExecutionResult | null;
  error: Error | null;
  executionTime: number | null;

  // Node info
  getNodeStatus: (nodeId: string) => NodeExecutionInfo["status"];
  getNodeResult: (nodeId: string) => NodeExecutionResult | undefined;

  // Actions
  run: (input?: Record<string, VariableType>) => Promise<ExecutionResult | null>;
  pause: () => void;
  resume: () => Promise<ExecutionResult | null>;
  stop: () => void;
  reset: () => void;
}

// ── Helper: Convert ReactFlow nodes/edges to workflow definition ──

function convertToWorkflowDefinition(
  nodes: Node[],
  edges: Edge[],
  name: string,
  id: string
): WorkflowDefinition {
  const workflowNodes: NodeDefinition[] = nodes.map((node) => ({
    id: node.id,
    type: (node.type || "agent") as NodeDefinition["type"],
    label: node.data?.label,
    config: node.data?.config || {},
    position: node.position,
  }));

  const workflowEdges: EdgeDefinition[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    label: typeof edge.label === "string" ? edge.label : undefined,
  }));

  return {
    id,
    name,
    nodes: workflowNodes,
    edges: workflowEdges,
  };
}

// ── Hook ──

export function useWorkflowExecution(
  nodes: Node[],
  edges: Edge[],
  workflowName: string = "Workflow",
  workflowId: string = "workflow",
  options: WorkflowExecutionOptions = {}
): UseWorkflowExecutionReturn {
  // State
  const [state, setState] = useState<ExecutionState>({
    isRunning: false,
    isPaused: false,
    currentNodeId: null,
    completedNodes: new Set(),
    failedNodes: new Set(),
    logs: [],
    nodeResults: new Map(),
    result: null,
    error: null,
    startTime: null,
    endTime: null,
  });

  // Refs for executor and abort control
  const executorRef = useRef<WorkflowExecutor | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create a log entry with unique ID
  const createLogEntry = useCallback(
    (
      level: ExecutionLogEntry["level"],
      message: string,
      nodeId?: string,
      data?: Record<string, unknown>
    ): ExecutionLogEntry => {
      const node = nodes.find((n) => n.id === nodeId);
      return {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        level,
        message,
        nodeId,
        nodeType: node?.type,
        nodeLabel: node?.data?.label,
        data,
      };
    },
    [nodes]
  );

  // Add log entry
  const addLog = useCallback(
    (log: ExecutionLogEntry) => {
      setState((prev) => ({
        ...prev,
        logs: [...prev.logs, log],
      }));
      options.onLog?.(log);
    },
    [options]
  );

  // Run the workflow
  const run = useCallback(
    async (input: Record<string, VariableType> = {}): Promise<ExecutionResult | null> => {
      // Reset state
      setState((prev) => ({
        ...prev,
        isRunning: true,
        isPaused: false,
        currentNodeId: null,
        completedNodes: new Set(),
        failedNodes: new Set(),
        logs: [],
        nodeResults: new Map(),
        result: null,
        error: null,
        startTime: Date.now(),
        endTime: null,
      }));

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Convert to workflow definition
      const workflow = convertToWorkflowDefinition(nodes, edges, workflowName, workflowId);

      // Create executor
      const llmProvider = options.llmProvider || new MockLLMProvider();
      const executor = new WorkflowExecutor(workflow, {
        llmProvider,
        maxExecutionTime: options.maxExecutionTime,
        maxNodeExecutions: options.maxNodeExecutions,
        onNodeStart: (node, _context) => {
          setState((prev) => ({
            ...prev,
            currentNodeId: node.id,
          }));

          addLog(createLogEntry("info", `Starting node: ${node.label || node.id}`, node.id));
          options.onNodeStart?.(node.id);
        },
        onNodeComplete: (node, result) => {
          const duration = result.endTime ? result.endTime - result.startTime : 0;

          setState((prev) => {
            const newCompleted = new Set(prev.completedNodes);
            const newFailed = new Set(prev.failedNodes);
            const newResults = new Map(prev.nodeResults);

            if (result.status === "completed") {
              newCompleted.add(node.id);
            } else if (result.status === "failed") {
              newFailed.add(node.id);
            }

            newResults.set(node.id, result);

            return {
              ...prev,
              completedNodes: newCompleted,
              failedNodes: newFailed,
              nodeResults: newResults,
              currentNodeId: null,
            };
          });

          addLog({
            ...createLogEntry(
              result.status === "failed" ? "error" : "info",
              `${result.status === "failed" ? "Failed" : "Completed"} node: ${node.label || node.id}`,
              node.id,
              { outputs: result.outputs, error: result.error }
            ),
            duration,
          });

          options.onNodeComplete?.(node.id, result);
        },
      });

      executorRef.current = executor;

      try {
        // Log start
        addLog(createLogEntry("info", "Starting workflow execution"));

        // Run workflow
        const result = await executor.run(input);

        // Update state with result
        setState((prev) => ({
          ...prev,
          isRunning: false,
          result,
          endTime: Date.now(),
        }));

        // Log completion
        addLog(
          createLogEntry(
            result.success ? "info" : "error",
            result.success
              ? `Workflow completed successfully in ${result.executionTime}ms`
              : `Workflow failed: ${result.error?.message || "Unknown error"}`
          )
        );

        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: err,
          endTime: Date.now(),
        }));

        addLog(createLogEntry("error", `Workflow execution error: ${err.message}`));

        return null;
      }
    },
    [nodes, edges, workflowName, workflowId, options, addLog, createLogEntry]
  );

  // Pause execution (for user approval nodes)
  const pause = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: true,
    }));
    addLog(createLogEntry("info", "Workflow paused"));
  }, [addLog, createLogEntry]);

  // Resume execution
  const resume = useCallback(async (): Promise<ExecutionResult | null> => {
    if (!executorRef.current || !state.currentNodeId) return null;

    setState((prev) => ({
      ...prev,
      isPaused: false,
      isRunning: true,
    }));

    addLog(createLogEntry("info", "Resuming workflow execution"));

    try {
      const result = await executorRef.current.resume(state.currentNodeId);

      setState((prev) => ({
        ...prev,
        isRunning: false,
        result,
        endTime: Date.now(),
      }));

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      setState((prev) => ({
        ...prev,
        isRunning: false,
        error: err,
        endTime: Date.now(),
      }));

      return null;
    }
  }, [state.currentNodeId, addLog, createLogEntry]);

  // Stop execution
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();

    setState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      endTime: Date.now(),
    }));

    addLog(createLogEntry("warn", "Workflow execution stopped by user"));
  }, [addLog, createLogEntry]);

  // Reset state
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    executorRef.current = null;

    setState({
      isRunning: false,
      isPaused: false,
      currentNodeId: null,
      completedNodes: new Set(),
      failedNodes: new Set(),
      logs: [],
      nodeResults: new Map(),
      result: null,
      error: null,
      startTime: null,
      endTime: null,
    });
  }, []);

  // Get node status
  const getNodeStatus = useCallback(
    (nodeId: string): NodeExecutionInfo["status"] => {
      if (state.failedNodes.has(nodeId)) return "failed";
      if (state.completedNodes.has(nodeId)) return "completed";
      if (state.currentNodeId === nodeId) return "running";
      return "pending";
    },
    [state.completedNodes, state.failedNodes, state.currentNodeId]
  );

  // Get node result
  const getNodeResult = useCallback(
    (nodeId: string): NodeExecutionResult | undefined => {
      return state.nodeResults.get(nodeId);
    },
    [state.nodeResults]
  );

  // Calculate execution time
  const executionTime = useMemo(() => {
    if (!state.startTime) return null;
    const end = state.endTime || Date.now();
    return end - state.startTime;
  }, [state.startTime, state.endTime]);

  return {
    // State
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    currentNodeId: state.currentNodeId,
    completedNodes: Array.from(state.completedNodes),
    failedNodes: Array.from(state.failedNodes),
    logs: state.logs,
    result: state.result,
    error: state.error,
    executionTime,

    // Node info
    getNodeStatus,
    getNodeResult,

    // Actions
    run,
    pause,
    resume,
    stop,
    reset,
  };
}

export default useWorkflowExecution;
