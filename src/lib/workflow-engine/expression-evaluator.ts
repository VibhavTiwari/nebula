/**
 * CEL-like Expression Evaluator
 *
 * Supports:
 * - Comparison operators: ==, !=, >, <, >=, <=
 * - Logical operators: &&, ||, !
 * - Arithmetic operators: +, -, *, /, %
 * - Variable substitution from context
 * - Parentheses for grouping
 * - String literals (single and double quotes)
 * - Number literals (integers and floats)
 * - Boolean literals (true, false)
 * - Null literal
 * - Property access (dot notation)
 * - Array indexing
 * - Function calls: contains(), startsWith(), endsWith(), length(), typeof()
 */

import { ExecutionContextInterface, VariableType } from './types';

// ============================================================================
// Token Types
// ============================================================================

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'COMPARATOR'
  | 'LOGICAL'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'DOT'
  | 'COMMA'
  | 'NOT'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean | null;
  position: number;
}

// ============================================================================
// Tokenizer
// ============================================================================

class Tokenizer {
  private input: string;
  private position: number = 0;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;

    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.position >= this.input.length) break;

      const token = this.nextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    this.tokens.push({ type: 'EOF', value: null, position: this.position });
    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      this.position++;
    }
  }

  private nextToken(): Token | null {
    const char = this.input[this.position];
    const startPos = this.position;

    // String literals
    if (char === '"' || char === "'") {
      return this.readString(char);
    }

    // Numbers
    if (/\d/.test(char) || (char === '-' && /\d/.test(this.input[this.position + 1] ?? ''))) {
      return this.readNumber();
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(char)) {
      return this.readIdentifier();
    }

    // Multi-character operators
    const twoChar = this.input.substring(this.position, this.position + 2);
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChar)) {
      this.position += 2;
      if (twoChar === '&&' || twoChar === '||') {
        return { type: 'LOGICAL', value: twoChar, position: startPos };
      }
      return { type: 'COMPARATOR', value: twoChar, position: startPos };
    }

    // Single character operators
    if (['>', '<'].includes(char)) {
      this.position++;
      return { type: 'COMPARATOR', value: char, position: startPos };
    }

    if (['+', '-', '*', '/', '%'].includes(char)) {
      this.position++;
      return { type: 'OPERATOR', value: char, position: startPos };
    }

    if (char === '!') {
      this.position++;
      return { type: 'NOT', value: '!', position: startPos };
    }

    if (char === '(') {
      this.position++;
      return { type: 'LPAREN', value: '(', position: startPos };
    }

    if (char === ')') {
      this.position++;
      return { type: 'RPAREN', value: ')', position: startPos };
    }

    if (char === '[') {
      this.position++;
      return { type: 'LBRACKET', value: '[', position: startPos };
    }

    if (char === ']') {
      this.position++;
      return { type: 'RBRACKET', value: ']', position: startPos };
    }

    if (char === '.') {
      this.position++;
      return { type: 'DOT', value: '.', position: startPos };
    }

    if (char === ',') {
      this.position++;
      return { type: 'COMMA', value: ',', position: startPos };
    }

    throw new ExpressionError(`Unexpected character: ${char}`, startPos);
  }

  private readString(quote: string): Token {
    const startPos = this.position;
    this.position++; // Skip opening quote
    let value = '';

    while (this.position < this.input.length) {
      const char = this.input[this.position];

      if (char === quote) {
        this.position++; // Skip closing quote
        return { type: 'STRING', value, position: startPos };
      }

      if (char === '\\' && this.position + 1 < this.input.length) {
        this.position++;
        const escaped = this.input[this.position];
        switch (escaped) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case 'r':
            value += '\r';
            break;
          case '\\':
            value += '\\';
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            value += escaped;
        }
      } else {
        value += char;
      }
      this.position++;
    }

    throw new ExpressionError('Unterminated string literal', startPos);
  }

  private readNumber(): Token {
    const startPos = this.position;
    let value = '';

    if (this.input[this.position] === '-') {
      value += '-';
      this.position++;
    }

    while (this.position < this.input.length && /[\d.]/.test(this.input[this.position])) {
      value += this.input[this.position];
      this.position++;
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      throw new ExpressionError(`Invalid number: ${value}`, startPos);
    }

    return { type: 'NUMBER', value: num, position: startPos };
  }

  private readIdentifier(): Token {
    const startPos = this.position;
    let value = '';

    while (this.position < this.input.length && /[a-zA-Z0-9_$]/.test(this.input[this.position])) {
      value += this.input[this.position];
      this.position++;
    }

    // Keywords
    if (value === 'true') {
      return { type: 'BOOLEAN', value: true, position: startPos };
    }
    if (value === 'false') {
      return { type: 'BOOLEAN', value: false, position: startPos };
    }
    if (value === 'null') {
      return { type: 'NULL', value: null, position: startPos };
    }

    return { type: 'IDENTIFIER', value, position: startPos };
  }
}

// ============================================================================
// AST Node Types
// ============================================================================

type ASTNode =
  | LiteralNode
  | IdentifierNode
  | BinaryNode
  | UnaryNode
  | MemberAccessNode
  | IndexAccessNode
  | CallNode;

interface LiteralNode {
  type: 'Literal';
  value: string | number | boolean | null;
}

interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

interface BinaryNode {
  type: 'Binary';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

interface UnaryNode {
  type: 'Unary';
  operator: string;
  operand: ASTNode;
}

interface MemberAccessNode {
  type: 'MemberAccess';
  object: ASTNode;
  property: string;
}

interface IndexAccessNode {
  type: 'IndexAccess';
  object: ASTNode;
  index: ASTNode;
}

interface CallNode {
  type: 'Call';
  callee: ASTNode;
  arguments: ASTNode[];
}

// ============================================================================
// Parser
// ============================================================================

class Parser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    const result = this.parseExpression();
    if (this.current().type !== 'EOF') {
      throw new ExpressionError(
        `Unexpected token: ${this.current().value}`,
        this.current().position
      );
    }
    return result;
  }

  private current(): Token {
    return this.tokens[this.position] ?? { type: 'EOF', value: null, position: 0 };
  }

  private advance(): Token {
    const token = this.current();
    this.position++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new ExpressionError(
        `Expected ${type} but got ${token.type}`,
        token.position
      );
    }
    return this.advance();
  }

  // Expression precedence (lowest to highest):
  // 1. Logical OR (||)
  // 2. Logical AND (&&)
  // 3. Comparison (==, !=, >, <, >=, <=)
  // 4. Addition/Subtraction (+, -)
  // 5. Multiplication/Division (*, /, %)
  // 6. Unary (!, -)
  // 7. Member access, Index access, Function calls
  // 8. Primary (literals, identifiers, parentheses)

  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();

    while (this.current().type === 'LOGICAL' && this.current().value === '||') {
      const operator = this.advance().value as string;
      const right = this.parseLogicalAnd();
      left = { type: 'Binary', operator, left, right };
    }

    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseComparison();

    while (this.current().type === 'LOGICAL' && this.current().value === '&&') {
      const operator = this.advance().value as string;
      const right = this.parseComparison();
      left = { type: 'Binary', operator, left, right };
    }

    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddition();

    while (this.current().type === 'COMPARATOR') {
      const operator = this.advance().value as string;
      const right = this.parseAddition();
      left = { type: 'Binary', operator, left, right };
    }

    return left;
  }

  private parseAddition(): ASTNode {
    let left = this.parseMultiplication();

    while (
      this.current().type === 'OPERATOR' &&
      (this.current().value === '+' || this.current().value === '-')
    ) {
      const operator = this.advance().value as string;
      const right = this.parseMultiplication();
      left = { type: 'Binary', operator, left, right };
    }

    return left;
  }

  private parseMultiplication(): ASTNode {
    let left = this.parseUnary();

    while (
      this.current().type === 'OPERATOR' &&
      (this.current().value === '*' ||
        this.current().value === '/' ||
        this.current().value === '%')
    ) {
      const operator = this.advance().value as string;
      const right = this.parseUnary();
      left = { type: 'Binary', operator, left, right };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.current().type === 'NOT') {
      const operator = this.advance().value as string;
      const operand = this.parseUnary();
      return { type: 'Unary', operator, operand };
    }

    if (this.current().type === 'OPERATOR' && this.current().value === '-') {
      const operator = this.advance().value as string;
      const operand = this.parseUnary();
      return { type: 'Unary', operator, operand };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let node = this.parsePrimary();

    while (true) {
      if (this.current().type === 'DOT') {
        this.advance();
        const property = this.expect('IDENTIFIER').value as string;
        node = { type: 'MemberAccess', object: node, property };
      } else if (this.current().type === 'LBRACKET') {
        this.advance();
        const index = this.parseExpression();
        this.expect('RBRACKET');
        node = { type: 'IndexAccess', object: node, index };
      } else if (this.current().type === 'LPAREN') {
        this.advance();
        const args: ASTNode[] = [];

        if (this.current().type !== 'RPAREN') {
          args.push(this.parseExpression());

          while (this.current().type === 'COMMA') {
            this.advance();
            args.push(this.parseExpression());
          }
        }

        this.expect('RPAREN');
        node = { type: 'Call', callee: node, arguments: args };
      } else {
        break;
      }
    }

    return node;
  }

  private parsePrimary(): ASTNode {
    const token = this.current();

    switch (token.type) {
      case 'NUMBER':
      case 'STRING':
      case 'BOOLEAN':
      case 'NULL':
        this.advance();
        return { type: 'Literal', value: token.value as string | number | boolean | null };

      case 'IDENTIFIER':
        this.advance();
        return { type: 'Identifier', name: token.value as string };

      case 'LPAREN': {
        this.advance();
        const expr = this.parseExpression();
        this.expect('RPAREN');
        return expr;
      }

      default:
        throw new ExpressionError(
          `Unexpected token: ${token.type}`,
          token.position
        );
    }
  }
}

// ============================================================================
// Error Class
// ============================================================================

export class ExpressionError extends Error {
  readonly position: number;

  constructor(message: string, position: number) {
    super(`Expression error at position ${position}: ${message}`);
    this.name = 'ExpressionError';
    this.position = position;
  }
}

// ============================================================================
// Evaluator
// ============================================================================

export class ExpressionEvaluator {
  private context: ExecutionContextInterface;
  private builtinFunctions: Map<string, (...args: VariableType[]) => VariableType>;

  constructor(context: ExecutionContextInterface) {
    this.context = context;
    this.builtinFunctions = new Map();
    this.registerBuiltinFunctions();
  }

  private registerBuiltinFunctions(): void {
    // String functions
    this.builtinFunctions.set('contains', (str: VariableType, search: VariableType) => {
      if (typeof str === 'string' && typeof search === 'string') {
        return str.includes(search);
      }
      if (Array.isArray(str)) {
        return str.includes(search);
      }
      return false;
    });

    this.builtinFunctions.set('startsWith', (str: VariableType, prefix: VariableType) => {
      if (typeof str === 'string' && typeof prefix === 'string') {
        return str.startsWith(prefix);
      }
      return false;
    });

    this.builtinFunctions.set('endsWith', (str: VariableType, suffix: VariableType) => {
      if (typeof str === 'string' && typeof suffix === 'string') {
        return str.endsWith(suffix);
      }
      return false;
    });

    this.builtinFunctions.set('length', (value: VariableType) => {
      if (typeof value === 'string' || Array.isArray(value)) {
        return value.length;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length;
      }
      return 0;
    });

    this.builtinFunctions.set('toLowerCase', (str: VariableType) => {
      if (typeof str === 'string') {
        return str.toLowerCase();
      }
      return str;
    });

    this.builtinFunctions.set('toUpperCase', (str: VariableType) => {
      if (typeof str === 'string') {
        return str.toUpperCase();
      }
      return str;
    });

    this.builtinFunctions.set('trim', (str: VariableType) => {
      if (typeof str === 'string') {
        return str.trim();
      }
      return str;
    });

    // Type functions
    this.builtinFunctions.set('typeof', (value: VariableType) => {
      if (value === null) return 'null';
      if (Array.isArray(value)) return 'array';
      return typeof value;
    });

    this.builtinFunctions.set('isNull', (value: VariableType) => {
      return value === null || value === undefined;
    });

    this.builtinFunctions.set('isNumber', (value: VariableType) => {
      return typeof value === 'number' && !isNaN(value);
    });

    this.builtinFunctions.set('isString', (value: VariableType) => {
      return typeof value === 'string';
    });

    this.builtinFunctions.set('isBoolean', (value: VariableType) => {
      return typeof value === 'boolean';
    });

    this.builtinFunctions.set('isArray', (value: VariableType) => {
      return Array.isArray(value);
    });

    this.builtinFunctions.set('isObject', (value: VariableType) => {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    });

    // Conversion functions
    this.builtinFunctions.set('toString', (value: VariableType) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });

    this.builtinFunctions.set('toNumber', (value: VariableType) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      }
      if (typeof value === 'boolean') return value ? 1 : 0;
      return 0;
    });

    // Math functions
    this.builtinFunctions.set('abs', (value: VariableType) => {
      if (typeof value === 'number') return Math.abs(value);
      return 0;
    });

    this.builtinFunctions.set('floor', (value: VariableType) => {
      if (typeof value === 'number') return Math.floor(value);
      return 0;
    });

    this.builtinFunctions.set('ceil', (value: VariableType) => {
      if (typeof value === 'number') return Math.ceil(value);
      return 0;
    });

    this.builtinFunctions.set('round', (value: VariableType) => {
      if (typeof value === 'number') return Math.round(value);
      return 0;
    });

    this.builtinFunctions.set('min', (...args: VariableType[]) => {
      const numbers = args.filter((a): a is number => typeof a === 'number');
      return numbers.length > 0 ? Math.min(...numbers) : 0;
    });

    this.builtinFunctions.set('max', (...args: VariableType[]) => {
      const numbers = args.filter((a): a is number => typeof a === 'number');
      return numbers.length > 0 ? Math.max(...numbers) : 0;
    });
  }

  evaluate(expression: string): VariableType {
    if (!expression || expression.trim() === '') {
      return null;
    }

    try {
      const tokenizer = new Tokenizer(expression);
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      return this.evaluateNode(ast);
    } catch (error) {
      if (error instanceof ExpressionError) {
        throw error;
      }
      throw new ExpressionError(
        `Failed to evaluate expression: ${error instanceof Error ? error.message : String(error)}`,
        0
      );
    }
  }

  private evaluateNode(node: ASTNode): VariableType {
    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier':
        return this.context.getVariable(node.name);

      case 'Binary':
        return this.evaluateBinary(node);

      case 'Unary':
        return this.evaluateUnary(node);

      case 'MemberAccess':
        return this.evaluateMemberAccess(node);

      case 'IndexAccess':
        return this.evaluateIndexAccess(node);

      case 'Call':
        return this.evaluateCall(node);

      default:
        throw new ExpressionError(`Unknown node type: ${(node as ASTNode).type}`, 0);
    }
  }

  private evaluateBinary(node: BinaryNode): VariableType {
    const left = this.evaluateNode(node.left);

    // Short-circuit evaluation for logical operators
    if (node.operator === '&&') {
      return this.toBoolean(left) ? this.evaluateNode(node.right) : left;
    }
    if (node.operator === '||') {
      return this.toBoolean(left) ? left : this.evaluateNode(node.right);
    }

    const right = this.evaluateNode(node.right);

    switch (node.operator) {
      case '==':
        return this.equals(left, right);
      case '!=':
        return !this.equals(left, right);
      case '>':
        return this.compare(left, right) > 0;
      case '<':
        return this.compare(left, right) < 0;
      case '>=':
        return this.compare(left, right) >= 0;
      case '<=':
        return this.compare(left, right) <= 0;
      case '+':
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left ?? '') + String(right ?? '');
        }
        return (this.toNumber(left) + this.toNumber(right));
      case '-':
        return this.toNumber(left) - this.toNumber(right);
      case '*':
        return this.toNumber(left) * this.toNumber(right);
      case '/':
        const divisor = this.toNumber(right);
        if (divisor === 0) {
          throw new ExpressionError('Division by zero', 0);
        }
        return this.toNumber(left) / divisor;
      case '%':
        const mod = this.toNumber(right);
        if (mod === 0) {
          throw new ExpressionError('Modulo by zero', 0);
        }
        return this.toNumber(left) % mod;
      default:
        throw new ExpressionError(`Unknown operator: ${node.operator}`, 0);
    }
  }

  private evaluateUnary(node: UnaryNode): VariableType {
    const operand = this.evaluateNode(node.operand);

    switch (node.operator) {
      case '!':
        return !this.toBoolean(operand);
      case '-':
        return -this.toNumber(operand);
      default:
        throw new ExpressionError(`Unknown unary operator: ${node.operator}`, 0);
    }
  }

  private evaluateMemberAccess(node: MemberAccessNode): VariableType {
    const object = this.evaluateNode(node.object);

    if (object === null || object === undefined) {
      return undefined;
    }

    if (typeof object === 'object') {
      return (object as Record<string, VariableType>)[node.property];
    }

    return undefined;
  }

  private evaluateIndexAccess(node: IndexAccessNode): VariableType {
    const object = this.evaluateNode(node.object);
    const index = this.evaluateNode(node.index);

    if (object === null || object === undefined) {
      return undefined;
    }

    if (Array.isArray(object)) {
      const idx = this.toNumber(index);
      return object[idx];
    }

    if (typeof object === 'object') {
      const key = String(index);
      return (object as Record<string, VariableType>)[key];
    }

    if (typeof object === 'string') {
      const idx = this.toNumber(index);
      return object[idx];
    }

    return undefined;
  }

  private evaluateCall(node: CallNode): VariableType {
    // Get the function name
    let fnName: string;
    let thisArg: VariableType = null;

    if (node.callee.type === 'Identifier') {
      fnName = node.callee.name;
    } else if (node.callee.type === 'MemberAccess') {
      fnName = node.callee.property;
      thisArg = this.evaluateNode(node.callee.object);
    } else {
      throw new ExpressionError('Invalid function call', 0);
    }

    const args = node.arguments.map((arg) => this.evaluateNode(arg));

    // Check built-in functions
    const builtin = this.builtinFunctions.get(fnName);
    if (builtin) {
      if (thisArg !== null) {
        return builtin(thisArg, ...args);
      }
      return builtin(...args);
    }

    throw new ExpressionError(`Unknown function: ${fnName}`, 0);
  }

  private toBoolean(value: VariableType): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  private toNumber(value: VariableType): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
  }

  private equals(left: VariableType, right: VariableType): boolean {
    // Handle null/undefined
    if (left === null || left === undefined) {
      return right === null || right === undefined;
    }
    if (right === null || right === undefined) {
      return false;
    }

    // Same type comparison
    if (typeof left === typeof right) {
      if (typeof left === 'object') {
        return JSON.stringify(left) === JSON.stringify(right);
      }
      return left === right;
    }

    // Type coercion for comparison
    if (typeof left === 'number' || typeof right === 'number') {
      return this.toNumber(left) === this.toNumber(right);
    }

    return String(left) === String(right);
  }

  private compare(left: VariableType, right: VariableType): number {
    // Handle null/undefined
    if (left === null || left === undefined) {
      if (right === null || right === undefined) return 0;
      return -1;
    }
    if (right === null || right === undefined) {
      return 1;
    }

    // Number comparison
    if (typeof left === 'number' || typeof right === 'number') {
      const leftNum = this.toNumber(left);
      const rightNum = this.toNumber(right);
      return leftNum - rightNum;
    }

    // String comparison
    const leftStr = String(left);
    const rightStr = String(right);
    return leftStr.localeCompare(rightStr);
  }
}

// ============================================================================
// Convenience Function
// ============================================================================

/**
 * Evaluate an expression with the given context
 */
export function evaluateExpression(
  expression: string,
  context: ExecutionContextInterface
): VariableType {
  const evaluator = new ExpressionEvaluator(context);
  return evaluator.evaluate(expression);
}

/**
 * Evaluate an expression as a boolean
 */
export function evaluateCondition(
  expression: string,
  context: ExecutionContextInterface
): boolean {
  const result = evaluateExpression(expression, context);

  if (result === null || result === undefined) return false;
  if (typeof result === 'boolean') return result;
  if (typeof result === 'number') return result !== 0;
  if (typeof result === 'string') return result !== '';
  if (Array.isArray(result)) return result.length > 0;
  if (typeof result === 'object') return Object.keys(result).length > 0;

  return true;
}
