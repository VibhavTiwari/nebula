/**
 * ModelSelector - Reusable dropdown for selecting AI models
 *
 * Groups models by provider: OpenAI, Anthropic, Google, Local/Other.
 * Shows model name, version, and capability indicators.
 */

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

// ── Types ──

interface ModelInfo {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "google" | "local";
  version?: string;
  capabilities?: ("vision" | "tools" | "code" | "fast")[];
  contextWindow?: string;
  description?: string;
}

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

// ── Model definitions ──

const MODELS: ModelInfo[] = [
  // OpenAI
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    version: "Latest",
    capabilities: ["vision", "tools", "code"],
    contextWindow: "128K",
    description: "Most capable GPT-4 model",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    version: "Latest",
    capabilities: ["vision", "tools", "fast"],
    contextWindow: "128K",
    description: "Fast and cost-effective",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    version: "0125",
    capabilities: ["vision", "tools", "code"],
    contextWindow: "128K",
    description: "Previous GPT-4 version",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    capabilities: ["tools", "fast"],
    contextWindow: "16K",
    description: "Fast and economical",
  },
  {
    id: "o1-preview",
    name: "o1 Preview",
    provider: "openai",
    capabilities: ["code"],
    contextWindow: "128K",
    description: "Advanced reasoning model",
  },
  {
    id: "o1-mini",
    name: "o1 Mini",
    provider: "openai",
    capabilities: ["code", "fast"],
    contextWindow: "128K",
    description: "Efficient reasoning model",
  },

  // Anthropic
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "anthropic",
    version: "2025-05-14",
    capabilities: ["vision", "tools", "code"],
    contextWindow: "200K",
    description: "Most capable Claude model",
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    version: "2025-05-14",
    capabilities: ["vision", "tools", "code"],
    contextWindow: "200K",
    description: "Balanced performance and cost",
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    version: "2024-10-22",
    capabilities: ["vision", "tools", "code"],
    contextWindow: "200K",
    description: "Previous Sonnet version",
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    version: "2024-10-22",
    capabilities: ["tools", "fast"],
    contextWindow: "200K",
    description: "Fast and efficient",
  },

  // Google
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    capabilities: ["vision", "tools", "fast"],
    contextWindow: "1M",
    description: "Latest Gemini model",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    capabilities: ["vision", "tools", "code"],
    contextWindow: "2M",
    description: "Large context window",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    capabilities: ["vision", "tools", "fast"],
    contextWindow: "1M",
    description: "Fast multimodal model",
  },

  // Local / Other
  {
    id: "ollama/llama3.1",
    name: "Llama 3.1",
    provider: "local",
    capabilities: ["code"],
    contextWindow: "128K",
    description: "Local via Ollama",
  },
  {
    id: "ollama/codestral",
    name: "Codestral",
    provider: "local",
    capabilities: ["code", "fast"],
    contextWindow: "32K",
    description: "Code-focused local model",
  },
  {
    id: "ollama/mixtral",
    name: "Mixtral 8x7B",
    provider: "local",
    capabilities: ["tools"],
    contextWindow: "32K",
    description: "MoE local model",
  },
];

// ── Provider styling ──

const PROVIDER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  openai: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  anthropic: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  google: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  local: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  local: "Local / Other",
};

const CAPABILITY_ICONS: Record<string, { icon: string; title: string }> = {
  vision: { icon: "V", title: "Vision / Images" },
  tools: { icon: "T", title: "Tool Use" },
  code: { icon: "C", title: "Code Generation" },
  fast: { icon: "F", title: "Fast Response" },
};

// ── Component ──

export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedModel = MODELS.find((m) => m.id === value);
  const providerColors = selectedModel
    ? PROVIDER_COLORS[selectedModel.provider]
    : PROVIDER_COLORS.openai;

  // Group models by provider
  const groupedModels = MODELS.reduce(
    (acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, ModelInfo[]>
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      {/* Selected model button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full flex items-center justify-between px-3 py-2 text-left",
          "border border-surface-3 rounded-lg bg-white",
          "hover:border-surface-dark-4 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:border-transparent"
        )}
      >
        {selectedModel ? (
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={clsx(
                "shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold",
                providerColors.bg,
                providerColors.text
              )}
            >
              {selectedModel.provider.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">
                {selectedModel.name}
              </div>
              {selectedModel.version && (
                <div className="text-[10px] text-surface-dark-4">
                  {selectedModel.version}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-sm text-surface-dark-4">Select model...</span>
        )}

        <svg
          className={clsx(
            "w-4 h-4 text-surface-dark-4 transition-transform shrink-0",
            isOpen && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-surface-3 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {(["openai", "anthropic", "google", "local"] as const).map((provider) => {
            const models = groupedModels[provider];
            if (!models?.length) return null;

            const colors = PROVIDER_COLORS[provider];

            return (
              <div key={provider}>
                {/* Provider header */}
                <div
                  className={clsx(
                    "sticky top-0 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b",
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                >
                  {PROVIDER_NAMES[provider]}
                </div>

                {/* Models */}
                <div className="py-1">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelect(model.id)}
                      className={clsx(
                        "w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-surface-1 transition-colors",
                        model.id === value && "bg-nebula-50"
                      )}
                    >
                      {/* Model info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">
                            {model.name}
                          </span>
                          {model.version && (
                            <span className="text-[10px] text-surface-dark-4">
                              {model.version}
                            </span>
                          )}
                        </div>
                        {model.description && (
                          <div className="text-[11px] text-surface-dark-4 mt-0.5">
                            {model.description}
                          </div>
                        )}
                      </div>

                      {/* Capabilities & context */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {/* Capability badges */}
                        {model.capabilities && model.capabilities.length > 0 && (
                          <div className="flex gap-0.5">
                            {model.capabilities.map((cap) => (
                              <span
                                key={cap}
                                title={CAPABILITY_ICONS[cap].title}
                                className="w-4 h-4 rounded bg-surface-2 text-surface-dark-4 text-[9px] font-bold flex items-center justify-center"
                              >
                                {CAPABILITY_ICONS[cap].icon}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Context window */}
                        {model.contextWindow && (
                          <span className="text-[9px] text-surface-dark-4">
                            {model.contextWindow}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
