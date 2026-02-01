/**
 * AgentPropertiesPanel - Configuration panel for Agent nodes
 *
 * Features:
 * - Name input
 * - Instructions textarea (system prompt)
 * - Model selector dropdown
 * - Temperature slider (0-2)
 * - Max tokens input
 * - Tools multi-select
 * - Handoff agents multi-select
 */

import { useState } from "react";
import clsx from "clsx";
import { ModelSelector } from "./shared/ModelSelector";
import { useAgentBuilderStore } from "@/stores/agentBuilderStore";

// ── Types ──

interface AgentConfig {
  model?: string;
  instructions?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  handoffAgents?: string[];
  responseFormat?: "text" | "json";
  streaming?: boolean;
}

interface AgentPropertiesPanelProps {
  nodeId: string;
  config: AgentConfig;
  onUpdate: (config: Partial<AgentConfig>) => void;
}

// ── Available tools ──

const AVAILABLE_TOOLS = [
  {
    id: "file_search",
    name: "File Search",
    description: "Search through uploaded files and documents",
    icon: "S",
    color: "bg-green-100 text-green-700",
  },
  {
    id: "code_interpreter",
    name: "Code Interpreter",
    description: "Execute Python code and analyze data",
    icon: "C",
    color: "bg-amber-100 text-amber-700",
  },
  {
    id: "web_search",
    name: "Web Search",
    description: "Search the web for current information",
    icon: "W",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "function_call",
    name: "Function Calling",
    description: "Call custom functions defined in your workflow",
    icon: "F",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "image_generation",
    name: "Image Generation",
    description: "Generate images using DALL-E",
    icon: "I",
    color: "bg-pink-100 text-pink-700",
  },
  {
    id: "computer_use",
    name: "Computer Use",
    description: "Control computer interface (Anthropic)",
    icon: "U",
    color: "bg-indigo-100 text-indigo-700",
  },
];

// ── Component ──

export function AgentPropertiesPanel({
  nodeId,
  config,
  onUpdate,
}: AgentPropertiesPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const nodes = useAgentBuilderStore((s) => s.nodes);

  // Get list of other agent nodes for handoff selection
  const otherAgents = nodes.filter(
    (n) => n.type === "agent" && n.id !== nodeId
  );

  const tools = config.tools || [];
  const handoffAgents = config.handoffAgents || [];

  const toggleTool = (toolId: string) => {
    const next = tools.includes(toolId)
      ? tools.filter((t) => t !== toolId)
      : [...tools, toolId];
    onUpdate({ tools: next });
  };

  const toggleHandoff = (agentId: string) => {
    const next = handoffAgents.includes(agentId)
      ? handoffAgents.filter((a) => a !== agentId)
      : [...handoffAgents, agentId];
    onUpdate({ handoffAgents: next });
  };

  return (
    <div className="space-y-5">
      {/* Instructions */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-700">
            Instructions
          </label>
          <span className="text-[10px] text-surface-dark-4">
            System prompt
          </span>
        </div>
        <textarea
          value={config.instructions || ""}
          onChange={(e) => onUpdate({ instructions: e.target.value })}
          className="nebula-input text-sm resize-none w-full"
          rows={6}
          placeholder="You are a helpful assistant that..."
        />
        <p className="text-[10px] text-surface-dark-4 mt-1">
          Define the agent's behavior, personality, and constraints.
        </p>
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Model
        </label>
        <ModelSelector
          value={config.model || "gpt-4o"}
          onChange={(model) => onUpdate({ model })}
        />
      </div>

      {/* Temperature */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-700">
            Temperature
          </label>
          <span className="text-xs font-mono text-nebula-600">
            {(config.temperature ?? 1).toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={config.temperature ?? 1}
          onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
          className="w-full h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-nebula-600"
        />
        <div className="flex justify-between text-[10px] text-surface-dark-4 mt-1">
          <span>Precise (0)</span>
          <span>Balanced (1)</span>
          <span>Creative (2)</span>
        </div>
      </div>

      {/* Tools */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Tools
        </label>
        <div className="space-y-2">
          {AVAILABLE_TOOLS.map((tool) => (
            <label
              key={tool.id}
              className={clsx(
                "flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                tools.includes(tool.id)
                  ? "border-nebula-500 bg-nebula-50"
                  : "border-surface-3 hover:border-surface-dark-4"
              )}
            >
              <input
                type="checkbox"
                checked={tools.includes(tool.id)}
                onChange={() => toggleTool(tool.id)}
                className="sr-only"
              />
              <div
                className={clsx(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                  tool.color
                )}
              >
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">
                  {tool.name}
                </div>
                <div className="text-[11px] text-surface-dark-4">
                  {tool.description}
                </div>
              </div>
              <div
                className={clsx(
                  "w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                  tools.includes(tool.id)
                    ? "border-nebula-600 bg-nebula-600"
                    : "border-surface-3"
                )}
              >
                {tools.includes(tool.id) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Handoff Agents */}
      {otherAgents.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Handoff Agents
          </label>
          <p className="text-[10px] text-surface-dark-4 mb-2">
            Select agents this agent can transfer conversations to.
          </p>
          <div className="space-y-1.5">
            {otherAgents.map((agent) => (
              <label
                key={agent.id}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                  handoffAgents.includes(agent.id)
                    ? "border-nebula-500 bg-nebula-50"
                    : "border-surface-3 hover:border-surface-dark-4"
                )}
              >
                <input
                  type="checkbox"
                  checked={handoffAgents.includes(agent.id)}
                  onChange={() => toggleHandoff(agent.id)}
                  className="rounded border-surface-3 text-nebula-600 focus:ring-nebula-500"
                />
                <div className="w-5 h-5 rounded-full bg-nebula-100 text-nebula-700 flex items-center justify-center text-[10px] font-bold">
                  A
                </div>
                <span className="text-sm text-gray-800">
                  {agent.data?.label || agent.id}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

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
          {/* Max Tokens */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Max Tokens
            </label>
            <input
              type="number"
              value={config.maxTokens || ""}
              onChange={(e) =>
                onUpdate({
                  maxTokens: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="nebula-input text-sm w-full"
              placeholder="e.g. 4096 (leave empty for default)"
              min={1}
            />
            <p className="text-[10px] text-surface-dark-4 mt-1">
              Maximum number of tokens in the response.
            </p>
          </div>

          {/* Response Format */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Response Format
            </label>
            <select
              value={config.responseFormat || "text"}
              onChange={(e) =>
                onUpdate({ responseFormat: e.target.value as "text" | "json" })
              }
              className="nebula-input text-sm w-full"
            >
              <option value="text">Text</option>
              <option value="json">JSON Object</option>
            </select>
          </div>

          {/* Streaming */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.streaming ?? true}
              onChange={(e) => onUpdate({ streaming: e.target.checked })}
              className="rounded border-surface-3 text-nebula-600 focus:ring-nebula-500"
            />
            <span className="text-xs text-gray-700">Enable streaming</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default AgentPropertiesPanel;
