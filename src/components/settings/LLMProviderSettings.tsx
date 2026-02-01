/**
 * LLM Provider Settings
 *
 * UI for managing API keys and LLM provider configurations.
 */

import { useState } from "react";
import clsx from "clsx";
import {
  useLLMProviderStore,
  MODEL_METADATA,
  type LLMProviderConfig,
  type LLMProviderType,
} from "@/stores/llmProviderStore";

// ── Icons ──

function IconOpenAI() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

function IconAnthropic() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0L0 20.459h3.744l1.32-3.456h6.36l1.32 3.456h3.744L9.792 3.541H6.696zm.456 10.944l2.136-5.592 2.136 5.592H7.152z" />
    </svg>
  );
}

function IconGoogle() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function IconLocal() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<LLMProviderType, React.ReactNode> = {
  openai: <IconOpenAI />,
  anthropic: <IconAnthropic />,
  google: <IconGoogle />,
  local: <IconLocal />,
};

const PROVIDER_COLORS: Record<LLMProviderType, string> = {
  openai: "text-emerald-600 bg-emerald-50",
  anthropic: "text-orange-600 bg-orange-50",
  google: "text-blue-600 bg-blue-50",
  local: "text-purple-600 bg-purple-50",
};

// ── Component ──

export function LLMProviderSettings() {
  const {
    providers,
    defaultProviderId,
    setApiKey,
    getApiKey,
    clearApiKey,
    updateProvider,
    setDefaultProvider,
    hasValidApiKey,
  } = useLLMProviderStore();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error" | null>>({});

  const handleSaveKey = (providerId: string) => {
    const key = keyInputs[providerId];
    if (key) {
      setApiKey(providerId, key);
      setKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
      setEditingKey(null);
    }
  };

  const handleTestConnection = async (provider: LLMProviderConfig) => {
    setTestingProvider(provider.id);
    setTestResults((prev) => ({ ...prev, [provider.id]: null }));

    // Simulate API test (in real implementation, this would call the actual API)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const hasKey = hasValidApiKey(provider.id);
    setTestResults((prev) => ({
      ...prev,
      [provider.id]: hasKey ? "success" : "error",
    }));
    setTestingProvider(null);
  };

  const maskApiKey = (key: string | null): string => {
    if (!key) return "";
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">LLM Providers</h2>
        <p className="text-sm text-surface-dark-4 mt-1">
          Configure API keys for AI model providers. Keys are stored locally and never sent to our servers.
        </p>
      </div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {providers.map((provider) => {
          const isEditing = editingKey === provider.id;
          const currentKey = getApiKey(provider.id);
          const hasKey = hasValidApiKey(provider.id);
          const isDefault = provider.id === defaultProviderId;
          const testResult = testResults[provider.id];

          return (
            <div
              key={provider.id}
              className={clsx(
                "bg-white rounded-lg border p-4",
                isDefault ? "border-nebula-300 ring-1 ring-nebula-100" : "border-surface-3"
              )}
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      PROVIDER_COLORS[provider.type]
                    )}
                  >
                    {PROVIDER_ICONS[provider.type]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-800">
                        {provider.name}
                      </h3>
                      {isDefault && (
                        <span className="px-2 py-0.5 bg-nebula-100 text-nebula-700 text-xs font-medium rounded-full">
                          Default
                        </span>
                      )}
                      {hasKey && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <IconCheck />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-dark-4 mt-0.5">
                      {provider.models.length} models available
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Enable/Disable Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provider.isEnabled}
                      onChange={(e) =>
                        updateProvider(provider.id, { isEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-nebula-600"></div>
                  </label>

                  {/* Set as Default */}
                  {!isDefault && hasKey && (
                    <button
                      onClick={() => setDefaultProvider(provider.id)}
                      className="text-xs text-nebula-600 hover:text-nebula-700 font-medium"
                    >
                      Set as default
                    </button>
                  )}
                </div>
              </div>

              {/* API Key Section */}
              {provider.type !== "local" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600">
                      API Key
                    </label>
                    {hasKey && !isEditing && (
                      <button
                        onClick={() => clearApiKey(provider.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove key
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKeys[provider.id] ? "text" : "password"}
                          value={keyInputs[provider.id] || ""}
                          onChange={(e) =>
                            setKeyInputs((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }
                          placeholder={`Enter your ${provider.name} API key`}
                          className="nebula-input pr-10 text-sm font-mono"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowKeys((prev) => ({
                              ...prev,
                              [provider.id]: !prev[provider.id],
                            }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showKeys[provider.id] ? <IconEyeOff /> : <IconEye />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleSaveKey(provider.id)}
                        disabled={!keyInputs[provider.id]}
                        className="nebula-btn-primary text-sm px-4"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingKey(null);
                          setKeyInputs((prev) => ({ ...prev, [provider.id]: "" }));
                        }}
                        className="nebula-btn-secondary text-sm px-4"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2 bg-surface-1 rounded-lg text-sm font-mono text-gray-500">
                        {hasKey ? maskApiKey(currentKey) : "No API key configured"}
                      </div>
                      <button
                        onClick={() => setEditingKey(provider.id)}
                        className="nebula-btn-secondary text-sm px-4"
                      >
                        {hasKey ? "Update" : "Add key"}
                      </button>
                      {hasKey && (
                        <button
                          onClick={() => handleTestConnection(provider)}
                          disabled={testingProvider === provider.id}
                          className={clsx(
                            "nebula-btn-secondary text-sm px-4",
                            testResult === "success" && "border-green-300 text-green-600",
                            testResult === "error" && "border-red-300 text-red-600"
                          )}
                        >
                          {testingProvider === provider.id ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Testing...
                            </span>
                          ) : testResult === "success" ? (
                            "Connected"
                          ) : testResult === "error" ? (
                            "Failed"
                          ) : (
                            "Test"
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Local Provider Base URL */}
              {provider.type === "local" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={provider.baseUrl || ""}
                    onChange={(e) =>
                      updateProvider(provider.id, { baseUrl: e.target.value })
                    }
                    placeholder="http://localhost:11434"
                    className="nebula-input text-sm font-mono"
                  />
                  <p className="text-xs text-surface-dark-4">
                    URL for your local Ollama or compatible server
                  </p>
                </div>
              )}

              {/* Models List */}
              {provider.isEnabled && (
                <div className="mt-4 pt-4 border-t border-surface-2">
                  <div className="text-xs font-medium text-gray-600 mb-2">
                    Available Models
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {provider.models.map((modelId) => {
                      const metadata = MODEL_METADATA[modelId];
                      return (
                        <span
                          key={modelId}
                          className="px-2 py-1 bg-surface-1 rounded text-xs text-gray-600 flex items-center gap-1.5"
                        >
                          {metadata?.name || modelId}
                          {metadata?.supportsTools && (
                            <span className="w-1 h-1 bg-blue-400 rounded-full" title="Supports tools" />
                          )}
                          {metadata?.supportsVision && (
                            <span className="w-1 h-1 bg-purple-400 rounded-full" title="Supports vision" />
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800">
              API Key Security
            </h4>
            <p className="text-xs text-blue-700 mt-1">
              Your API keys are stored locally in your browser and are never sent to any external
              servers. They are used only for direct API calls to the respective providers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
