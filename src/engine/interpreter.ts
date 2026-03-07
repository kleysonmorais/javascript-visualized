import type * as acorn from "acorn";
import type {
  ExecutionStep,
  CallStackFrame,
  MemoryBlock,
  MemoryEntry,
  HeapObject,
  HeapObjectProperty,
  ConsoleEntry,
  WebAPIEntry,
  QueueItem,
  EventLoopState,
  VariableScope,
  VariableKind,
  MemoryValueType,
  ConsoleMethod,
} from "@/types";
import { getFrameColor, getPointerColor } from "@/constants/theme";
import {
  displayValue,
  getValueType,
  extractSource,
  generateObjectLabel,
  generateId,
  deepClone,
  stringifyForConsole,
} from "./utils";

// ESTree node types (extending acorn.Node)
interface BaseNode {
  type: string;
  start: number;
  end: number;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

interface ProgramNode extends BaseNode {
  type: "Program";
  body: StatementNode[];
}

interface VariableDeclarationNode extends BaseNode {
  type: "VariableDeclaration";
  declarations: VariableDeclaratorNode[];
  kind: "var" | "let" | "const";
}

interface VariableDeclaratorNode extends BaseNode {
  type: "VariableDeclarator";
  id: IdentifierNode;
  init: ExpressionNode | null;
}

interface FunctionDeclarationNode extends BaseNode {
  type: "FunctionDeclaration";
  id: IdentifierNode;
  params: PatternNode[];
  body: BlockStatementNode;
}

interface ExpressionStatementNode extends BaseNode {
  type: "ExpressionStatement";
  expression: ExpressionNode;
}

interface IfStatementNode extends BaseNode {
  type: "IfStatement";
  test: ExpressionNode;
  consequent: StatementNode;
  alternate: StatementNode | null;
}

interface ForStatementNode extends BaseNode {
  type: "ForStatement";
  init: VariableDeclarationNode | ExpressionNode | null;
  test: ExpressionNode | null;
  update: ExpressionNode | null;
  body: StatementNode;
}

interface WhileStatementNode extends BaseNode {
  type: "WhileStatement";
  test: ExpressionNode;
  body: StatementNode;
}

interface BlockStatementNode extends BaseNode {
  type: "BlockStatement";
  body: StatementNode[];
}

interface ReturnStatementNode extends BaseNode {
  type: "ReturnStatement";
  argument: ExpressionNode | null;
}

interface CallExpressionNode extends BaseNode {
  type: "CallExpression";
  callee: ExpressionNode;
  arguments: ExpressionNode[];
}

interface MemberExpressionNode extends BaseNode {
  type: "MemberExpression";
  object: ExpressionNode;
  property: ExpressionNode | IdentifierNode;
  computed: boolean;
}

interface AssignmentExpressionNode extends BaseNode {
  type: "AssignmentExpression";
  operator: string;
  left: PatternNode | MemberExpressionNode;
  right: ExpressionNode;
}

interface BinaryExpressionNode extends BaseNode {
  type: "BinaryExpression";
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

interface LogicalExpressionNode extends BaseNode {
  type: "LogicalExpression";
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

interface UnaryExpressionNode extends BaseNode {
  type: "UnaryExpression";
  operator: string;
  prefix: boolean;
  argument: ExpressionNode;
}

interface UpdateExpressionNode extends BaseNode {
  type: "UpdateExpression";
  operator: "++" | "--";
  prefix: boolean;
  argument: IdentifierNode | MemberExpressionNode;
}

interface LiteralNode extends BaseNode {
  type: "Literal";
  value: string | number | boolean | null | RegExp | bigint;
  raw: string;
}

interface IdentifierNode extends BaseNode {
  type: "Identifier";
  name: string;
}

interface ObjectExpressionNode extends BaseNode {
  type: "ObjectExpression";
  properties: PropertyNode[];
}

interface PropertyNode extends BaseNode {
  type: "Property";
  key: IdentifierNode | LiteralNode;
  value: ExpressionNode;
  kind: "init" | "get" | "set";
  computed: boolean;
  shorthand: boolean;
}

interface ArrayExpressionNode extends BaseNode {
  type: "ArrayExpression";
  elements: (ExpressionNode | null)[];
}

interface FunctionExpressionNode extends BaseNode {
  type: "FunctionExpression";
  id: IdentifierNode | null;
  params: PatternNode[];
  body: BlockStatementNode;
}

interface ArrowFunctionExpressionNode extends BaseNode {
  type: "ArrowFunctionExpression";
  params: PatternNode[];
  body: BlockStatementNode | ExpressionNode;
  expression: boolean;
}

interface TemplateLiteralNode extends BaseNode {
  type: "TemplateLiteral";
  quasis: TemplateElementNode[];
  expressions: ExpressionNode[];
}

interface TemplateElementNode extends BaseNode {
  type: "TemplateElement";
  value: { raw: string; cooked: string };
  tail: boolean;
}

interface ConditionalExpressionNode extends BaseNode {
  type: "ConditionalExpression";
  test: ExpressionNode;
  consequent: ExpressionNode;
  alternate: ExpressionNode;
}

type StatementNode =
  | VariableDeclarationNode
  | FunctionDeclarationNode
  | ExpressionStatementNode
  | IfStatementNode
  | ForStatementNode
  | WhileStatementNode
  | BlockStatementNode
  | ReturnStatementNode;

type ExpressionNode =
  | CallExpressionNode
  | MemberExpressionNode
  | AssignmentExpressionNode
  | BinaryExpressionNode
  | LogicalExpressionNode
  | UnaryExpressionNode
  | UpdateExpressionNode
  | LiteralNode
  | IdentifierNode
  | ObjectExpressionNode
  | ArrayExpressionNode
  | FunctionExpressionNode
  | ArrowFunctionExpressionNode
  | TemplateLiteralNode
  | ConditionalExpressionNode;

type PatternNode = IdentifierNode;

// Internal type for function values stored in environment
interface FunctionValue {
  __isFunction: true;
  params: string[];
  body: BlockStatementNode | ExpressionNode;
  isArrow: boolean;
  source: string;
}

// Result of resolving a value
interface ResolvedValue {
  value: unknown;
  displayValue: string;
  valueType: MemoryValueType;
  heapReferenceId?: string;
  pointerColor?: string;
}

const MAX_STEPS = 2000;
const MAX_LOOP_ITERATIONS = 1000;

export class Interpreter {
  private steps: ExecutionStep[] = [];
  private callStack: CallStackFrame[] = [];
  private memoryBlocks: MemoryBlock[] = [];
  private heap: HeapObject[] = [];
  private consoleOutput: ConsoleEntry[] = [];
  private webAPIs: WebAPIEntry[] = [];
  private taskQueue: QueueItem[] = [];
  private microtaskQueue: QueueItem[] = [];
  private eventLoop: EventLoopState = { phase: "idle", description: "Idle" };
  private scopes: VariableScope[] = [];

  // Counters
  private stepIndex: number = 0;
  private frameCounter: number = 0;
  private heapCounter: number = 0;
  private pointerCounter: number = 0;
  private consoleCounter: number = 0;
  private webAPICounter: number = 0;

  // Environment (variable storage for actual execution)
  private globalEnv: Record<string, unknown> = {};
  private envStack: Record<string, unknown>[] = [];

  // Source code for extracting function sources
  private sourceCode: string = "";

  // Return value communication
  private returnValue: unknown = undefined;
  private hasReturned: boolean = false;

  execute(ast: acorn.Node, sourceCode: string): ExecutionStep[] {
    this.sourceCode = sourceCode;

    // Initialize global execution context
    this.pushGlobalFrame();

    // Walk the program body
    this.visitProgram(ast as ProgramNode);

    // Pop global frame
    this.popFrame();

    return this.steps;
  }

  // === Core internal methods ===

  private snapshot(
    line: number,
    column: number,
    description: string,
    code: string,
  ): void {
    if (this.stepIndex >= MAX_STEPS) {
      if (this.stepIndex === MAX_STEPS) {
        this.steps.push({
          index: this.stepIndex,
          line,
          column,
          description: "Execution limit reached (2000 steps)",
          code,
          callStack: deepClone(this.callStack),
          webAPIs: deepClone(this.webAPIs),
          taskQueue: deepClone(this.taskQueue),
          microtaskQueue: deepClone(this.microtaskQueue),
          console: deepClone(this.consoleOutput),
          eventLoop: deepClone(this.eventLoop),
          scopes: deepClone(this.scopes),
          highlightedLine: line,
          memoryBlocks: deepClone(this.memoryBlocks),
          heap: deepClone(this.heap),
        });
      }
      return;
    }

    const step: ExecutionStep = {
      index: this.stepIndex++,
      line,
      column,
      description,
      code,
      callStack: deepClone(this.callStack),
      webAPIs: deepClone(this.webAPIs),
      taskQueue: deepClone(this.taskQueue),
      microtaskQueue: deepClone(this.microtaskQueue),
      console: deepClone(this.consoleOutput),
      eventLoop: deepClone(this.eventLoop),
      scopes: deepClone(this.scopes),
      highlightedLine: line,
      memoryBlocks: deepClone(this.memoryBlocks),
      heap: deepClone(this.heap),
    };

    this.steps.push(step);
  }

  private pushGlobalFrame(): void {
    const frameId = generateId("frame", this.frameCounter);
    const color = getFrameColor(this.frameCounter++);

    const frame: CallStackFrame = {
      id: frameId,
      name: "<global>",
      type: "global",
      line: 1,
      column: 0,
      scope: {
        name: "Global",
        type: "global",
        variables: [],
      },
      color,
    };

    const memoryBlock: MemoryBlock = {
      frameId,
      label: "Global Memory",
      type: "global",
      color,
      entries: [],
    };

    this.callStack.push(frame);
    this.memoryBlocks.push(memoryBlock);
    this.envStack.push(this.globalEnv);

    this.scopes.push({
      name: "Global",
      type: "global",
      variables: [],
    });

    this.eventLoop = {
      phase: "executing-task",
      description: "Executing script",
    };

    this.snapshot(1, 0, "Starting program execution", "");
  }

  private pushFrame(
    name: string,
    line: number,
    column: number,
    params: Array<{ name: string; value: unknown }>,
  ): void {
    const frameId = generateId("frame", this.frameCounter);
    const color = getFrameColor(this.frameCounter++);

    const frame: CallStackFrame = {
      id: frameId,
      name,
      type: "function",
      line,
      column,
      scope: {
        name,
        type: "function",
        variables: params.map((p) => ({
          name: p.name,
          value: p.value,
          kind: "param" as VariableKind,
        })),
        parentScope:
          this.callStack.length > 0
            ? this.callStack[this.callStack.length - 1].name
            : undefined,
      },
      color,
    };

    const entries: MemoryEntry[] = params.map((p) => {
      const resolved = this.resolveValueForMemory(p.value);
      return {
        name: p.name,
        kind: "param" as const,
        valueType: resolved.valueType,
        displayValue: resolved.displayValue,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
      };
    });

    const memoryBlock: MemoryBlock = {
      frameId,
      label: `Local: ${name}`,
      type: "local",
      color,
      entries,
    };

    this.callStack.push(frame);
    this.memoryBlocks.push(memoryBlock);

    // Create new local environment
    const localEnv: Record<string, unknown> = {};
    for (const p of params) {
      localEnv[p.name] = p.value;
    }
    this.envStack.push(localEnv);

    this.scopes.push({
      name,
      type: "function",
      variables: params.map((p) => ({
        name: p.name,
        value: p.value,
        kind: "param" as VariableKind,
      })),
      parentScope:
        this.scopes.length > 0
          ? this.scopes[this.scopes.length - 1].name
          : undefined,
    });
  }

  private popFrame(): void {
    if (this.callStack.length > 0) {
      const frame = this.callStack.pop()!;
      // Remove corresponding memory block
      const blockIndex = this.memoryBlocks.findIndex(
        (b) => b.frameId === frame.id,
      );
      if (blockIndex !== -1) {
        this.memoryBlocks.splice(blockIndex, 1);
      }
      // Pop environment
      this.envStack.pop();
      // Pop scope
      this.scopes.pop();
    }

    // Update event loop state when returning to idle
    if (this.callStack.length === 0) {
      this.eventLoop = { phase: "idle", description: "Idle" };
    }
  }

  private getCurrentFrameId(): string {
    return this.callStack[this.callStack.length - 1]?.id ?? "";
  }

  private getCurrentFrameName(): string {
    return this.callStack[this.callStack.length - 1]?.name ?? "<global>";
  }

  private getCurrentEnv(): Record<string, unknown> {
    return this.envStack[this.envStack.length - 1] ?? this.globalEnv;
  }

  private addMemoryEntry(frameId: string, entry: MemoryEntry): void {
    const block = this.memoryBlocks.find((b) => b.frameId === frameId);
    if (block) {
      block.entries.push(entry);
    }
  }

  private updateMemoryEntry(
    frameId: string,
    name: string,
    updates: Partial<MemoryEntry>,
  ): void {
    const block = this.memoryBlocks.find((b) => b.frameId === frameId);
    if (block) {
      const entry = block.entries.find((e) => e.name === name);
      if (entry) {
        Object.assign(entry, updates);
      }
    }
  }

  private findMemoryEntryFrameId(name: string): string | null {
    // Search from top of stack to bottom (current to global)
    for (let i = this.memoryBlocks.length - 1; i >= 0; i--) {
      const block = this.memoryBlocks[i];
      if (block.entries.some((e) => e.name === name)) {
        return block.frameId;
      }
    }
    return null;
  }

  private addHeapObject(
    type: "object" | "array" | "function",
    label: string,
    properties?: HeapObjectProperty[],
    functionSource?: string,
  ): HeapObject {
    const id = generateId("heap", this.heapCounter++);
    const color = getPointerColor(this.pointerCounter++);

    const heapObj: HeapObject = {
      id,
      type,
      color,
      label,
      properties,
      functionSource,
    };

    this.heap.push(heapObj);
    return heapObj;
  }

  private addConsoleEntry(method: ConsoleMethod, args: string[]): void {
    const entry: ConsoleEntry = {
      id: generateId("console", this.consoleCounter++),
      method,
      args,
      timestamp: this.stepIndex,
    };
    this.consoleOutput.push(entry);
  }

  private addWebAPIEntry(
    type: "setTimeout" | "setInterval",
    callback: string,
    delay: number,
  ): string {
    const id = generateId("webapi", this.webAPICounter++);
    const entry: WebAPIEntry = {
      id,
      type,
      label: type,
      callback,
      delay,
      elapsed: 0,
      status: "running",
    };
    this.webAPIs.push(entry);
    return id;
  }

  private lookupVariable(name: string): unknown {
    // Search from current env to global
    for (let i = this.envStack.length - 1; i >= 0; i--) {
      if (name in this.envStack[i]) {
        return this.envStack[i][name];
      }
    }
    if (name in this.globalEnv) {
      return this.globalEnv[name];
    }
    return undefined;
  }

  private setVariable(
    name: string,
    value: unknown,
    isNewDeclaration: boolean = false,
  ): void {
    if (isNewDeclaration) {
      // Add to current scope
      this.getCurrentEnv()[name] = value;
    } else {
      // Update existing variable (search from current to global)
      for (let i = this.envStack.length - 1; i >= 0; i--) {
        if (name in this.envStack[i]) {
          this.envStack[i][name] = value;
          return;
        }
      }
      // If not found, create in current scope
      this.getCurrentEnv()[name] = value;
    }
  }

  private resolveValueForMemory(value: unknown): ResolvedValue {
    const valueType = getValueType(value);
    const display = displayValue(value);

    if (valueType === "primitive") {
      return {
        value,
        displayValue: display,
        valueType,
      };
    }

    if (valueType === "function") {
      // Check if it's a wrapped function we created
      if (this.isFunctionValue(value)) {
        const heapObj = this.addHeapObject(
          "function",
          "ⓕ",
          undefined,
          value.source,
        );
        return {
          value,
          displayValue: "ⓕ",
          valueType: "function",
          heapReferenceId: heapObj.id,
          pointerColor: heapObj.color,
        };
      }
      return {
        value,
        displayValue: "ⓕ",
        valueType: "function",
      };
    }

    // Object or array
    if (Array.isArray(value)) {
      const properties: HeapObjectProperty[] = value.map((item, index) => {
        const itemResolved = this.resolveValueForMemoryWithoutHeap(item);
        return {
          key: String(index),
          displayValue: itemResolved.displayValue,
          valueType: itemResolved.valueType,
          heapReferenceId: itemResolved.heapReferenceId,
          pointerColor: itemResolved.pointerColor,
        };
      });

      const label = generateObjectLabel(value);
      const heapObj = this.addHeapObject("array", label, properties);

      return {
        value,
        displayValue: "[Pointer]",
        valueType: "object",
        heapReferenceId: heapObj.id,
        pointerColor: heapObj.color,
      };
    }

    if (typeof value === "object" && value !== null) {
      const properties: HeapObjectProperty[] = Object.entries(
        value as Record<string, unknown>,
      ).map(([key, val]) => {
        const propResolved = this.resolveValueForMemoryWithoutHeap(val);
        return {
          key,
          displayValue: propResolved.displayValue,
          valueType: propResolved.valueType,
          heapReferenceId: propResolved.heapReferenceId,
          pointerColor: propResolved.pointerColor,
        };
      });

      const label = generateObjectLabel(value);
      const heapObj = this.addHeapObject("object", label, properties);

      return {
        value,
        displayValue: "[Pointer]",
        valueType: "object",
        heapReferenceId: heapObj.id,
        pointerColor: heapObj.color,
      };
    }

    return {
      value,
      displayValue: display,
      valueType,
    };
  }

  private resolveValueForMemoryWithoutHeap(value: unknown): ResolvedValue {
    const valueType = getValueType(value);
    const display = displayValue(value);

    if (valueType === "primitive") {
      return {
        value,
        displayValue: display,
        valueType,
      };
    }

    // For nested objects, we check if they already exist in the heap
    // For simplicity, just display placeholders
    if (valueType === "function") {
      return {
        value,
        displayValue: "ⓕ",
        valueType: "function",
      };
    }

    if (Array.isArray(value)) {
      return {
        value,
        displayValue: generateObjectLabel(value),
        valueType: "object",
      };
    }

    return {
      value,
      displayValue: generateObjectLabel(value),
      valueType: "object",
    };
  }

  private isFunctionValue(value: unknown): value is FunctionValue {
    return (
      typeof value === "object" &&
      value !== null &&
      "__isFunction" in value &&
      (value as FunctionValue).__isFunction === true
    );
  }

  private getLine(node: BaseNode): number {
    return node.loc?.start.line ?? 1;
  }

  private getColumn(node: BaseNode): number {
    return node.loc?.start.column ?? 0;
  }

  // === AST Visitor Methods ===

  private visitProgram(node: ProgramNode): void {
    for (const stmt of node.body) {
      this.visitStatement(stmt);
      if (this.stepIndex >= MAX_STEPS) break;
    }
  }

  private visitStatement(node: StatementNode | BaseNode): void {
    if (this.stepIndex >= MAX_STEPS) return;

    switch (node.type) {
      case "VariableDeclaration":
        this.visitVariableDeclaration(node as VariableDeclarationNode);
        break;
      case "FunctionDeclaration":
        this.visitFunctionDeclaration(node as FunctionDeclarationNode);
        break;
      case "ExpressionStatement":
        this.visitExpressionStatement(node as ExpressionStatementNode);
        break;
      case "IfStatement":
        this.visitIfStatement(node as IfStatementNode);
        break;
      case "ForStatement":
        this.visitForStatement(node as ForStatementNode);
        break;
      case "WhileStatement":
        this.visitWhileStatement(node as WhileStatementNode);
        break;
      case "BlockStatement":
        this.visitBlockStatement(node as BlockStatementNode);
        break;
      case "ReturnStatement":
        this.visitReturnStatement(node as ReturnStatementNode);
        break;
      default:
        // Unsupported statement - skip gracefully
        console.warn(`Unsupported statement type: ${node.type}`);
    }
  }

  private visitVariableDeclaration(node: VariableDeclarationNode): void {
    const kind = node.kind;

    for (const declarator of node.declarations) {
      const name = declarator.id.name;
      const code = extractSource(this.sourceCode, declarator);
      let value: unknown = undefined;
      let resolved: ResolvedValue;

      if (declarator.init) {
        // Check for function expression or arrow function
        if (
          declarator.init.type === "FunctionExpression" ||
          declarator.init.type === "ArrowFunctionExpression"
        ) {
          const funcNode = declarator.init as
            | FunctionExpressionNode
            | ArrowFunctionExpressionNode;
          const funcValue = this.createFunctionValue(funcNode);
          value = funcValue;

          // Create heap object for function
          const heapObj = this.addHeapObject(
            "function",
            "ⓕ",
            undefined,
            funcValue.source,
          );

          resolved = {
            value: funcValue,
            displayValue: "ⓕ",
            valueType: "function",
            heapReferenceId: heapObj.id,
            pointerColor: heapObj.color,
          };
        } else {
          value = this.evaluateExpression(declarator.init);
          resolved = this.resolveValueForMemory(value);
        }
      } else {
        value = undefined;
        resolved = {
          value: undefined,
          displayValue: "undefined",
          valueType: "primitive",
        };
      }

      // Store in environment
      this.setVariable(name, value, true);

      // Add to current frame's memory
      const entry: MemoryEntry = {
        name,
        kind: kind as VariableKind,
        valueType: resolved.valueType,
        displayValue: resolved.displayValue,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
      };

      this.addMemoryEntry(this.getCurrentFrameId(), entry);

      // Update scope variables
      const currentScope = this.scopes[this.scopes.length - 1];
      if (currentScope) {
        currentScope.variables.push({
          name,
          value,
          kind: kind as VariableKind,
        });
      }

      // Update stack frame scope
      const currentFrame = this.callStack[this.callStack.length - 1];
      if (currentFrame) {
        currentFrame.scope.variables.push({
          name,
          value,
          kind: kind as VariableKind,
        });
      }

      this.snapshot(
        this.getLine(declarator),
        this.getColumn(declarator),
        `Declaring ${kind} ${name} = ${resolved.displayValue}`,
        code,
      );
    }
  }

  private visitFunctionDeclaration(node: FunctionDeclarationNode): void {
    const name = node.id.name;
    const code = extractSource(this.sourceCode, node);

    // Create function value
    const funcValue = this.createFunctionValueFromDeclaration(node);

    // Store in environment
    this.setVariable(name, funcValue, true);

    // Create heap object
    const heapObj = this.addHeapObject(
      "function",
      "ⓕ",
      undefined,
      funcValue.source,
    );

    // Add to current frame's memory
    const entry: MemoryEntry = {
      name,
      kind: "function",
      valueType: "function",
      displayValue: "ⓕ",
      heapReferenceId: heapObj.id,
      pointerColor: heapObj.color,
    };

    this.addMemoryEntry(this.getCurrentFrameId(), entry);

    // Update scope
    const currentScope = this.scopes[this.scopes.length - 1];
    if (currentScope) {
      currentScope.variables.push({
        name,
        value: funcValue,
        kind: "const" as VariableKind,
      });
    }

    // Update stack frame scope
    const currentFrame = this.callStack[this.callStack.length - 1];
    if (currentFrame) {
      currentFrame.scope.variables.push({
        name,
        value: funcValue,
        kind: "const" as VariableKind,
      });
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `Declaring function ${name}`,
      code,
    );
  }

  private visitExpressionStatement(node: ExpressionStatementNode): void {
    this.evaluateExpression(node.expression);
  }

  private visitIfStatement(node: IfStatementNode): void {
    const testResult = this.evaluateExpression(node.test);
    const code = extractSource(this.sourceCode, node.test);

    this.snapshot(
      this.getLine(node.test),
      this.getColumn(node.test),
      `Evaluating if condition: ${displayValue(testResult)}`,
      code,
    );

    if (testResult) {
      this.visitStatement(node.consequent as StatementNode);
    } else if (node.alternate) {
      this.visitStatement(node.alternate as StatementNode);
    }
  }

  private visitForStatement(node: ForStatementNode): void {
    // Visit init
    if (node.init) {
      if (node.init.type === "VariableDeclaration") {
        this.visitVariableDeclaration(node.init as VariableDeclarationNode);
      } else {
        this.evaluateExpression(node.init as ExpressionNode);
      }
    }

    let iteration = 0;

    while (iteration < MAX_LOOP_ITERATIONS && this.stepIndex < MAX_STEPS) {
      // Test condition
      if (node.test) {
        const testResult = this.evaluateExpression(node.test);
        if (!testResult) break;
      }

      iteration++;
      const code = extractSource(this.sourceCode, node);

      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `For loop iteration ${iteration}`,
        code,
      );

      // Execute body
      this.visitStatement(node.body as StatementNode);

      // Check for return
      if (this.hasReturned) break;

      // Update
      if (node.update) {
        this.evaluateExpression(node.update);
      }
    }

    if (iteration >= MAX_LOOP_ITERATIONS) {
      console.warn("For loop iteration limit reached");
    }
  }

  private visitWhileStatement(node: WhileStatementNode): void {
    let iteration = 0;

    while (iteration < MAX_LOOP_ITERATIONS && this.stepIndex < MAX_STEPS) {
      const testResult = this.evaluateExpression(node.test);
      if (!testResult) break;

      iteration++;
      const code = extractSource(this.sourceCode, node);

      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `While loop iteration ${iteration}`,
        code,
      );

      // Execute body
      this.visitStatement(node.body as StatementNode);

      // Check for return
      if (this.hasReturned) break;
    }

    if (iteration >= MAX_LOOP_ITERATIONS) {
      console.warn("While loop iteration limit reached");
    }
  }

  private visitBlockStatement(node: BlockStatementNode): void {
    for (const stmt of node.body) {
      this.visitStatement(stmt);
      if (this.hasReturned || this.stepIndex >= MAX_STEPS) break;
    }
  }

  private visitReturnStatement(node: ReturnStatementNode): void {
    let value: unknown = undefined;

    if (node.argument) {
      value = this.evaluateExpression(node.argument);
    }

    this.returnValue = value;
    this.hasReturned = true;

    const code = extractSource(this.sourceCode, node);
    const funcName = this.getCurrentFrameName();

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `Returning ${displayValue(value)} from ${funcName}`,
      code,
    );
  }

  // === Expression Evaluation ===

  private evaluateExpression(node: ExpressionNode | BaseNode): unknown {
    if (this.stepIndex >= MAX_STEPS) return undefined;

    switch (node.type) {
      case "Literal":
        return this.evaluateLiteral(node as LiteralNode);
      case "Identifier":
        return this.evaluateIdentifier(node as IdentifierNode);
      case "BinaryExpression":
        return this.evaluateBinaryExpression(node as BinaryExpressionNode);
      case "LogicalExpression":
        return this.evaluateLogicalExpression(node as LogicalExpressionNode);
      case "UnaryExpression":
        return this.evaluateUnaryExpression(node as UnaryExpressionNode);
      case "UpdateExpression":
        return this.evaluateUpdateExpression(node as UpdateExpressionNode);
      case "AssignmentExpression":
        return this.evaluateAssignment(node as AssignmentExpressionNode);
      case "CallExpression":
        return this.evaluateCallExpression(node as CallExpressionNode);
      case "MemberExpression":
        return this.evaluateMemberExpression(node as MemberExpressionNode);
      case "ObjectExpression":
        return this.evaluateObjectExpression(node as ObjectExpressionNode);
      case "ArrayExpression":
        return this.evaluateArrayExpression(node as ArrayExpressionNode);
      case "FunctionExpression":
        return this.createFunctionValue(node as FunctionExpressionNode);
      case "ArrowFunctionExpression":
        return this.createFunctionValue(node as ArrowFunctionExpressionNode);
      case "TemplateLiteral":
        return this.evaluateTemplateLiteral(node as TemplateLiteralNode);
      case "ConditionalExpression":
        return this.evaluateConditionalExpression(
          node as ConditionalExpressionNode,
        );
      default:
        console.warn(`Unsupported expression type: ${node.type}`);
        return undefined;
    }
  }

  private evaluateLiteral(node: LiteralNode): unknown {
    return node.value;
  }

  private evaluateIdentifier(node: IdentifierNode): unknown {
    return this.lookupVariable(node.name);
  }

  private evaluateBinaryExpression(node: BinaryExpressionNode): unknown {
    const left = this.evaluateExpression(node.left);
    const right = this.evaluateExpression(node.right);

    switch (node.operator) {
      case "+":
        return (left as number) + (right as number);
      case "-":
        return (left as number) - (right as number);
      case "*":
        return (left as number) * (right as number);
      case "/":
        return (left as number) / (right as number);
      case "%":
        return (left as number) % (right as number);
      case "**":
        return (left as number) ** (right as number);
      case "==":
        return left == right;
      case "!=":
        return left != right;
      case "===":
        return left === right;
      case "!==":
        return left !== right;
      case "<":
        return (left as number) < (right as number);
      case "<=":
        return (left as number) <= (right as number);
      case ">":
        return (left as number) > (right as number);
      case ">=":
        return (left as number) >= (right as number);
      case "&":
        return (left as number) & (right as number);
      case "|":
        return (left as number) | (right as number);
      case "^":
        return (left as number) ^ (right as number);
      case "<<":
        return (left as number) << (right as number);
      case ">>":
        return (left as number) >> (right as number);
      case ">>>":
        return (left as number) >>> (right as number);
      default:
        console.warn(`Unsupported binary operator: ${node.operator}`);
        return undefined;
    }
  }

  private evaluateLogicalExpression(node: LogicalExpressionNode): unknown {
    const left = this.evaluateExpression(node.left);

    switch (node.operator) {
      case "&&":
        return left ? this.evaluateExpression(node.right) : left;
      case "||":
        return left ? left : this.evaluateExpression(node.right);
      case "??":
        return left !== null && left !== undefined
          ? left
          : this.evaluateExpression(node.right);
      default:
        console.warn(`Unsupported logical operator: ${node.operator}`);
        return undefined;
    }
  }

  private evaluateUnaryExpression(node: UnaryExpressionNode): unknown {
    const arg = this.evaluateExpression(node.argument);

    switch (node.operator) {
      case "!":
        return !arg;
      case "-":
        return -(arg as number);
      case "+":
        return +(arg as number);
      case "typeof":
        return typeof arg;
      case "void":
        return undefined;
      default:
        console.warn(`Unsupported unary operator: ${node.operator}`);
        return undefined;
    }
  }

  private evaluateUpdateExpression(node: UpdateExpressionNode): unknown {
    const argNode = node.argument;
    let name: string;
    let currentValue: unknown;

    if (argNode.type === "Identifier") {
      name = argNode.name;
      currentValue = this.lookupVariable(name);
    } else {
      // MemberExpression - simplified handling
      console.warn(
        "Update expression on member expressions not fully supported",
      );
      return undefined;
    }

    const numValue = Number(currentValue);
    let newValue: number;
    let returnValue: number;

    if (node.operator === "++") {
      newValue = numValue + 1;
      returnValue = node.prefix ? newValue : numValue;
    } else {
      newValue = numValue - 1;
      returnValue = node.prefix ? newValue : numValue;
    }

    // Update the variable
    this.setVariable(name, newValue);

    // Update memory entry
    const frameId = this.findMemoryEntryFrameId(name);
    if (frameId) {
      this.updateMemoryEntry(frameId, name, {
        displayValue: displayValue(newValue),
      });
    }

    return returnValue;
  }

  private evaluateAssignment(node: AssignmentExpressionNode): unknown {
    const rightValue = this.evaluateExpression(node.right);
    let name: string;

    if (node.left.type === "Identifier") {
      name = (node.left as IdentifierNode).name;
    } else if (node.left.type === "MemberExpression") {
      // Handle member expression assignment (e.g., obj.prop = value)
      const memberNode = node.left as MemberExpressionNode;
      const obj = this.evaluateExpression(memberNode.object) as Record<
        string,
        unknown
      >;
      let propName: string;

      if (memberNode.computed) {
        propName = String(
          this.evaluateExpression(memberNode.property as ExpressionNode),
        );
      } else {
        propName = (memberNode.property as IdentifierNode).name;
      }

      if (obj && typeof obj === "object") {
        let finalValue = rightValue;

        if (node.operator !== "=") {
          const currentValue = obj[propName];
          finalValue = this.applyAssignmentOperator(
            node.operator,
            currentValue,
            rightValue,
          );
        }

        obj[propName] = finalValue;
      }

      const code = extractSource(this.sourceCode, node);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `Assigning ${memberNode.object.type === "Identifier" ? (memberNode.object as IdentifierNode).name : "object"}.${propName} = ${displayValue(rightValue)}`,
        code,
      );

      return rightValue;
    } else {
      console.warn("Unsupported assignment target");
      return undefined;
    }

    // Get current value for compound assignments
    let finalValue = rightValue;
    if (node.operator !== "=") {
      const currentValue = this.lookupVariable(name);
      finalValue = this.applyAssignmentOperator(
        node.operator,
        currentValue,
        rightValue,
      );
    }

    // Update environment
    this.setVariable(name, finalValue);

    // Update memory entry
    const resolved = this.resolveValueForMemory(finalValue);
    const frameId = this.findMemoryEntryFrameId(name);
    if (frameId) {
      this.updateMemoryEntry(frameId, name, {
        displayValue: resolved.displayValue,
        valueType: resolved.valueType,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
      });
    }

    const code = extractSource(this.sourceCode, node);
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `Assigning ${name} = ${resolved.displayValue}`,
      code,
    );

    return finalValue;
  }

  private applyAssignmentOperator(
    operator: string,
    left: unknown,
    right: unknown,
  ): unknown {
    switch (operator) {
      case "+=":
        return (left as number) + (right as number);
      case "-=":
        return (left as number) - (right as number);
      case "*=":
        return (left as number) * (right as number);
      case "/=":
        return (left as number) / (right as number);
      case "%=":
        return (left as number) % (right as number);
      case "**=":
        return (left as number) ** (right as number);
      case "&=":
        return (left as number) & (right as number);
      case "|=":
        return (left as number) | (right as number);
      case "^=":
        return (left as number) ^ (right as number);
      case "<<=":
        return (left as number) << (right as number);
      case ">>=":
        return (left as number) >> (right as number);
      case ">>>=":
        return (left as number) >>> (right as number);
      default:
        return right;
    }
  }

  private evaluateCallExpression(node: CallExpressionNode): unknown {
    // Check for console.log, console.warn, etc.
    if (
      node.callee.type === "MemberExpression" &&
      (node.callee as MemberExpressionNode).object.type === "Identifier" &&
      ((node.callee as MemberExpressionNode).object as IdentifierNode).name ===
        "console"
    ) {
      return this.handleConsoleCall(node);
    }

    // Check for setTimeout/setInterval
    if (
      node.callee.type === "Identifier" &&
      ["setTimeout", "setInterval"].includes(
        (node.callee as IdentifierNode).name,
      )
    ) {
      return this.handleTimerCall(node);
    }

    // Regular function call
    return this.handleFunctionCall(node);
  }

  private handleConsoleCall(node: CallExpressionNode): void {
    const memberExpr = node.callee as MemberExpressionNode;
    const methodName = (memberExpr.property as IdentifierNode)
      .name as ConsoleMethod;

    // Evaluate arguments
    const args = node.arguments.map((arg) => {
      const val = this.evaluateExpression(arg as ExpressionNode);
      return stringifyForConsole(val);
    });

    // Push console frame
    const code = extractSource(this.sourceCode, node);
    this.pushFrame(
      `console.${methodName}`,
      this.getLine(node),
      this.getColumn(node),
      [],
    );

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `Calling console.${methodName}`,
      code,
    );

    // Add console entry
    this.addConsoleEntry(methodName, args);

    // Pop frame
    this.popFrame();

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `console.${methodName}(${args.join(", ")})`,
      code,
    );
  }

  private handleTimerCall(node: CallExpressionNode): string {
    const timerName = (node.callee as IdentifierNode).name as
      | "setTimeout"
      | "setInterval";
    const code = extractSource(this.sourceCode, node);

    // Get callback and delay
    let callbackSource = "";
    let delay = 0;

    if (node.arguments.length > 0) {
      const callbackNode = node.arguments[0];
      callbackSource = extractSource(this.sourceCode, callbackNode as BaseNode);
    }

    if (node.arguments.length > 1) {
      const delayValue = this.evaluateExpression(
        node.arguments[1] as ExpressionNode,
      );
      delay = Number(delayValue) || 0;
    }

    // Register Web API
    const id = this.addWebAPIEntry(timerName, callbackSource, delay);

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `Calling ${timerName} with ${delay}ms delay`,
      code,
    );

    return id;
  }

  private handleFunctionCall(node: CallExpressionNode): unknown {
    let funcName: string;
    let funcValue: unknown;

    if (node.callee.type === "Identifier") {
      funcName = (node.callee as IdentifierNode).name;
      funcValue = this.lookupVariable(funcName);
    } else if (node.callee.type === "MemberExpression") {
      // Method call - simplified handling
      const memberExpr = node.callee as MemberExpressionNode;
      const propName = (memberExpr.property as IdentifierNode).name;
      funcName = propName;
      const obj = this.evaluateExpression(memberExpr.object) as Record<
        string,
        unknown
      >;
      funcValue = obj?.[propName];
    } else if (
      node.callee.type === "FunctionExpression" ||
      node.callee.type === "ArrowFunctionExpression"
    ) {
      // IIFE - immediately invoked function expression
      funcName = "<anonymous>";
      funcValue = this.createFunctionValue(
        node.callee as FunctionExpressionNode | ArrowFunctionExpressionNode,
      );
    } else {
      console.warn("Unsupported callee type:", node.callee.type);
      return undefined;
    }

    if (!this.isFunctionValue(funcValue)) {
      console.warn(`${funcName} is not a function`);
      return undefined;
    }

    // Evaluate arguments
    const evaluatedArgs = node.arguments.map((arg) =>
      this.evaluateExpression(arg as ExpressionNode),
    );

    // Build params with values
    const params = funcValue.params.map((paramName: string, index: number) => ({
      name: paramName,
      value: evaluatedArgs[index],
    }));

    const code = extractSource(this.sourceCode, node);
    const argsDisplay = evaluatedArgs.map((v) => displayValue(v)).join(", ");

    // Push frame
    this.pushFrame(funcName, this.getLine(node), this.getColumn(node), params);

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `Calling ${funcName}(${argsDisplay})`,
      code,
    );

    // Execute function body
    this.hasReturned = false;
    this.returnValue = undefined;

    if (
      funcValue.isArrow &&
      !("body" in funcValue.body && funcValue.body.type === "BlockStatement")
    ) {
      // Arrow function with expression body
      this.returnValue = this.evaluateExpression(
        funcValue.body as ExpressionNode,
      );
      this.hasReturned = true;
    } else {
      // Block body
      this.visitBlockStatement(funcValue.body as BlockStatementNode);
    }

    const returnVal = this.returnValue;
    this.hasReturned = false;
    this.returnValue = undefined;

    // Pop frame
    this.popFrame();

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `${funcName} returned ${displayValue(returnVal)}`,
      code,
    );

    return returnVal;
  }

  private evaluateMemberExpression(node: MemberExpressionNode): unknown {
    const obj = this.evaluateExpression(node.object) as Record<string, unknown>;

    if (obj === null || obj === undefined) {
      return undefined;
    }

    let propName: string;

    if (node.computed) {
      propName = String(
        this.evaluateExpression(node.property as ExpressionNode),
      );
    } else {
      propName = (node.property as IdentifierNode).name;
    }

    // Handle array length property
    if (Array.isArray(obj) && propName === "length") {
      return obj.length;
    }

    return obj[propName];
  }

  private evaluateObjectExpression(
    node: ObjectExpressionNode,
  ): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    for (const prop of node.properties) {
      let key: string;

      if (prop.key.type === "Identifier") {
        key = prop.key.name;
      } else if (prop.key.type === "Literal") {
        key = String(prop.key.value);
      } else {
        continue;
      }

      const value = this.evaluateExpression(prop.value as ExpressionNode);
      obj[key] = value;
    }

    return obj;
  }

  private evaluateArrayExpression(node: ArrayExpressionNode): unknown[] {
    const arr: unknown[] = [];

    for (const element of node.elements) {
      if (element === null) {
        arr.push(undefined);
      } else {
        arr.push(this.evaluateExpression(element as ExpressionNode));
      }
    }

    return arr;
  }

  private evaluateTemplateLiteral(node: TemplateLiteralNode): string {
    let result = "";

    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.cooked;

      if (i < node.expressions.length) {
        const exprValue = this.evaluateExpression(node.expressions[i]);
        result += String(exprValue);
      }
    }

    return result;
  }

  private evaluateConditionalExpression(
    node: ConditionalExpressionNode,
  ): unknown {
    const test = this.evaluateExpression(node.test);
    return test
      ? this.evaluateExpression(node.consequent)
      : this.evaluateExpression(node.alternate);
  }

  // === Function Creation ===

  private createFunctionValue(
    node: FunctionExpressionNode | ArrowFunctionExpressionNode,
  ): FunctionValue {
    const params = node.params.map((p) => (p as IdentifierNode).name);
    const source = extractSource(this.sourceCode, node);
    const isArrow = node.type === "ArrowFunctionExpression";

    return {
      __isFunction: true,
      params,
      body: node.body as BlockStatementNode | ExpressionNode,
      isArrow,
      source,
    };
  }

  private createFunctionValueFromDeclaration(
    node: FunctionDeclarationNode,
  ): FunctionValue {
    const params = node.params.map((p) => (p as IdentifierNode).name);
    const source = extractSource(this.sourceCode, node);

    return {
      __isFunction: true,
      params,
      body: node.body,
      isArrow: false,
      source,
    };
  }
}
