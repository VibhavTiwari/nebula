/**
 * BuilderNodes.tsx -- Custom ReactFlow node components for the Agent Builder.
 *
 * Each node follows Nebula's dark theme design language:
 *   - Dark card background with colored accent borders
 *   - Subtle glow effects on hover/selection
 *   - Modern, clean typography
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
function nodeClasses(selected: boolean | undefined, accentColor: string) {
  return clsx(
    "rounded-xl border bg-panel-card shadow-node",
    "transition-all duration-200",
    "hover:shadow-node-hover hover:border-panel-border-light",
    accentColor,
    selected && "ring-2 ring-nebula-500 ring-offset-2 ring-offset-panel-bg"
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
        "bg-accent-green-soft/50 border-2 border-accent-green/50 rounded-full px-6 py-2.5",
        "shadow-node transition-all duration-200",
        "hover:shadow-node-hover hover:border-accent-green",
        "flex items-center justify-center gap-2",
        (data.selected ?? selected) && "ring-2 ring-nebula-500 ring-offset-2 ring-offset-panel-bg"
      )}
    >
      <div className="w-5 h-5 rounded-full bg-accent-green flex items-center justify-center">
        <svg
          className="w-3 h-3 text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M6.3 2.8A1.5 1.5 0 004 4.1v11.8a1.5 1.5 0 002.3 1.3l9.2-5.9a1.5 1.5 0 000-2.6L6.3 2.8z" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-accent-green">
        {data.label || "Start"}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-green"
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
        nodeClasses(data.selected ?? selected, "border-l-4 border-l-nebula-500 border-t-panel-border border-r-panel-border border-b-panel-border"),
        "min-w-[220px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-nebula-500"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-nebula-500/20 text-nebula-400 flex items-center justify-center text-xs font-bold shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {model && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-nebula-500/10 text-nebula-400 border border-nebula-500/30">
            {model}
          </span>
        )}
        {instructions && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-indigo/10 text-accent-indigo border border-accent-indigo/30">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Instructions
          </span>
        )}
        {tools.length > 0 && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
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
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-nebula-500"
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
        nodeClasses(data.selected ?? selected, "border-l-4 border-l-accent-purple border-t-panel-border border-r-panel-border border-b-panel-border"),
        "min-w-[200px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-purple"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent-purple/20 text-accent-purple flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
      </div>

      {/* Category list */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {categories.map((cat, idx) => (
            <div
              key={cat.id ?? idx}
              className="text-[11px] text-accent-purple bg-accent-purple/10 border border-accent-purple/30 rounded px-2 py-0.5 truncate"
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
            const leftPercent =
              total === 1 ? 50 : 15 + (idx / (total - 1)) * 70;
            return (
              <Handle
                key={cat.id ?? idx}
                type="source"
                position={Position.Bottom}
                id={cat.id ?? `cat-${idx}`}
                className="!w-2.5 !h-2.5 !border-2 !border-panel-card !bg-accent-purple"
                style={{ left: `${leftPercent}%` }}
              />
            );
          })
        : (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-purple"
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
        "bg-panel-hover border-2 border-panel-border-light rounded-full px-6 py-2.5",
        "shadow-node transition-all duration-200",
        "hover:shadow-node-hover",
        "flex items-center justify-center gap-2",
        (data.selected ?? selected) && "ring-2 ring-nebula-500 ring-offset-2 ring-offset-panel-bg"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-text-muted"
      />
      <svg
        className="w-4 h-4 text-text-muted"
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
      <span className="text-sm font-semibold text-text-secondary">
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
        "bg-accent-yellow-soft/30 border border-accent-yellow/30 rounded-lg p-3 min-w-[160px] max-w-[240px]",
        "shadow-node rotate-[-0.5deg]",
        "transition-all duration-200",
        "hover:shadow-node-hover hover:border-accent-yellow/50",
        (data.selected ?? selected) && "ring-2 ring-nebula-500 ring-offset-2 ring-offset-panel-bg"
      )}
    >
      {/* Sticky note header strip */}
      <div className="h-1 bg-accent-yellow/50 rounded-full mb-2" />

      <span className="text-xs font-medium text-accent-yellow block mb-1">
        {data.label || "Note"}
      </span>
      <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
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
        nodeClasses(data.selected ?? selected, "border-l-4 border-l-accent-green border-t-panel-border border-r-panel-border border-b-panel-border"),
        "min-w-[200px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-green"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent-green/20 text-accent-green flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
      </div>

      {/* Vector store count */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-green/10 text-accent-green border border-accent-green/30">
        {vectorStoreIds.length} vector store{vectorStoreIds.length !== 1 ? "s" : ""}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-green"
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
        nodeClasses(data.selected ?? selected, "border-l-4 border-l-accent-red border-t-panel-border border-r-panel-border border-b-panel-border"),
        "min-w-[200px] p-3 pb-5"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-red"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent-red/20 text-accent-red flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
      </div>

      {/* Rules count */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-red/10 text-accent-red border border-accent-red/30">
        {rules.length} rule{rules.length !== 1 ? "s" : ""}
      </span>

      {/* Pass handle (bottom-center) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="pass"
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-green"
        style={{ left: "35%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-accent-green pointer-events-none select-none"
        style={{ bottom: -14, left: "35%", transform: "translateX(-50%)" }}
      >
        pass
      </span>

      {/* Fail handle (bottom-right) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="fail"
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-red"
        style={{ left: "65%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-accent-red pointer-events-none select-none"
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
        nodeClasses(data.selected ?? selected, "border-l-4 border-l-accent-teal border-t-panel-border border-r-panel-border border-b-panel-border"),
        "min-w-[200px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-teal"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent-teal/20 text-accent-teal flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
      </div>

      {/* Server & tool info */}
      <div className="flex flex-col gap-1">
        {serverId && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-accent-teal/10 text-accent-teal border border-accent-teal/30 truncate">
            Server: {truncate(serverId, 20)}
          </span>
        )}
        {toolName && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-panel-hover text-text-secondary border border-panel-border truncate">
            {truncate(toolName, 24)}
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-teal"
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
        "bg-panel-card border-2 border-accent-orange/50 rounded-lg shadow-node relative",
        "transition-all duration-200",
        "hover:shadow-node-hover hover:border-accent-orange",
        "min-w-[210px] p-3 pb-5",
        (data.selected ?? selected) && "ring-2 ring-nebula-500 ring-offset-2 ring-offset-panel-bg"
      )}
      style={{
        clipPath:
          "polygon(12px 0%, calc(100% - 12px) 0%, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0% calc(100% - 12px), 0% 12px)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-orange"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent-orange/20 text-accent-orange flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
      </div>

      {/* Condition preview */}
      {condition && (
        <div className="text-[11px] font-mono text-accent-orange bg-accent-orange/10 border border-accent-orange/30 rounded px-2 py-1 truncate">
          {truncate(condition, 40)}
        </div>
      )}

      {/* Pass handle (bottom-left, green indicator) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="pass"
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-green"
        style={{ left: "30%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-accent-green pointer-events-none select-none"
        style={{ bottom: -14, left: "30%", transform: "translateX(-50%)" }}
      >
        true
      </span>

      {/* Fail handle (bottom-right, red indicator) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="fail"
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-red"
        style={{ left: "70%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-accent-red pointer-events-none select-none"
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
        "bg-panel-card rounded-xl border-2 border-dashed border-accent-indigo/50 shadow-node",
        "transition-all duration-200",
        "hover:shadow-node-hover hover:border-accent-indigo",
        "min-w-[260px] min-h-[130px] p-3",
        (data.selected ?? selected) && "ring-2 ring-nebula-500 ring-offset-2 ring-offset-panel-bg"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-indigo"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent-indigo/20 text-accent-indigo flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
        {maxIterations > 0 && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-indigo/10 text-accent-indigo border border-accent-indigo/30">
            max {maxIterations}
          </span>
        )}
      </div>

      {/* Condition preview */}
      {condition && (
        <div className="text-[11px] font-mono text-accent-indigo bg-accent-indigo/10 border border-accent-indigo/30 rounded px-2 py-1 truncate mb-2">
          {truncate(condition, 40)}
        </div>
      )}

      {/* Container area indicator */}
      <div className="border border-dashed border-accent-indigo/30 rounded-lg bg-accent-indigo/5 min-h-[40px] flex items-center justify-center">
        <span className="text-[10px] text-accent-indigo/50 italic select-none">
          loop body
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-indigo"
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
        nodeClasses(data.selected ?? selected, "border-l-4 border-l-accent-blue border-t-panel-border border-r-panel-border border-b-panel-border"),
        "min-w-[210px] p-3 pb-5"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-blue"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent-blue/20 text-accent-blue flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
      </div>

      {/* Prompt preview */}
      {prompt && (
        <div className="text-[11px] text-accent-blue bg-accent-blue/10 border border-accent-blue/30 rounded px-2 py-1 truncate">
          {truncate(prompt, 60)}
        </div>
      )}

      {/* Approve handle (bottom-left, green) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="approve"
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-green"
        style={{ left: "30%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-accent-green pointer-events-none select-none"
        style={{ bottom: -14, left: "30%", transform: "translateX(-50%)" }}
      >
        approve
      </span>

      {/* Reject handle (bottom-right, red) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="reject"
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-red"
        style={{ left: "70%" }}
      />
      <span
        className="absolute text-[9px] font-medium text-accent-red pointer-events-none select-none"
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
        nodeClasses(data.selected ?? selected, "border-l-4 border-l-accent-amber border-t-panel-border border-r-panel-border border-b-panel-border"),
        "min-w-[200px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-amber"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent-amber/20 text-accent-amber flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
      </div>

      {/* Language badge */}
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-amber/10 text-accent-amber border border-accent-amber/30 mb-1.5">
        {language}
      </span>

      {/* Code preview (first line) */}
      {firstLine && (
        <div className="text-[11px] font-mono text-text-secondary bg-panel-bg border border-panel-border rounded px-2 py-1 truncate">
          {truncate(firstLine, 36)}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-amber"
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
        nodeClasses(data.selected ?? selected, "border-l-4 border-l-accent-sky border-t-panel-border border-r-panel-border border-b-panel-border"),
        "min-w-[190px] p-3"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-sky"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-accent-sky/20 text-accent-sky flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary truncate">
          {data.label}
        </span>
      </div>

      {/* Key/Value */}
      <div className="flex flex-col gap-1">
        {key && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-accent-sky uppercase tracking-wider">
              key
            </span>
            <span className="text-[11px] font-mono text-text-secondary bg-panel-bg border border-panel-border rounded px-1.5 py-0.5 truncate">
              {truncate(key, 20)}
            </span>
          </div>
        )}
        {value && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-accent-sky uppercase tracking-wider">
              val
            </span>
            <span className="text-[11px] font-mono text-text-secondary bg-panel-bg border border-panel-border rounded px-1.5 py-0.5 truncate">
              {truncate(value, 20)}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-panel-card !bg-accent-sky"
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
