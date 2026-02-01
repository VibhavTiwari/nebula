/**
 * File Search Node Executor
 *
 * Searches vector stores for relevant documents.
 * Currently a mock implementation - to be integrated with actual vector store.
 */

import {
  ExecutionContextInterface,
  FileSearchNodeConfig,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  ValidationError,
  ValidationResult,
  VariableType,
} from '../types';

export interface FileSearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
  source?: string;
}

export interface VectorStoreProvider {
  search(
    storeId: string,
    query: string,
    maxResults: number
  ): Promise<FileSearchResult[]>;

  isAvailable(): Promise<boolean>;
}

/**
 * Mock vector store provider for testing
 */
export class MockVectorStoreProvider implements VectorStoreProvider {
  private mockData: Map<string, FileSearchResult[]> = new Map();

  constructor(initialData?: Record<string, FileSearchResult[]>) {
    if (initialData) {
      for (const [storeId, results] of Object.entries(initialData)) {
        this.mockData.set(storeId, results);
      }
    }
  }

  async search(
    storeId: string,
    query: string,
    maxResults: number
  ): Promise<FileSearchResult[]> {
    // Simulate some processing delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    const storeData = this.mockData.get(storeId);

    if (!storeData) {
      // Return mock results if no data is set
      return [
        {
          id: `result-1-${Date.now()}`,
          content: `Mock search result for query: "${query}"`,
          score: 0.95,
          metadata: { type: 'mock' },
          source: `store:${storeId}`,
        },
        {
          id: `result-2-${Date.now()}`,
          content: `Another mock result related to: "${query}"`,
          score: 0.85,
          metadata: { type: 'mock' },
          source: `store:${storeId}`,
        },
      ].slice(0, maxResults);
    }

    // Simple relevance simulation - filter and score based on query terms
    const queryTerms = query.toLowerCase().split(/\s+/);

    const scoredResults = storeData.map((result) => {
      const contentLower = result.content.toLowerCase();
      const matchCount = queryTerms.filter((term) =>
        contentLower.includes(term)
      ).length;
      const relevanceScore = matchCount / queryTerms.length;

      return {
        ...result,
        score: Math.min(result.score * relevanceScore + 0.5, 1.0),
      };
    });

    // Sort by score and limit results
    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Add mock data for a store
   */
  setStoreData(storeId: string, results: FileSearchResult[]): void {
    this.mockData.set(storeId, results);
  }

  /**
   * Clear all mock data
   */
  clearData(): void {
    this.mockData.clear();
  }
}

export class FileSearchExecutor implements NodeExecutor<FileSearchNodeConfig> {
  readonly nodeType = 'file-search' as const;

  private vectorStoreProvider: VectorStoreProvider;

  constructor(vectorStoreProvider?: VectorStoreProvider) {
    this.vectorStoreProvider = vectorStoreProvider ?? new MockVectorStoreProvider();
  }

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: FileSearchNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;

    context.log('info', `Executing file-search node: ${node.label ?? nodeId}`, {
      vectorStoreIds: config.vectorStoreIds,
      maxResults: config.maxResults,
    });

    // Determine the query
    let query: string;

    if (config.query) {
      query = this.interpolateVariables(config.query, context);
    } else if (config.queryVariable) {
      const queryValue = context.getVariable(config.queryVariable);
      query = this.stringifyValue(queryValue);
    } else {
      // Use input as query
      const input = context.getInput();
      query = this.stringifyValue(input);
    }

    const maxResults = config.maxResults ?? 5;

    const inputs = {
      query,
      vectorStoreIds: config.vectorStoreIds,
      maxResults,
    };

    try {
      // Check if provider is available
      const isAvailable = await this.vectorStoreProvider.isAvailable();
      if (!isAvailable) {
        throw new Error('Vector store provider is not available');
      }

      // Search each vector store
      const allResults: FileSearchResult[] = [];

      for (const storeId of config.vectorStoreIds) {
        context.log('debug', `Searching vector store: ${storeId}`);

        try {
          const results = await this.vectorStoreProvider.search(
            storeId,
            query,
            maxResults
          );

          allResults.push(...results);
        } catch (error) {
          context.log('warn', `Failed to search store ${storeId}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Sort all results by score and limit
      const sortedResults = allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      context.log('info', `File search completed`, {
        resultCount: sortedResults.length,
        topScore: sortedResults[0]?.score,
      });

      // Store results in context
      const outputVariable = config.outputVariable ?? 'searchResults';
      context.setVariable(outputVariable, sortedResults);
      context.setOutput('results', sortedResults);
      context.setOutput('resultCount', sortedResults.length);

      // Also store just the content for easy access
      const contentArray = sortedResults.map((r) => r.content);
      context.setVariable(`${outputVariable}_content`, contentArray);

      return {
        nodeId,
        nodeType: 'file-search',
        status: 'completed',
        inputs,
        outputs: {
          results: sortedResults,
          resultCount: sortedResults.length,
          content: contentArray,
        },
        startTime,
        endTime: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `File search failed: ${errorMessage}`, {
        nodeId,
        error: errorMessage,
      });

      return {
        nodeId,
        nodeType: 'file-search',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'FILE_SEARCH_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: FileSearchNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate vector store IDs
    if (!config.vectorStoreIds || config.vectorStoreIds.length === 0) {
      errors.push({
        field: 'vectorStoreIds',
        message: 'At least one vector store ID is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      for (let i = 0; i < config.vectorStoreIds.length; i++) {
        const storeId = config.vectorStoreIds[i];
        if (!storeId || storeId.trim() === '') {
          errors.push({
            field: `vectorStoreIds[${i}]`,
            message: 'Vector store ID cannot be empty',
            code: 'INVALID_VALUE',
          });
        }
      }
    }

    // Validate max results
    if (config.maxResults !== undefined) {
      if (config.maxResults < 1) {
        errors.push({
          field: 'maxResults',
          message: 'Max results must be at least 1',
          code: 'INVALID_RANGE',
        });
      }
      if (config.maxResults > 100) {
        errors.push({
          field: 'maxResults',
          message: 'Max results cannot exceed 100',
          code: 'INVALID_RANGE',
        });
      }
    }

    // Validate that either query, queryVariable, or implicit input is used
    // This is more of a warning than an error

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private interpolateVariables(
    text: string,
    context: ExecutionContextInterface
  ): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const value = context.getVariable(varName.trim());

      if (value === undefined || value === null) {
        return match;
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  private stringifyValue(value: VariableType): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      // Try to extract a meaningful query from the object
      if ('query' in value) {
        return String((value as Record<string, unknown>)['query']);
      }
      if ('input' in value) {
        return String((value as Record<string, unknown>)['input']);
      }
      if ('text' in value) {
        return String((value as Record<string, unknown>)['text']);
      }
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Set the vector store provider
   */
  setVectorStoreProvider(provider: VectorStoreProvider): void {
    this.vectorStoreProvider = provider;
  }
}
