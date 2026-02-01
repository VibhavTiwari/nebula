/**
 * Execution Visualizer Component
 *
 * Shows real-time workflow execution with a mini workflow graph.
 * Highlights current node, completed nodes, and failed nodes.
 */

import { useMemo } from "react";
import type { Node, Edge } from "reactflow";
import clsx from "clsx";

// ── Types ──

export type NodeExecutionStatus = "pending" | "running" | "completed" | "failed" | "skipped";

interface ExecutionVisualizerProps {
  nodes: Node[];
  edges: Edge[];
  currentNodeId: string | null;
  completedNodes: string[];
  failedNodes: string[];
  isRunning: boolean;
  executionPath?: string[];
}

interface MiniNodeProps {
  node: Node;
  status: NodeExecutionStatus;
  x: number;
  y: number;
  scale: number;
}

interface MiniEdgeProps {
  edge: Edge;
  sourceNode: Node;
  targetNode: Node;
  isTraced: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
}

// ── Constants ──

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;
const MINI_SCALE = 0.4;
const PADDING = 20;

// ── Node status colors ──

const statusColors: Record<NodeExecutionStatus, { bg: string; border: string; text: string }> = {
  pending: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-500" },
  running: { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-700" },
  completed: { bg: "bg-green-100", border: "border-green-400", text: "text-green-700" },
  failed: { bg: "bg-red-100", border: "border-red-400", text: "text-red-700" },
  skipped: { bg: "bg-yellow-100", border: "border-yellow-400", text: "text-yellow-700" },
};

// ── Mini Node Component ──

function MiniNode({ node, status, x, y, scale }: MiniNodeProps) {
  const colors = statusColors[status];
  const width = NODE_WIDTH * scale;
  const height = NODE_HEIGHT * scale;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Node background */}
      <rect
        width={width}
        height={height}
        rx={4}
        className={clsx("transition-colors duration-300", colors.bg)}
        fill="currentColor"
        stroke={status === "running" ? "#3b82f6" : "#d1d5db"}
        strokeWidth={status === "running" ? 2 : 1}
      />

      {/* Pulsing animation for running node */}
      {status === "running" && (
        <rect
          width={width}
          height={height}
          rx={4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          className="animate-pulse"
          opacity={0.5}
        />
      )}

      {/* Node label */}
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className={clsx("text-[8px] font-medium", colors.text)}
        fill="currentColor"
      >
        {(node.data?.label || node.type || "").slice(0, 12)}
        {(node.data?.label || "").length > 12 ? "..." : ""}
      </text>

      {/* Status indicator */}
      <g transform={`translate(${width - 8}, -4)`}>
        {status === "completed" && (
          <circle r={6} fill="#22c55e">
            <animate attributeName="r" from="4" to="6" dur="0.3s" fill="freeze" />
          </circle>
        )}
        {status === "completed" && (
          <path
            d="M-2.5 0 L-0.5 2 L2.5 -1.5"
            stroke="white"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {status === "failed" && (
          <circle r={6} fill="#ef4444">
            <animate attributeName="r" from="4" to="6" dur="0.3s" fill="freeze" />
          </circle>
        )}
        {status === "failed" && (
          <path
            d="M-2 -2 L2 2 M2 -2 L-2 2"
            stroke="white"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {status === "running" && (
          <circle r={6} fill="#3b82f6">
            <animate
              attributeName="opacity"
              values="1;0.5;1"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        )}
        {status === "running" && (
          <circle r={2} fill="white">
            <animate
              attributeName="r"
              values="1;2;1"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        )}
      </g>
    </g>
  );
}

// ── Mini Edge Component ──

function MiniEdge({ edge: _edge, sourceNode, targetNode, isTraced, scale, offsetX, offsetY }: MiniEdgeProps) {
  const sourceX = (sourceNode.position.x - offsetX) * scale + (NODE_WIDTH * scale) / 2;
  const sourceY = (sourceNode.position.y - offsetY) * scale + NODE_HEIGHT * scale;
  const targetX = (targetNode.position.x - offsetX) * scale + (NODE_WIDTH * scale) / 2;
  const targetY = (targetNode.position.y - offsetY) * scale;

  // Calculate control points for curved edge
  const midY = (sourceY + targetY) / 2;

  const pathD = `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke={isTraced ? "#3b82f6" : "#d1d5db"}
        strokeWidth={isTraced ? 2 : 1}
        markerEnd={isTraced ? "url(#arrowhead-active)" : "url(#arrowhead)"}
        className="transition-colors duration-300"
      />
      {isTraced && (
        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 2"
          className="animate-dash"
        />
      )}
    </g>
  );
}

// ── Main Component ──

export function ExecutionVisualizer({
  nodes,
  edges,
  currentNodeId,
  completedNodes,
  failedNodes,
  isRunning,
  executionPath: _executionPath = [],
}: ExecutionVisualizerProps) {
  // Calculate bounds and offsets
  const { minX, minY, width, height, scale, tracedEdges } = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, width: 200, height: 100, scale: MINI_SCALE, tracedEdges: new Set<string>() };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
      maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Calculate scale to fit in container (max 400x200)
    const maxWidth = 400;
    const maxHeight = 200;
    const scaleX = (maxWidth - PADDING * 2) / contentWidth;
    const scaleY = (maxHeight - PADDING * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 0.5);

    const width = contentWidth * scale + PADDING * 2;
    const height = contentHeight * scale + PADDING * 2;

    // Calculate traced edges (edges between executed nodes)
    const tracedEdges = new Set<string>();
    const executedNodes = new Set([...completedNodes, currentNodeId].filter(Boolean));

    edges.forEach((edge) => {
      if (executedNodes.has(edge.source) && executedNodes.has(edge.target)) {
        tracedEdges.add(edge.id);
      }
      // Also trace edge to current node
      if (executedNodes.has(edge.source) && edge.target === currentNodeId) {
        tracedEdges.add(edge.id);
      }
    });

    return { minX, minY, width, height, scale, tracedEdges };
  }, [nodes, edges, completedNodes, currentNodeId]);

  // Get node status
  const getNodeStatus = (nodeId: string): NodeExecutionStatus => {
    if (failedNodes.includes(nodeId)) return "failed";
    if (completedNodes.includes(nodeId)) return "completed";
    if (currentNodeId === nodeId) return "running";
    return "pending";
  };

  // Create node map for edge lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-surface-1 rounded-lg border border-surface-3">
        <span className="text-sm text-surface-dark-4">No nodes to visualize</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-surface-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-1 border-b border-surface-3">
        <span className="text-xs font-medium text-gray-700">Execution Flow</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-surface-dark-4">
              {completedNodes.length} completed
            </span>
          </div>
          {failedNodes.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-surface-dark-4">
                {failedNodes.length} failed
              </span>
            </div>
          )}
          {isRunning && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] text-blue-600">Running</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Visualization */}
      <div className="p-4 overflow-auto">
        <svg
          width={Math.max(width, 300)}
          height={Math.max(height, 150)}
          className="mx-auto"
        >
          {/* Defs for arrowheads */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#d1d5db" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Background grid */}
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Edges */}
          <g transform={`translate(${PADDING}, ${PADDING})`}>
            {edges.map((edge) => {
              const sourceNode = nodeMap.get(edge.source);
              const targetNode = nodeMap.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              return (
                <MiniEdge
                  key={edge.id}
                  edge={edge}
                  sourceNode={sourceNode}
                  targetNode={targetNode}
                  isTraced={tracedEdges.has(edge.id)}
                  scale={scale}
                  offsetX={minX}
                  offsetY={minY}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g transform={`translate(${PADDING}, ${PADDING})`}>
            {nodes.map((node) => (
              <MiniNode
                key={node.id}
                node={node}
                status={getNodeStatus(node.id)}
                x={(node.position.x - minX) * scale}
                y={(node.position.y - minY) * scale}
                scale={scale}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-3 py-2 bg-surface-1 border-t border-surface-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
          <span className="text-[10px] text-surface-dark-4">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-400 animate-pulse" />
          <span className="text-[10px] text-surface-dark-4">Running</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-400" />
          <span className="text-[10px] text-surface-dark-4">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-400" />
          <span className="text-[10px] text-surface-dark-4">Failed</span>
        </div>
      </div>

      {/* CSS for dash animation */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default ExecutionVisualizer;
