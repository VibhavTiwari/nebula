/**
 * TransformPropertiesPanel - Configuration panel for Transform nodes
 *
 * Features:
 * - Language selector (JavaScript/Python)
 * - Code editor textarea with monospace font
 * - Input/output variable hints
 * - Syntax highlighting (basic)
 */

import { useState } from "react";
import clsx from "clsx";
import { VariableSelector } from "./shared/VariableSelector";

// ── Types ──

interface TransformConfig {
  language?: "javascript" | "python";
  code?: string;
  inputVariable?: string;
  outputVariable?: string;
  timeout?: number;
}

interface TransformPropertiesPanelProps {
  nodeId: string;
  config: TransformConfig;
  onUpdate: (config: Partial<TransformConfig>) => void;
}

// ── Code templates ──

const CODE_TEMPLATES = {
  javascript: {
    empty: `// Transform data
// 'input' contains the incoming data
// Return the transformed result

return input;`,
    mapArray: `// Map over array
return input.map(item => ({
  ...item,
  processed: true
}));`,
    filterData: `// Filter items
return input.filter(item =>
  item.value > 0
);`,
    parseJSON: `// Parse JSON string
try {
  return JSON.parse(input);
} catch (e) {
  return { error: e.message };
}`,
    formatOutput: `// Format output string
return \`Processed: \${input.name} - \${input.status}\`;`,
  },
  python: {
    empty: `# Transform data
# 'input' contains the incoming data
# Return the transformed result

return input`,
    mapArray: `# Map over list
return [
    {**item, "processed": True}
    for item in input
]`,
    filterData: `# Filter items
return [
    item for item in input
    if item["value"] > 0
]`,
    parseJSON: `# Parse JSON string
import json
try:
    return json.loads(input)
except Exception as e:
    return {"error": str(e)}`,
    formatOutput: `# Format output string
return f"Processed: {input['name']} - {input['status']}"`,
  },
};

// ── Component ──

export function TransformPropertiesPanel({
  nodeId: _nodeId,
  config,
  onUpdate,
}: TransformPropertiesPanelProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const language = config.language || "javascript";
  const templates = CODE_TEMPLATES[language];

  const applyTemplate = (key: keyof typeof templates) => {
    onUpdate({ code: templates[key] });
    setShowTemplates(false);
  };

  // Line count for gutter
  const lineCount = (config.code || "").split("\n").length;

  return (
    <div className="space-y-5">
      {/* Language Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Language
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUpdate({ language: "javascript" })}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors",
              language === "javascript"
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : "border-surface-3 text-surface-dark-4 hover:border-surface-dark-4"
            )}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/>
            </svg>
            <span className="text-xs font-medium">JavaScript</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ language: "python" })}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors",
              language === "python"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-surface-3 text-surface-dark-4 hover:border-surface-dark-4"
            )}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
            </svg>
            <span className="text-xs font-medium">Python</span>
          </button>
        </div>
      </div>

      {/* Input Variable */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Input Variable
        </label>
        <VariableSelector
          value={config.inputVariable || "input"}
          onChange={(value) => onUpdate({ inputVariable: value })}
          placeholder="Select input variable..."
        />
      </div>

      {/* Code Editor */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-700">Code</label>
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-[10px] text-nebula-600 hover:text-nebula-700"
          >
            Insert template
          </button>
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <div className="mb-2 p-2 bg-surface-1 rounded-lg border border-surface-3">
            <div className="text-[10px] text-surface-dark-4 mb-2">
              Choose a template:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(templates).map(([key, _]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyTemplate(key as keyof typeof templates)}
                  className="px-2 py-1.5 text-[11px] text-left rounded border border-surface-3 hover:border-nebula-500 hover:bg-nebula-50 transition-colors"
                >
                  {key === "empty" && "Empty template"}
                  {key === "mapArray" && "Map array"}
                  {key === "filterData" && "Filter data"}
                  {key === "parseJSON" && "Parse JSON"}
                  {key === "formatOutput" && "Format output"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Code textarea with line numbers */}
        <div className="relative rounded-lg border border-surface-3 overflow-hidden">
          {/* Line numbers */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-surface-1 border-r border-surface-3 flex flex-col items-end pr-1 pt-2 select-none pointer-events-none">
            {Array.from({ length: Math.max(lineCount, 10) }, (_, i) => (
              <span
                key={i}
                className="text-[10px] text-surface-dark-4 leading-5 font-mono"
              >
                {i + 1}
              </span>
            ))}
          </div>

          {/* Code area */}
          <textarea
            value={config.code || templates.empty}
            onChange={(e) => onUpdate({ code: e.target.value })}
            className={clsx(
              "w-full bg-white text-sm font-mono resize-none",
              "pl-10 pr-3 py-2 leading-5",
              "border-0 focus:ring-0 focus:outline-none",
              language === "javascript" ? "text-amber-900" : "text-blue-900"
            )}
            rows={12}
            spellCheck={false}
            placeholder="Enter your transformation code..."
          />
        </div>

        <p className="text-[10px] text-surface-dark-4 mt-1">
          Access input data via the <code className="bg-surface-2 px-1 rounded">input</code> variable.
          Return the transformed result.
        </p>
      </div>

      {/* Output Variable */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Output Variable (optional)
        </label>
        <input
          type="text"
          value={config.outputVariable || ""}
          onChange={(e) => onUpdate({ outputVariable: e.target.value })}
          className="nebula-input text-sm w-full font-mono"
          placeholder="e.g. transformedData"
        />
        <p className="text-[10px] text-surface-dark-4 mt-1">
          Store the result in a named variable for use in subsequent nodes.
        </p>
      </div>

      {/* Advanced Settings */}
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

      {showAdvanced && (
        <div className="space-y-4 pl-4 border-l-2 border-surface-2">
          {/* Timeout */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Timeout (ms)
            </label>
            <input
              type="number"
              value={config.timeout ?? 5000}
              onChange={(e) =>
                onUpdate({ timeout: parseInt(e.target.value, 10) || 5000 })
              }
              className="nebula-input text-sm w-full"
              min={100}
              max={60000}
            />
            <p className="text-[10px] text-surface-dark-4 mt-1">
              Maximum execution time before timeout (100ms - 60000ms).
            </p>
          </div>
        </div>
      )}

      {/* Available variables hint */}
      <div className="p-3 bg-surface-1 rounded-lg">
        <div className="text-[10px] font-medium text-surface-dark-4 mb-2">
          Available in scope:
        </div>
        <div className="flex flex-wrap gap-1.5">
          <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
            input
          </code>
          <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
            context
          </code>
          <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
            state
          </code>
          {language === "javascript" && (
            <>
              <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
                JSON
              </code>
              <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
                Math
              </code>
            </>
          )}
          {language === "python" && (
            <>
              <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
                json
              </code>
              <code className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono text-gray-700 border border-surface-3">
                re
              </code>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransformPropertiesPanel;
