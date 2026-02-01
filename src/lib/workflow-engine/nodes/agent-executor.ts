/**
 * Agent Node Executor
 *
 * Executes an agent node by calling an LLM provider with the configured
 * instructions and model settings.
 */

import {
  AgentNodeConfig,
  ExecutionContextInterface,
  LLMProvider,
  LLMRequest,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  ValidationError,
  ValidationResult,
} from '../types';

export class AgentExecutor implements NodeExecutor<AgentNodeConfig> {
  readonly nodeType = 'agent' as const;

  private llmProvider: LLMProvider | null;

  constructor(llmProvider?: LLMProvider) {
    this.llmProvider = llmProvider ?? null;
  }

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: AgentNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;

    context.log('info', `Executing agent node: ${node.label ?? nodeId}`, {
      model: config.model,
      hasSystemPrompt: Boolean(config.systemPrompt),
    });

    // Prepare inputs
    const input = context.getInput();
    const variables = context.getAllVariables();

    const inputs = {
      input,
      variables,
      instructions: config.instructions,
    };

    try {
      // Check if LLM provider is available
      if (!this.llmProvider) {
        throw new Error('No LLM provider configured');
      }

      // Build the LLM request
      const request = this.buildRequest(config, context);

      context.log('debug', 'Calling LLM provider', {
        model: request.model,
        messageCount: request.messages.length,
      });

      // Call the LLM
      const response = await this.llmProvider.chat(request);

      context.log('debug', 'LLM response received', {
        contentLength: response.content.length,
        finishReason: response.finishReason,
        usage: response.usage,
      });

      // Store the response in context
      const outputVariable = config.outputVariable ?? 'agentResponse';
      context.setVariable(outputVariable, response.content);
      context.setOutput('response', response.content);

      // Store additional metadata
      if (response.usage) {
        context.setVariable(`${outputVariable}_tokens`, response.usage.totalTokens);
      }

      return {
        nodeId,
        nodeType: 'agent',
        status: 'completed',
        inputs,
        outputs: {
          response: response.content,
          model: response.model,
          finishReason: response.finishReason,
          usage: response.usage,
        },
        startTime,
        endTime: Date.now(),
        metadata: {
          toolCalls: response.toolCalls,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `Agent execution failed: ${errorMessage}`, {
        nodeId,
        error: errorMessage,
      });

      return {
        nodeId,
        nodeType: 'agent',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'AGENT_EXECUTION_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: AgentNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config.instructions || config.instructions.trim() === '') {
      errors.push({
        field: 'instructions',
        message: 'Instructions are required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        errors.push({
          field: 'temperature',
          message: 'Temperature must be between 0 and 2',
          code: 'INVALID_RANGE',
        });
      }
    }

    if (config.maxTokens !== undefined && config.maxTokens < 1) {
      errors.push({
        field: 'maxTokens',
        message: 'Max tokens must be at least 1',
        code: 'INVALID_RANGE',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private buildRequest(
    config: AgentNodeConfig,
    context: ExecutionContextInterface
  ): LLMRequest {
    const messages: LLMRequest['messages'] = [];

    // Add system prompt if configured
    if (config.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.interpolateVariables(config.systemPrompt, context),
      });
    }

    // Add the main instruction with interpolated variables
    const interpolatedInstructions = this.interpolateVariables(
      config.instructions,
      context
    );

    // Include input in the user message
    const input = context.getInput();
    let userContent = interpolatedInstructions;

    if (Object.keys(input).length > 0) {
      const inputStr =
        typeof input === 'object'
          ? JSON.stringify(input, null, 2)
          : String(input);
      userContent = `${interpolatedInstructions}\n\nInput:\n${inputStr}`;
    }

    messages.push({
      role: 'user',
      content: userContent,
    });

    return {
      messages,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };
  }

  private interpolateVariables(
    text: string,
    context: ExecutionContextInterface
  ): string {
    // Replace {{variable}} patterns with values from context
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const value = context.getVariable(varName.trim());

      if (value === undefined || value === null) {
        return match; // Keep original if not found
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  /**
   * Set the LLM provider
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }
}
