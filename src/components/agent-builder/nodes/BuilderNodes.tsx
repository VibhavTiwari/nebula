/**
 * BuilderNodes.tsx -- Custom ReactFlow node components for the Agent Builder.
 *
 * Each node follows Nebula's light-theme design language:
 *   - White card background with a colored left-border accent
 *   - rounded-lg, subtle shadow, Inter font
 *   - Hover: elevated shadow
 *   - Selected: nebula-600 ring
 *   - Handles tinted to match the node's theme color
 */

import type React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import clsx from "clsx";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface BaseNodeData {
  label: string;
  config: Record<string, unknown>;
  selected?: boolean;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Common wrapper classes shared by most card-style nodes. */
function cardClasses(selected: boolean | undefined, accentBorder: string) {
  return clsx(
    "bg-white rounded-lg border border-surface-3 shadow-sm",
    "transition-shadow duration-150",
    "hover:shadow-md",
    accentBorder,
    selected && "ring-2 ring-nebula-600 ring-offset-1"
  );
}

/** Truncate a string to a maximum length. */
function truncate(str: string | undefined | null, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "..." : str;
}

// ---------------------------------------------------------------------------
// 1. StartNode
// ---------------------------------------------------------------------------

export function StartNode({ data, selected }: NodeProps<BaseNodeData>) {
  return (
    <div
      className={clsx(
        "bg-green-50 border-2 border-green-400 rounded-full px-6 py-2 shadow-sm",
        "transition-shadow duration-150 hover:shadow-md",
        "flex items-center justify-center gap-2",
        (data.selected ?? selected) && "ring-2 ring-nebula-600 ring-offset-1"
      )}
    >
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
        <svg
          className="w-3 h-3 text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M6.3 2.8A1.5 1.5 0 004 4.1v11.8a1.5 1.5 0 002.3 1.3l9.2-5.9a1.5 1.5 0 000-2.6L6.3 2.8z" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-green-700">
        {data.label || "Start"}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white !bg-green-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. AgentNode
// ---------------------------------------------------------------------------

export function AgentNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const model = config.model as string | undefined;
  const instructions = config.instructions as string | undefined;
  const tools = (config.tools as string[] | undefined) ?? [];

  return (
    <div
      className={clsx(
        cardClasses(data.selected ?? selected, "border-l-4 border-l-nebula-500"),
        "min-w-[200px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-nebula-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-nebula-100 text-nebula-700 flex items-center justify-center text-xs font-bold shrink-0">
          A
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {model && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-nebula-50 text-nebula-700 border border-nebula-200">
            {model}
          </span>
        )}
        {instructions && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-200">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Instructions
          </span>
        )}
        {tools.length > 0 && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {tools.length} tool{tools.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white !bg-nebula-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. ClassifyNode
// ---------------------------------------------------------------------------

export function ClassifyNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const categories = (config.categories as Array<{ id: string; name: string }>) ?? [];

  return (
    <div
      className={clsx(
        cardClasses(data.selected ?? selected, "border-l-4 border-l-purple-500"),
        "min-w-[180px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-purple-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Category list */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {categories.map((cat, idx) => (
            <div
              key={cat.id ?? idx}
              className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-0.5 truncate"
            >
              {cat.name}
            </div>
          ))}
        </div>
      )}

      {/* One source handle per category, spread along bottom / right */}
      {categories.length > 0
        ? categories.map((cat, idx) => {
            const total = categories.length;
            // Spread handles evenly along the bottom
            const leftPercent =
              total === 1 ? 50 : 15 + (idx / (total - 1)) * 70;
            return (
              <Handle
                key={cat.id ?? idx}
                type="source"
                position={Position.Bottom}
                id={cat.id ?? `cat-${idx}`}
                className="!w-2.5 !h-2.5 !border-2 !border-white !bg-purple-500"
                style={{ left: `${leftPercent}%` }}
              />
            );
          })
        : (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-3 !h-3 !border-2 !border-white !bg-purple-500"
          />
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. EndNode
// ---------------------------------------------------------------------------

export function EndNode({ data, selected }: NodeProps<BaseNodeData>) {
  return (
    <div
      className={clsx(
        "bg-slate-50 border-2 border-slate-400 rounded-full px-6 py-2 shadow-sm",
        "transition-shadow duration-150 hover:shadow-md",
        "flex items-center justify-center gap-2",
        (data.selected ?? selected) && "ring-2 ring-nebula-600 ring-offset-1"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-slate-500"
      />
      <svg
        className="w-4 h-4 text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span className="text-sm font-semibold text-slate-600">
        {data.label || "End"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. NoteNode
// ---------------------------------------------------------------------------

export function NoteNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const text = (config.text as string) ?? "";

  return (
    <div
      className={clsx(
        "bg-amber-50 border border-amber-300 rounded-lg p-3 min-w-[140px] max-w-[220px]",
        "shadow-md rotate-[-0.5deg]",
        "transition-shadow duration-150 hover:shadow-lg",
        (data.selected ?? selected) && "ring-2 ring-nebula-600 ring-offset-1"
      )}
    >
      {/* Sticky note header strip */}
      <div className="h-1 bg-amber-400 rounded-full mb-2" />

      <span className="text-xs font-medium text-amber-800 block mb-1">
        {data.label || "Note"}
      </span>
      <p className="text-[11px] text-amber-700 leading-relaxed whitespace-pre-wrap">
        {truncate(text, 200)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. FileSearchNode
// ---------------------------------------------------------------------------

export function FileSearchNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const vectorStoreIds = (config.vectorStoreIds as string[] | undefined) ?? [];

  return (
    <div
      className={clsx(
        cardClasses(data.selected ?? selected, "border-l-4 border-l-green-500"),
        "min-w-[180px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-green-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Vector store count */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
        {vectorStoreIds.length} vector store{vectorStoreIds.length !== 1 ? "s" : ""}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white !bg-green-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. GuardrailsNode
// ---------------------------------------------------------------------------

export function GuardrailsNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const rules = (config.rules as Array<unknown>) ?? [];

  return (
    <div
      className={clsx(
        cardClasses(data.selected ?? selected, "border-l-4 border-l-red-400"),
        "min-w-[180px] p-3 pb-5"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-red-400"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Rules count */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
        {rules.length} rule{rules.length !== 1 ? "s" : ""}
      </span>

      {/* Pass handle (bottom-center) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="pass"
        className="!w-3 !h-3 !border-2 !border-white !bg-green-500"
        style={{ left: "35%" }}
      />
      {/* "pass" label */}
      <span
        className="absolute text-[9px] font-medium text-green-600 pointer-events-none select-none"
        style={{ bottom: -14, left: "35%", transform: "translateX(-50%)" }}
      >
        pass
      </span>

      {/* Fail handle (bottom-right) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="fail"
        className="!w-3 !h-3 !border-2 !border-white !bg-red-500"
        style={{ left: "65%" }}
      />
      {/* "fail" label */}
      <span
        className="absolute text-[9px] font-medium text-red-600 pointer-events-none select-none"
        style={{ bottom: -14, left: "65%", transform: "translateX(-50%)" }}
      >
        fail
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. McpNode
// ---------------------------------------------------------------------------

export function McpNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const serverId = (config.serverId as string) ?? "";
  const toolName = (config.toolName as string) ?? "";

  return (
    <div
      className={clsx(
        cardClasses(data.selected ?? selected, "border-l-4 border-l-teal-500"),
        "min-w-[180px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-teal-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Server & tool info */}
      <div className="flex flex-col gap-1">
        {serverId && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200 truncate">
            Server: {truncate(serverId, 20)}
          </span>
        )}
        {toolName && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-teal-50 text-teal-600 border border-teal-200 truncate">
            {truncate(toolName, 24)}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white !bg-teal-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. IfElseNode
// ---------------------------------------------------------------------------

export function IfElseNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const condition = (config.condition as string) ?? "";

  return (
    <div
      className={clsx(
        "bg-white border-2 border-orange-400 rounded-lg shadow-sm relative",
        "transition-shadow duration-150 hover:shadow-md",
        "min-w-[190px] p-3 pb-5",
        (data.selected ?? selected) && "ring-2 ring-nebula-600 ring-offset-1"
      )}
      style={{
        clipPath:
          "polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0% calc(100% - 12px), 0% 12px)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-orange-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Condition preview */}
      {condition && (
        <div className="text-[11px] font-mono text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 truncate">
          {truncate(condition, 40)}
        </div>
      )}

      {/* Pass handle (bottom-left, green indicator) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="pass"
        className="!w-3 !h-3 !border-2 !border-white !bg-green-500"
        style={{ left: "30%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-green-600 pointer-events-none select-none"
        style={{ bottom: -14, left: "30%", transform: "translateX(-50%)" }}
      >
        true
      </span>

      {/* Fail handle (bottom-right, red indicator) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="fail"
        className="!w-3 !h-3 !border-2 !border-white !bg-red-500"
        style={{ left: "70%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-red-600 pointer-events-none select-none"
        style={{ bottom: -14, left: "70%", transform: "translateX(-50%)" }}
      >
        false
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. WhileLoopNode
// ---------------------------------------------------------------------------

export function WhileLoopNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const condition = (config.condition as string) ?? "";
  const maxIterations = (config.maxIterations as number) ?? 0;

  return (
    <div
      className={clsx(
        "bg-white rounded-lg border-2 border-dashed border-indigo-400 shadow-sm",
        "transition-shadow duration-150 hover:shadow-md",
        "min-w-[240px] min-h-[120px] p-3",
        (data.selected ?? selected) && "ring-2 ring-nebula-600 ring-offset-1"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-indigo-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
        {maxIterations > 0 && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            max {maxIterations}
          </span>
        )}
      </div>

      {/* Condition preview */}
      {condition && (
        <div className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 truncate mb-2">
          {truncate(condition, 40)}
        </div>
      )}

      {/* Container area indicator */}
      <div className="border border-dashed border-indigo-200 rounded bg-indigo-50/30 min-h-[40px] flex items-center justify-center">
        <span className="text-[10px] text-indigo-300 italic select-none">
          loop body
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white !bg-indigo-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11. UserApprovalNode
// ---------------------------------------------------------------------------

export function UserApprovalNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const prompt = (config.prompt as string) ?? "";

  return (
    <div
      className={clsx(
        cardClasses(data.selected ?? selected, "border-l-4 border-l-blue-500"),
        "min-w-[190px] p-3 pb-5"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-blue-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Prompt preview */}
      {prompt && (
        <div className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 truncate">
          {truncate(prompt, 60)}
        </div>
      )}

      {/* Approve handle (bottom-left, green) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="approve"
        className="!w-3 !h-3 !border-2 !border-white !bg-green-500"
        style={{ left: "30%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-green-600 pointer-events-none select-none"
        style={{ bottom: -14, left: "30%", transform: "translateX(-50%)" }}
      >
        approve
      </span>

      {/* Reject handle (bottom-right, red) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="reject"
        className="!w-3 !h-3 !border-2 !border-white !bg-red-500"
        style={{ left: "70%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-red-600 pointer-events-none select-none"
        style={{ bottom: -14, left: "70%", transform: "translateX(-50%)" }}
      >
        reject
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12. TransformNode
// ---------------------------------------------------------------------------

export function TransformNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const language = (config.language as string) ?? "javascript";
  const code = (config.code as string) ?? "";
  const firstLine = code.split("\n")[0] ?? "";

  return (
    <div
      className={clsx(
        cardClasses(data.selected ?? selected, "border-l-4 border-l-amber-500"),
        "min-w-[180px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-amber-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Language badge */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 mb-1.5">
        {language}
      </span>

      {/* Code preview (first line) */}
      {firstLine && (
        <div className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 truncate">
          {truncate(firstLine, 36)}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white !bg-amber-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 13. SetStateNode
// ---------------------------------------------------------------------------

export function SetStateNode({ data, selected }: NodeProps<BaseNodeData>) {
  const config = data.config ?? {};
  const key = (config.key as string) ?? "";
  const value = (config.value as string) ?? "";

  return (
    <div
      className={clsx(
        cardClasses(data.selected ?? selected, "border-l-4 border-l-sky-500"),
        "min-w-[170px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-sky-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Key/Value */}
      <div className="flex flex-col gap-1">
        {key && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-sky-600 uppercase tracking-wider">
              key
            </span>
            <span className="text-[11px] font-mono text-sky-800 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5 truncate">
              {truncate(key, 20)}
            </span>
          </div>
        )}
        {value && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-sky-600 uppercase tracking-wider">
              val
            </span>
            <span className="text-[11px] font-mono text-sky-700 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5 truncate">
              {truncate(value, 20)}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white !bg-sky-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node type registry
// ---------------------------------------------------------------------------

export const builderNodeTypes: Record<string, React.ComponentType<NodeProps>> = {
  start: StartNode,
  agent: AgentNode,
  classify: ClassifyNode,
  end: EndNode,
  note: NoteNode,
  "file-search": FileSearchNode,
  guardrails: GuardrailsNode,
  mcp: McpNode,
  "if-else": IfElseNode,
  "while-loop": WhileLoopNode,
  "user-approval": UserApprovalNode,
  transform: TransformNode,
  "set-state": SetStateNode,
};
