/**
 * Classify Node Executor
 *
 * Uses an LLM to classify input into one of several categories.
 * Routes execution to the output handle corresponding to the selected category.
 */

import {
  ClassifyNodeConfig,
  ExecutionContextInterface,
  LLMProvider,
  LLMRequest,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  ValidationError,
  ValidationResult,
} from '../types';

export class ClassifyExecutor implements NodeExecutor<ClassifyNodeConfig> {
  readonly nodeType = 'classify' as const;

  private llmProvider: LLMProvider | null;

  constructor(llmProvider?: LLMProvider) {
    this.llmProvider = llmProvider ?? null;
  }

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: ClassifyNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;

    context.log('info', `Executing classify node: ${node.label ?? nodeId}`, {
      categories: config.categories.map((c) => c.name),
    });

    // Get the input to classify
    const inputVariable = config.inputVariable ?? 'input';
    let inputToClassify = context.getVariable(inputVariable);

    // If not found in variables, check the actual input
    if (inputToClassify === undefined) {
      const contextInput = context.getInput();
      inputToClassify = contextInput[inputVariable] ?? contextInput;
    }

    const inputString =
      typeof inputToClassify === 'object'
        ? JSON.stringify(inputToClassify)
        : String(inputToClassify ?? '');

    const inputs = {
      input: inputToClassify,
      categories: config.categories,
    };

    try {
      if (!this.llmProvider) {
        throw new Error('No LLM provider configured');
      }

      // Build the classification request
      const request = this.buildClassificationRequest(config, inputString);

      context.log('debug', 'Calling LLM for classification', {
        inputLength: inputString.length,
        categoryCount: config.categories.length,
      });

      // Call the LLM
      const response = await this.llmProvider.chat(request);

      // Parse the response to determine the category
      const selectedCategory = this.parseClassificationResponse(
        response.content,
        config.categories
      );

      context.log('info', `Classification result: ${selectedCategory?.name ?? 'unknown'}`, {
        confidence: selectedCategory ? 'matched' : 'no match',
      });

      // Store the result in context
      const outputVariable = config.outputVariable ?? 'classification';
      context.setVariable(outputVariable, selectedCategory?.name ?? null);
      context.setOutput('category', selectedCategory?.name ?? null);
      context.setOutput('categoryId', selectedCategory?.id ?? null);

      // Determine next node based on category's output handle
      const nextNodes: string[] = [];
      if (selectedCategory?.outputHandle) {
        nextNodes.push(selectedCategory.outputHandle);
      }

      return {
        nodeId,
        nodeType: 'classify',
        status: 'completed',
        inputs,
        outputs: {
          category: selectedCategory?.name ?? null,
          categoryId: selectedCategory?.id ?? null,
          rawResponse: response.content,
        },
        startTime,
        endTime: Date.now(),
        nextNodes,
        metadata: {
          selectedCategory,
          outputHandle: selectedCategory?.outputHandle,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `Classification failed: ${errorMessage}`, {
        nodeId,
        error: errorMessage,
      });

      return {
        nodeId,
        nodeType: 'classify',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'CLASSIFY_EXECUTION_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: ClassifyNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config.categories || config.categories.length === 0) {
      errors.push({
        field: 'categories',
        message: 'At least one category is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (config.categories) {
      const categoryIds = new Set<string>();
      const categoryNames = new Set<string>();

      for (let i = 0; i < config.categories.length; i++) {
        const category = config.categories[i];

        if (!category.id) {
          errors.push({
            field: `categories[${i}].id`,
            message: 'Category ID is required',
            code: 'REQUIRED_FIELD',
          });
        } else if (categoryIds.has(category.id)) {
          errors.push({
            field: `categories[${i}].id`,
            message: 'Category ID must be unique',
            code: 'DUPLICATE_VALUE',
          });
        } else {
          categoryIds.add(category.id);
        }

        if (!category.name) {
          errors.push({
            field: `categories[${i}].name`,
            message: 'Category name is required',
            code: 'REQUIRED_FIELD',
          });
        } else if (categoryNames.has(category.name.toLowerCase())) {
          errors.push({
            field: `categories[${i}].name`,
            message: 'Category name must be unique',
            code: 'DUPLICATE_VALUE',
          });
        } else {
          categoryNames.add(category.name.toLowerCase());
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private buildClassificationRequest(
    config: ClassifyNodeConfig,
    input: string
  ): LLMRequest {
    // Build category descriptions for the prompt
    const categoryList = config.categories
      .map((cat) => {
        let description = `- ${cat.name}`;
        if (cat.description) {
          description += `: ${cat.description}`;
        }
        if (cat.examples && cat.examples.length > 0) {
          description += `\n  Examples: ${cat.examples.join(', ')}`;
        }
        return description;
      })
      .join('\n');

    const systemPrompt = `You are a classification assistant. Your task is to classify the given input into exactly one of the provided categories.

Categories:
${categoryList}

Respond with ONLY the category name, nothing else. If the input doesn't clearly fit any category, choose the closest match.`;

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Classify this input:\n\n${input}` },
      ],
      model: config.model,
      temperature: 0, // Low temperature for more consistent classification
      maxTokens: 50, // We only need the category name
    };
  }

  private parseClassificationResponse(
    response: string,
    categories: ClassifyNodeConfig['categories']
  ): ClassifyNodeConfig['categories'][number] | null {
    const normalizedResponse = response.trim().toLowerCase();

    // Try exact match first
    for (const category of categories) {
      if (category.name.toLowerCase() === normalizedResponse) {
        return category;
      }
    }

    // Try partial match
    for (const category of categories) {
      if (
        normalizedResponse.includes(category.name.toLowerCase()) ||
        category.name.toLowerCase().includes(normalizedResponse)
      ) {
        return category;
      }
    }

    // Try matching by ID
    for (const category of categories) {
      if (category.id.toLowerCase() === normalizedResponse) {
        return category;
      }
    }

    // No match found - return the first category as default
    return categories.length > 0 ? categories[0] : null;
  }

  /**
   * Set the LLM provider
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }
}
