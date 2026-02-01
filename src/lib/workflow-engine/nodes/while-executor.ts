/**
 * While Loop Node Executor
 *
 * Executes child nodes repeatedly while a condition is true.
 * Includes max iterations safety to prevent infinite loops.
 */

import {
  ExecutionContextInterface,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  ValidationError,
  ValidationResult,
  WhileNodeConfig,
} from '../types';
import { evaluateCondition } from '../expression-evaluator';

const DEFAULT_MAX_ITERATIONS = 100;

export class WhileExecutor implements NodeExecutor<WhileNodeConfig> {
  readonly nodeType = 'while' as const;

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: WhileNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;
    const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;

    context.log('info', `Executing while loop: ${node.label ?? nodeId}`, {
      condition: config.condition,
      maxIterations,
      bodyNodes: config.bodyNodes,
    });

    const inputs = {
      condition: config.condition,
      maxIterations,
      bodyNodes: config.bodyNodes ?? [],
    };

    try {
      // Get or initialize iteration count for this loop
      const loopId = `while_${nodeId}`;
      let iterationCount = context.getIterationCount(loopId);

      // Evaluate the condition
      context.log('debug', `Evaluating while condition: ${config.condition}`, {
        iteration: iterationCount,
      });

      let shouldContinue = false;

      try {
        shouldContinue = evaluateCondition(config.condition, context);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.log('error', `Condition evaluation error: ${errorMessage}`);

        return {
          nodeId,
          nodeType: 'while',
          status: 'failed',
          inputs,
          outputs: {},
          error: {
            code: 'CONDITION_EVALUATION_ERROR',
            message: `Failed to evaluate condition: ${errorMessage}`,
            nodeId,
          },
          startTime,
          endTime: Date.now(),
        };
      }

      // Check iteration limit
      if (iterationCount >= maxIterations) {
        context.log('warn', `While loop reached max iterations (${maxIterations})`, {
          nodeId,
          iterations: iterationCount,
        });

        // Reset iteration count for this loop
        context.resetIterationCount(loopId);

        return {
          nodeId,
          nodeType: 'while',
          status: 'completed',
          inputs,
          outputs: {
            loopCompleted: true,
            reason: 'max_iterations_reached',
            iterations: iterationCount,
          },
          startTime,
          endTime: Date.now(),
          metadata: {
            exitReason: 'max_iterations',
            totalIterations: iterationCount,
          },
        };
      }

      if (shouldContinue) {
        // Increment iteration count
        const newCount = context.incrementIterationCount(loopId);

        context.log('debug', `While condition is true, starting iteration ${newCount}`, {
          bodyNodes: config.bodyNodes,
        });

        // Set iteration variable for use in body
        context.setVariable('_loopIteration', newCount);
        context.setVariable(`_${nodeId}_iteration`, newCount);

        // Return with body nodes to execute
        // The workflow executor will execute body nodes and then re-evaluate this node
        return {
          nodeId,
          nodeType: 'while',
          status: 'running',
          inputs,
          outputs: {
            continueLoop: true,
            iteration: newCount,
          },
          startTime,
          endTime: Date.now(),
          nextNodes: config.bodyNodes ?? [],
          metadata: {
            shouldContinue: true,
            iteration: newCount,
            loopId,
          },
        };
      } else {
        // Loop condition is false - exit the loop
        const totalIterations = iterationCount;

        context.log('info', `While loop completed after ${totalIterations} iterations`);

        // Reset iteration count for this loop
        context.resetIterationCount(loopId);

        return {
          nodeId,
          nodeType: 'while',
          status: 'completed',
          inputs,
          outputs: {
            loopCompleted: true,
            reason: 'condition_false',
            iterations: totalIterations,
          },
          startTime,
          endTime: Date.now(),
          metadata: {
            exitReason: 'condition_false',
            totalIterations,
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `While loop execution failed: ${errorMessage}`, {
        nodeId,
        error: errorMessage,
      });

      // Reset iteration count on error
      context.resetIterationCount(`while_${nodeId}`);

      return {
        nodeId,
        nodeType: 'while',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'WHILE_EXECUTION_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: WhileNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate condition
    if (!config.condition || config.condition.trim() === '') {
      errors.push({
        field: 'condition',
        message: 'Condition expression is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      // Basic syntax validation
      const syntaxError = this.validateExpressionSyntax(config.condition);
      if (syntaxError) {
        errors.push({
          field: 'condition',
          message: syntaxError,
          code: 'INVALID_EXPRESSION',
        });
      }
    }

    // Validate max iterations
    if (config.maxIterations !== undefined) {
      if (config.maxIterations < 1) {
        errors.push({
          field: 'maxIterations',
          message: 'Max iterations must be at least 1',
          code: 'INVALID_RANGE',
        });
      }
      if (config.maxIterations > 10000) {
        errors.push({
          field: 'maxIterations',
          message: 'Max iterations cannot exceed 10000',
          code: 'INVALID_RANGE',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateExpressionSyntax(expression: string): string | null {
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

      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid expression';
    }
  }
}
