/**
 * Node Palette — Agent Builder sidebar
 *
 * Displays available node types grouped by category.
 * Supports drag-and-drop onto the canvas as well as click-to-add.
 */

import { useState } from "react";
import clsx from "clsx";

interface NodePaletteProps {
  onAddNode: (type: string) => void;
}

// ── Icon components (inline SVG, 18x18) ──

function IconAgent() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="2" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="6" r="1" fill="currentColor" />
      <circle cx="11" cy="6" r="1" fill="currentColor" />
      <path d="M6 12v2a2 2 0 002 2h2a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconClassify() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 8l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="4" cy="14" r="1.5" fill="currentColor" />
      <circle cx="14" cy="14" r="1.5" fill="currentColor" />
      <circle cx="9" cy="2.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconEnd() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6.5" y="6.5" width="5" height="5" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function IconNote() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2L3 5v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V5L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 9l1.5 1.5L11 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlug() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 2v4M11 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 6h8v3a4 4 0 01-8 0V6z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 13v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconGitBranch() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="14" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 5.5v7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 7c0-1 1-2 3-2h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconLoop() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 6.5A5 5 0 004.1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 11.5A5 5 0 0013.9 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 5l2 1.5L15.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 13l-2-1.5L2.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUserCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 15c0-2.5 2-4.5 5-4.5s5 2 5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.5 10l1.5 1.5L17 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 5L2 9l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 5L16 9l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 3L8 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconVariable() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h2l3 10h-2L4 4z" fill="currentColor" />
      <path d="M9 4h2l3 10h-2L9 4z" fill="currentColor" />
      <path d="M3 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSearchFilter() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Category and node definitions ──

interface PaletteNode {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface PaletteCategory {
  name: string;
  color: string;          // Tailwind text color for the header
  headerBg: string;       // Tailwind bg color for the header
  dotColor: string;       // Tailwind bg for the small dot
  nodes: PaletteNode[];
}

const PALETTE_CATEGORIES: PaletteCategory[] = [
  {
    name: "Core",
    color: "text-blue-700",
    headerBg: "bg-blue-50",
    dotColor: "bg-blue-500",
    nodes: [
      {
        type: "agent",
        label: "Agent",
        description: "Configure an AI agent with model, instructions, and tools",
        icon: <IconAgent />,
      },
      {
        type: "classify",
        label: "Classify",
        description: "Route to different paths based on input classification",
        icon: <IconClassify />,
      },
      {
        type: "end",
        label: "End",
        description: "Terminal node that ends the workflow",
        icon: <IconEnd />,
      },
      {
        type: "note",
        label: "Note",
        description: "Add a sticky note annotation",
        icon: <IconNote />,
      },
    ],
  },
  {
    name: "Tools",
    color: "text-green-700",
    headerBg: "bg-green-50",
    dotColor: "bg-green-500",
    nodes: [
      {
        type: "file-search",
        label: "File search",
        description: "Search through vector stores and documents",
        icon: <IconSearch />,
      },
      {
        type: "guardrails",
        label: "Guardrails",
        description: "Add input/output safety rules",
        icon: <IconShield />,
      },
      {
        type: "mcp",
        label: "MCP",
        description: "Connect to an MCP server tool",
        icon: <IconPlug />,
      },
    ],
  },
  {
    name: "Logic",
    color: "text-orange-700",
    headerBg: "bg-orange-50",
    dotColor: "bg-orange-500",
    nodes: [
      {
        type: "if-else",
        label: "If / else",
        description: "Conditional branching based on conditions",
        icon: <IconGitBranch />,
      },
      {
        type: "while-loop",
        label: "While",
        description: "Loop while a condition is true",
        icon: <IconLoop />,
      },
      {
        type: "user-approval",
        label: "User approval",
        description: "Pause for human approval before continuing",
        icon: <IconUserCheck />,
      },
    ],
  },
  {
    name: "Data",
    color: "text-purple-700",
    headerBg: "bg-purple-50",
    dotColor: "bg-purple-500",
    nodes: [
      {
        type: "transform",
        label: "Transform",
        description: "Transform data with code",
        icon: <IconCode />,
      },
      {
        type: "set-state",
        label: "Set state",
        description: "Set a variable in the workflow state",
        icon: <IconVariable />,
      },
    ],
  },
];

// ── Component ──

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [filter, setFilter] = useState("");

  const normalizedFilter = filter.toLowerCase().trim();

  const filteredCategories = PALETTE_CATEGORIES.map((cat) => ({
    ...cat,
    nodes: cat.nodes.filter(
      (node) =>
        node.label.toLowerCase().includes(normalizedFilter) ||
        node.description.toLowerCase().includes(normalizedFilter) ||
        node.type.toLowerCase().includes(normalizedFilter)
    ),
  })).filter((cat) => cat.nodes.length > 0);

  const handleDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/reactflow-type", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-[240px] nebula-panel shrink-0 select-none">
      {/* Header */}
      <div className="nebula-panel-header">Add Nodes</div>

      {/* Search / filter */}
      <div className="px-3 py-2 border-b border-surface-3">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-dark-4 pointer-events-none">
            <IconSearchFilter />
          </span>
          <input
            type="text"
            placeholder="Filter nodes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="nebula-input pl-8 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Scrollable category list */}
      <div className="flex-1 overflow-y-auto">
        {filteredCategories.length === 0 && (
          <div className="px-4 py-8 text-xs text-surface-dark-4 text-center">
            No nodes match &ldquo;{filter}&rdquo;
          </div>
        )}

        {filteredCategories.map((category) => (
          <div key={category.name} className="mb-1">
            {/* Category header */}
            <div
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                category.headerBg,
                category.color
              )}
            >
              <span className={clsx("w-2 h-2 rounded-full", category.dotColor)} />
              {category.name}
            </div>

            {/* Nodes */}
            <div className="py-1">
              {category.nodes.map((node) => (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, node.type)}
                  onClick={() => onAddNode(node.type)}
                  className={clsx(
                    "flex items-start gap-2.5 mx-2 my-0.5 px-2.5 py-2 rounded-md cursor-grab",
                    "border border-transparent",
                    "hover:bg-surface-2 hover:border-surface-3",
                    "active:cursor-grabbing active:bg-surface-3",
                    "transition-colors duration-100"
                  )}
                  title={`Drag or click to add ${node.label}`}
                >
                  {/* Icon */}
                  <span className={clsx("shrink-0 mt-0.5", category.color)}>
                    {node.icon}
                  </span>

                  {/* Label + description */}
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-surface-dark-0 leading-tight">
                      {node.label}
                    </div>
                    <div className="text-[11px] leading-snug text-surface-dark-4 mt-0.5">
                      {node.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
