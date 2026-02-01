/**
 * Evaluate View Component
 *
 * Test the workflow with sample inputs and view real-time execution.
 * Features JSON input editor, execution visualization, and history.
 */

import { useState, useCallback, useMemo } from "react";
import type { Node, Edge } from "reactflow";
import clsx from "clsx";
import { ExecutionVisualizer } from "./ExecutionVisualizer";
import { useWorkflowExecution, type ExecutionLogEntry } from "@/hooks/useWorkflowExecution";
import { type VariableType } from "@/lib/workflow-engine";

// ── Types ──

interface EvaluateViewProps {
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
  workflowId?: string;
}

interface TestRun {
  id: string;
  timestamp: number;
  input: Record<string, unknown>;
  success: boolean;
  executionTime: number;
  outputs: Record<string, unknown>;
  error?: string;
}

// ── JSON Editor Component ──

interface JSONEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

function JSONEditor({ value, onChange, error, placeholder }: JSONEditorProps) {
  const lines = value.split("\n");
  const lineCount = Math.max(lines.length, 5);

  return (
    <div className="relative">
      <div className="flex bg-white border border-surface-3 rounded-lg overflow-hidden">
        {/* Line numbers */}
        <div className="flex flex-col items-end py-3 px-2 bg-surface-1 border-r border-surface-3 select-none">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i} className="text-[10px] text-gray-400 leading-5 font-mono">
              {i + 1}
            </span>
          ))}
        </div>

        {/* Editor */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={clsx(
            "flex-1 p-3 text-xs font-mono text-gray-700 resize-none focus:outline-none leading-5 min-h-[120px]",
            error && "bg-red-50"
          )}
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

// ── Log Entry Component ──

interface LogEntryRowProps {
  log: ExecutionLogEntry;
}

function LogEntryRow({ log }: LogEntryRowProps) {
  const levelColors = {
    debug: "text-gray-500 bg-gray-50",
    info: "text-blue-600 bg-blue-50",
    warn: "text-yellow-600 bg-yellow-50",
    error: "text-red-600 bg-red-50",
  };

  const levelIcons = {
    debug: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
    info: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    warn: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    error: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div
      className={clsx(
        "flex items-start gap-2 px-3 py-2 border-b border-surface-3 last:border-b-0 transition-colors",
        levelColors[log.level]
      )}
    >
      {/* Level icon */}
      <span className="mt-0.5 shrink-0">{levelIcons[log.level]}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{log.message}</span>
          {log.nodeLabel && (
            <span className="text-[10px] px-1.5 py-0.5 bg-white/50 rounded">
              {log.nodeLabel}
            </span>
          )}
        </div>
        {log.duration !== undefined && (
          <span className="text-[10px] opacity-75">{log.duration}ms</span>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-[10px] opacity-75 shrink-0 tabular-nums">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

// ── Test Run History Item ──

interface TestRunItemProps {
  run: TestRun;
  isSelected: boolean;
  onClick: () => void;
}

function TestRunItem({ run, isSelected, onClick }: TestRunItemProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-3 py-2 border-b border-surface-3 transition-colors",
        isSelected ? "bg-nebula-50" : "bg-white hover:bg-surface-1"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "w-2 h-2 rounded-full",
              run.success ? "bg-green-500" : "bg-red-500"
            )}
          />
          <span className="text-xs font-medium text-gray-700">
            {run.success ? "Success" : "Failed"}
          </span>
        </div>
        <span className="text-[10px] text-surface-dark-4">
          {run.executionTime}ms
        </span>
      </div>
      <div className="text-[10px] text-surface-dark-4 mt-1">
        {new Date(run.timestamp).toLocaleString()}
      </div>
    </button>
  );
}

// ── Main Component ──

export function EvaluateView({
  nodes,
  edges,
  workflowName,
  workflowId = crypto.randomUUID(),
}: EvaluateViewProps) {
  // State
  const [inputJSON, setInputJSON] = useState('{\n  "userInput": "Hello, world!"\n}');
  const [jsonError, setJsonError] = useState<string | undefined>();
  const [testHistory, setTestHistory] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Workflow execution hook
  const {
    isRunning,
    currentNodeId,
    completedNodes,
    failedNodes,
    logs,
    result,
    error,
    executionTime,
    run,
    stop,
    reset,
  } = useWorkflowExecution(nodes, edges, workflowName, workflowId);

  // Parse and validate JSON input
  const parseInput = useCallback((): Record<string, VariableType> | null => {
    try {
      const parsed = JSON.parse(inputJSON) as Record<string, VariableType>;
      setJsonError(undefined);
      return parsed;
    } catch (e) {
      const err = e instanceof Error ? e.message : "Invalid JSON";
      setJsonError(err);
      return null;
    }
  }, [inputJSON]);

  // Handle JSON input change
  const handleInputChange = useCallback((value: string) => {
    setInputJSON(value);
    try {
      JSON.parse(value);
      setJsonError(undefined);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Invalid JSON";
      setJsonError(err);
    }
  }, []);

  // Run workflow
  const handleRun = useCallback(async () => {
    const input = parseInput();
    if (!input) return;

    reset();
    const runResult = await run(input);

    if (runResult) {
      const testRun: TestRun = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        input,
        success: runResult.success,
        executionTime: runResult.executionTime,
        outputs: runResult.outputs,
        error: runResult.error?.message,
      };

      setTestHistory((prev) => [testRun, ...prev.slice(0, 9)]); // Keep last 10 runs
      setSelectedRunId(testRun.id);
    }
  }, [parseInput, reset, run]);

  // Clear input
  const handleClear = useCallback(() => {
    setInputJSON('{\n  \n}');
    setJsonError(undefined);
    reset();
  }, [reset]);

  // Get selected run for history display
  const selectedRun = useMemo(() => {
    return testHistory.find((r) => r.id === selectedRunId);
  }, [testHistory, selectedRunId]);

  return (
    <div className="flex-1 flex bg-surface-1 overflow-hidden">
      {/* Left panel: Input and Visualization */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-surface-3">
        {/* Input section */}
        <div className="p-4 border-b border-surface-3 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-800">Input Variables</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                disabled={isRunning}
                className="nebula-btn-secondary text-xs"
              >
                Clear
              </button>
              <button
                onClick={isRunning ? stop : handleRun}
                disabled={!!jsonError}
                className={clsx(
                  "nebula-btn-primary text-xs flex items-center gap-1.5",
                  isRunning && "bg-red-500 hover:bg-red-600"
                )}
              >
                {isRunning ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 10h6v4H9z"
                      />
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Run
                  </>
                )}
              </button>
            </div>
          </div>

          <JSONEditor
            value={inputJSON}
            onChange={handleInputChange}
            error={jsonError}
            placeholder='{\n  "key": "value"\n}'
          />
        </div>

        {/* Execution visualization */}
        <div className="p-4 border-b border-surface-3">
          <ExecutionVisualizer
            nodes={nodes}
            edges={edges}
            currentNodeId={currentNodeId}
            completedNodes={completedNodes}
            failedNodes={failedNodes}
            isRunning={isRunning}
          />
        </div>

        {/* Execution log */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-surface-3 bg-surface-1">
            <h3 className="text-xs font-medium text-gray-700">Execution Log</h3>
            {executionTime !== null && (
              <span className="text-[10px] text-surface-dark-4">
                Total: {executionTime}ms
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-surface-dark-4">
                {isRunning ? (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Executing workflow...
                  </div>
                ) : (
                  "Run workflow to see execution log"
                )}
              </div>
            ) : (
              <div>
                {logs.map((log) => (
                  <LogEntryRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel: Output and History */}
      <div className="w-80 flex flex-col bg-white">
        {/* Output section */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-surface-3">
          <div className="flex items-center justify-between px-4 py-2 border-b border-surface-3 bg-surface-1">
            <h3 className="text-xs font-medium text-gray-700">Output</h3>
            {result && (
              <span
                className={clsx(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  result.success
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                {result.success ? "Success" : "Failed"}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-red-700">Error</div>
                    <div className="text-xs text-red-600 mt-1">{error.message}</div>
                  </div>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-3">
                {/* Execution summary */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-surface-1 rounded-lg">
                    <div className="text-[10px] text-surface-dark-4">Execution Time</div>
                    <div className="text-sm font-medium text-gray-800">
                      {result.executionTime}ms
                    </div>
                  </div>
                  <div className="p-2 bg-surface-1 rounded-lg">
                    <div className="text-[10px] text-surface-dark-4">Nodes Executed</div>
                    <div className="text-sm font-medium text-gray-800">
                      {completedNodes.length + failedNodes.length}
                    </div>
                  </div>
                </div>

                {/* Output data */}
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-2">Output Data</div>
                  <pre className="p-3 bg-surface-1 rounded-lg text-xs font-mono text-gray-700 overflow-x-auto">
                    {JSON.stringify(result.outputs, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-surface-dark-4">
                Run workflow to see output
              </div>
            )}
          </div>
        </div>

        {/* History section */}
        <div className="h-64 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-surface-3 bg-surface-1">
            <h3 className="text-xs font-medium text-gray-700">Test History</h3>
            {testHistory.length > 0 && (
              <button
                onClick={() => setTestHistory([])}
                className="text-[10px] text-surface-dark-4 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {testHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-surface-dark-4">
                No test runs yet
              </div>
            ) : (
              <div>
                {testHistory.map((run) => (
                  <TestRunItem
                    key={run.id}
                    run={run}
                    isSelected={selectedRunId === run.id}
                    onClick={() => setSelectedRunId(run.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected run details */}
        {selectedRun && (
          <div className="border-t border-surface-3 p-3 bg-surface-1">
            <div className="text-xs font-medium text-gray-700 mb-2">Run Details</div>
            <div className="space-y-2">
              <div>
                <div className="text-[10px] text-surface-dark-4">Input</div>
                <pre className="text-[10px] font-mono text-gray-600 truncate">
                  {JSON.stringify(selectedRun.input)}
                </pre>
              </div>
              {selectedRun.error && (
                <div>
                  <div className="text-[10px] text-red-600">Error</div>
                  <div className="text-[10px] text-red-500">{selectedRun.error}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EvaluateView;
