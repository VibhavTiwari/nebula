/**
 * McpPropertiesPanel - Configuration panel for MCP (Model Context Protocol) nodes
 *
 * Features:
 * - Server selector dropdown
 * - Tool name input with autocomplete
 * - Parameters JSON editor
 * - Connection status indicator
 */

import { useState } from "react";
import clsx from "clsx";

// ── Types ──

interface McpServer {
  id: string;
  name: string;
  url: string;
  status: "connected" | "disconnected" | "error";
  tools: McpTool[];
}

interface McpTool {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }[];
}

interface McpConfig {
  serverId?: string;
  toolName?: string;
  parameters?: string;
  timeout?: number;
  retryOnError?: boolean;
}

interface McpPropertiesPanelProps {
  nodeId: string;
  config: McpConfig;
  onUpdate: (config: Partial<McpConfig>) => void;
}

// ── Mock MCP servers ──

const MOCK_MCP_SERVERS: McpServer[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    url: "mcp://localhost:8080/filesystem",
    status: "connected",
    tools: [
      {
        name: "read_file",
        description: "Read contents of a file",
        parameters: [
          { name: "path", type: "string", required: true, description: "Path to the file" },
        ],
      },
      {
        name: "write_file",
        description: "Write contents to a file",
        parameters: [
          { name: "path", type: "string", required: true },
          { name: "content", type: "string", required: true },
        ],
      },
      {
        name: "list_directory",
        description: "List files in a directory",
        parameters: [
          { name: "path", type: "string", required: true },
          { name: "recursive", type: "boolean", required: false },
        ],
      },
    ],
  },
  {
    id: "database",
    name: "Database",
    url: "mcp://localhost:8081/postgres",
    status: "connected",
    tools: [
      {
        name: "query",
        description: "Execute a SQL query",
        parameters: [
          { name: "sql", type: "string", required: true, description: "SQL query to execute" },
          { name: "params", type: "array", required: false },
        ],
      },
      {
        name: "insert",
        description: "Insert a record",
        parameters: [
          { name: "table", type: "string", required: true },
          { name: "data", type: "object", required: true },
        ],
      },
    ],
  },
  {
    id: "browser",
    name: "Browser Automation",
    url: "mcp://localhost:8082/browser",
    status: "disconnected",
    tools: [
      {
        name: "navigate",
        description: "Navigate to a URL",
        parameters: [{ name: "url", type: "string", required: true }],
      },
      {
        name: "screenshot",
        description: "Take a screenshot",
        parameters: [{ name: "selector", type: "string", required: false }],
      },
      {
        name: "click",
        description: "Click an element",
        parameters: [{ name: "selector", type: "string", required: true }],
      },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    url: "mcp://api.github.com/mcp",
    status: "connected",
    tools: [
      {
        name: "create_issue",
        description: "Create a GitHub issue",
        parameters: [
          { name: "repo", type: "string", required: true },
          { name: "title", type: "string", required: true },
          { name: "body", type: "string", required: false },
        ],
      },
      {
        name: "create_pr",
        description: "Create a pull request",
        parameters: [
          { name: "repo", type: "string", required: true },
          { name: "title", type: "string", required: true },
          { name: "head", type: "string", required: true },
          { name: "base", type: "string", required: true },
        ],
      },
    ],
  },
];

// ── Component ──

export function McpPropertiesPanel({
  nodeId: _nodeId,
  config,
  onUpdate,
}: McpPropertiesPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const selectedServer = MOCK_MCP_SERVERS.find((s) => s.id === config.serverId);
  const selectedTool = selectedServer?.tools.find((t) => t.name === config.toolName);

  // ── Handlers ──

  const handleParametersChange = (value: string) => {
    onUpdate({ parameters: value });

    // Validate JSON
    try {
      if (value.trim()) {
        JSON.parse(value);
      }
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const generateParameterTemplate = () => {
    if (!selectedTool) return;

    const template: Record<string, unknown> = {};
    selectedTool.parameters.forEach((param) => {
      if (param.type === "string") template[param.name] = "";
      else if (param.type === "number") template[param.name] = 0;
      else if (param.type === "boolean") template[param.name] = false;
      else if (param.type === "array") template[param.name] = [];
      else if (param.type === "object") template[param.name] = {};
      else template[param.name] = null;
    });

    onUpdate({ parameters: JSON.stringify(template, null, 2) });
    setJsonError(null);
  };

  return (
    <div className="space-y-5">
      {/* Server Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          MCP Server
        </label>
        <div className="space-y-2">
          {MOCK_MCP_SERVERS.map((server) => (
            <button
              key={server.id}
              type="button"
              onClick={() => onUpdate({ serverId: server.id, toolName: undefined })}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left",
                config.serverId === server.id
                  ? "border-nebula-500 bg-nebula-50"
                  : "border-surface-3 hover:border-surface-dark-4"
              )}
            >
              {/* Status indicator */}
              <span
                className={clsx(
                  "w-2 h-2 rounded-full shrink-0",
                  server.status === "connected" && "bg-green-500",
                  server.status === "disconnected" && "bg-gray-400",
                  server.status === "error" && "bg-red-500"
                )}
              />

              {/* Server icon */}
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>

              {/* Server info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{server.name}</div>
                <div className="text-[10px] text-surface-dark-4 font-mono truncate">
                  {server.url}
                </div>
              </div>

              {/* Tools count */}
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-surface-2 text-[10px] text-surface-dark-4">
                {server.tools.length} tools
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tool Selector */}
      {selectedServer && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Tool
          </label>
          <select
            value={config.toolName || ""}
            onChange={(e) => onUpdate({ toolName: e.target.value })}
            className="nebula-input text-sm w-full"
          >
            <option value="">Select a tool...</option>
            {selectedServer.tools.map((tool) => (
              <option key={tool.name} value={tool.name}>
                {tool.name}
              </option>
            ))}
          </select>

          {/* Tool description */}
          {selectedTool && (
            <p className="text-[10px] text-surface-dark-4 mt-1">
              {selectedTool.description}
            </p>
          )}
        </div>
      )}

      {/* Parameters */}
      {selectedTool && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-700">Parameters</label>
            <button
              type="button"
              onClick={generateParameterTemplate}
              className="text-[10px] text-nebula-600 hover:text-nebula-700"
            >
              Generate template
            </button>
          </div>

          {/* Parameter hints */}
          <div className="mb-2 p-2 bg-surface-1 rounded-lg">
            <div className="text-[10px] text-surface-dark-4 mb-1.5">
              Required parameters:
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedTool.parameters.map((param) => (
                <span
                  key={param.name}
                  className={clsx(
                    "px-1.5 py-0.5 rounded text-[9px] font-mono",
                    param.required
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {param.name}: {param.type}
                  {!param.required && "?"}
                </span>
              ))}
            </div>
          </div>

          {/* JSON editor */}
          <textarea
            value={config.parameters || "{\n  \n}"}
            onChange={(e) => handleParametersChange(e.target.value)}
            className={clsx(
              "nebula-input text-sm w-full font-mono resize-none",
              jsonError && "border-red-300 focus:border-red-500 focus:ring-red-500"
            )}
            rows={8}
            placeholder='{"key": "value"}'
            spellCheck={false}
          />
          {jsonError && (
            <p className="text-[10px] text-red-600 mt-1">
              Invalid JSON: {jsonError}
            </p>
          )}
        </div>
      )}

      {/* Connection status info */}
      {selectedServer && (
        <div
          className={clsx(
            "flex items-center gap-2 px-3 py-2 rounded-lg border",
            selectedServer.status === "connected" && "bg-green-50 border-green-200",
            selectedServer.status === "disconnected" && "bg-gray-50 border-gray-200",
            selectedServer.status === "error" && "bg-red-50 border-red-200"
          )}
        >
          <span
            className={clsx(
              "w-2 h-2 rounded-full",
              selectedServer.status === "connected" && "bg-green-500",
              selectedServer.status === "disconnected" && "bg-gray-400",
              selectedServer.status === "error" && "bg-red-500"
            )}
          />
          <span
            className={clsx(
              "text-xs",
              selectedServer.status === "connected" && "text-green-700",
              selectedServer.status === "disconnected" && "text-gray-600",
              selectedServer.status === "error" && "text-red-700"
            )}
          >
            {selectedServer.status === "connected" && "Server connected"}
            {selectedServer.status === "disconnected" && "Server not connected"}
            {selectedServer.status === "error" && "Connection error"}
          </span>
        </div>
      )}

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
              value={config.timeout ?? 30000}
              onChange={(e) => onUpdate({ timeout: parseInt(e.target.value, 10) || 30000 })}
              className="nebula-input text-sm w-full"
              min={1000}
              max={300000}
            />
          </div>

          {/* Retry on Error */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.retryOnError ?? false}
              onChange={(e) => onUpdate({ retryOnError: e.target.checked })}
              className="rounded border-surface-3 text-nebula-600 focus:ring-nebula-500"
            />
            <span className="text-xs text-gray-700">Retry on error (max 3 attempts)</span>
          </label>
        </div>
      )}

      {/* Output info */}
      <div className="p-3 bg-surface-1 rounded-lg">
        <div className="text-[10px] font-medium text-surface-dark-4 mb-2">
          Output:
        </div>
        <p className="text-[11px] text-gray-600">
          The tool result will be available as{" "}
          <code className="px-1 py-0.5 bg-white rounded border border-surface-3 text-[10px] font-mono">
            mcp_result
          </code>
        </p>
      </div>
    </div>
  );
}

export default McpPropertiesPanel;
