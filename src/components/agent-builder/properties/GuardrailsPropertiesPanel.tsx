/**
 * GuardrailsPropertiesPanel - Configuration panel for Guardrails nodes
 *
 * Features:
 * - Rules list with add/delete
 * - Each rule: name, type (input/output), condition, action (block/warn/log)
 * - Rule presets for common patterns
 */

import { useState } from "react";
import clsx from "clsx";

// ── Types ──

interface GuardrailRule {
  id: string;
  name: string;
  type: "input" | "output";
  condition: string;
  action: "block" | "warn" | "log";
  message?: string;
  enabled?: boolean;
}

interface GuardrailsConfig {
  rules?: GuardrailRule[];
  failBehavior?: "stop" | "continue";
  logViolations?: boolean;
}

interface GuardrailsPropertiesPanelProps {
  nodeId: string;
  config: GuardrailsConfig;
  onUpdate: (config: Partial<GuardrailsConfig>) => void;
}

// ── Preset rules ──

const RULE_PRESETS: Omit<GuardrailRule, "id">[] = [
  {
    name: "No PII",
    type: "input",
    condition: "!contains_pii(input)",
    action: "block",
    message: "Input contains personal identifiable information.",
  },
  {
    name: "No Profanity",
    type: "input",
    condition: "!contains_profanity(input)",
    action: "block",
    message: "Input contains inappropriate language.",
  },
  {
    name: "Grounded Output",
    type: "output",
    condition: "is_grounded(output, context)",
    action: "warn",
    message: "Output may not be grounded in provided context.",
  },
  {
    name: "Length Limit",
    type: "output",
    condition: "output.length <= 4000",
    action: "warn",
    message: "Output exceeds recommended length.",
  },
  {
    name: "No Code Execution",
    type: "output",
    condition: "!contains_code_block(output)",
    action: "log",
    message: "Output contains code that may be executed.",
  },
  {
    name: "Topic Relevance",
    type: "output",
    condition: "is_on_topic(output, allowed_topics)",
    action: "block",
    message: "Output is off-topic.",
  },
];

// ── Helper ──

function generateId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ── Component ──

export function GuardrailsPropertiesPanel({
  nodeId: _nodeId,
  config,
  onUpdate,
}: GuardrailsPropertiesPanelProps) {
  const [showPresets, setShowPresets] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const rules = config.rules || [];

  // ── Handlers ──

  const addRule = (preset?: Omit<GuardrailRule, "id">) => {
    const newRule: GuardrailRule = preset
      ? { ...preset, id: generateId(), enabled: true }
      : {
          id: generateId(),
          name: "",
          type: "input",
          condition: "",
          action: "block",
          enabled: true,
        };
    onUpdate({ rules: [...rules, newRule] });
    setExpandedRule(newRule.id);
    setShowPresets(false);
  };

  const updateRule = (id: string, patch: Partial<GuardrailRule>) => {
    const next = rules.map((r) => (r.id === id ? { ...r, ...patch } : r));
    onUpdate({ rules: next });
  };

  const removeRule = (id: string) => {
    onUpdate({ rules: rules.filter((r) => r.id !== id) });
    if (expandedRule === id) setExpandedRule(null);
  };

  const toggleRule = (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      updateRule(id, { enabled: !rule.enabled });
    }
  };

  const moveRule = (id: string, direction: "up" | "down") => {
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === rules.length - 1) return;

    const newRules = [...rules];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newRules[index], newRules[swapIndex]] = [newRules[swapIndex], newRules[index]];
    onUpdate({ rules: newRules });
  };

  return (
    <div className="space-y-5">
      {/* Rules List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">
            Rules ({rules.length})
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="text-[10px] text-nebula-600 hover:text-nebula-700 px-2 py-1 rounded hover:bg-nebula-50"
            >
              Presets
            </button>
            <button
              type="button"
              onClick={() => addRule()}
              className="text-[10px] text-nebula-600 hover:text-nebula-700 px-2 py-1 rounded hover:bg-nebula-50"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Presets dropdown */}
        {showPresets && (
          <div className="mb-3 p-2 bg-surface-1 rounded-lg border border-surface-3">
            <div className="text-[10px] text-surface-dark-4 mb-2">
              Quick add from presets:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {RULE_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => addRule(preset)}
                  className="flex items-center gap-2 px-2 py-1.5 text-left text-[11px] rounded border border-surface-3 hover:border-nebula-500 hover:bg-nebula-50 transition-colors"
                >
                  <span
                    className={clsx(
                      "shrink-0 w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold",
                      preset.type === "input"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    )}
                  >
                    {preset.type === "input" ? "I" : "O"}
                  </span>
                  <span className="truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rules */}
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className={clsx(
                "border rounded-lg transition-colors",
                rule.enabled !== false
                  ? "border-surface-3"
                  : "border-surface-2 opacity-60",
                expandedRule === rule.id && "border-nebula-300"
              )}
            >
              {/* Rule header */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={() =>
                  setExpandedRule(expandedRule === rule.id ? null : rule.id)
                }
              >
                {/* Enable toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRule(rule.id);
                  }}
                  className={clsx(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                    rule.enabled !== false
                      ? "border-green-500 bg-green-500"
                      : "border-surface-3"
                  )}
                >
                  {rule.enabled !== false && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Type badge */}
                <span
                  className={clsx(
                    "shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase",
                    rule.type === "input"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  )}
                >
                  {rule.type}
                </span>

                {/* Action badge */}
                <span
                  className={clsx(
                    "shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase",
                    rule.action === "block" && "bg-red-100 text-red-700",
                    rule.action === "warn" && "bg-amber-100 text-amber-700",
                    rule.action === "log" && "bg-gray-100 text-gray-600"
                  )}
                >
                  {rule.action}
                </span>

                {/* Name */}
                <span className="flex-1 text-sm text-gray-800 truncate">
                  {rule.name || "(unnamed rule)"}
                </span>

                {/* Expand icon */}
                <svg
                  className={clsx(
                    "w-4 h-4 text-surface-dark-4 transition-transform",
                    expandedRule === rule.id && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded rule details */}
              {expandedRule === rule.id && (
                <div className="px-3 pb-3 space-y-3 border-t border-surface-2">
                  <div className="pt-3 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveRule(rule.id, "up")}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-surface-2 disabled:opacity-30"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRule(rule.id, "down")}
                      disabled={index === rules.length - 1}
                      className="p-1 rounded hover:bg-surface-2 disabled:opacity-30"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      className="p-1 rounded hover:bg-red-50 text-surface-dark-4 hover:text-red-500"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-[10px] text-surface-dark-4 mb-1">
                      Rule Name
                    </label>
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                      className="nebula-input text-sm w-full"
                      placeholder="e.g. No PII"
                    />
                  </div>

                  {/* Type & Action */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-surface-dark-4 mb-1">
                        Type
                      </label>
                      <select
                        value={rule.type}
                        onChange={(e) =>
                          updateRule(rule.id, { type: e.target.value as "input" | "output" })
                        }
                        className="nebula-input text-sm w-full"
                      >
                        <option value="input">Input</option>
                        <option value="output">Output</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-surface-dark-4 mb-1">
                        Action
                      </label>
                      <select
                        value={rule.action}
                        onChange={(e) =>
                          updateRule(rule.id, {
                            action: e.target.value as "block" | "warn" | "log",
                          })
                        }
                        className="nebula-input text-sm w-full"
                      >
                        <option value="block">Block</option>
                        <option value="warn">Warn</option>
                        <option value="log">Log</option>
                      </select>
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-[10px] text-surface-dark-4 mb-1">
                      Condition
                    </label>
                    <textarea
                      value={rule.condition}
                      onChange={(e) => updateRule(rule.id, { condition: e.target.value })}
                      className="nebula-input text-sm w-full font-mono resize-none"
                      rows={2}
                      placeholder="e.g. !contains_pii(input)"
                      spellCheck={false}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-[10px] text-surface-dark-4 mb-1">
                      Violation Message
                    </label>
                    <input
                      type="text"
                      value={rule.message || ""}
                      onChange={(e) => updateRule(rule.id, { message: e.target.value })}
                      className="nebula-input text-sm w-full"
                      placeholder="Message shown when rule is violated"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {rules.length === 0 && (
            <div className="text-center py-8 text-xs text-surface-dark-4 border border-dashed border-surface-3 rounded-lg">
              No guardrail rules defined.
              <br />
              <button
                type="button"
                onClick={() => setShowPresets(true)}
                className="text-nebula-600 hover:text-nebula-700 mt-1"
              >
                Add from presets
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Settings */}
      <div className="pt-2 border-t border-surface-3 space-y-3">
        <div className="text-xs font-medium text-gray-700">Global Settings</div>

        {/* Fail Behavior */}
        <div>
          <label className="block text-[10px] text-surface-dark-4 mb-1">
            On Failure
          </label>
          <select
            value={config.failBehavior || "stop"}
            onChange={(e) =>
              onUpdate({ failBehavior: e.target.value as "stop" | "continue" })
            }
            className="nebula-input text-sm w-full"
          >
            <option value="stop">Stop workflow</option>
            <option value="continue">Continue (log only)</option>
          </select>
        </div>

        {/* Log Violations */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.logViolations ?? true}
            onChange={(e) => onUpdate({ logViolations: e.target.checked })}
            className="rounded border-surface-3 text-nebula-600 focus:ring-nebula-500"
          />
          <span className="text-xs text-gray-700">Log all violations</span>
        </label>
      </div>

      {/* Output handles */}
      <div className="pt-2 border-t border-surface-3">
        <div className="text-[10px] text-surface-dark-4 mb-2">Output handles:</div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700">pass (all rules passed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-700">fail (rule blocked)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuardrailsPropertiesPanel;
