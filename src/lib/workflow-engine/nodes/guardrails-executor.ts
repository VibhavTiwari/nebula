/**
 * Guardrails Node Executor
 *
 * Validates input/output against defined rules.
 * Supports regex, keyword, and custom validation rules.
 */

import {
  ExecutionContextInterface,
  GuardrailRule,
  GuardrailsNodeConfig,
  LLMProvider,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  ValidationError,
  ValidationResult,
  VariableType,
} from '../types';

export interface GuardrailValidationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export class GuardrailsExecutor implements NodeExecutor<GuardrailsNodeConfig> {
  readonly nodeType = 'guardrails' as const;

  private llmProvider: LLMProvider | null;

  constructor(llmProvider?: LLMProvider) {
    this.llmProvider = llmProvider ?? null;
  }

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: GuardrailsNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;

    context.log('info', `Executing guardrails node: ${node.label ?? nodeId}`, {
      mode: config.mode,
      ruleCount: config.rules.length,
      onFail: config.onFail,
    });

    // Determine what to validate based on mode
    let contentToValidate: VariableType;

    switch (config.mode) {
      case 'input':
        contentToValidate = context.getInput();
        break;
      case 'output':
        contentToValidate = context.getOutput();
        break;
      case 'both':
        contentToValidate = {
          input: context.getInput(),
          output: context.getOutput(),
        };
        break;
      default:
        contentToValidate = context.getInput();
    }

    const contentString = this.stringifyContent(contentToValidate);

    const inputs = {
      mode: config.mode,
      rules: config.rules.map((r) => r.name),
      contentLength: contentString.length,
    };

    try {
      // Run all rules
      const validationResults: GuardrailValidationResult[] = [];
      let allPassed = true;

      for (const rule of config.rules) {
        context.log('debug', `Evaluating rule: ${rule.name}`);

        const result = await this.evaluateRule(rule, contentString, context);
        validationResults.push(result);

        if (!result.passed) {
          allPassed = false;
          context.log('warn', `Rule failed: ${rule.name}`, {
            message: result.message,
          });
        } else {
          context.log('debug', `Rule passed: ${rule.name}`);
        }
      }

      // Store results in context
      context.setVariable('_guardrailResults', validationResults);
      context.setVariable('_guardrailsPassed', allPassed);

      // Determine final status based on results and onFail config
      if (!allPassed) {
        const failedRules = validationResults.filter((r) => !r.passed);

        switch (config.onFail) {
          case 'block':
            context.log('error', 'Guardrails blocked execution', {
              failedRules: failedRules.map((r) => r.ruleName),
            });

            return {
              nodeId,
              nodeType: 'guardrails',
              status: 'failed',
              inputs,
              outputs: {
                passed: false,
                failedRules: failedRules,
                allResults: validationResults,
              },
              error: {
                code: 'GUARDRAILS_BLOCKED',
                message: `Guardrails validation failed: ${failedRules.map((r) => r.ruleName).join(', ')}`,
                nodeId,
                details: {
                  failedRules,
                },
              },
              startTime,
              endTime: Date.now(),
            };

          case 'warn':
            context.log('warn', 'Guardrails validation failed but continuing', {
              failedRules: failedRules.map((r) => r.ruleName),
            });

            return {
              nodeId,
              nodeType: 'guardrails',
              status: 'completed',
              inputs,
              outputs: {
                passed: false,
                warned: true,
                failedRules: failedRules,
                allResults: validationResults,
              },
              startTime,
              endTime: Date.now(),
              metadata: {
                warnings: failedRules.map((r) => ({
                  rule: r.ruleName,
                  message: r.message,
                })),
              },
            };

          case 'continue':
          default:
            context.log('debug', 'Guardrails validation failed, continuing anyway');

            return {
              nodeId,
              nodeType: 'guardrails',
              status: 'completed',
              inputs,
              outputs: {
                passed: false,
                failedRules: failedRules,
                allResults: validationResults,
              },
              startTime,
              endTime: Date.now(),
            };
        }
      }

      context.log('info', 'All guardrails passed');

      return {
        nodeId,
        nodeType: 'guardrails',
        status: 'completed',
        inputs,
        outputs: {
          passed: true,
          allResults: validationResults,
        },
        startTime,
        endTime: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `Guardrails execution failed: ${errorMessage}`, {
        nodeId,
        error: errorMessage,
      });

      return {
        nodeId,
        nodeType: 'guardrails',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'GUARDRAILS_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: GuardrailsNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate mode
    const validModes = ['input', 'output', 'both'];
    if (!validModes.includes(config.mode)) {
      errors.push({
        field: 'mode',
        message: `Invalid mode. Must be one of: ${validModes.join(', ')}`,
        code: 'INVALID_VALUE',
      });
    }

    // Validate onFail
    const validOnFail = ['block', 'warn', 'continue'];
    if (!validOnFail.includes(config.onFail)) {
      errors.push({
        field: 'onFail',
        message: `Invalid onFail action. Must be one of: ${validOnFail.join(', ')}`,
        code: 'INVALID_VALUE',
      });
    }

    // Validate rules
    if (!config.rules || config.rules.length === 0) {
      errors.push({
        field: 'rules',
        message: 'At least one rule is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      const ruleIds = new Set<string>();

      for (let i = 0; i < config.rules.length; i++) {
        const rule = config.rules[i];

        // Validate ID
        if (!rule.id) {
          errors.push({
            field: `rules[${i}].id`,
            message: 'Rule ID is required',
            code: 'REQUIRED_FIELD',
          });
        } else if (ruleIds.has(rule.id)) {
          errors.push({
            field: `rules[${i}].id`,
            message: 'Rule ID must be unique',
            code: 'DUPLICATE_VALUE',
          });
        } else {
          ruleIds.add(rule.id);
        }

        // Validate name
        if (!rule.name) {
          errors.push({
            field: `rules[${i}].name`,
            message: 'Rule name is required',
            code: 'REQUIRED_FIELD',
          });
        }

        // Validate type
        const validTypes = ['regex', 'keyword', 'llm', 'custom'];
        if (!validTypes.includes(rule.type)) {
          errors.push({
            field: `rules[${i}].type`,
            message: `Invalid rule type. Must be one of: ${validTypes.join(', ')}`,
            code: 'INVALID_VALUE',
          });
        }

        // Type-specific validation
        if (rule.type === 'regex' && rule.config) {
          const pattern = rule.config['pattern'] as string;
          if (!pattern) {
            errors.push({
              field: `rules[${i}].config.pattern`,
              message: 'Regex pattern is required',
              code: 'REQUIRED_FIELD',
            });
          } else {
            try {
              new RegExp(pattern);
            } catch {
              errors.push({
                field: `rules[${i}].config.pattern`,
                message: 'Invalid regex pattern',
                code: 'INVALID_VALUE',
              });
            }
          }
        }

        if (rule.type === 'keyword' && rule.config) {
          const keywords = rule.config['keywords'] as string[];
          if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
            errors.push({
              field: `rules[${i}].config.keywords`,
              message: 'Keywords array is required and must not be empty',
              code: 'REQUIRED_FIELD',
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async evaluateRule(
    rule: GuardrailRule,
    content: string,
    context: ExecutionContextInterface
  ): Promise<GuardrailValidationResult> {
    try {
      switch (rule.type) {
        case 'regex':
          return this.evaluateRegexRule(rule, content);

        case 'keyword':
          return this.evaluateKeywordRule(rule, content);

        case 'llm':
          return await this.evaluateLLMRule(rule, content);

        case 'custom':
          return this.evaluateCustomRule(rule, content, context);

        default:
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            passed: false,
            message: `Unknown rule type: ${rule.type}`,
          };
      }
    } catch (error) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private evaluateRegexRule(
    rule: GuardrailRule,
    content: string
  ): GuardrailValidationResult {
    const pattern = rule.config['pattern'] as string;
    const flags = (rule.config['flags'] as string) ?? 'gi';
    const shouldMatch = (rule.config['shouldMatch'] as boolean) ?? false;

    const regex = new RegExp(pattern, flags);
    const matches = content.match(regex);
    const hasMatch = matches !== null && matches.length > 0;

    const passed = shouldMatch ? hasMatch : !hasMatch;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      message: passed
        ? undefined
        : rule.message ?? (shouldMatch ? 'Required pattern not found' : 'Prohibited pattern found'),
      details: {
        matches: matches ?? [],
        pattern,
      },
    };
  }

  private evaluateKeywordRule(
    rule: GuardrailRule,
    content: string
  ): GuardrailValidationResult {
    const keywords = rule.config['keywords'] as string[];
    const caseSensitive = (rule.config['caseSensitive'] as boolean) ?? false;
    const shouldContain = (rule.config['shouldContain'] as boolean) ?? false;

    const contentToCheck = caseSensitive ? content : content.toLowerCase();
    const foundKeywords: string[] = [];

    for (const keyword of keywords) {
      const keywordToCheck = caseSensitive ? keyword : keyword.toLowerCase();
      if (contentToCheck.includes(keywordToCheck)) {
        foundKeywords.push(keyword);
      }
    }

    const hasKeywords = foundKeywords.length > 0;
    const passed = shouldContain ? hasKeywords : !hasKeywords;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      message: passed
        ? undefined
        : rule.message ?? (shouldContain ? 'Required keywords not found' : 'Prohibited keywords found'),
      details: {
        foundKeywords,
        checkedKeywords: keywords,
      },
    };
  }

  private async evaluateLLMRule(
    rule: GuardrailRule,
    content: string
  ): Promise<GuardrailValidationResult> {
    if (!this.llmProvider) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        message: 'LLM provider not configured for LLM-based guardrail',
      };
    }

    const prompt = rule.config['prompt'] as string;
    const model = rule.config['model'] as string | undefined;

    if (!prompt) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        message: 'Prompt is required for LLM-based guardrail',
      };
    }

    try {
      const response = await this.llmProvider.chat({
        messages: [
          {
            role: 'system',
            content: `You are a content validator. Evaluate the following content against the given criteria and respond with only "PASS" or "FAIL" followed by a brief explanation.`,
          },
          {
            role: 'user',
            content: `Criteria: ${prompt}\n\nContent to evaluate:\n${content}`,
          },
        ],
        model,
        temperature: 0,
        maxTokens: 100,
      });

      const result = response.content.trim().toUpperCase();
      const passed = result.startsWith('PASS');

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed,
        message: passed ? undefined : rule.message ?? response.content,
        details: {
          llmResponse: response.content,
        },
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        message: `LLM evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private evaluateCustomRule(
    rule: GuardrailRule,
    content: string,
    context: ExecutionContextInterface
  ): GuardrailValidationResult {
    const validatorCode = rule.config['validator'] as string;

    if (!validatorCode) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        message: 'Validator function is required for custom guardrail',
      };
    }

    try {
      // Create a sandboxed validator function
      // eslint-disable-next-line no-new-func
      const validator = new Function(
        'content',
        'context',
        `
        "use strict";
        ${validatorCode}
      `
      );

      const result = validator(content, {
        getVariable: (name: string) => context.getVariable(name),
        getInput: () => context.getInput(),
        getOutput: () => context.getOutput(),
      });

      // Result can be boolean or object with { passed, message }
      if (typeof result === 'boolean') {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          passed: result,
          message: result ? undefined : rule.message,
        };
      }

      if (typeof result === 'object' && result !== null) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          passed: Boolean(result.passed),
          message: result.message ?? (result.passed ? undefined : rule.message),
          details: result.details,
        };
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        message: 'Custom validator must return boolean or object with passed property',
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        message: `Custom validator error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private stringifyContent(content: VariableType): string {
    if (content === null || content === undefined) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    if (typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }

    return String(content);
  }

  /**
   * Set the LLM provider
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }
}
