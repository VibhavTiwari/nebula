/**
 * If/Else Node Executor
 *
 * Evaluates conditions using CEL-like expressions and routes execution
 * to the appropriate branch based on the results.
 */

import {
  ExecutionContextInterface,
  IfElseNodeConfig,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  ValidationError,
  ValidationResult,
} from '../types';
import { evaluateCondition } from '../expression-evaluator';

export class IfElseExecutor implements NodeExecutor<IfElseNodeConfig> {
  readonly nodeType = 'if-else' as const;

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: IfElseNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;

    context.log('info', `Executing if-else node: ${node.label ?? nodeId}`, {
      conditionCount: config.conditions.length,
      hasElse: Boolean(config.elseOutputHandle),
    });

    const inputs = {
      conditions: config.conditions.map((c) => c.expression),
      variables: context.getAllVariables(),
    };

    try {
      // Evaluate each condition in order
      let matchedCondition: IfElseNodeConfig['conditions'][number] | null = null;
      const evaluationResults: Array<{
        expression: string;
        result: boolean;
        error?: string;
      }> = [];

      for (const condition of config.conditions) {
        context.log('debug', `Evaluating condition: ${condition.expression}`);

        try {
          const result = evaluateCondition(condition.expression, context);

          evaluationResults.push({
            expression: condition.expression,
            result,
          });

          context.log('debug', `Condition result: ${result}`, {
            expression: condition.expression,
          });

          if (result && !matchedCondition) {
            matchedCondition = condition;
            context.log('info', `Condition matched: ${condition.label ?? condition.expression}`);
            // Don't break - evaluate all conditions for logging purposes
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          evaluationResults.push({
            expression: condition.expression,
            result: false,
            error: errorMessage,
          });

          context.log('warn', `Condition evaluation error: ${errorMessage}`, {
            expression: condition.expression,
          });
        }
      }

      // Determine the output handle
      let selectedHandle: string | null = null;
      let branchName: string = 'else';

      if (matchedCondition) {
        selectedHandle = matchedCondition.outputHandle;
        branchName = matchedCondition.label ?? matchedCondition.expression;
      } else if (config.elseOutputHandle) {
        selectedHandle = config.elseOutputHandle;
        branchName = 'else';
        context.log('info', 'No conditions matched, taking else branch');
      }

      // Store the result in context
      context.setVariable('_ifElseResult', {
        matchedCondition: matchedCondition?.id ?? null,
        branch: branchName,
        outputHandle: selectedHandle,
      });

      const nextNodes: string[] = selectedHandle ? [selectedHandle] : [];

      return {
        nodeId,
        nodeType: 'if-else',
        status: 'completed',
        inputs,
        outputs: {
          matchedCondition: matchedCondition?.id ?? null,
          branch: branchName,
          outputHandle: selectedHandle,
          evaluationResults,
        },
        startTime,
        endTime: Date.now(),
        nextNodes,
        metadata: {
          evaluationResults,
          selectedHandle,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `If-else execution failed: ${errorMessage}`, {
        nodeId,
        error: errorMessage,
      });

      return {
        nodeId,
        nodeType: 'if-else',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'IF_ELSE_EXECUTION_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: IfElseNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config.conditions || config.conditions.length === 0) {
      errors.push({
        field: 'conditions',
        message: 'At least one condition is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (config.conditions) {
      const conditionIds = new Set<string>();
      const outputHandles = new Set<string>();

      for (let i = 0; i < config.conditions.length; i++) {
        const condition = config.conditions[i];

        // Validate ID uniqueness
        if (!condition.id) {
          errors.push({
            field: `conditions[${i}].id`,
            message: 'Condition ID is required',
            code: 'REQUIRED_FIELD',
          });
        } else if (conditionIds.has(condition.id)) {
          errors.push({
            field: `conditions[${i}].id`,
            message: 'Condition ID must be unique',
            code: 'DUPLICATE_VALUE',
          });
        } else {
          conditionIds.add(condition.id);
        }

        // Validate expression
        if (!condition.expression || condition.expression.trim() === '') {
          errors.push({
            field: `conditions[${i}].expression`,
            message: 'Expression is required',
            code: 'REQUIRED_FIELD',
          });
        } else {
          // Try to validate expression syntax
          const syntaxError = this.validateExpressionSyntax(condition.expression);
          if (syntaxError) {
            errors.push({
              field: `conditions[${i}].expression`,
              message: syntaxError,
              code: 'INVALID_EXPRESSION',
            });
          }
        }

        // Validate output handle
        if (!condition.outputHandle) {
          errors.push({
            field: `conditions[${i}].outputHandle`,
            message: 'Output handle is required',
            code: 'REQUIRED_FIELD',
          });
        } else if (outputHandles.has(condition.outputHandle)) {
          // Output handles can be duplicated if conditions should route to same place
          // This is a warning, not an error
        } else {
          outputHandles.add(condition.outputHandle);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateExpressionSyntax(expression: string): string | null {
    // Basic syntax validation without actually evaluating
    try {
      // Check for balanced parentheses
      let parenCount = 0;
      for (const char of expression) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (parenCount < 0) {
          return 'Unbalanced parentheses';
        }
      }
      if (parenCount !== 0) {
        return 'Unbalanced parentheses';
      }

      // Check for balanced brackets
      let bracketCount = 0;
      for (const char of expression) {
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
        if (bracketCount < 0) {
          return 'Unbalanced brackets';
        }
      }
      if (bracketCount !== 0) {
        return 'Unbalanced brackets';
      }

      // Check for empty expression
      if (expression.trim() === '') {
        return 'Expression cannot be empty';
      }

      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid expression';
    }
  }
}
