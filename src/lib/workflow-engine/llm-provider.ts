/**
 * LLM Provider Abstraction
 *
 * Provides interfaces and implementations for LLM providers
 * including mock providers for testing and stubs for future integration.
 */

import { LLMProvider, LLMRequest, LLMResponse, LLMToolCall } from './types';

// ============================================================================
// Mock LLM Provider
// ============================================================================

export interface MockLLMProviderOptions {
  defaultResponse?: string;
  responseDelay?: number;
  classifyResponses?: Map<string, string>;
  customHandler?: (request: LLMRequest) => Promise<LLMResponse>;
}

/**
 * Mock LLM provider for testing workflows without actual API calls
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';
  readonly models = ['mock-model-1', 'mock-model-2'];

  private options: MockLLMProviderOptions;

  constructor(options: MockLLMProviderOptions = {}) {
    this.options = {
      defaultResponse: 'This is a mock response from the LLM.',
      responseDelay: 100,
      ...options,
    };
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    // Simulate network delay
    if (this.options.responseDelay && this.options.responseDelay > 0) {
      await this.delay(this.options.responseDelay);
    }

    // Use custom handler if provided
    if (this.options.customHandler) {
      return this.options.customHandler(request);
    }

    // Check for classification requests
    const lastMessage = request.messages[request.messages.length - 1];
    if (lastMessage && this.options.classifyResponses) {
      for (const [keyword, category] of this.options.classifyResponses) {
        if (lastMessage.content.toLowerCase().includes(keyword.toLowerCase())) {
          return {
            content: category,
            model: request.model ?? 'mock-model-1',
            usage: {
              promptTokens: this.countTokens(request.messages),
              completionTokens: this.countTokens([{ content: category }]),
              totalTokens: 0,
            },
            finishReason: 'stop',
          };
        }
      }
    }

    const response: LLMResponse = {
      content: this.options.defaultResponse ?? 'Mock response',
      model: request.model ?? 'mock-model-1',
      usage: {
        promptTokens: this.countTokens(request.messages),
        completionTokens: this.countTokens([
          { content: this.options.defaultResponse ?? '' },
        ]),
        totalTokens: 0,
      },
      finishReason: 'stop',
    };

    // Calculate total tokens
    if (response.usage) {
      response.usage.totalTokens = response.usage.promptTokens + response.usage.completionTokens;
    }

    return response;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private countTokens(messages: Array<{ content: string }>): number {
    // Simple token estimation: ~4 characters per token
    return messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0);
  }

  /**
   * Set a custom response for the next request
   */
  setResponse(response: string): void {
    this.options.defaultResponse = response;
  }

  /**
   * Add a classification response mapping
   */
  addClassifyResponse(keyword: string, category: string): void {
    if (!this.options.classifyResponses) {
      this.options.classifyResponses = new Map();
    }
    this.options.classifyResponses.set(keyword, category);
  }
}

// ============================================================================
// OpenAI Provider Stub
// ============================================================================

export interface OpenAIProviderConfig {
  apiKey: string;
  organization?: string;
  baseUrl?: string;
  defaultModel?: string;
}

/**
 * OpenAI provider stub for future integration
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly models = [
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'gpt-4o',
    'gpt-4o-mini',
  ];

  private config: OpenAIProviderConfig;

  constructor(config: OpenAIProviderConfig) {
    this.config = config;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    // TODO: Implement actual OpenAI API call
    // This is a stub that should be replaced with real implementation

    const model = request.model ?? this.config.defaultModel ?? 'gpt-4-turbo';

    // For now, throw an error indicating not implemented
    throw new Error(
      `OpenAI provider not yet implemented. Would call model: ${model}`
    );
  }

  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    return Boolean(this.config.apiKey);
  }

  /**
   * Validate the API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    // TODO: Implement actual validation
    return Boolean(this.config.apiKey);
  }
}

// ============================================================================
// Anthropic Provider Stub
// ============================================================================

export interface AnthropicProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}

/**
 * Anthropic Claude provider stub for future integration
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly models = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'claude-3-5-sonnet-20241022',
    'claude-opus-4-5-20251101',
  ];

  private config: AnthropicProviderConfig;

  constructor(config: AnthropicProviderConfig) {
    this.config = config;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    // TODO: Implement actual Anthropic API call
    // This is a stub that should be replaced with real implementation

    const model = request.model ?? this.config.defaultModel ?? 'claude-3-5-sonnet-20241022';

    // For now, throw an error indicating not implemented
    throw new Error(
      `Anthropic provider not yet implemented. Would call model: ${model}`
    );
  }

  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    return Boolean(this.config.apiKey);
  }

  /**
   * Validate the API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    // TODO: Implement actual validation
    return Boolean(this.config.apiKey);
  }
}

// ============================================================================
// Provider Registry
// ============================================================================

/**
 * Registry for managing multiple LLM providers
 */
export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string | null = null;

  /**
   * Register a provider
   */
  register(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);

    // Set as default if it's the first provider
    if (this.defaultProvider === null) {
      this.defaultProvider = provider.name;
    }
  }

  /**
   * Unregister a provider
   */
  unregister(name: string): boolean {
    const removed = this.providers.delete(name);

    // Update default if necessary
    if (removed && this.defaultProvider === name) {
      const firstProvider = this.providers.keys().next();
      this.defaultProvider = firstProvider.done ? null : firstProvider.value;
    }

    return removed;
  }

  /**
   * Get a provider by name
   */
  get(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get the default provider
   */
  getDefault(): LLMProvider | undefined {
    if (this.defaultProvider === null) {
      return undefined;
    }
    return this.providers.get(this.defaultProvider);
  }

  /**
   * Set the default provider
   */
  setDefault(name: string): boolean {
    if (!this.providers.has(name)) {
      return false;
    }
    this.defaultProvider = name;
    return true;
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all available models across all providers
   */
  getAllModels(): Array<{ provider: string; model: string }> {
    const models: Array<{ provider: string; model: string }> = [];

    for (const [name, provider] of this.providers) {
      for (const model of provider.models) {
        models.push({ provider: name, model });
      }
    }

    return models;
  }

  /**
   * Find a provider that supports a specific model
   */
  findProviderForModel(model: string): LLMProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.models.includes(model)) {
        return provider;
      }
    }
    return undefined;
  }

  /**
   * Check if any provider is available
   */
  async hasAvailableProvider(): Promise<boolean> {
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders(): Promise<LLMProvider[]> {
    const available: LLMProvider[] = [];

    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
    this.defaultProvider = null;
  }
}

// ============================================================================
// Default Registry Instance
// ============================================================================

/**
 * Global provider registry instance
 */
export const providerRegistry = new ProviderRegistry();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple mock provider with preset responses
 */
export function createMockProvider(
  responses: Record<string, string> = {}
): MockLLMProvider {
  const provider = new MockLLMProvider({
    customHandler: async (request) => {
      const lastMessage = request.messages[request.messages.length - 1];
      const content = lastMessage?.content ?? '';

      // Check for matching response
      for (const [pattern, response] of Object.entries(responses)) {
        if (content.toLowerCase().includes(pattern.toLowerCase())) {
          return {
            content: response,
            model: request.model ?? 'mock-model-1',
            finishReason: 'stop',
          };
        }
      }

      // Default response
      return {
        content: `Processed: ${content.substring(0, 50)}...`,
        model: request.model ?? 'mock-model-1',
        finishReason: 'stop',
      };
    },
  });

  return provider;
}

/**
 * Create a mock provider that returns tool calls
 */
export function createToolCallingMockProvider(
  toolCalls: LLMToolCall[]
): MockLLMProvider {
  return new MockLLMProvider({
    customHandler: async (request) => ({
      content: '',
      model: request.model ?? 'mock-model-1',
      finishReason: 'tool_calls',
      toolCalls,
    }),
  });
}
