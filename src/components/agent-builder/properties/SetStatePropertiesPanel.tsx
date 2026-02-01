/**
 * SetStatePropertiesPanel - Configuration panel for Set State nodes
 *
 * Features:
 * - Variable name input
 * - Value input
 * - Value type selector (string/number/boolean/json)
 * - Expression mode for dynamic values
 */

import { useState } from "react";
import clsx from "clsx";
import { VariableSelector } from "./shared/VariableSelector";

// ── Types ──

interface SetStateConfig {
  key?: string;
  value?: string;
  valueType?: "string" | "number" | "boolean" | "json" | "expression";
  description?: string;
}

interface SetStatePropertiesPanelProps {
  nodeId: string;
  config: SetStateConfig;
  onUpdate: (config: Partial<SetStateConfig>) => void;
}

// ── Value type definitions ──

const VALUE_TYPES = [
  {
    id: "string" as const,
    name: "String",
    icon: "Aa",
    color: "bg-green-100 text-green-700",
    placeholder: "Hello, world!",
  },
  {
    id: "number" as const,
    name: "Number",
    icon: "123",
    color: "bg-blue-100 text-blue-700",
    placeholder: "42",
  },
  {
    id: "boolean" as const,
    name: "Boolean",
    icon: "T/F",
    color: "bg-purple-100 text-purple-700",
    placeholder: "true",
  },
  {
    id: "json" as const,
    name: "JSON",
    icon: "{ }",
    color: "bg-orange-100 text-orange-700",
    placeholder: '{"key": "value"}',
  },
  {
    id: "expression" as const,
    name: "Expression",
    icon: "fx",
    color: "bg-indigo-100 text-indigo-700",
    placeholder: "input.length * 2",
  },
];

// ── Component ──

export function SetStatePropertiesPanel({
  nodeId: _nodeId,
  config,
  onUpdate,
}: SetStatePropertiesPanelProps) {
  const [showDescription, setShowDescription] = useState(!!config.description);

  const valueType = config.valueType || "string";
  const selectedType = VALUE_TYPES.find((t) => t.id === valueType) || VALUE_TYPES[0];

  // Validate JSON
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleValueChange = (value: string) => {
    onUpdate({ value });

    // Validate JSON if type is json
    if (valueType === "json") {
      try {
        if (value.trim()) {
          JSON.parse(value);
        }
        setJsonError(null);
      } catch (e) {
        setJsonError((e as Error).message);
      }
    } else {
      setJsonError(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Variable Name */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Variable Name
        </label>
        <input
          type="text"
          value={config.key || ""}
          onChange={(e) => onUpdate({ key: e.target.value })}
          className="nebula-input text-sm w-full font-mono"
          placeholder="e.g. counter, userName, isComplete"
        />
        <p className="text-[10px] text-surface-dark-4 mt-1">
          The name used to reference this variable in other nodes.
        </p>
      </div>

      {/* Value Type */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Value Type
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {VALUE_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => onUpdate({ valueType: type.id })}
              className={clsx(
                "flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-colors",
                valueType === type.id
                  ? "border-nebula-500 bg-nebula-50"
                  : "border-surface-3 hover:border-surface-dark-4"
              )}
            >
              <span
                className={clsx(
                  "w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold",
                  type.color
                )}
              >
                {type.icon}
              </span>
              <span className="text-[10px] text-gray-600">{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Value Input */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Value
        </label>

        {valueType === "boolean" ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ value: "true" })}
              className={clsx(
                "flex-1 px-4 py-2 rounded-lg border transition-colors font-medium",
                config.value === "true"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-surface-3 text-surface-dark-4 hover:border-surface-dark-4"
              )}
            >
              True
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ value: "false" })}
              className={clsx(
                "flex-1 px-4 py-2 rounded-lg border transition-colors font-medium",
                config.value === "false"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-surface-3 text-surface-dark-4 hover:border-surface-dark-4"
              )}
            >
              False
            </button>
          </div>
        ) : valueType === "json" ? (
          <div>
            <textarea
              value={config.value || ""}
              onChange={(e) => handleValueChange(e.target.value)}
              className={clsx(
                "nebula-input text-sm w-full font-mono resize-none",
                jsonError && "border-red-300 focus:border-red-500 focus:ring-red-500"
              )}
              rows={6}
              placeholder={selectedType.placeholder}
              spellCheck={false}
            />
            {jsonError && (
              <p className="text-[10px] text-red-600 mt-1">
                Invalid JSON: {jsonError}
              </p>
            )}
          </div>
        ) : valueType === "expression" ? (
          <div>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-500 font-mono text-sm font-bold">
                =
              </span>
              <input
                type="text"
                value={config.value || ""}
                onChange={(e) => handleValueChange(e.target.value)}
                className="nebula-input text-sm w-full font-mono pl-6"
                placeholder={selectedType.placeholder}
              />
            </div>
            <p className="text-[10px] text-surface-dark-4 mt-1">
              Use JavaScript expressions. Variables: <code>input</code>, <code>context</code>, <code>state</code>
            </p>
          </div>
        ) : (
          <input
            type={valueType === "number" ? "number" : "text"}
            value={config.value || ""}
            onChange={(e) => handleValueChange(e.target.value)}
            className="nebula-input text-sm w-full"
            placeholder={selectedType.placeholder}
          />
        )}
      </div>

      {/* From Variable Option (for expression type) */}
      {valueType === "expression" && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Or select from variable
          </label>
          <VariableSelector
            value=""
            onChange={(value) => onUpdate({ value })}
            placeholder="Choose a variable..."
          />
        </div>
      )}

      {/* Description (optional) */}
      <div>
        {!showDescription ? (
          <button
            type="button"
            onClick={() => setShowDescription(true)}
            className="text-xs text-nebula-600 hover:text-nebula-700"
          >
            + Add description
          </button>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={config.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="nebula-input text-sm w-full"
              placeholder="What is this variable used for?"
            />
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-3 bg-surface-1 rounded-lg border border-surface-3">
        <div className="text-[10px] font-medium text-surface-dark-4 mb-2">
          Result Preview
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-700">
            {config.key || "variableName"}
          </span>
          <span className="text-surface-dark-4">=</span>
          <span
            className={clsx(
              "px-2 py-0.5 rounded text-sm font-mono",
              selectedType.color
            )}
          >
            {valueType === "boolean" && (config.value === "true" ? "true" : "false")}
            {valueType === "number" && (config.value || "0")}
            {valueType === "string" && `"${config.value || ""}"`}
            {valueType === "json" && (config.value ? "(JSON object)" : "{}")}
            {valueType === "expression" && `(evaluated)`}
          </span>
        </div>
      </div>

      {/* Type badges legend */}
      <div className="pt-2 border-t border-surface-3">
        <div className="text-[10px] text-surface-dark-4 mb-2">
          This variable will be available as:
        </div>
        <div className="flex flex-wrap gap-2">
          <code className="px-1.5 py-0.5 bg-sky-50 rounded text-[10px] font-mono text-sky-700 border border-sky-200">
            state.{config.key || "variableName"}
          </code>
          <code className="px-1.5 py-0.5 bg-sky-50 rounded text-[10px] font-mono text-sky-700 border border-sky-200">
            ${"{"}state.{config.key || "variableName"}{"}"}
          </code>
        </div>
      </div>
    </div>
  );
}

export default SetStatePropertiesPanel;
