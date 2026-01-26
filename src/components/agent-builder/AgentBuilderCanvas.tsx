/**
 * Agent Builder Canvas — Phase 10
 *
 * Visual graph editor for defining agent swarms and model chains.
 * Uses ReactFlow for the directed graph visualization.
 */

import { useCallback, useState, useMemo } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import type { AgentGraph, AgentGraphNode, AgentGraphEdge } from "@/types/agent";
import clsx from "clsx";

interface Props {
  graph?: AgentGraph;
  onSave?: (graph: AgentGraph) => void;
}

export function AgentBuilderCanvas({ graph, onSave }: Props) {
  const initialNodes = graph?.nodes.map(graphNodeToFlowNode) || [];
  const initialEdges = graph?.edges.map(graphEdgeToFlowEdge) || [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const addNode = useCallback(
    (type: string) => {
      const id = `node-${Date.now()}`;
      const newNode: Node = {
        id,
        type,
        position: { x: 250, y: nodes.length * 100 + 50 },
        data: { label: getDefaultLabel(type), config: {} },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes]
  );

  const handleSave = useCallback(() => {
    if (!onSave) return;

    const agentGraph: AgentGraph = {
      id: graph?.id || crypto.randomUUID(),
      name: graph?.name || "Custom Workflow",
      description: graph?.description || "",
      version: graph?.version || "1.0",
      nodes: nodes.map(flowNodeToGraphNode),
      edges: edges.map(flowEdgeToGraphEdge),
      createdAt: graph?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(agentGraph);
  }, [graph, nodes, edges, onSave]);

  const handleExport = useCallback(() => {
    const data: AgentGraph = {
      id: graph?.id || crypto.randomUUID(),
      name: graph?.name || "Exported Workflow",
      description: "",
      version: "1.0",
      nodes: nodes.map(flowNodeToGraphNode),
      edges: edges.map(flowEdgeToGraphEdge),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [graph, nodes, edges]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      agent: AgentNode,
      "tool-call": ToolCallNode,
      transform: TransformNode,
      gate: GateNode,
      question: QuestionNode,
      "deploy-step": DeployStepNode,
      start: StartNode,
      end: EndNode,
    }),
    []
  );

  return (
    <div className="flex h-full">
      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-surface-1"
        >
          <Background />
          <Controls />
          <MiniMap />

          {/* Toolbar */}
          <Panel position="top-left">
            <div className="bg-white rounded-lg shadow-md border border-surface-3 p-2">
              <div className="text-xs font-medium text-surface-dark-4 mb-2 px-1">
                Add Node
              </div>
              <div className="flex flex-wrap gap-1">
                {NODE_TYPES.map((nt) => (
                  <button
                    key={nt.type}
                    onClick={() => addNode(nt.type)}
                    className={clsx(
                      "flex items-center gap-1 px-2 py-1 rounded text-xs",
                      "hover:bg-surface-2 transition-colors",
                      nt.color
                    )}
                    title={nt.description}
                  >
                    <span>{nt.icon}</span>
                    <span>{nt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* Actions */}
          <Panel position="top-right">
            <div className="flex gap-2">
              <button onClick={handleSave} className="nebula-btn-primary text-xs">
                Save
              </button>
              <button onClick={handleExport} className="nebula-btn-secondary text-xs">
                Export
              </button>
              <button
                onClick={() => loadTemplate("feature-build", setNodes, setEdges)}
                className="nebula-btn-secondary text-xs"
              >
                Feature Build Template
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Properties panel */}
      {selectedNode && (
        <div className="w-72 border-l border-surface-3 bg-white p-4 overflow-y-auto">
          <h3 className="text-sm font-medium mb-3">Node Properties</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-surface-dark-4 mb-1">Type</label>
              <div className="text-sm font-medium">{selectedNode.type}</div>
            </div>
            <div>
              <label className="block text-xs text-surface-dark-4 mb-1">Label</label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, label: e.target.value } }
                        : n
                    )
                  );
                }}
                className="nebula-input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-dark-4 mb-1">ID</label>
              <div className="text-xs font-mono text-surface-dark-4">
                {selectedNode.id}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Custom Node Components ──

function AgentNode({ data }: { data: { label: string } }) {
  return (
    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg px-4 py-2 min-w-[140px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="flex items-center gap-2">
        <span className="text-blue-600 text-sm">A</span>
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}

function ToolCallNode({ data }: { data: { label: string } }) {
  return (
    <div className="bg-purple-50 border-2 border-purple-400 rounded-lg px-4 py-2 min-w-[140px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      <div className="flex items-center gap-2">
        <span className="text-purple-600 text-sm">T</span>
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  );
}

function TransformNode({ data }: { data: { label: string } }) {
  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-lg px-4 py-2 min-w-[140px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />
      <div className="flex items-center gap-2">
        <span className="text-amber-600 text-sm">X</span>
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
    </div>
  );
}

function GateNode({ data }: { data: { label: string } }) {
  return (
    <div className="bg-red-50 border-2 border-red-400 rounded-lg px-4 py-2 min-w-[140px] shadow-sm rotate-0">
      <Handle type="target" position={Position.Top} className="!bg-red-500" />
      <div className="flex items-center gap-2">
        <span className="text-red-600 text-sm">G</span>
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-red-500" />
    </div>
  );
}

function QuestionNode({ data }: { data: { label: string } }) {
  return (
    <div className="bg-teal-50 border-2 border-teal-400 rounded-lg px-4 py-2 min-w-[140px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-teal-500" />
      <div className="flex items-center gap-2">
        <span className="text-teal-600 text-sm">?</span>
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500" />
    </div>
  );
}

function DeployStepNode({ data }: { data: { label: string } }) {
  return (
    <div className="bg-orange-50 border-2 border-orange-400 rounded-lg px-4 py-2 min-w-[140px] shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-orange-500" />
      <div className="flex items-center gap-2">
        <span className="text-orange-600 text-sm">D</span>
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
    </div>
  );
}

function StartNode({ data }: { data: { label: string } }) {
  return (
    <div className="bg-green-100 border-2 border-green-500 rounded-full px-4 py-2 shadow-sm">
      <span className="text-sm font-medium text-green-700">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}

function EndNode({ data }: { data: { label: string } }) {
  return (
    <div className="bg-gray-100 border-2 border-gray-500 rounded-full px-4 py-2 shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />
      <span className="text-sm font-medium text-gray-700">{data.label}</span>
    </div>
  );
}

// ── Constants ──

const NODE_TYPES = [
  { type: "start", label: "Start", icon: "S", color: "text-green-700", description: "Starting point" },
  { type: "agent", label: "Agent", icon: "A", color: "text-blue-700", description: "Agent invocation" },
  { type: "tool-call", label: "Tool", icon: "T", color: "text-purple-700", description: "Tool call" },
  { type: "transform", label: "Transform", icon: "X", color: "text-amber-700", description: "Data transform" },
  { type: "gate", label: "Gate", icon: "G", color: "text-red-700", description: "Gate check" },
  { type: "question", label: "Question", icon: "?", color: "text-teal-700", description: "Human question" },
  { type: "deploy-step", label: "Deploy", icon: "D", color: "text-orange-700", description: "Deploy step" },
  { type: "end", label: "End", icon: "E", color: "text-gray-700", description: "End point" },
];

function getDefaultLabel(type: string): string {
  return NODE_TYPES.find((nt) => nt.type === type)?.label || type;
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

// ── Templates ──

function loadTemplate(
  templateId: string,
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void
): void {
  const template = WORKFLOW_TEMPLATES[templateId];
  if (!template) return;

  setNodes(() => template.nodes);
  setEdges(() => template.edges);
}

const WORKFLOW_TEMPLATES: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  "feature-build": {
    nodes: [
      { id: "start", type: "start", position: { x: 250, y: 0 }, data: { label: "Start" } },
      { id: "cto", type: "agent", position: { x: 250, y: 80 }, data: { label: "CTO Agent" } },
      { id: "eng", type: "agent", position: { x: 100, y: 180 }, data: { label: "Engineering" } },
      { id: "test", type: "agent", position: { x: 400, y: 180 }, data: { label: "Testing" } },
      { id: "gate", type: "gate", position: { x: 250, y: 280 }, data: { label: "Quality Gate" } },
      { id: "devops", type: "agent", position: { x: 250, y: 380 }, data: { label: "DevOps" } },
      { id: "deploy", type: "deploy-step", position: { x: 250, y: 480 }, data: { label: "Deploy" } },
      { id: "scribe", type: "agent", position: { x: 250, y: 580 }, data: { label: "Scribing" } },
      { id: "end", type: "end", position: { x: 250, y: 680 }, data: { label: "Done" } },
    ],
    edges: [
      { id: "e1", source: "start", target: "cto", animated: true },
      { id: "e2", source: "cto", target: "eng", animated: true },
      { id: "e3", source: "cto", target: "test", animated: true },
      { id: "e4", source: "eng", target: "gate", animated: true },
      { id: "e5", source: "test", target: "gate", animated: true },
      { id: "e6", source: "gate", target: "devops", animated: true },
      { id: "e7", source: "devops", target: "deploy", animated: true },
      { id: "e8", source: "deploy", target: "scribe", animated: true },
      { id: "e9", source: "scribe", target: "end", animated: true },
    ],
  },
};
