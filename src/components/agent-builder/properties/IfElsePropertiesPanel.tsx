/**
 * IfElsePropertiesPanel - Configuration panel for If/Else nodes
 *
 * Matches OpenAI's if/else node interface:
 * - "If" section with case name and condition
 * - "Else if" sections (can add multiple)
 * - Delete buttons for each condition
 * - Help text about Common Expression Language
 */

import { useState } from "react";
import clsx from "clsx";
import { VariableSelector } from "./shared/VariableSelector";

// ── Types ──

interface Condition {
  id: string;
  name?: string;
  expression: string;
  type: "if" | "elseif";
}

interface IfElseConfig {
  conditions?: Condition[];
  conditionType?: "code" | "llm" | "variable";
  defaultBranch?: boolean; // whether to show "else" branch
}

interface IfElsePropertiesPanelProps {
  nodeId: string;
  config: IfElseConfig;
  onUpdate: (config: Partial<IfElseConfig>) => void;
}

// ── Helper ──

function generateId(): string {
  return `cond-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ── Component ──

export function IfElsePropertiesPanel({
  nodeId: _nodeId,
  config,
  onUpdate,
}: IfElsePropertiesPanelProps) {
  const [showExpressionHelp, setShowExpressionHelp] = useState(false);

  // Ensure at least one "if" condition exists
  const conditions: Condition[] = config.conditions?.length
    ? config.conditions
    : [{ id: generateId(), type: "if", expression: "", name: "" }];

  const ifCondition = conditions.find((c) => c.type === "if") || conditions[0];
  const elseIfConditions = conditions.filter((c) => c.type === "elseif");

  // ── Handlers ──

  const updateCondition = (id: string, patch: Partial<Condition>) => {
    const next = conditions.map((c) => (c.id === id ? { ...c, ...patch } : c));
    onUpdate({ conditions: next });
  };

  const addElseIf = () => {
    const newCondition: Condition = {
      id: generateId(),
      type: "elseif",
      expression: "",
      name: "",
    };
    onUpdate({ conditions: [...conditions, newCondition] });
  };

  const removeCondition = (id: string) => {
    // Cannot remove the main "if" condition
    const condition = conditions.find((c) => c.id === id);
    if (condition?.type === "if") return;

    onUpdate({ conditions: conditions.filter((c) => c.id !== id) });
  };

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

      {/* If Condition */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-semibold">
            If
          </div>
          <span className="text-[10px] text-surface-dark-4">
            Main condition
          </span>
        </div>

        <div className="border border-orange-200 rounded-lg p-3 bg-orange-50/30">
          {/* Case name (optional) */}
          <div className="mb-3">
            <label className="block text-[10px] text-surface-dark-4 mb-1">
              Case name (optional)
            </label>
            <input
              type="text"
              value={ifCondition.name || ""}
              onChange={(e) => updateCondition(ifCondition.id, { name: e.target.value })}
              className="nebula-input text-sm w-full"
              placeholder="e.g. User is authenticated"
            />
          </div>

          {/* Condition expression */}
          <div>
            <label className="block text-[10px] text-surface-dark-4 mb-1">
              Condition
            </label>
            {config.conditionType === "variable" ? (
              <VariableSelector
                value={ifCondition.expression}
                onChange={(value) => updateCondition(ifCondition.id, { expression: value })}
                placeholder="Select variable..."
              />
            ) : (
              <textarea
                value={ifCondition.expression}
                onChange={(e) => updateCondition(ifCondition.id, { expression: e.target.value })}
                className="nebula-input text-sm resize-none w-full font-mono"
                rows={3}
                placeholder={
                  config.conditionType === "llm"
                    ? "Describe the condition in natural language..."
                    : "Enter condition, e.g. input == 5"
                }
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>

      {/* Else If Conditions */}
      {elseIfConditions.map((condition, index) => (
        <div key={condition.id}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
                Else If
              </div>
              <span className="text-[10px] text-surface-dark-4">
                Condition {index + 2}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeCondition(condition.id)}
              className="p-1 rounded hover:bg-red-50 text-surface-dark-4 hover:text-red-500 transition-colors"
              title="Remove condition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/30">
            {/* Case name (optional) */}
            <div className="mb-3">
              <label className="block text-[10px] text-surface-dark-4 mb-1">
                Case name (optional)
              </label>
              <input
                type="text"
                value={condition.name || ""}
                onChange={(e) => updateCondition(condition.id, { name: e.target.value })}
                className="nebula-input text-sm w-full"
                placeholder="e.g. User is admin"
              />
            </div>

            {/* Condition expression */}
            <div>
              <label className="block text-[10px] text-surface-dark-4 mb-1">
                Condition
              </label>
              {config.conditionType === "variable" ? (
                <VariableSelector
                  value={condition.expression}
                  onChange={(value) => updateCondition(condition.id, { expression: value })}
                  placeholder="Select variable..."
                />
              ) : (
                <textarea
                  value={condition.expression}
                  onChange={(e) => updateCondition(condition.id, { expression: e.target.value })}
                  className="nebula-input text-sm resize-none w-full font-mono"
                  rows={2}
                  placeholder={
                    config.conditionType === "llm"
                      ? "Describe the condition..."
                      : "Enter condition expression..."
                  }
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add Else If */}
      <button
        type="button"
        onClick={addElseIf}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-surface-3 rounded-lg text-xs text-nebula-600 hover:border-nebula-500 hover:bg-nebula-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Else If
      </button>

      {/* Else branch indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-surface-3">
        <div className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 text-xs font-semibold">
          Else
        </div>
        <span className="text-xs text-surface-dark-4">
          Default path when no conditions match
        </span>
      </div>

      {/* Output handles preview */}
      <div className="pt-2 border-t border-surface-3">
        <div className="text-[10px] text-surface-dark-4 mb-2">Output handles:</div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700">
              {ifCondition.name || "if"} (true)
            </span>
          </div>
          {elseIfConditions.map((cond, i) => (
            <div key={cond.id} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-blue-700">
                {cond.name || `else-if-${i + 1}`}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-xs text-gray-600">else (false)</span>
          </div>
        </div>
      </div>

      {/* Expression Help */}
      {config.conditionType === "code" && (
        <div>
          <button
            type="button"
            onClick={() => setShowExpressionHelp(!showExpressionHelp)}
            className="flex items-center gap-1 text-[11px] text-nebula-600 hover:text-nebula-700"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Expression syntax help
          </button>

          {showExpressionHelp && (
            <div className="mt-2 p-3 bg-surface-1 rounded-lg text-xs space-y-2">
              <p className="text-surface-dark-4">
                Use Common Expression Language (CEL) for conditions:
              </p>
              <ul className="space-y-1 text-gray-700 font-mono text-[11px]">
                <li>input == "hello" - Equality</li>
                <li>count {">"} 5 - Comparison</li>
                <li>items.size() {">"} 0 - Array length</li>
                <li>text.contains("error") - String contains</li>
                <li>user.role == "admin" - Object property</li>
                <li>a && b || c - Logical operators</li>
              </ul>
              <a
                href="https://cel.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-nebula-600 hover:underline"
              >
                Learn more about CEL
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default IfElsePropertiesPanel;
