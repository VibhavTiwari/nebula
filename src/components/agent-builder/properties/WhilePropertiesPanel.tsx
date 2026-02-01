/**
 * WhilePropertiesPanel - Configuration panel for While Loop nodes
 *
 * Features:
 * - Condition textarea
 * - Condition type selector (code/llm/variable)
 * - Max iterations input with safety warning
 * - Loop body configuration
 */

import { useState } from "react";
import clsx from "clsx";
import { VariableSelector } from "./shared/VariableSelector";

// ── Types ──

interface WhileConfig {
  condition?: string;
  conditionType?: "code" | "llm" | "variable";
  maxIterations?: number;
  continueOnError?: boolean;
  loopVariable?: string;
  incrementBy?: number;
}

interface WhilePropertiesPanelProps {
  nodeId: string;
  config: WhileConfig;
  onUpdate: (config: Partial<WhileConfig>) => void;
}

// ── Component ──

export function WhilePropertiesPanel({
  nodeId: _nodeId,
  config,
  onUpdate,
}: WhilePropertiesPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const maxIterations = config.maxIterations ?? 10;
  const isHighIterationCount = maxIterations > 50;

  return (
    <div className="space-y-5">
      {/* Condition Type */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Condition Type
        </label>
        <div className="flex gap-2">
          {(["code", "llm", "variable"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onUpdate({ conditionType: type })}
              className={clsx(
                "flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                config.conditionType === type
                  ? "border-nebula-500 bg-nebula-50 text-nebula-700"
                  : "border-surface-3 text-surface-dark-4 hover:border-surface-dark-4"
              )}
            >
              {type === "code" && "Expression"}
              {type === "llm" && "LLM"}
              {type === "variable" && "Variable"}
            </button>
          ))}
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Continue While
        </label>
        {config.conditionType === "variable" ? (
          <VariableSelector
            value={config.condition || ""}
            onChange={(value) => onUpdate({ condition: value })}
            placeholder="Select variable (truthy = continue)..."
          />
        ) : (
          <textarea
            value={config.condition || ""}
            onChange={(e) => onUpdate({ condition: e.target.value })}
            className="nebula-input text-sm resize-none w-full font-mono"
            rows={4}
            placeholder={
              config.conditionType === "llm"
                ? "Describe when the loop should continue..."
                : "Enter condition, e.g. counter < 10"
            }
            spellCheck={false}
          />
        )}
        <p className="text-[10px] text-surface-dark-4 mt-1">
          The loop continues as long as this condition evaluates to true.
        </p>
      </div>

      {/* Max Iterations */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-700">
            Max Iterations
          </label>
          <span
            className={clsx(
              "text-xs font-mono",
              isHighIterationCount ? "text-amber-600" : "text-nebula-600"
            )}
          >
            {maxIterations}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={maxIterations}
          onChange={(e) => onUpdate({ maxIterations: parseInt(e.target.value, 10) })}
          className="w-full h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-nebula-600"
        />
        <div className="flex justify-between text-[10px] text-surface-dark-4 mt-1">
          <span>1</span>
          <span>50</span>
          <span>100</span>
        </div>

        {/* High iteration warning */}
        {isHighIterationCount && (
          <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-[11px] text-amber-700">
              <strong>Warning:</strong> High iteration counts may cause performance issues or exceed API rate limits.
            </div>
          </div>
        )}
      </div>

      {/* Or: Manual input */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Or enter exact value
        </label>
        <input
          type="number"
          value={maxIterations}
          onChange={(e) =>
            onUpdate({
              maxIterations: Math.max(1, Math.min(1000, parseInt(e.target.value, 10) || 10)),
            })
          }
          className="nebula-input text-sm w-full"
          min={1}
          max={1000}
        />
      </div>

      {/* Loop visualization */}
      <div className="relative p-4 bg-indigo-50/50 border border-dashed border-indigo-300 rounded-lg">
        <div className="absolute -top-2 left-3 px-2 bg-white text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
          Loop Body
        </div>
        <div className="flex items-center justify-center h-12 text-xs text-indigo-400">
          Nodes connected to this loop will repeat
        </div>

        {/* Loop arrow indicator */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2">
          <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs text-surface-dark-4 hover:text-gray-700 transition-colors"
      >
        <svg
          className={clsx("w-3 h-3 transition-transform", showAdvanced && "rotate-90")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Advanced Settings
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-surface-2">
          {/* Loop Variable */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Loop Counter Variable
            </label>
            <input
              type="text"
              value={config.loopVariable || ""}
              onChange={(e) => onUpdate({ loopVariable: e.target.value })}
              className="nebula-input text-sm w-full font-mono"
              placeholder="e.g. i, index, counter"
            />
            <p className="text-[10px] text-surface-dark-4 mt-1">
              Variable name to track iteration count (0-indexed).
            </p>
          </div>

          {/* Increment By */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Increment By
            </label>
            <input
              type="number"
              value={config.incrementBy ?? 1}
              onChange={(e) =>
                onUpdate({ incrementBy: parseInt(e.target.value, 10) || 1 })
              }
              className="nebula-input text-sm w-full"
              min={1}
            />
          </div>

          {/* Continue on Error */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.continueOnError ?? false}
              onChange={(e) => onUpdate({ continueOnError: e.target.checked })}
              className="rounded border-surface-3 text-nebula-600 focus:ring-nebula-500"
            />
            <div>
              <span className="text-xs text-gray-700">Continue on error</span>
              <p className="text-[10px] text-surface-dark-4">
                If an iteration fails, continue to the next instead of stopping.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Output handles info */}
      <div className="pt-2 border-t border-surface-3">
        <div className="text-[10px] text-surface-dark-4 mb-2">Output handles:</div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs text-indigo-700">loop (each iteration)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700">done (after loop ends)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhilePropertiesPanel;
