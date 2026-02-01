/**
 * Transform Node Executor
 *
 * Runs JavaScript code safely using the Function constructor with a sandbox.
 * Transforms input data and returns the result.
 */

import {
  ExecutionContextInterface,
  NodeDefinition,
  NodeExecutionResult,
  NodeExecutor,
  TransformNodeConfig,
  ValidationError,
  ValidationResult,
  VariableType,
} from '../types';

// Allowed globals in the sandbox
const ALLOWED_GLOBALS = [
  'JSON',
  'Math',
  'Date',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'RegExp',
  'Map',
  'Set',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURIComponent',
  'decodeURIComponent',
  'encodeURI',
  'decodeURI',
];

export class TransformExecutor implements NodeExecutor<TransformNodeConfig> {
  readonly nodeType = 'transform' as const;

  async execute(
    node: NodeDefinition,
    context: ExecutionContextInterface,
    config: TransformNodeConfig
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeId = node.id;

    context.log('info', `Executing transform node: ${node.label ?? nodeId}`, {
      codeLength: config.code.length,
      inputVariables: config.inputVariables,
    });

    // Gather inputs
    const inputData: Record<string, VariableType> = {};

    // Add specified input variables
    if (config.inputVariables && config.inputVariables.length > 0) {
      for (const varName of config.inputVariables) {
        inputData[varName] = context.getVariable(varName);
      }
    }

    // Always include standard context
    inputData['input'] = context.getInput();
    inputData['variables'] = context.getAllVariables();
    inputData['output'] = context.getOutput();

    const inputs = {
      code: config.code,
      inputVariables: config.inputVariables,
      inputData,
    };

    try {
      // Execute the transform code
      const result = await this.executeCode(config.code, inputData, context);

      context.log('debug', 'Transform completed', {
        resultType: typeof result,
      });

      // Store the result
      const outputVariable = config.outputVariable ?? 'transformResult';
      context.setVariable(outputVariable, result);
      context.setOutput('result', result);

      return {
        nodeId,
        nodeType: 'transform',
        status: 'completed',
        inputs,
        outputs: {
          result,
        },
        startTime,
        endTime: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      context.log('error', `Transform execution failed: ${errorMessage}`, {
        nodeId,
        error: errorMessage,
      });

      return {
        nodeId,
        nodeType: 'transform',
        status: 'failed',
        inputs,
        outputs: {},
        error: {
          code: 'TRANSFORM_EXECUTION_ERROR',
          message: errorMessage,
          nodeId,
          stack: error instanceof Error ? error.stack : undefined,
        },
        startTime,
        endTime: Date.now(),
      };
    }
  }

  validate(config: TransformNodeConfig): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config.code || config.code.trim() === '') {
      errors.push({
        field: 'code',
        message: 'Transform code is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      // Basic syntax validation
      const syntaxError = this.validateCodeSyntax(config.code);
      if (syntaxError) {
        errors.push({
          field: 'code',
          message: syntaxError,
          code: 'INVALID_SYNTAX',
        });
      }

      // Check for dangerous patterns
      const securityError = this.checkSecurityPatterns(config.code);
      if (securityError) {
        errors.push({
          field: 'code',
          message: securityError,
          code: 'SECURITY_VIOLATION',
        });
      }
    }

    if (config.inputVariables) {
      for (let i = 0; i < config.inputVariables.length; i++) {
        const varName = config.inputVariables[i];
        if (!varName || varName.trim() === '') {
          errors.push({
            field: `inputVariables[${i}]`,
            message: 'Variable name cannot be empty',
            code: 'INVALID_VALUE',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async executeCode(
    code: string,
    inputData: Record<string, VariableType>,
    context: ExecutionContextInterface
  ): Promise<VariableType> {
    // Create sandbox with allowed globals
    const sandbox: Record<string, unknown> = {};

    // Add allowed globals
    for (const name of ALLOWED_GLOBALS) {
      sandbox[name] = (globalThis as Record<string, unknown>)[name];
    }

    // Add input data to sandbox
    for (const [key, value] of Object.entries(inputData)) {
      sandbox[key] = value;
    }

    // Add helper functions
    sandbox['log'] = (message: string) => {
      context.log('debug', `[Transform] ${message}`);
    };

    sandbox['getVariable'] = (name: string) => {
      return context.getVariable(name);
    };

    sandbox['setVariable'] = (name: string, value: VariableType) => {
      context.setVariable(name, value);
    };

    // Build the function body
    // The code should return a value
    const wrappedCode = `
      "use strict";
      ${code}
    `;

    try {
      // Create parameter names and values
      const paramNames = Object.keys(sandbox);
      const paramValues = Object.values(sandbox);

      // Create the sandboxed function
      // eslint-disable-next-line no-new-func
      const fn = new Function(...paramNames, wrappedCode);

      // Execute with timeout
      const result = await this.executeWithTimeout(
        () => fn(...paramValues),
        5000 // 5 second timeout
      );

      return result as VariableType;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Transform code error: ${error.message}`);
      }
      throw error;
    }
  }

  private async executeWithTimeout<T>(
    fn: () => T,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Transform execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = fn();

        // Handle promise results
        if (result instanceof Promise) {
          result
            .then((value) => {
              clearTimeout(timeoutId);
              resolve(value);
            })
            .catch((error) => {
              clearTimeout(timeoutId);
              reject(error);
            });
        } else {
          clearTimeout(timeoutId);
          resolve(result);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private validateCodeSyntax(code: string): string | null {
    try {
      // Try to parse the code to check syntax
      // eslint-disable-next-line no-new-func
      new Function(code);
      return null;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return `Syntax error: ${error.message}`;
      }
      return error instanceof Error ? error.message : 'Invalid JavaScript code';
    }
  }

  private checkSecurityPatterns(code: string): string | null {
    // List of dangerous patterns to check
    const dangerousPatterns = [
      { pattern: /\beval\s*\(/, message: 'eval() is not allowed' },
      { pattern: /\bFunction\s*\(/, message: 'Function constructor is not allowed in code' },
      { pattern: /\bimport\s*\(/, message: 'Dynamic import is not allowed' },
      { pattern: /\brequire\s*\(/, message: 'require() is not allowed' },
      { pattern: /\bprocess\b/, message: 'process object is not allowed' },
      { pattern: /\b__dirname\b/, message: '__dirname is not allowed' },
      { pattern: /\b__filename\b/, message: '__filename is not allowed' },
      { pattern: /\bglobalThis\b/, message: 'globalThis is not allowed' },
      { pattern: /\bwindow\b/, message: 'window object is not allowed' },
      { pattern: /\bdocument\b/, message: 'document object is not allowed' },
      { pattern: /\blocalStorage\b/, message: 'localStorage is not allowed' },
      { pattern: /\bsessionStorage\b/, message: 'sessionStorage is not allowed' },
      { pattern: /\bfetch\s*\(/, message: 'fetch() is not allowed' },
      { pattern: /\bXMLHttpRequest\b/, message: 'XMLHttpRequest is not allowed' },
      { pattern: /\bWebSocket\b/, message: 'WebSocket is not allowed' },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        return message;
      }
    }

    return null;
  }
}
