/**
 * Set State Node Executor
 *
 * Sets a variable in the execution context.
 * Supports different value types including string, number, boolean, JSON, and expressions.
 */

import {
  ExecutionContextInterface,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  SetStateNodeConfig,
  ValidationError,
  ValidationResult,
  VariableType,
} from '../types';
import { evaluateExpression } from '../expression-evaluator';

export class SetStateExecutor implements NodeExecutor<SetStateNodeConfig> {
  readonly nodeType = 'set-state' as const;

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: SetStateNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;

    context.log('info', `Executing set-state node: ${node.label ?? nodeId}`, {
      variable: config.variable,
      valueType: config.valueType,
    });

    const inputs = {
      variable: config.variable,
      valueType: config.valueType,
      rawValue: config.value,
    };

    try {
      // Parse and convert the value based on type
      const parsedValue = this.parseValue(config, context);

      context.log('debug', `Setting variable "${config.variable}"`, {
        valueType: config.valueType,
        parsedType: typeof parsedValue,
      });

      // Set the variable in context
      context.setVariable(config.variable, parsedValue);

      // Also set in output for chaining
      context.setOutput(config.variable, parsedValue);

      return {
        nodeId,
        nodeType: 'set-state',
        status: 'completed',
        inputs,
        outputs: {
          variable: config.variable,
          value: parsedValue,
          valueType: typeof parsedValue,
        },
        startTime,
        endTime: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `Set-state execution failed: ${errorMessage}`, {
        nodeId,
        variable: config.variable,
        error: errorMessage,
      });

      return {
        nodeId,
        nodeType: 'set-state',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'SET_STATE_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: SetStateNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate variable name
    if (!config.variable || config.variable.trim() === '') {
      errors.push({
        field: 'variable',
        message: 'Variable name is required',
        code: 'REQUIRED_FIELD',
      });
    } else if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(config.variable)) {
      errors.push({
        field: 'variable',
        message: 'Invalid variable name. Must be a valid identifier or dot-separated path.',
        code: 'INVALID_VALUE',
      });
    }

    // Validate value type
    const validTypes = ['string', 'number', 'boolean', 'json', 'expression'];
    if (!validTypes.includes(config.valueType)) {
      errors.push({
        field: 'valueType',
        message: `Invalid value type. Must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_VALUE',
      });
    }

    // Validate value based on type
    if (config.value === undefined || config.value === null) {
      // Empty values are allowed for some types
      if (config.valueType !== 'string') {
        errors.push({
          field: 'value',
          message: 'Value is required',
          code: 'REQUIRED_FIELD',
        });
      }
    } else {
      // Type-specific validation
      switch (config.valueType) {
        case 'number':
          if (isNaN(Number(config.value))) {
            errors.push({
              field: 'value',
              message: 'Value must be a valid number',
              code: 'INVALID_VALUE',
            });
          }
          break;

        case 'boolean':
          const lowerValue = config.value.toLowerCase();
          if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lowerValue)) {
            errors.push({
              field: 'value',
              message: 'Value must be a valid boolean (true, false, 1, 0, yes, no)',
              code: 'INVALID_VALUE',
            });
          }
          break;

        case 'json':
          try {
            JSON.parse(config.value);
          } catch {
            errors.push({
              field: 'value',
              message: 'Value must be valid JSON',
              code: 'INVALID_VALUE',
            });
          }
          break;

        case 'expression':
          // Basic syntax validation for expressions
          if (config.value.trim() === '') {
            errors.push({
              field: 'value',
              message: 'Expression cannot be empty',
              code: 'INVALID_VALUE',
            });
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private parseValue(
    config: SetStateNodeConfig,
    context: ExecutionContextInterface
  ): VariableType {
    const rawValue = config.value;

    switch (config.valueType) {
      case 'string':
        // Support variable interpolation in strings
        return this.interpolateString(rawValue ?? '', context);

      case 'number':
        const num = Number(rawValue);
        if (isNaN(num)) {
          throw new Error(`Cannot convert "${rawValue}" to number`);
        }
        return num;

      case 'boolean':
        return this.parseBoolean(rawValue);

      case 'json':
        try {
          const parsed = JSON.parse(rawValue);
          // Interpolate any string values in the parsed JSON
          return this.interpolateObject(parsed, context);
        } catch (error) {
          throw new Error(
            `Invalid JSON value: ${error instanceof Error ? error.message : String(error)}`
          );
        }

      case 'expression':
        try {
          return evaluateExpression(rawValue, context);
        } catch (error) {
          throw new Error(
            `Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }

      default:
        throw new Error(`Unknown value type: ${config.valueType}`);
    }
  }

  private parseBoolean(value: string): boolean {
    const lowerValue = value.toLowerCase().trim();

    if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
      return true;
    }

    if (['false', '0', 'no', 'off'].includes(lowerValue)) {
      return false;
    }

    throw new Error(`Cannot convert "${value}" to boolean`);
  }

  private interpolateString(
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

  private interpolateObject(
    obj: VariableType,
    context: ExecutionContextInterface
  ): VariableType {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.interpolateString(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateObject(item, context));
    }

    if (typeof obj === 'object') {
      const result: Record<string, VariableType> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value as VariableType, context);
      }
      return result;
    }

    return obj;
  }
}
