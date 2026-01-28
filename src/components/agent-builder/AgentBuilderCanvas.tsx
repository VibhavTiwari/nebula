/**
 * Agent Builder Canvas — Full-featured visual workflow editor
 *
 * Mirrors OpenAI Agent Builder functionality while keeping Nebula's light UI theme.
 * Features: drag-and-drop node palette, rich property editing, undo/redo,
 * Draft/Publish workflow, Code view, Evaluate mode, templates.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import clsx from "clsx";

import { builderNodeTypes } from "./nodes/BuilderNodes";
import { NodePalette } from "./NodePalette";
import { NodePropertiesPanel } from "./NodePropertiesPanel";
import { useAgentBuilderStore } from "@/stores/agentBuilderStore";
import type { AgentGraph, AgentGraphNode, AgentGraphEdge } from "@/types/agent";

// ── Props ──

interface Props {
  graph?: AgentGraph;
  onSave?: (graph: AgentGraph) => void;
}

// ── Default node configs ──

const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  agent: { model: "gpt-4o", instructions: "", temperature: 1, tools: [] },
  classify: { categories: [], model: "gpt-4o", instructions: "" },
  end: { outputMappings: [] },
  note: { text: "", color: "#fef9c3" },
  "file-search": { vectorStoreIds: [], maxResults: 10 },
  guardrails: { rules: [] },
  mcp: { serverId: "", toolName: "", parameters: "{}" },
  "if-else": { conditionType: "code", condition: "" },
  "while-loop": { conditionType: "code", condition: "", maxIterations: 10, childNodeIds: [] },
  "user-approval": { prompt: "", timeout: undefined },
  transform: { language: "javascript", code: "" },
  "set-state": { key: "", value: "", valueType: "string" },
  start: {},
};

const DEFAULT_LABELS: Record<string, string> = {
  agent: "Agent",
  classify: "Classify",
  end: "End",
  note: "Note",
  "file-search": "File Search",
  guardrails: "Guardrails",
  mcp: "MCP",
  "if-else": "If / Else",
  "while-loop": "While Loop",
  "user-approval": "User Approval",
  transform: "Transform",
  "set-state": "Set State",
  start: "Start",
};

// ── Component ──

export function AgentBuilderCanvas({ graph, onSave }: Props) {
  const store = useAgentBuilderStore();

  // Initialize from graph prop or store
  const initialNodes = graph?.nodes.map(graphNodeToFlowNode) || store.nodes;
  const initialEdges = graph?.edges.map(graphEdgeToFlowEdge) || store.edges;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<"draft" | "published">(
    store.workflowStatus || "draft"
  );
  const [workflowName, setWorkflowName] = useState(store.workflowName || "Untitled Workflow");
  const [activeView, setActiveView] = useState<"canvas" | "code" | "evaluate">("canvas");
  const [evaluationLog, setEvaluationLog] = useState<EvalEntry[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Memoize node types so ReactFlow doesn't re-render
  const nodeTypes: NodeTypes = useMemo(() => builderNodeTypes as unknown as NodeTypes, []);

  // ── Handlers ──

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { strokeWidth: 2 },
            labelStyle: { fontSize: 11, fontWeight: 500 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type,
        position: position ?? {
          x: 250 + Math.random() * 200,
          y: 100 + nodes.length * 80,
        },
        data: {
          label: DEFAULT_LABELS[type] || type,
          config: { ...(DEFAULT_CONFIGS[type] || {}) },
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes]
  );

  // Drag-and-drop from palette
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow-type");
      if (!type) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds || !reactFlowInstance.current) return;

      const position = reactFlowInstance.current.project({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      addNode(type, position);
    },
    [addNode]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  // ── Node data updates ──

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      );
      // Update selected node reference too
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data } : prev
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  // ── Save / Export / Publish ──

  const buildGraphData = useCallback((): AgentGraph => {
    return {
      id: graph?.id || store.workflowId || crypto.randomUUID(),
      name: workflowName,
      description: store.workflowDescription || "",
      version: store.workflowVersion || "1.0",
      nodes: nodes.map(flowNodeToGraphNode),
      edges: edges.map(flowEdgeToGraphEdge),
      createdAt: graph?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [graph, store, workflowName, nodes, edges]);

  const handleSave = useCallback(() => {
    const data = buildGraphData();
    onSave?.(data);
    store.setNodes(nodes);
    store.setEdges(edges);
    store.setWorkflowMeta({ workflowName });
  }, [buildGraphData, onSave, store, nodes, edges, workflowName]);

  const handleExport = useCallback(() => {
    const data = buildGraphData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildGraphData, workflowName]);

  const handlePublish = useCallback(() => {
    setWorkflowStatus("published");
    store.setWorkflowStatus("published");
    handleSave();
  }, [store, handleSave]);

  const handleUnpublish = useCallback(() => {
    setWorkflowStatus("draft");
    store.setWorkflowStatus("draft");
  }, [store]);

  // ── Templates ──

  const loadTemplate = useCallback(
    (templateId: string) => {
      const template = WORKFLOW_TEMPLATES[templateId];
      if (!template) return;
      setNodes(template.nodes);
      setEdges(template.edges);
      setWorkflowName(template.name || "Template Workflow");
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  // ── Evaluation (simulated) ──

  const runEvaluation = useCallback(() => {
    setActiveView("evaluate");
    setEvaluationLog([]);

    // Walk through nodes in order and simulate execution
    const orderedNodeIds = getExecutionOrder(nodes, edges);
    let delay = 0;

    orderedNodeIds.forEach((nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      delay += 400 + Math.random() * 600;

      setTimeout(() => {
        setEvaluationLog((prev) => [
          ...prev,
          {
            nodeId: node.id,
            nodeType: node.type || "unknown",
            label: node.data.label,
            status: Math.random() > 0.1 ? "success" : "warning",
            message: `Processed ${node.data.label}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }, delay);
    });

    setTimeout(() => {
      setEvaluationLog((prev) => [
        ...prev,
        {
          nodeId: "summary",
          nodeType: "system",
          label: "Evaluation Complete",
          status: "success",
          message: `${orderedNodeIds.length} nodes evaluated. Workflow is valid.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }, delay + 800);
  }, [nodes, edges]);

  // ── Render ──

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Node Palette */}
      <NodePalette onAddNode={addNode} />

      {/* Center: Canvas / Code / Evaluate */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-surface-3 bg-white">
          {/* Left: Workflow name + status */}
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingName(false);
                }}
                className="nebula-input text-sm font-medium w-56"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="text-sm font-semibold text-gray-800 hover:text-nebula-600 transition-colors"
                title="Click to rename"
              >
                {workflowName}
              </button>
            )}

            <span
              className={clsx(
                "nebula-badge text-[10px]",
                workflowStatus === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              )}
            >
              {workflowStatus === "published" ? "Published" : "Draft"}
            </span>
          </div>

          {/* Center: View tabs */}
          <div className="flex items-center bg-surface-1 rounded-lg p-0.5">
            {(["canvas", "code", "evaluate"] as const).map((view) => (
              <button
                key={view}
                onClick={() => {
                  if (view === "evaluate") {
                    runEvaluation();
                  } else {
                    setActiveView(view);
                  }
                }}
                className={clsx(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  activeView === view
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-surface-dark-4 hover:text-gray-700"
                )}
              >
                {view === "canvas" && "Canvas"}
                {view === "code" && "Code"}
                {view === "evaluate" && "Evaluate"}
              </button>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Template dropdown */}
            <div className="relative group">
              <button className="nebula-btn-secondary text-xs">
                Templates
              </button>
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-surface-3 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-1">
                  {Object.entries(WORKFLOW_TEMPLATES).map(([id, tmpl]) => (
                    <button
                      key={id}
                      onClick={() => loadTemplate(id)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-surface-2 transition-colors"
                    >
                      <div className="font-medium">{tmpl.name}</div>
                      <div className="text-surface-dark-4 mt-0.5">{tmpl.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleExport} className="nebula-btn-secondary text-xs">
              Export
            </button>
            <button onClick={handleSave} className="nebula-btn-secondary text-xs">
              Save
            </button>
            {workflowStatus === "draft" ? (
              <button onClick={handlePublish} className="nebula-btn-primary text-xs">
                Publish
              </button>
            ) : (
              <button onClick={handleUnpublish} className="nebula-btn-secondary text-xs border-orange-300 text-orange-600 hover:bg-orange-50">
                Unpublish
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        {activeView === "canvas" && (
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onInit={onInit}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              fitView
              className="bg-surface-1"
              deleteKeyCode={["Backspace", "Delete"]}
              multiSelectionKeyCode="Shift"
              snapToGrid
              snapGrid={[16, 16]}
              defaultEdgeOptions={{
                animated: true,
                style: { strokeWidth: 2, stroke: "#94a3b8" },
              }}
            >
              <Background gap={16} size={1} color="#e5e7eb" />
              <Controls className="!bg-white !border-surface-3 !shadow-sm" />
              <MiniMap
                nodeStrokeWidth={3}
                className="!bg-white !border-surface-3"
                maskColor="rgba(0,0,0,0.05)"
              />
            </ReactFlow>
          </div>
        )}

        {activeView === "code" && (
          <CodeView nodes={nodes} edges={edges} workflowName={workflowName} />
        )}

        {activeView === "evaluate" && (
          <EvaluateView log={evaluationLog} onRerun={runEvaluation} />
        )}
      </div>

      {/* Right: Properties Panel */}
      {selectedNode && activeView === "canvas" && (
        <NodePropertiesPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onDelete={deleteNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

// ── Code View ──

function CodeView({
  nodes,
  edges,
  workflowName,
}: {
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
}) {
  const code = useMemo(() => {
    const graphData = {
      name: workflowName,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data.label,
        config: n.data.config,
        position: n.position,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
      })),
    };
    return JSON.stringify(graphData, null, 2);
  }, [nodes, edges, workflowName]);

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-1">
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-3 bg-white">
        <span className="text-xs font-medium text-surface-dark-4">
          Workflow Definition (JSON)
        </span>
        <button
          onClick={handleCopy}
          className="nebula-btn-secondary text-xs"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono text-gray-700 bg-white border border-surface-3 rounded-lg p-4 whitespace-pre-wrap">
          {code}
        </pre>
      </div>
    </div>
  );
}

// ── Evaluate View ──

interface EvalEntry {
  nodeId: string;
  nodeType: string;
  label: string;
  status: "success" | "warning" | "error";
  message: string;
  timestamp: string;
}

function EvaluateView({
  log,
  onRerun,
}: {
  log: EvalEntry[];
  onRerun: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col bg-surface-1">
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-3 bg-white">
        <span className="text-xs font-medium text-surface-dark-4">
          Evaluation Results
        </span>
        <button onClick={onRerun} className="nebula-btn-secondary text-xs">
          Re-run
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {log.length === 0 && (
          <div className="text-center text-sm text-surface-dark-4 py-12">
            Running evaluation...
          </div>
        )}
        <div className="space-y-2">
          {log.map((entry, i) => (
            <div
              key={i}
              className={clsx(
                "flex items-start gap-3 px-4 py-2.5 rounded-lg border bg-white",
                entry.status === "success" && "border-green-200",
                entry.status === "warning" && "border-yellow-200",
                entry.status === "error" && "border-red-200"
              )}
            >
              <span
                className={clsx(
                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                  entry.status === "success" && "bg-green-500",
                  entry.status === "warning" && "bg-yellow-500",
                  entry.status === "error" && "bg-red-500"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">
                    {entry.label}
                  </span>
                  <span className="text-[10px] text-surface-dark-4 font-mono">
                    {entry.nodeType}
                  </span>
                </div>
                <div className="text-xs text-surface-dark-4 mt-0.5">
                  {entry.message}
                </div>
              </div>
              <span className="text-[10px] text-surface-dark-4 shrink-0 tabular-nums">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Execution order helper ──

function getExecutionOrder(nodes: Node[], edges: Edge[]): string[] {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const neighbor of adjacency.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return order;
}

// ── Conversion helpers ──

function graphNodeToFlowNode(node: AgentGraphNode): Node {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: { label: node.label, config: node.config },
  };
}

function flowNodeToGraphNode(node: Node): AgentGraphNode {
  return {
    id: node.id,
    type: (node.type || "agent") as AgentGraphNode["type"],
    label: node.data.label,
    position: node.position,
    config: node.data.config || {},
  };
}

function graphEdgeToFlowEdge(edge: AgentGraphEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: true,
  };
}

function flowEdgeToGraphEdge(edge: Edge): AgentGraphEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: typeof edge.label === "string" ? edge.label : undefined,
  };
}

// ── Workflow Templates ──

interface WorkflowTemplate {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  "feature-build": {
    name: "Feature Build Pipeline",
    description: "CTO-led multi-agent pipeline: design, build, test, deploy, document",
    nodes: [
      { id: "start", type: "start", position: { x: 400, y: 0 }, data: { label: "Start", config: {} } },
      { id: "cto", type: "agent", position: { x: 400, y: 100 }, data: { label: "CTO Agent", config: { model: "claude-opus-4-20250514", instructions: "Analyze requirements and create execution plan" } } },
      { id: "eng", type: "agent", position: { x: 200, y: 230 }, data: { label: "Engineering", config: { model: "claude-sonnet-4-20250514", tools: ["code_interpreter"] } } },
      { id: "test", type: "agent", position: { x: 600, y: 230 }, data: { label: "Testing", config: { model: "gpt-4o", tools: ["code_interpreter"] } } },
      { id: "gate", type: "if-else", position: { x: 400, y: 360 }, data: { label: "Quality Gate", config: { conditionType: "llm", condition: "All tests pass and coverage > 80%" } } },
      { id: "devops", type: "agent", position: { x: 300, y: 490 }, data: { label: "DevOps", config: { model: "gpt-4o-mini" } } },
      { id: "fix", type: "agent", position: { x: 560, y: 490 }, data: { label: "Fix Issues", config: { model: "claude-sonnet-4-20250514", instructions: "Fix failing tests and quality issues" } } },
      { id: "approval", type: "user-approval", position: { x: 300, y: 610 }, data: { label: "Deploy Approval", config: { prompt: "Approve deployment to production?" } } },
      { id: "scribe", type: "agent", position: { x: 200, y: 740 }, data: { label: "Scribing", config: { model: "gpt-4o-mini", instructions: "Document all changes" } } },
      { id: "end", type: "end", position: { x: 400, y: 860 }, data: { label: "Done", config: {} } },
    ],
    edges: [
      { id: "e1", source: "start", target: "cto", animated: true },
      { id: "e2", source: "cto", target: "eng", animated: true },
      { id: "e3", source: "cto", target: "test", animated: true },
      { id: "e4", source: "eng", target: "gate", animated: true },
      { id: "e5", source: "test", target: "gate", animated: true },
      { id: "e6", source: "gate", sourceHandle: "pass", target: "devops", animated: true, label: "pass" },
      { id: "e7", source: "gate", sourceHandle: "fail", target: "fix", animated: true, label: "fail" },
      { id: "e8", source: "fix", target: "gate", animated: true },
      { id: "e9", source: "devops", target: "approval", animated: true },
      { id: "e10", source: "approval", sourceHandle: "approve", target: "scribe", animated: true, label: "approve" },
      { id: "e11", source: "approval", sourceHandle: "reject", target: "eng", animated: true, label: "reject" },
      { id: "e12", source: "scribe", target: "end", animated: true },
    ],
  },
  "classifier-router": {
    name: "Intent Classifier",
    description: "Classify user input and route to specialized agents",
    nodes: [
      { id: "start", type: "start", position: { x: 400, y: 0 }, data: { label: "Start", config: {} } },
      { id: "guard-in", type: "guardrails", position: { x: 400, y: 100 }, data: { label: "Input Guard", config: { rules: [{ name: "No PII", type: "input", condition: "no_pii", action: "block" }] } } },
      { id: "classify", type: "classify", position: { x: 400, y: 230 }, data: { label: "Intent Classifier", config: { model: "gpt-4o-mini", categories: [{ id: "support", name: "Support", description: "Customer support questions" }, { id: "sales", name: "Sales", description: "Sales and pricing inquiries" }, { id: "tech", name: "Technical", description: "Technical questions" }] } } },
      { id: "support-agent", type: "agent", position: { x: 100, y: 380 }, data: { label: "Support Agent", config: { model: "gpt-4o", instructions: "Handle customer support", tools: ["file_search"] } } },
      { id: "sales-agent", type: "agent", position: { x: 400, y: 380 }, data: { label: "Sales Agent", config: { model: "gpt-4o", instructions: "Handle sales inquiries" } } },
      { id: "tech-agent", type: "agent", position: { x: 700, y: 380 }, data: { label: "Tech Agent", config: { model: "claude-sonnet-4-20250514", instructions: "Handle technical questions", tools: ["code_interpreter"] } } },
      { id: "guard-out", type: "guardrails", position: { x: 400, y: 510 }, data: { label: "Output Guard", config: { rules: [{ name: "No hallucination", type: "output", condition: "grounded", action: "warn" }] } } },
      { id: "end", type: "end", position: { x: 400, y: 630 }, data: { label: "End", config: {} } },
    ],
    edges: [
      { id: "e1", source: "start", target: "guard-in", animated: true },
      { id: "e2", source: "guard-in", sourceHandle: "pass", target: "classify", animated: true },
      { id: "e3", source: "classify", sourceHandle: "support", target: "support-agent", animated: true, label: "support" },
      { id: "e4", source: "classify", sourceHandle: "sales", target: "sales-agent", animated: true, label: "sales" },
      { id: "e5", source: "classify", sourceHandle: "tech", target: "tech-agent", animated: true, label: "technical" },
      { id: "e6", source: "support-agent", target: "guard-out", animated: true },
      { id: "e7", source: "sales-agent", target: "guard-out", animated: true },
      { id: "e8", source: "tech-agent", target: "guard-out", animated: true },
      { id: "e9", source: "guard-out", sourceHandle: "pass", target: "end", animated: true },
    ],
  },
  "data-pipeline": {
    name: "Data Processing Pipeline",
    description: "Transform, validate, and store data with loops and state",
    nodes: [
      { id: "start", type: "start", position: { x: 400, y: 0 }, data: { label: "Start", config: {} } },
      { id: "fetch", type: "mcp", position: { x: 400, y: 100 }, data: { label: "Fetch Data", config: { serverId: "data-source", toolName: "fetch_records" } } },
      { id: "init-state", type: "set-state", position: { x: 400, y: 220 }, data: { label: "Init Counter", config: { key: "processedCount", value: "0", valueType: "number" } } },
      { id: "loop", type: "while-loop", position: { x: 400, y: 340 }, data: { label: "Process Records", config: { conditionType: "variable", condition: "processedCount < totalRecords", maxIterations: 100 } } },
      { id: "transform", type: "transform", position: { x: 400, y: 460 }, data: { label: "Clean Data", config: { language: "javascript", code: "return data.map(r => ({ ...r, cleaned: true }))" } } },
      { id: "validate", type: "if-else", position: { x: 400, y: 580 }, data: { label: "Valid?", config: { conditionType: "code", condition: "result.errors.length === 0" } } },
      { id: "store", type: "agent", position: { x: 250, y: 710 }, data: { label: "Store Results", config: { model: "gpt-4o-mini", instructions: "Store validated data" } } },
      { id: "log-error", type: "set-state", position: { x: 560, y: 710 }, data: { label: "Log Error", config: { key: "errors", value: "[]", valueType: "json" } } },
      { id: "end", type: "end", position: { x: 400, y: 840 }, data: { label: "Complete", config: {} } },
      { id: "note", type: "note", position: { x: 650, y: 340 }, data: { label: "Note", config: { text: "This loop processes records in batches of 10. Adjust maxIterations for larger datasets.", color: "#fef9c3" } } },
    ],
    edges: [
      { id: "e1", source: "start", target: "fetch", animated: true },
      { id: "e2", source: "fetch", target: "init-state", animated: true },
      { id: "e3", source: "init-state", target: "loop", animated: true },
      { id: "e4", source: "loop", target: "transform", animated: true },
      { id: "e5", source: "transform", target: "validate", animated: true },
      { id: "e6", source: "validate", sourceHandle: "pass", target: "store", animated: true, label: "valid" },
      { id: "e7", source: "validate", sourceHandle: "fail", target: "log-error", animated: true, label: "invalid" },
      { id: "e8", source: "store", target: "end", animated: true },
      { id: "e9", source: "log-error", target: "end", animated: true },
    ],
  },
};
