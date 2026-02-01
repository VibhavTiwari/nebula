/**
 * VariableSelector - Reusable component for selecting workflow state variables
 *
 * Shows available variables from workflow state with type badges.
 * Used in Classify input, conditions, transform nodes, etc.
 */

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { useAgentBuilderStore } from "@/stores/agentBuilderStore";

// ── Types ──

interface VariableOption {
  name: string;
  type: "STRING" | "NUMBER" | "BOOLEAN" | "ARRAY" | "OBJECT" | "ANY";
  source?: string; // which node produced it
}

interface VariableSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowCustom?: boolean; // allow typing custom variable names
}

// ── Type badge colors ──

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  STRING: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  NUMBER: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  BOOLEAN: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  ARRAY: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  OBJECT: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  ANY: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

// ── Component ──

export function VariableSelector({
  value,
  onChange,
  placeholder = "Select variable...",
  className,
  allowCustom = true,
}: VariableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stateVariables = useAgentBuilderStore((s) => s.stateVariables);
  const nodes = useAgentBuilderStore((s) => s.nodes);

  // Build list of available variables from:
  // 1. Explicit state variables set in the workflow
  // 2. Node outputs (inferred from node types)
  const availableVariables: VariableOption[] = [];

  // Add built-in variables
  availableVariables.push(
    { name: "input", type: "STRING", source: "System" },
    { name: "context", type: "OBJECT", source: "System" },
    { name: "messages", type: "ARRAY", source: "System" },
    { name: "user_id", type: "STRING", source: "System" },
    { name: "session_id", type: "STRING", source: "System" }
  );

  // Add state variables
  Object.entries(stateVariables).forEach(([key, val]) => {
    let type: VariableOption["type"] = "ANY";
    if (typeof val === "string") type = "STRING";
    else if (typeof val === "number") type = "NUMBER";
    else if (typeof val === "boolean") type = "BOOLEAN";
    else if (Array.isArray(val)) type = "ARRAY";
    else if (typeof val === "object") type = "OBJECT";

    availableVariables.push({ name: key, type, source: "State" });
  });

  // Add node outputs
  nodes.forEach((node) => {
    const label = node.data?.label || node.id;
    const nodeId = node.id.replace(/-/g, "_");

    switch (node.type) {
      case "agent":
        availableVariables.push(
          { name: `${nodeId}_output`, type: "STRING", source: label },
          { name: `${nodeId}_response`, type: "OBJECT", source: label }
        );
        break;
      case "classify":
        availableVariables.push(
          { name: `${nodeId}_category`, type: "STRING", source: label },
          { name: `${nodeId}_confidence`, type: "NUMBER", source: label }
        );
        break;
      case "transform":
        availableVariables.push(
          { name: `${nodeId}_result`, type: "ANY", source: label }
        );
        break;
      case "file-search":
        availableVariables.push(
          { name: `${nodeId}_results`, type: "ARRAY", source: label }
        );
        break;
      case "mcp":
        availableVariables.push(
          { name: `${nodeId}_output`, type: "ANY", source: label }
        );
        break;
      case "set-state":
        const config = node.data?.config || {};
        if (config.key) {
          availableVariables.push({
            name: config.key as string,
            type: (config.valueType as VariableOption["type"]) || "STRING",
            source: label,
          });
        }
        break;
    }
  });

  // Filter by search
  const filteredVariables = availableVariables.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.source?.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (varName: string) => {
    onChange(varName);
    setIsOpen(false);
    setSearch("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (allowCustom) {
      onChange(val);
    }
  };

  const selectedVar = availableVariables.find((v) => v.name === value);
  const typeColors = selectedVar ? TYPE_COLORS[selectedVar.type] : TYPE_COLORS.ANY;

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      {/* Input with type badge */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : value}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            setSearch(value);
          }}
          placeholder={placeholder}
          className={clsx(
            "nebula-input text-sm w-full",
            selectedVar && !isOpen && "pr-20"
          )}
        />

        {/* Type badge */}
        {selectedVar && !isOpen && (
          <span
            className={clsx(
              "absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase border",
              typeColors.bg,
              typeColors.text,
              typeColors.border
            )}
          >
            {selectedVar.type}
          </span>
        )}

        {/* Dropdown chevron */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-dark-4 hover:text-surface-dark-2"
          style={{ right: selectedVar && !isOpen ? "4.5rem" : "0.5rem" }}
        >
          <svg
            className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-surface-3 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredVariables.length === 0 ? (
            <div className="px-3 py-2 text-xs text-surface-dark-4">
              {allowCustom
                ? "No matching variables. Type to create custom."
                : "No variables available."}
            </div>
          ) : (
            <div className="py-1">
              {filteredVariables.map((variable, i) => {
                const colors = TYPE_COLORS[variable.type];
                return (
                  <button
                    key={`${variable.name}-${i}`}
                    type="button"
                    onClick={() => handleSelect(variable.name)}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-1 transition-colors",
                      variable.name === value && "bg-surface-1"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs truncate">
                        {variable.name}
                      </span>
                      {variable.source && (
                        <span className="text-[10px] text-surface-dark-4 truncate">
                          from {variable.source}
                        </span>
                      )}
                    </div>
                    <span
                      className={clsx(
                        "shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase border ml-2",
                        colors.bg,
                        colors.text,
                        colors.border
                      )}
                    >
                      {variable.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VariableSelector;
