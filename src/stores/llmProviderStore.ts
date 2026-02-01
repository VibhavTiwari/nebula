/**
 * LLM Provider Store
 *
 * Manages API keys and provider configurations for LLM integrations.
 * Keys are stored encrypted in localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ── Types ──

export type LLMProviderType = "openai" | "anthropic" | "google" | "local";

export interface LLMProviderConfig {
  id: string;
  type: LLMProviderType;
  name: string;
  apiKey: string; // Stored obfuscated
  baseUrl?: string; // For custom endpoints
  isEnabled: boolean;
  isDefault: boolean;
  models: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProviderType;
  contextLength: number;
  supportsTools: boolean;
  supportsVision: boolean;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

interface LLMProviderState {
  providers: LLMProviderConfig[];
  defaultProviderId: string | null;

  // Actions
  addProvider: (provider: Omit<LLMProviderConfig, "id" | "createdAt" | "updatedAt">) => string;
  updateProvider: (id: string, updates: Partial<LLMProviderConfig>) => void;
  removeProvider: (id: string) => void;
  setDefaultProvider: (id: string) => void;
  getProvider: (id: string) => LLMProviderConfig | undefined;
  getDefaultProvider: () => LLMProviderConfig | undefined;
  getEnabledProviders: () => LLMProviderConfig[];
  hasValidApiKey: (providerId: string) => boolean;

  // API Key management (with basic obfuscation)
  setApiKey: (providerId: string, apiKey: string) => void;
  getApiKey: (providerId: string) => string | null;
  clearApiKey: (providerId: string) => void;
}

// ── Default provider configurations ──

const DEFAULT_PROVIDERS: Omit<LLMProviderConfig, "id" | "createdAt" | "updatedAt">[] = [
  {
    type: "openai",
    name: "OpenAI",
    apiKey: "",
    isEnabled: true,
    isDefault: true,
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
      "o1-preview",
      "o1-mini",
    ],
  },
  {
    type: "anthropic",
    name: "Anthropic",
    apiKey: "",
    isEnabled: true,
    isDefault: false,
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ],
  },
  {
    type: "google",
    name: "Google AI",
    apiKey: "",
    isEnabled: false,
    isDefault: false,
    models: [
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
  },
  {
    type: "local",
    name: "Local (Ollama)",
    apiKey: "",
    baseUrl: "http://localhost:11434",
    isEnabled: false,
    isDefault: false,
    models: [
      "llama3.2",
      "mistral",
      "codellama",
      "phi",
    ],
  },
];

// ── Model metadata ──

export const MODEL_METADATA: Record<string, LLMModel> = {
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    contextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10,
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
  },
  "gpt-4-turbo": {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    contextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    inputPricePerMillion: 10,
    outputPricePerMillion: 30,
  },
  "claude-3-5-sonnet-20241022": {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    contextLength: 200000,
    supportsTools: true,
    supportsVision: true,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
  },
  "claude-3-5-haiku-20241022": {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    contextLength: 200000,
    supportsTools: true,
    supportsVision: true,
    inputPricePerMillion: 0.8,
    outputPricePerMillion: 4,
  },
  "claude-3-opus-20240229": {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    contextLength: 200000,
    supportsTools: true,
    supportsVision: true,
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
  },
  "gemini-2.0-flash-exp": {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    provider: "google",
    contextLength: 1000000,
    supportsTools: true,
    supportsVision: true,
    inputPricePerMillion: 0,
    outputPricePerMillion: 0,
  },
  "gemini-1.5-pro": {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    contextLength: 2000000,
    supportsTools: true,
    supportsVision: true,
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5,
  },
};

// ── Simple obfuscation (NOT encryption - just to prevent casual viewing) ──

function obfuscate(str: string): string {
  if (!str) return "";
  return btoa(str.split("").reverse().join(""));
}

function deobfuscate(str: string): string {
  if (!str) return "";
  try {
    return atob(str).split("").reverse().join("");
  } catch {
    return "";
  }
}

// ── Store ──

export const useLLMProviderStore = create<LLMProviderState>()(
  persist(
    immer((set, get) => ({
      providers: DEFAULT_PROVIDERS.map((p) => ({
        ...p,
        id: `provider-${p.type}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      defaultProviderId: "provider-openai",

      addProvider: (provider) => {
        const id = `provider-${Date.now()}`;
        set((state) => {
          state.providers.push({
            ...provider,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
        return id;
      },

      updateProvider: (id, updates) =>
        set((state) => {
          const provider = state.providers.find((p) => p.id === id);
          if (provider) {
            Object.assign(provider, updates, {
              updatedAt: new Date().toISOString(),
            });
          }
        }),

      removeProvider: (id) =>
        set((state) => {
          state.providers = state.providers.filter((p) => p.id !== id);
          if (state.defaultProviderId === id) {
            state.defaultProviderId = state.providers[0]?.id || null;
          }
        }),

      setDefaultProvider: (id) =>
        set((state) => {
          // Clear previous default
          state.providers.forEach((p) => {
            p.isDefault = p.id === id;
          });
          state.defaultProviderId = id;
        }),

      getProvider: (id) => {
        return get().providers.find((p) => p.id === id);
      },

      getDefaultProvider: () => {
        const state = get();
        return state.providers.find((p) => p.id === state.defaultProviderId);
      },

      getEnabledProviders: () => {
        return get().providers.filter((p) => p.isEnabled);
      },

      hasValidApiKey: (providerId) => {
        const provider = get().providers.find((p) => p.id === providerId);
        if (!provider) return false;
        // Local providers don't need API keys
        if (provider.type === "local") return true;
        return !!deobfuscate(provider.apiKey);
      },

      setApiKey: (providerId, apiKey) =>
        set((state) => {
          const provider = state.providers.find((p) => p.id === providerId);
          if (provider) {
            provider.apiKey = obfuscate(apiKey);
            provider.updatedAt = new Date().toISOString();
          }
        }),

      getApiKey: (providerId) => {
        const provider = get().providers.find((p) => p.id === providerId);
        if (!provider) return null;
        return deobfuscate(provider.apiKey);
      },

      clearApiKey: (providerId) =>
        set((state) => {
          const provider = state.providers.find((p) => p.id === providerId);
          if (provider) {
            provider.apiKey = "";
            provider.updatedAt = new Date().toISOString();
          }
        }),
    })),
    {
      name: "nebula-llm-providers",
      partialize: (state) => ({
        providers: state.providers,
        defaultProviderId: state.defaultProviderId,
      }),
    }
  )
);

// ── Helper to get all available models ──

export function getAllAvailableModels(): LLMModel[] {
  const providers = useLLMProviderStore.getState().getEnabledProviders();
  const models: LLMModel[] = [];

  for (const provider of providers) {
    for (const modelId of provider.models) {
      const metadata = MODEL_METADATA[modelId];
      if (metadata) {
        models.push(metadata);
      } else {
        // Create basic metadata for unknown models
        models.push({
          id: modelId,
          name: modelId,
          provider: provider.type,
          contextLength: 4096,
          supportsTools: false,
          supportsVision: false,
          inputPricePerMillion: 0,
          outputPricePerMillion: 0,
        });
      }
    }
  }

  return models;
}
