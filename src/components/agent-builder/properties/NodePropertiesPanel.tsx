/**
 * NodePropertiesPanel - Main container for node property editing
 *
 * Renders the appropriate panel based on node type.
 * Includes header with node type icon, title, copy/delete buttons.
 */

import { useCallback, useState } from "react";
import type { Node } from "reactflow";
import clsx from "clsx";

// Import property panels
import { AgentPropertiesPanel } from "./AgentPropertiesPanel";
import { ClassifyPropertiesPanel } from "./ClassifyPropertiesPanel";
import { IfElsePropertiesPanel } from "./IfElsePropertiesPanel";
import { WhilePropertiesPanel } from "./WhilePropertiesPanel";
import { TransformPropertiesPanel } from "./TransformPropertiesPanel";
import { SetStatePropertiesPanel } from "./SetStatePropertiesPanel";
import { UserApprovalPropertiesPanel } from "./UserApprovalPropertiesPanel";
import { GuardrailsPropertiesPanel } from "./GuardrailsPropertiesPanel";
import { FileSearchPropertiesPanel } from "./FileSearchPropertiesPanel";
import { McpPropertiesPanel } from "./McpPropertiesPanel";

// ── Types ──

interface NodePropertiesPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  onDuplicate?: (nodeId: string) => void;
}

interface OutputMapping {
  key: string;
  value: string;
}

// ── Node metadata for header styling ──

const NODE_META: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string; label: string }
> = {
  start: {
    icon: <PlayIcon />,
    color: "text-green-700",
    bgColor: "bg-green-100",
    label: "Start",
  },
  agent: {
    icon: <AgentIcon />,
    color: "text-nebula-700",
    bgColor: "bg-nebula-100",
    label: "Agent",
  },
  classify: {
    icon: <ClassifyIcon />,
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    label: "Classify",
  },
  end: {
    icon: <EndIcon />,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "End",
  },
  note: {
    icon: <NoteIcon />,
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    label: "Note",
  },
  "file-search": {
    icon: <SearchIcon />,
    color: "text-green-700",
    bgColor: "bg-green-100",
    label: "File Search",
  },
  guardrails: {
    icon: <ShieldIcon />,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Guardrails",
  },
  mcp: {
    icon: <ServerIcon />,
    color: "text-teal-700",
    bgColor: "bg-teal-100",
    label: "MCP",
  },
  "if-else": {
    icon: <BranchIcon />,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "If / Else",
  },
  "while-loop": {
    icon: <LoopIcon />,
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    label: "While Loop",
  },
  "user-approval": {
    icon: <UserIcon />,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    label: "User Approval",
  },
  transform: {
    icon: <CodeIcon />,
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    label: "Transform",
  },
  "set-state": {
    icon: <DatabaseIcon />,
    color: "text-sky-700",
    bgColor: "bg-sky-100",
    label: "Set State",
  },
};

// ── Component ──

export function NodePropertiesPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
  onDuplicate,
}: NodePropertiesPanelProps) {
  const [copied, setCopied] = useState(false);

  const data = node.data as Record<string, unknown>;
  const nodeType = node.type || "agent";
  const meta = NODE_META[nodeType] || {
    icon: <DefaultIcon />,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: nodeType,
  };

  // Update the entire node data
  const update = useCallback(
    (patch: Record<string, unknown>) => {
      onUpdate(node.id, { ...data, ...patch });
    },
    [node.id, data, onUpdate]
  );

  // Update just the config portion
  const updateConfig = useCallback(
    (patch: Record<string, unknown>) => {
      const config = (data.config ?? {}) as Record<string, unknown>;
      onUpdate(node.id, { ...data, config: { ...config, ...patch } });
    },
    [node.id, data, onUpdate]
  );

  const config = (data.config ?? {}) as Record<string, unknown>;

  // Copy node ID to clipboard
  const handleCopyId = () => {
    navigator.clipboard.writeText(node.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 border-l border-surface-3 bg-white flex flex-col h-full shrink-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              meta.bgColor,
              meta.color
            )}
          >
            {meta.icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">{meta.label}</div>
            <button
              onClick={handleCopyId}
              className="text-[10px] font-mono text-surface-dark-4 hover:text-nebula-600 transition-colors"
              title="Click to copy node ID"
            >
              {copied ? "Copied!" : node.id}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(node.id)}
              className="p-1.5 rounded hover:bg-surface-2 text-surface-dark-4 hover:text-surface-dark-0 transition-colors"
              title="Duplicate node"
            >
              <CopyIcon />
            </button>
          )}
          <button
            onClick={() => onDelete(node.id)}
            className="p-1.5 rounded hover:bg-red-50 text-surface-dark-4 hover:text-red-600 transition-colors"
            title="Delete node"
          >
            <TrashIcon />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-2 text-surface-dark-4 hover:text-surface-dark-0 transition-colors"
            title="Close panel"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Common: Label field */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={(data.label as string) ?? ""}
            onChange={(e) => update({ label: e.target.value })}
            className="nebula-input text-sm w-full"
            placeholder="Node name"
          />
        </div>

        {/* Type-specific panels */}
        {nodeType === "agent" && (
          <AgentPropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "classify" && (
          <ClassifyPropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "if-else" && (
          <IfElsePropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "while-loop" && (
          <WhilePropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "transform" && (
          <TransformPropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "set-state" && (
          <SetStatePropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "user-approval" && (
          <UserApprovalPropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "guardrails" && (
          <GuardrailsPropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "file-search" && (
          <FileSearchPropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "mcp" && (
          <McpPropertiesPanel
            nodeId={node.id}
            config={config}
            onUpdate={updateConfig}
          />
        )}
        {nodeType === "end" && (
          <EndFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "note" && (
          <NoteFields config={config} updateConfig={updateConfig} />
        )}
        {nodeType === "start" && (
          <StartFields config={config} updateConfig={updateConfig} />
        )}
      </div>
    </aside>
  );
}

// ── Simple field components for basic nodes ──

interface FieldProps {
  config: Record<string, unknown>;
  updateConfig: (patch: Record<string, unknown>) => void;
}

function StartFields({ config, updateConfig }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 text-green-700 mb-2">
          <PlayIcon />
          <span className="text-sm font-medium">Entry Point</span>
        </div>
        <p className="text-xs text-green-600">
          This is the starting point of your workflow. All executions begin here.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Input Schema (optional)
        </label>
        <textarea
          value={(config.inputSchema as string) ?? ""}
          onChange={(e) => updateConfig({ inputSchema: e.target.value })}
          className="nebula-input text-sm resize-none w-full font-mono"
          rows={4}
          placeholder='{"type": "object", "properties": {...}}'
          spellCheck={false}
        />
        <p className="text-[10px] text-surface-dark-4 mt-1">
          Define expected input structure in JSON Schema format.
        </p>
      </div>
    </div>
  );
}

function EndFields({ config, updateConfig }: FieldProps) {
  const mappings = (config.outputMappings as OutputMapping[]) ?? [];

  const addMapping = () => {
    updateConfig({ outputMappings: [...mappings, { key: "", value: "" }] });
  };

  const removeMapping = (index: number) => {
    updateConfig({ outputMappings: mappings.filter((_, i) => i !== index) });
  };

  const updateMapping = (index: number, patch: Partial<OutputMapping>) => {
    const next = mappings.map((m, i) => (i === index ? { ...m, ...patch } : m));
    updateConfig({ outputMappings: next });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <EndIcon />
          <span className="text-sm font-medium">Workflow End</span>
        </div>
        <p className="text-xs text-gray-500">
          This marks the end of your workflow execution.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">
            Output Mapping
          </label>
          <button
            onClick={addMapping}
            className="text-[10px] text-nebula-600 hover:text-nebula-700"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {mappings.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                value={m.key}
                onChange={(e) => updateMapping(i, { key: e.target.value })}
                className="nebula-input text-sm flex-1 font-mono"
                placeholder="Key"
              />
              <span className="text-xs text-surface-dark-4 shrink-0">=</span>
              <input
                type="text"
                value={m.value}
                onChange={(e) => updateMapping(i, { value: e.target.value })}
                className="nebula-input text-sm flex-1 font-mono"
                placeholder="Value"
              />
              <button
                onClick={() => removeMapping(i)}
                className="p-1 rounded hover:bg-red-50 text-surface-dark-4 hover:text-red-500"
              >
                <CloseIcon />
              </button>
            </div>
          ))}
          {mappings.length === 0 && (
            <p className="text-xs text-surface-dark-4 text-center py-2">
              No output mappings. Add to define workflow output.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const NOTE_COLORS = [
  { name: "Yellow", value: "#fef9c3" },
  { name: "Blue", value: "#dbeafe" },
  { name: "Green", value: "#dcfce7" },
  { name: "Pink", value: "#fce7f3" },
  { name: "Purple", value: "#f3e8ff" },
  { name: "Gray", value: "#f3f4f6" },
];

function NoteFields({ config, updateConfig }: FieldProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Note Text
        </label>
        <textarea
          value={(config.text as string) ?? ""}
          onChange={(e) => updateConfig({ text: e.target.value })}
          className="nebula-input text-sm resize-none w-full"
          rows={6}
          placeholder="Add notes, comments, or documentation..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Color
        </label>
        <div className="flex gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => updateConfig({ color: c.value })}
              className={clsx(
                "w-8 h-8 rounded-lg border-2 transition-all",
                (config.color as string) === c.value
                  ? "border-nebula-500 scale-110 shadow-md"
                  : "border-transparent hover:border-surface-dark-4"
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Icons ──

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M9 6.5v4M5 6.5v4M3.5 4l.5 7.5a1 1 0 001 1h4a1 1 0 001-1L10.5 4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="7" height="7" rx="1" />
      <path d="M9 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v5a1 1 0 001 1h2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M6.3 2.8A1.5 1.5 0 004 4.1v11.8a1.5 1.5 0 002.3 1.3l9.2-5.9a1.5 1.5 0 000-2.6L6.3 2.8z" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ClassifyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function EndIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  );
}

function DefaultIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default NodePropertiesPanel;
