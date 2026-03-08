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
import type {
  InternalPromise,
  PendingMicrotask,
  PromiseReaction,
} from "./promise";

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
  async?: boolean;
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
  async?: boolean;
}

interface ArrowFunctionExpressionNode extends BaseNode {
  type: "ArrowFunctionExpression";
  params: PatternNode[];
  body: BlockStatementNode | ExpressionNode;
  expression: boolean;
  async?: boolean;
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

interface NewExpressionNode extends BaseNode {
  type: "NewExpression";
  callee: ExpressionNode;
  arguments: ExpressionNode[];
}

interface AwaitExpressionNode extends BaseNode {
  type: "AwaitExpression";
  argument: ExpressionNode;
}

interface TryStatementNode extends BaseNode {
  type: "TryStatement";
  block: BlockStatementNode;
  handler: CatchClauseNode | null;
  finalizer: BlockStatementNode | null;
}

interface CatchClauseNode extends BaseNode {
  type: "CatchClause";
  param: IdentifierNode | null;
  body: BlockStatementNode;
}

interface ThrowStatementNode extends BaseNode {
  type: "ThrowStatement";
  argument: ExpressionNode;
}

type StatementNode =
  | VariableDeclarationNode
  | FunctionDeclarationNode
  | ExpressionStatementNode
  | IfStatementNode
  | ForStatementNode
  | WhileStatementNode
  | BlockStatementNode
  | ReturnStatementNode
  | TryStatementNode
  | ThrowStatementNode;

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
  | ConditionalExpressionNode
  | NewExpressionNode
  | AwaitExpressionNode;

type PatternNode = IdentifierNode;

// Internal type for function values stored in environment
interface FunctionValue {
  __isFunction: true;
  params: string[];
  body: BlockStatementNode | ExpressionNode;
  isArrow: boolean;
  isAsync: boolean;
  source: string;
}

// Thrown error signal — used for try/catch and async rejection propagation
interface ThrownError {
  __isThrownError: true;
  reason: unknown;
}

// Continuation for a suspended async function
interface AsyncContinuation {
  functionName: string;
  frameId: string;
  frameColor: string;
  memoryBlockId: string;
  remainingStatements: StatementNode[];
  localEnv: Record<string, unknown>;
  awaitResultVarName: string | null; // variable to assign the await result to (null = expression stmt)
  returnPromiseId: string;           // the implicit promise the async fn resolves/rejects
  capturedEnvStack: Record<string, unknown>[]; // full env stack snapshot for closures
  isRejection: boolean;              // if true, resume with a thrown error
}

// Runtime value stored in variables when a Promise is created/returned
interface PromiseWrapper {
  __isPromise: true;
  promiseId: string;
}

// Runtime value for built-in resolve/reject functions injected into executor scope
interface BuiltinFn {
  __isBuiltin: true;
  kind: "promise-resolve" | "promise-reject";
  promiseId: string;
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
const MAX_INTERVAL_ITERATIONS = 3;
const MAX_ASYNC_ITERATIONS = 50; // nested timer depth limit
const MAX_MICROTASK_DRAIN = 100; // safety limit per drain cycle

// Internal timer tracking
interface PendingTimer {
  id: string;
  numericId: number; // the number returned to user code (e.g. 1, 2, 3…)
  type: "setTimeout" | "setInterval";
  callbackNode: BaseNode;
  callbackSource: string;
  delay: number;
  registeredAtStep: number;
  cancelled: boolean;
  intervalCount: number;
  processed: boolean; // true once picked up by processAsyncCallbacks
}

// Internal fetch tracking — resolves a promise when delay elapses
interface PendingFetch {
  id: string;
  url: string;
  delay: number;
  promiseId: string; // the pending Promise to resolve when fetch "completes"
  processed: boolean;
}

// Mock Response runtime value
interface FetchResponse {
  __isFetchResponse: true;
  url: string;
  heapObjectId: string; // the Response HeapObject
}

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

  // Async engine state
  private pendingTimers: PendingTimer[] = [];
  private timerIdCounter: number = 1;
  private clearedTimerIds: Set<string> = new Set();

  // Fetch engine state
  private pendingFetches: PendingFetch[] = [];
  private fetchCounter: number = 0;

  // Promise engine state
  private promises: Map<string, InternalPromise> = new Map();
  private promiseCounter: number = 0;
  private pendingMicrotasks: PendingMicrotask[] = [];
  private microtaskCounter: number = 0;
  private reactionCounter: number = 0;

  // Async/await engine state
  private asyncContinuations: Map<string, AsyncContinuation> = new Map();

  // Global memory block kept accessible during async phase for closure support
  private globalMemoryBlock: MemoryBlock | null = null;

  execute(ast: acorn.Node, sourceCode: string): ExecutionStep[] {
    this.sourceCode = sourceCode;

    // Phase 1: Synchronous execution
    this.pushGlobalFrame();
    this.visitProgram(ast as ProgramNode);
    this.popFrame();

    // Re-attach global memory block for async phase so callbacks can
    // read and update global variables in the UI
    if (this.globalMemoryBlock) {
      this.memoryBlocks.push(this.globalMemoryBlock);
      this.envStack.push(this.globalEnv);
    }

    this.eventLoop = {
      phase: "checking-tasks",
      description: "All synchronous code executed — checking for async tasks",
    };
    this.snapshot(
      0,
      0,
      "All synchronous code executed — checking for async tasks",
      "",
    );

    // Phase 2: Process async callbacks (supports nested timers via iteration)
    this.processAsyncCallbacks();

    return this.steps;
  }

  // === Async Phase ===

  private processAsyncCallbacks(): void {
    let iteration = 0;

    // STEP 1: Drain microtasks queued during synchronous execution
    if (this.pendingMicrotasks.length > 0) {
      this.eventLoop = {
        phase: "checking-microtasks",
        description: "Checking Microtask Queue...",
      };
      this.snapshot(
        0,
        0,
        "Checking Microtask Queue after synchronous code",
        "",
      );
      this.drainMicrotaskQueue();
    }

    while (iteration < MAX_ASYNC_ITERATIONS && this.stepIndex < MAX_STEPS) {
      // Process any pending fetches — they resolve Promises (→ microtasks) before timers run
      const unprocessedFetches = this.pendingFetches.filter((f) => !f.processed);
      if (unprocessedFetches.length > 0) {
        this.eventLoop = {
          phase: "checking-tasks",
          description: "fetch() completed — resolving Promise",
        };
        this.processPendingFetches();
        // Drain microtasks that the fetch resolution triggered
        if (this.pendingMicrotasks.length > 0) {
          this.eventLoop = {
            phase: "checking-microtasks",
            description: "fetch resolved — draining Microtask Queue",
          };
          this.snapshot(0, 0, "fetch resolved — checking Microtask Queue", "");
          this.drainMicrotaskQueue();
        }
        iteration++;
        continue;
      }

      // STEP 2: Get the next timer from the Task Queue
      const activeTimers = this.pendingTimers
        .filter((t) => !t.cancelled && !t.processed)
        .sort((a, b) =>
          a.delay !== b.delay
            ? a.delay - b.delay
            : a.registeredAtStep - b.registeredAtStep,
        );

      if (activeTimers.length === 0 && this.pendingMicrotasks.length === 0)
        break;

      // Process microtasks again if any were added during the last iteration
      if (this.pendingMicrotasks.length > 0) {
        this.eventLoop = {
          phase: "checking-microtasks",
          description: "Checking Microtask Queue...",
        };
        this.snapshot(
          0,
          0,
          "Microtasks pending — draining before next task",
          "",
        );
        this.drainMicrotaskQueue();
        continue;
      }

      if (activeTimers.length === 0) break;

      const timer = activeTimers[0];
      if (timer.cancelled || this.stepIndex >= MAX_STEPS) {
        iteration++;
        continue;
      }
      timer.processed = true;
      this.runTimerCallback(timer);

      // STEP 3: After callback execution, drain microtasks before picking next task
      if (this.pendingMicrotasks.length > 0) {
        this.eventLoop = {
          phase: "checking-microtasks",
          description: "Checking Microtask Queue...",
        };
        this.snapshot(0, 0, "Callback done — checking Microtask Queue", "");
        this.drainMicrotaskQueue();
      }

      iteration++;
    }

    // Final microtask drain
    if (this.pendingMicrotasks.length > 0) {
      this.drainMicrotaskQueue();
    }

    // Remove cancelled timers from Web APIs (they were already shown as cancelled)
    const cancelledIds = new Set(
      this.pendingTimers.filter((t) => t.cancelled).map((t) => t.id),
    );
    if (cancelledIds.size > 0) {
      this.webAPIs = this.webAPIs.filter((w) => !cancelledIds.has(w.id));
    }

    const hasAnyTimers = this.pendingTimers.length > 0;
    const hadMicrotasks =
      this.microtaskQueue.length > 0 || this.pendingMicrotasks.length > 0;
    if (hasAnyTimers || hadMicrotasks) {
      this.eventLoop = { phase: "idle", description: "All tasks completed" };
      this.snapshot(0, 0, "Execution complete — all tasks processed", "");
    }
  }

  private drainMicrotaskQueue(): void {
    let drainCount = 0;

    while (
      this.pendingMicrotasks.length > 0 &&
      drainCount < MAX_MICROTASK_DRAIN &&
      this.stepIndex < MAX_STEPS
    ) {
      const microtask = this.pendingMicrotasks.shift()!;

      // Update Event Loop phase
      this.eventLoop = {
        phase: "draining-microtasks",
        description:
          "Event Loop: draining Microtask Queue (priority over Task Queue)",
      };

      // Remove from visualization queue
      this.microtaskQueue = this.microtaskQueue.filter(
        (q) => q.id !== microtask.id,
      );

      // Execute the microtask
      this.executeMicrotask(microtask);

      this.eventLoop = {
        phase: "checking-microtasks",
        description: "Checking for more microtasks...",
      };

      drainCount++;
    }

    if (drainCount >= MAX_MICROTASK_DRAIN) {
      console.warn("Microtask drain limit reached (possible infinite loop)");
    }
  }

  private runTimerCallback(timer: PendingTimer): void {
    // Step 1: Timer completes in Web APIs
    const webAPI = this.webAPIs.find((w) => w.id === timer.id);
    if (webAPI) {
      webAPI.elapsed = timer.delay;
      webAPI.status = "completed";
    }
    this.eventLoop = {
      phase: "checking-tasks",
      description: "Timer completed — checking Task Queue",
    };
    this.snapshot(
      0,
      0,
      `${timer.delay}ms timer completed — callback ready`,
      "",
    );

    // Step 2: Move callback to Task Queue
    const taskItem: QueueItem = {
      id: `task-${timer.id}`,
      callbackLabel:
        timer.callbackSource.length > 30
          ? timer.callbackSource.slice(0, 30) + "..."
          : timer.callbackSource,
      sourceType: timer.type,
      sourceId: timer.id,
    };
    this.taskQueue.push(taskItem);
    this.snapshot(0, 0, "Callback moved from Web APIs to Task Queue", "");

    // Step 3: Event Loop picks task
    this.taskQueue = this.taskQueue.filter((q) => q.id !== taskItem.id);
    // Keep cancelled timer visible for one step, then remove running/completed
    this.webAPIs = this.webAPIs.filter((w) => w.id !== timer.id);
    this.eventLoop = {
      phase: "picking-task",
      description: "Moving callback from Task Queue to Call Stack",
    };
    this.snapshot(
      0,
      0,
      "Event Loop: Call Stack is empty → picking task from Task Queue",
      "",
    );

    // Step 4: Execute the callback body
    const callbackNode = timer.callbackNode as
      | FunctionExpressionNode
      | ArrowFunctionExpressionNode;

    const iterationLabel =
      timer.type === "setInterval"
        ? ` (iteration ${timer.intervalCount + 1})`
        : "";
    const execDescription = `Executing ${timer.type} callback${iterationLabel}`;

    this.pushFrame(
      "callback",
      callbackNode.loc?.start.line ?? 0,
      callbackNode.loc?.start.column ?? 0,
      [],
    );
    this.eventLoop = {
      phase: "executing-task",
      description: "Executing callback",
    };
    this.snapshot(0, 0, execDescription, timer.callbackSource);

    this.hasReturned = false;
    this.returnValue = undefined;

    if (
      callbackNode.type === "ArrowFunctionExpression" &&
      callbackNode.expression
    ) {
      this.evaluateExpression(callbackNode.body as ExpressionNode);
    } else {
      this.visitBlockStatement(callbackNode.body as BlockStatementNode);
    }

    this.hasReturned = false;
    this.returnValue = undefined;

    this.popFrame();
    this.eventLoop = {
      phase: "checking-tasks",
      description: "Callback done — checking for more tasks",
    };
    this.snapshot(0, 0, "Callback execution completed — Call Stack empty", "");

    // Step 5: For setInterval, re-register if under iteration limit
    if (timer.type === "setInterval" && !timer.cancelled) {
      const nextCount = timer.intervalCount + 1;
      if (nextCount < MAX_INTERVAL_ITERATIONS) {
        const newWebApiId = generateId("webapi", this.webAPICounter++);
        const newTimer: PendingTimer = {
          ...timer,
          id: newWebApiId,
          registeredAtStep: this.stepIndex,
          intervalCount: nextCount,
          processed: false,
          cancelled: false,
        };
        this.pendingTimers.push(newTimer);
        this.webAPIs.push({
          id: newWebApiId,
          type: "setInterval",
          label: "setInterval",
          callback: timer.callbackSource,
          delay: timer.delay,
          elapsed: 0,
          status: "running",
        });
        this.snapshot(
          0,
          0,
          `setInterval(callback, ${timer.delay}ms) — interval registered in Web APIs`,
          "",
        );
      } else {
        this.snapshot(0, 0, "setInterval iteration limit reached (3 max)", "");
      }
    }
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

    this.globalMemoryBlock = memoryBlock;

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
      description: "Executing synchronous code",
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
    // Note: caller is responsible for setting eventLoop phase after popFrame
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
      // Update existing variable (search from current env down to global)
      for (let i = this.envStack.length - 1; i >= 0; i--) {
        if (name in this.envStack[i]) {
          this.envStack[i][name] = value;
          return;
        }
      }
      // Also check globalEnv directly (covers async phase where global
      // may not be in envStack yet)
      if (name in this.globalEnv) {
        this.globalEnv[name] = value;
        return;
      }
      // If not found anywhere, create in current scope
      this.getCurrentEnv()[name] = value;
    }
  }

  private resolveValueForMemory(value: unknown): ResolvedValue {
    const valueType = getValueType(value);
    const display = displayValue(value);

    // Handle Promise wrappers — link to existing heap object
    if (this.isPromiseWrapper(value)) {
      const promiseId = (value as PromiseWrapper).promiseId;
      const internalPromise = this.promises.get(promiseId);
      if (internalPromise) {
        const heapObj = this.heap.find(
          (h) => h.id === internalPromise.heapObjectId,
        );
        if (heapObj) {
          return {
            value,
            displayValue: "[Pointer]",
            valueType: "object",
            heapReferenceId: heapObj.id,
            pointerColor: heapObj.color,
          };
        }
      }
    }

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

  private isBuiltinFn(value: unknown): value is BuiltinFn {
    return (
      typeof value === "object" &&
      value !== null &&
      "__isBuiltin" in value &&
      (value as BuiltinFn).__isBuiltin === true
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
      case "TryStatement":
        this.visitTryStatement(node as TryStatementNode);
        break;
      case "ThrowStatement":
        this.visitThrowStatement(node as ThrowStatementNode);
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

    const asyncPrefix = node.async ? "async " : "";
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `Declaring ${asyncPrefix}function ${name}`,
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
      case "NewExpression":
        return this.evaluateNewExpression(node as NewExpressionNode);
      case "AwaitExpression":
        // Reached only when await is evaluated outside visitAsyncFunctionBody
        // (e.g. nested inside a non-await-split expression). Evaluate the argument.
        return this.evaluateExpression((node as AwaitExpressionNode).argument);
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

    // Check for clearTimeout/clearInterval
    if (
      node.callee.type === "Identifier" &&
      ["clearTimeout", "clearInterval"].includes(
        (node.callee as IdentifierNode).name,
      )
    ) {
      return this.handleClearTimerCall(node);
    }

    // Check for fetch(url)
    if (
      node.callee.type === "Identifier" &&
      (node.callee as IdentifierNode).name === "fetch"
    ) {
      return this.handleFetchCall(node);
    }

    // Check for Promise.resolve / Promise.reject / Promise.all / Promise.race
    if (
      node.callee.type === "MemberExpression" &&
      (node.callee as MemberExpressionNode).object.type === "Identifier" &&
      ((node.callee as MemberExpressionNode).object as IdentifierNode).name ===
        "Promise"
    ) {
      return this.handlePromiseStaticCall(node);
    }

    // Check for promise.then() / promise.catch() / promise.finally()
    if (node.callee.type === "MemberExpression") {
      const memberCallee = node.callee as MemberExpressionNode;
      const propName = (memberCallee.property as IdentifierNode).name;
      if (["then", "catch", "finally"].includes(propName)) {
        // Check if the object resolves to a promise wrapper
        const objValue = this.evaluateExpression(memberCallee.object);
        if (this.isPromiseWrapper(objValue)) {
          return this.handlePromiseChainCall(
            objValue as PromiseWrapper,
            propName,
            node,
          );
        }
      }

      // Handle response.json() on a FetchResponse runtime value
      if (propName === "json") {
        const objValue = this.evaluateExpression(memberCallee.object);
        if (
          typeof objValue === "object" &&
          objValue !== null &&
          "__isFetchResponse" in (objValue as Record<string, unknown>)
        ) {
          return this.handleResponseJsonCall(
            objValue as FetchResponse,
            node,
          );
        }
      }

      // Handle native array methods
      const arrayMethods = [
        "join",
        "push",
        "pop",
        "shift",
        "unshift",
        "slice",
        "splice",
        "concat",
        "indexOf",
        "includes",
        "reverse",
        "sort",
        "map",
        "filter",
        "reduce",
        "forEach",
        "find",
        "findIndex",
        "some",
        "every",
        "flat",
        "flatMap",
        "fill",
        "copyWithin",
        "entries",
        "keys",
        "values",
        "toString",
        "toLocaleString",
      ];
      if (arrayMethods.includes(propName)) {
        const objValue = this.evaluateExpression(memberCallee.object);
        if (Array.isArray(objValue)) {
          return this.handleArrayMethodCall(objValue, propName, node);
        }
      }

      // Handle String methods
      const stringMethods = [
        "charAt",
        "charCodeAt",
        "concat",
        "includes",
        "endsWith",
        "indexOf",
        "lastIndexOf",
        "match",
        "padEnd",
        "padStart",
        "repeat",
        "replace",
        "replaceAll",
        "search",
        "slice",
        "split",
        "startsWith",
        "substring",
        "toLowerCase",
        "toUpperCase",
        "trim",
        "trimEnd",
        "trimStart",
        "toString",
      ];
      if (stringMethods.includes(propName)) {
        const objValue = this.evaluateExpression(memberCallee.object);
        if (typeof objValue === "string") {
          return this.handleStringMethodCall(objValue, propName, node);
        }
      }
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

  private handleTimerCall(node: CallExpressionNode): number {
    const timerName = (node.callee as IdentifierNode).name as
      | "setTimeout"
      | "setInterval";
    const code = extractSource(this.sourceCode, node);

    // Validate first argument is a function/arrow function
    if (
      node.arguments.length === 0 ||
      (node.arguments[0].type !== "FunctionExpression" &&
        node.arguments[0].type !== "ArrowFunctionExpression" &&
        node.arguments[0].type !== "Identifier")
    ) {
      const numId = this.timerIdCounter++;
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `${timerName}: callback is not a function — skipped`,
        code,
      );
      return numId;
    }

    // Resolve callback node (may be identifier pointing to a variable)
    const callbackNode: BaseNode = node.arguments[0] as BaseNode;
    const callbackSource = extractSource(this.sourceCode, callbackNode);

    // If it's an identifier, look up the function value but we can't get the AST node back;
    // for now we only support inline function/arrow expressions
    if (callbackNode.type === "Identifier") {
      const numId = this.timerIdCounter++;
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `${timerName}: callback is not a function — skipped`,
        code,
      );
      return numId;
    }

    // Get delay (default 0)
    let delay = 0;
    if (node.arguments.length > 1) {
      const delayValue = this.evaluateExpression(
        node.arguments[1] as ExpressionNode,
      );
      delay = Number(delayValue) || 0;
    }

    // Assign numeric ID (returned to user code)
    const numericId = this.timerIdCounter++;

    // Register Web API entry
    const webApiId = this.addWebAPIEntry(timerName, callbackSource, delay);

    // Register pending timer for Phase 2
    const timer: PendingTimer = {
      id: webApiId,
      numericId,
      type: timerName,
      callbackNode,
      callbackSource,
      delay,
      registeredAtStep: this.stepIndex,
      cancelled: false,
      intervalCount: 0,
      processed: false,
    };
    this.pendingTimers.push(timer);

    const descDelay = `${delay}ms`;
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `${timerName}(callback, ${descDelay}) — timer registered in Web APIs`,
      code,
    );

    return numericId;
  }

  private handleClearTimerCall(node: CallExpressionNode): void {
    const code = extractSource(this.sourceCode, node);
    const calleeName = (node.callee as IdentifierNode).name;

    if (node.arguments.length > 0) {
      const idValue = this.evaluateExpression(
        node.arguments[0] as ExpressionNode,
      );
      const numericId = Number(idValue);

      // Find the timer by its numericId — find the most recent one that isn't cancelled
      // This handles both pending timers and currently-executing timers (for setInterval)
      const timer = this.pendingTimers
        .filter((t) => t.numericId === numericId && !t.cancelled)
        .pop(); // Get the last (most recently added) one
      if (timer) {
        timer.cancelled = true;
        this.clearedTimerIds.add(timer.id);
        // Update WebAPI entry to show cancelled state
        const webAPI = this.webAPIs.find((w) => w.id === timer.id);
        if (webAPI) {
          webAPI.status = "cancelled";
        }
        this.snapshot(
          this.getLine(node),
          this.getColumn(node),
          `${calleeName}(${numericId}) — timer cancelled`,
          code,
        );
        return;
      }
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `${calleeName} called`,
      code,
    );
  }

  // === Fetch Simulation ===

  private handleFetchCall(node: CallExpressionNode): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);

    // Evaluate the URL argument
    const urlArg = node.arguments.length > 0
      ? this.evaluateExpression(node.arguments[0] as ExpressionNode)
      : "https://api.example.com/data";
    const url = String(urlArg);

    // 1. Create a pending Promise for the fetch result
    const { promise: fetchPromise, wrapper } = this.createInternalPromise();

    // 2. Register in Web APIs
    const fetchId = generateId("webapi", this.webAPICounter++);
    const delay = 1500; // simulated network delay

    const entry: WebAPIEntry = {
      id: fetchId,
      type: "fetch",
      label: "fetch",
      callback: url,
      delay,
      elapsed: 0,
      status: "running",
      promiseState: "pending",
    };
    this.webAPIs.push(entry);

    // 3. Register pending fetch
    const pendingFetch: PendingFetch = {
      id: fetchId,
      url,
      delay,
      promiseId: fetchPromise.id,
      processed: false,
    };
    this.pendingFetches.push(pendingFetch);

    // 4. Snapshot
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `fetch("${url}") — network request registered in Web APIs`,
      code,
    );

    return wrapper;
  }

  private handleResponseJsonCall(
    _response: FetchResponse,
    node: CallExpressionNode,
  ): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);

    // Create mock parsed data HeapObject
    const dataHeapId = generateId("heap", this.heapCounter++);
    const dataColor = getPointerColor(this.pointerCounter++);
    const dataHeapObj: HeapObject = {
      id: dataHeapId,
      type: "object",
      color: dataColor,
      label: '{ message: "Mock data" }',
      properties: [
        {
          key: "message",
          displayValue: '"Mock data from fetch"',
          valueType: "primitive",
        },
        {
          key: "status",
          displayValue: '"success"',
          valueType: "primitive",
        },
      ],
    };
    this.heap.push(dataHeapObj);

    // Create a resolved Promise with the data object
    const { promise: jsonPromise, wrapper } = this.createInternalPromise();

    // The runtime value for data — a plain object with the heap link
    const dataValue: Record<string, unknown> & { __heapId: string } = {
      __heapId: dataHeapId,
      message: "Mock data from fetch",
      status: "success",
    };

    this.resolvePromise(jsonPromise, dataValue);

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `response.json() — parsing response body`,
      code,
    );

    return wrapper;
  }

  private processPendingFetches(): void {
    const unprocessed = this.pendingFetches.filter((f) => !f.processed);
    for (const fetch of unprocessed) {
      fetch.processed = true;

      // Update Web API entry — show fetch completing
      const webAPI = this.webAPIs.find((w) => w.id === fetch.id);
      if (webAPI) {
        webAPI.elapsed = fetch.delay;
        webAPI.status = "completed";
        webAPI.promiseState = "fulfilled";
      }

      this.snapshot(
        0,
        0,
        `fetch completed — Response received (status 200)`,
        "",
      );

      // Create mock Response HeapObject
      const responseHeapId = generateId("heap", this.heapCounter++);
      const responseColor = getPointerColor(this.pointerCounter++);

      // Create a placeholder heap entry for the json() function
      const jsonFnHeapId = generateId("heap", this.heapCounter++);
      this.heap.push({
        id: jsonFnHeapId,
        type: "function",
        color: getPointerColor(this.pointerCounter++),
        label: "json()",
        functionSource: "json()",
      });

      const responseHeapObj: HeapObject = {
        id: responseHeapId,
        type: "object",
        color: responseColor,
        label: "Response",
        properties: [
          {
            key: "status",
            displayValue: "200",
            valueType: "primitive",
          },
          {
            key: "ok",
            displayValue: "true",
            valueType: "primitive",
          },
          {
            key: "url",
            displayValue: `"${fetch.url}"`,
            valueType: "primitive",
          },
          {
            key: "json",
            displayValue: "ⓕ",
            valueType: "function",
            heapReferenceId: jsonFnHeapId,
            pointerColor: getPointerColor(this.pointerCounter - 1),
          },
        ],
      };
      this.heap.push(responseHeapObj);

      // The runtime Response value — interpreter recognises __isFetchResponse
      const responseValue: FetchResponse = {
        __isFetchResponse: true,
        url: fetch.url,
        heapObjectId: responseHeapId,
      };

      // Resolve the fetch promise with the Response
      const fetchPromise = this.promises.get(fetch.promiseId);
      if (fetchPromise) {
        this.resolvePromise(fetchPromise, responseValue);
      }

      // Remove the Web API entry from display after completion
      this.webAPIs = this.webAPIs.filter((w) => w.id !== fetch.id);
    }
  }

  // Handle native array method calls
  private handleArrayMethodCall(
    arr: unknown[],
    method: string,
    node: CallExpressionNode,
  ): unknown {
    const args = node.arguments.map((arg) =>
      this.evaluateExpression(arg as ExpressionNode),
    );

    // Type-safe method invocation
    type ArrayMethod = keyof unknown[];
    const fn = (arr as unknown[])[method as ArrayMethod];
    if (typeof fn === "function") {
      return fn.apply(arr, args);
    }
    return undefined;
  }

  // Handle native string method calls
  private handleStringMethodCall(
    str: string,
    method: string,
    node: CallExpressionNode,
  ): unknown {
    const args = node.arguments.map((arg) =>
      this.evaluateExpression(arg as ExpressionNode),
    );

    // Type-safe method invocation
    type StringMethod = keyof string;
    const fn = (str as string)[method as StringMethod];
    if (typeof fn === "function") {
      return (fn as (...args: unknown[]) => unknown).apply(str, args);
    }
    return undefined;
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

    // Handle builtin resolve/reject calls
    if (this.isBuiltinFn(funcValue)) {
      return this.handleBuiltinCall(node, funcValue);
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

    // Route async functions to the async engine
    if (funcValue.isAsync) {
      return this.callAsyncFunction(funcValue, funcName, params, node);
    }

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

  // === Promise Engine ===

  // PromiseWrapper is the runtime value stored in variables / returned to user code.
  // It carries the internal promise id so chaining and reactions can look it up.
  private makePromiseWrapper(promiseId: string): PromiseWrapper {
    return { __isPromise: true, promiseId };
  }

  private isPromiseWrapper(value: unknown): value is PromiseWrapper {
    return (
      typeof value === "object" &&
      value !== null &&
      "__isPromise" in value &&
      (value as PromiseWrapper).__isPromise === true
    );
  }

  // Create a new InternalPromise + matching HeapObject, return the wrapper.
  private createInternalPromise(): {
    promise: InternalPromise;
    wrapper: PromiseWrapper;
  } {
    const id = `promise-${this.promiseCounter++}`;
    const heapId = generateId("heap", this.heapCounter++);
    const color = getPointerColor(this.pointerCounter++);

    const heapObj: HeapObject = {
      id: heapId,
      type: "object",
      color,
      label: "Promise",
      properties: [
        {
          key: "[[PromiseState]]",
          displayValue: '"pending"',
          valueType: "primitive",
        },
        {
          key: "[[PromiseResult]]",
          displayValue: "undefined",
          valueType: "primitive",
        },
        {
          key: "[[PromiseFulfillReactions]]",
          displayValue: "[]",
          valueType: "primitive",
        },
      ],
    };
    this.heap.push(heapObj);

    const promise: InternalPromise = {
      id,
      heapObjectId: heapId,
      state: "pending",
      result: undefined,
      fulfillReactions: [],
      rejectReactions: [],
    };
    this.promises.set(id, promise);

    return { promise, wrapper: this.makePromiseWrapper(id) };
  }

  // Update the HeapObject to reflect the promise's current state.
  private syncPromiseHeap(promise: InternalPromise): void {
    const heapObj = this.heap.find((h) => h.id === promise.heapObjectId);
    if (!heapObj) return;

    const reactionLabels = promise.fulfillReactions
      .map((r) => r.callbackSource.slice(0, 25))
      .join(", ");

    heapObj.properties = [
      {
        key: "[[PromiseState]]",
        displayValue: `"${promise.state}"`,
        valueType: "primitive",
      },
      {
        key: "[[PromiseResult]]",
        displayValue:
          promise.state === "pending"
            ? "undefined"
            : displayValue(promise.result),
        valueType: "primitive",
      },
      {
        key: "[[PromiseFulfillReactions]]",
        displayValue:
          promise.fulfillReactions.length === 0 ? "[]" : `[${reactionLabels}]`,
        valueType: "primitive",
      },
    ];
  }

  // Settle a promise (fulfill or reject) and schedule reactions as microtasks.
  private resolvePromise(promise: InternalPromise, value: unknown): void {
    if (promise.state !== "pending") return; // already settled

    // If resolved with another promise wrapper, adopt its state (simplified: use value directly)
    promise.state = "fulfilled";
    promise.result = value;
    this.syncPromiseHeap(promise);

    for (const reaction of promise.fulfillReactions) {
      this.scheduleMicrotask(reaction, value);
    }
    promise.fulfillReactions = [];
    promise.rejectReactions = [];
  }

  private rejectPromise(promise: InternalPromise, reason: unknown): void {
    if (promise.state !== "pending") return;

    promise.state = "rejected";
    promise.result = reason;
    this.syncPromiseHeap(promise);

    for (const reaction of promise.rejectReactions) {
      this.scheduleMicrotask(reaction, reason);
    }
    promise.fulfillReactions = [];
    promise.rejectReactions = [];
  }

  private scheduleMicrotask(reaction: PromiseReaction, value: unknown): void {
    // Check if this reaction is an async-resume marker
    const asyncResumeId = (reaction as unknown as Record<string, unknown>)["__asyncResumeId"] as string | undefined;
    if (asyncResumeId) {
      const isRejection = !!(reaction as unknown as Record<string, unknown>)["__isRejection"];
      const continuation = this.asyncContinuations.get(asyncResumeId);
      if (continuation) {
        continuation.isRejection = isRejection;
      }
      const microtask: PendingMicrotask = {
        id: asyncResumeId,
        callbackNode: null as unknown,
        callbackSource: reaction.callbackSource,
        sourcePromiseId: reaction.id,
        resolveValue: value,
        capturedEnvStack: this.envStack.map((env) => ({ ...env })),
      };
      this.pendingMicrotasks.push(microtask);
      // Add to visualization queue if not already present
      if (!this.microtaskQueue.some((q) => q.id === asyncResumeId)) {
        this.microtaskQueue.push({
          id: asyncResumeId,
          callbackLabel: reaction.callbackSource,
          sourceType: "promise",
          sourceId: reaction.id,
        });
      }
      return;
    }

    const microtaskId = `microtask-${this.microtaskCounter++}`;

    const microtask: PendingMicrotask = {
      id: microtaskId,
      callbackNode: reaction.callbackNode,
      callbackSource: reaction.callbackSource,
      sourcePromiseId: reaction.id,
      resolveValue: value,
      resultPromiseId: reaction.resultPromiseId,
      capturedEnvStack: this.envStack.map((env) => ({ ...env })),
      preserveValue: reaction.preserveValue,
    };
    this.pendingMicrotasks.push(microtask);

    // Show in microtask queue panel
    const queueItem: QueueItem = {
      id: microtaskId,
      callbackLabel:
        reaction.callbackSource.length > 35
          ? reaction.callbackSource.slice(0, 35) + "..."
          : reaction.callbackSource,
      sourceType: "promise",
      sourceId: reaction.id,
    };
    this.microtaskQueue.push(queueItem);
  }

  // Handle new Promise(executor)
  private evaluateNewExpression(node: NewExpressionNode): unknown {
    const callee = node.callee;
    if (
      callee.type === "Identifier" &&
      (callee as IdentifierNode).name === "Promise"
    ) {
      return this.handleNewPromise(node);
    }

    // Fallback: try to call as a regular constructor (unsupported — return undefined)
    const code = extractSource(this.sourceCode, node);
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `new ${callee.type === "Identifier" ? (callee as IdentifierNode).name : "?"} (not supported)`,
      code,
    );
    return undefined;
  }

  private handleNewPromise(node: NewExpressionNode): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);
    const { promise, wrapper } = this.createInternalPromise();

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `new Promise() — executor will run immediately`,
      code,
    );

    // Executor must be a function/arrow expression (first arg)
    if (node.arguments.length === 0) return wrapper;

    const executorArg = node.arguments[0] as ExpressionNode;
    const executorNode =
      executorArg.type === "FunctionExpression" ||
      executorArg.type === "ArrowFunctionExpression"
        ? (executorArg as FunctionExpressionNode | ArrowFunctionExpressionNode)
        : null;

    if (!executorNode) {
      // Executor from variable — unsupported inline; skip
      return wrapper;
    }

    const executorSource = extractSource(this.sourceCode, executorNode);

    // Build special resolve/reject functions stored in env
    const resolveFn: BuiltinFn = {
      __isBuiltin: true,
      kind: "promise-resolve",
      promiseId: promise.id,
    };
    const rejectFn: BuiltinFn = {
      __isBuiltin: true,
      kind: "promise-reject",
      promiseId: promise.id,
    };

    const executorParams = executorNode.params.map(
      (p) => (p as IdentifierNode).name,
    );
    const resolveParamName = executorParams[0] ?? "resolve";
    const rejectParamName = executorParams[1] ?? "reject";

    // Push executor frame with resolve + reject as params
    this.pushFrame(
      "Promise executor",
      this.getLine(executorNode),
      this.getColumn(executorNode),
      [
        { name: resolveParamName, value: resolveFn },
        { name: rejectParamName, value: rejectFn },
      ],
    );

    this.snapshot(
      this.getLine(executorNode),
      this.getColumn(executorNode),
      "Executing Promise executor — runs synchronously",
      executorSource,
    );

    this.hasReturned = false;
    this.returnValue = undefined;

    if (
      executorNode.type === "ArrowFunctionExpression" &&
      (executorNode as ArrowFunctionExpressionNode).expression
    ) {
      this.evaluateExpression(
        (executorNode as ArrowFunctionExpressionNode).body as ExpressionNode,
      );
    } else {
      this.visitBlockStatement(executorNode.body as BlockStatementNode);
    }

    this.hasReturned = false;
    this.returnValue = undefined;

    this.popFrame();

    this.syncPromiseHeap(promise);
    return wrapper;
  }

  // Handle Promise.resolve(v), Promise.reject(r), Promise.all([...]), Promise.race([...])
  private handlePromiseStaticCall(
    node: CallExpressionNode,
  ): PromiseWrapper | unknown {
    const memberExpr = node.callee as MemberExpressionNode;
    const methodName = (memberExpr.property as IdentifierNode).name;
    const code = extractSource(this.sourceCode, node);

    if (methodName === "resolve") {
      const value =
        node.arguments.length > 0
          ? this.evaluateExpression(node.arguments[0] as ExpressionNode)
          : undefined;

      const { promise, wrapper } = this.createInternalPromise();
      this.resolvePromise(promise, value);

      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `Promise.resolve(${displayValue(value)}) — creates fulfilled Promise`,
        code,
      );
      return wrapper;
    }

    if (methodName === "reject") {
      const reason =
        node.arguments.length > 0
          ? this.evaluateExpression(node.arguments[0] as ExpressionNode)
          : undefined;

      const { promise, wrapper } = this.createInternalPromise();
      this.rejectPromise(promise, reason);

      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `Promise.reject(${displayValue(reason)}) — creates rejected Promise`,
        code,
      );
      return wrapper;
    }

    if (methodName === "all") {
      return this.handlePromiseAll(node, false);
    }

    if (methodName === "race") {
      return this.handlePromiseRace(node);
    }

    if (methodName === "allSettled") {
      return this.handlePromiseAll(node, true);
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `Promise.${methodName} (not supported)`,
      code,
    );
    return undefined;
  }

  private handlePromiseAll(
    node: CallExpressionNode,
    settled: boolean,
  ): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);
    const { promise: resultPromise, wrapper } = this.createInternalPromise();

    const label = settled ? "Promise.allSettled" : "Promise.all";

    if (node.arguments.length === 0) {
      this.resolvePromise(resultPromise, []);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `${label}([]) — resolved with []`,
        code,
      );
      return wrapper;
    }

    const iterableArg = this.evaluateExpression(
      node.arguments[0] as ExpressionNode,
    );
    if (!Array.isArray(iterableArg)) {
      this.resolvePromise(resultPromise, []);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `${label}: argument not iterable`,
        code,
      );
      return wrapper;
    }

    const values: unknown[] = [];
    let hasRejected = false;

    for (const item of iterableArg) {
      if (this.isPromiseWrapper(item)) {
        const p = this.promises.get((item as PromiseWrapper).promiseId);
        if (p) {
          if (p.state === "fulfilled") {
            values.push(
              settled ? { status: "fulfilled", value: p.result } : p.result,
            );
          } else if (p.state === "rejected") {
            if (!settled) {
              hasRejected = true;
              this.rejectPromise(resultPromise, p.result);
              break;
            } else {
              values.push({ status: "rejected", reason: p.result });
            }
          } else {
            // pending — treat as undefined for simplicity
            values.push(settled ? { status: "pending" } : undefined);
          }
        }
      } else {
        values.push(settled ? { status: "fulfilled", value: item } : item);
      }
    }

    if (!hasRejected) {
      this.resolvePromise(resultPromise, values);
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `${label}([${iterableArg.length} promises]) — ${hasRejected ? "rejected" : `resolved with [${values.length} values]`}`,
      code,
    );
    return wrapper;
  }

  private handlePromiseRace(node: CallExpressionNode): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);
    const { promise: resultPromise, wrapper } = this.createInternalPromise();

    if (node.arguments.length === 0) {
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        "Promise.race([]) — forever pending",
        code,
      );
      return wrapper;
    }

    const iterableArg = this.evaluateExpression(
      node.arguments[0] as ExpressionNode,
    );
    if (!Array.isArray(iterableArg)) {
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        "Promise.race: argument not iterable",
        code,
      );
      return wrapper;
    }

    for (const item of iterableArg) {
      if (this.isPromiseWrapper(item)) {
        const p = this.promises.get((item as PromiseWrapper).promiseId);
        if (p && p.state !== "pending") {
          if (p.state === "fulfilled") {
            this.resolvePromise(resultPromise, p.result);
          } else {
            this.rejectPromise(resultPromise, p.result);
          }
          break;
        }
      } else {
        this.resolvePromise(resultPromise, item);
        break;
      }
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `Promise.race([${iterableArg.length} promises]) — ${resultPromise.state === "pending" ? "all pending" : `${resultPromise.state} with ${displayValue(resultPromise.result)}`}`,
      code,
    );
    return wrapper;
  }

  // Handle promise.then(onFulfilled, onRejected), .catch(onRejected), .finally(onFinally)
  private handlePromiseChainCall(
    wrapper: PromiseWrapper,
    method: string,
    node: CallExpressionNode,
  ): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);
    const sourcePromise = this.promises.get(wrapper.promiseId);
    if (!sourcePromise) return wrapper;

    // Create the result promise that .then()/.catch()/.finally() returns
    const { promise: resultPromise, wrapper: resultWrapper } =
      this.createInternalPromise();

    const getCallbackNode = (index: number) => {
      const arg = node.arguments[index];
      if (!arg) return null;
      if (
        arg.type === "FunctionExpression" ||
        arg.type === "ArrowFunctionExpression"
      ) {
        return arg as FunctionExpressionNode | ArrowFunctionExpressionNode;
      }
      return null;
    };

    const getCallbackSource = (index: number): string => {
      const arg = node.arguments[index];
      if (!arg) return "(no callback)";
      return extractSource(this.sourceCode, arg as BaseNode);
    };

    if (method === "then") {
      const onFulfilledNode = getCallbackNode(0);
      const onRejectedNode = getCallbackNode(1);

      if (onFulfilledNode) {
        const reaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: "fulfill",
          callbackNode: onFulfilledNode,
          callbackSource: getCallbackSource(0),
          resultPromiseId: resultPromise.id,
        };

        if (sourcePromise.state === "fulfilled") {
          this.scheduleMicrotask(reaction, sourcePromise.result);
        } else if (sourcePromise.state === "pending") {
          sourcePromise.fulfillReactions.push(reaction);
          this.syncPromiseHeap(sourcePromise);
        }
        // If already rejected, onFulfilled is skipped — resultPromise stays pending
        // (simplified: propagate rejection)
        if (sourcePromise.state === "rejected") {
          this.rejectPromise(resultPromise, sourcePromise.result);
        }
      } else {
        // Empty .then() — pass value through to next promise
        if (sourcePromise.state === "fulfilled") {
          this.resolvePromise(resultPromise, sourcePromise.result);
        } else if (sourcePromise.state === "rejected") {
          this.rejectPromise(resultPromise, sourcePromise.result);
        } else {
          // pending — add identity reactions to propagate when settled
          const identityFulfillReaction: PromiseReaction = {
            id: `reaction-${this.reactionCounter++}`,
            type: "fulfill",
            callbackNode: null as unknown,
            callbackSource: "(identity)",
            resultPromiseId: resultPromise.id,
          };
          sourcePromise.fulfillReactions.push(identityFulfillReaction);
        }
      }

      if (onRejectedNode) {
        const reaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: "reject",
          callbackNode: onRejectedNode,
          callbackSource: getCallbackSource(1),
          resultPromiseId: resultPromise.id,
        };

        if (sourcePromise.state === "rejected") {
          this.scheduleMicrotask(reaction, sourcePromise.result);
        } else if (sourcePromise.state === "pending") {
          sourcePromise.rejectReactions.push(reaction);
        }
      }
    } else if (method === "catch") {
      const onRejectedNode = getCallbackNode(0);

      if (onRejectedNode) {
        const reaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: "reject",
          callbackNode: onRejectedNode,
          callbackSource: getCallbackSource(0),
          resultPromiseId: resultPromise.id,
        };

        if (sourcePromise.state === "rejected") {
          this.scheduleMicrotask(reaction, sourcePromise.result);
        } else if (sourcePromise.state === "pending") {
          sourcePromise.rejectReactions.push(reaction);
        } else {
          // fulfilled — propagate to result promise
          this.resolvePromise(resultPromise, sourcePromise.result);
        }
      }
    } else if (method === "finally") {
      const onFinallyNode = getCallbackNode(0);
      const finallySource = getCallbackSource(0);

      if (onFinallyNode) {
        // Both fulfill and reject call the same callback, then propagate original value
        const fulfillReaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: "fulfill",
          callbackNode: onFinallyNode,
          callbackSource: finallySource,
          resultPromiseId: resultPromise.id,
          preserveValue: true, // .finally() preserves original value
        };
        const rejectReaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: "reject",
          callbackNode: onFinallyNode,
          callbackSource: finallySource,
          resultPromiseId: resultPromise.id,
          preserveValue: true, // .finally() preserves original value
        };

        if (sourcePromise.state === "fulfilled") {
          this.scheduleMicrotask(fulfillReaction, sourcePromise.result);
        } else if (sourcePromise.state === "rejected") {
          this.scheduleMicrotask(rejectReaction, sourcePromise.result);
        } else {
          sourcePromise.fulfillReactions.push(fulfillReaction);
          sourcePromise.rejectReactions.push(rejectReaction);
          this.syncPromiseHeap(sourcePromise);
        }
      }
    }

    // Generate educational description for the step
    let description: string;
    if (method === "then") {
      if (sourcePromise.state === "fulfilled") {
        description = `.then() — Promise already fulfilled, callback → Microtask Queue`;
      } else if (sourcePromise.state === "rejected") {
        description = `.then() skipped — Promise is rejected`;
      } else {
        description = `.then() registered — callback queued when Promise settles`;
      }
    } else if (method === "catch") {
      if (sourcePromise.state === "rejected") {
        description = `.catch() — Promise rejected, callback → Microtask Queue`;
      } else if (sourcePromise.state === "fulfilled") {
        description = `.catch() skipped — Promise is fulfilled`;
      } else {
        description = `.catch() registered — will handle rejection`;
      }
    } else {
      // finally
      if (sourcePromise.state !== "pending") {
        description = `.finally() — callback → Microtask Queue (will run on settle)`;
      } else {
        description = `.finally() registered — will run on settle`;
      }
    }

    this.snapshot(this.getLine(node), this.getColumn(node), description, code);

    return resultWrapper;
  }

  // Execute a single microtask (a .then/.catch/.finally callback or async resume)
  private executeMicrotask(microtask: PendingMicrotask): void {
    // Check if this is an async-resume microtask
    if (microtask.callbackNode === null && this.asyncContinuations.has(microtask.id)) {
      const continuation = this.asyncContinuations.get(microtask.id)!;
      this.resumeAsyncFunction(
        microtask.id,
        microtask.resolveValue,
        continuation.isRejection,
      );
      return;
    }

    const callbackNode = microtask.callbackNode as
      | FunctionExpressionNode
      | ArrowFunctionExpressionNode;

    const params = callbackNode.params.map((p) => (p as IdentifierNode).name);
    const resolveParamName = params[0];

    const frameParams =
      resolveParamName !== undefined
        ? [{ name: resolveParamName, value: microtask.resolveValue }]
        : [];

    this.pushFrame(
      microtask.callbackSource.length > 20
        ? microtask.callbackSource.slice(0, 20) + "..."
        : microtask.callbackSource,
      this.getLine(callbackNode),
      this.getColumn(callbackNode),
      frameParams,
    );

    this.eventLoop = {
      phase: "draining-microtasks",
      description:
        "Event Loop: draining Microtask Queue (priority over Task Queue)",
    };

    this.snapshot(
      this.getLine(callbackNode),
      this.getColumn(callbackNode),
      `Executing .then()/.catch()/.finally() callback with value: ${displayValue(microtask.resolveValue)}`,
      microtask.callbackSource,
    );

    this.hasReturned = false;
    this.returnValue = undefined;

    if (
      callbackNode.type === "ArrowFunctionExpression" &&
      (callbackNode as ArrowFunctionExpressionNode).expression
    ) {
      this.returnValue = this.evaluateExpression(
        (callbackNode as ArrowFunctionExpressionNode).body as ExpressionNode,
      );
      this.hasReturned = true;
    } else {
      this.visitBlockStatement(callbackNode.body as BlockStatementNode);
    }

    const returnVal = this.returnValue;
    this.hasReturned = false;
    this.returnValue = undefined;

    this.popFrame();

    // Resolve the result promise with the callback's return value
    // (or original value if preserveValue is set, e.g. for .finally())
    if (microtask.resultPromiseId) {
      const resultPromise = this.promises.get(microtask.resultPromiseId);
      if (resultPromise) {
        // For .finally(), preserve the original value instead of using return value
        const valueToResolve = microtask.preserveValue
          ? microtask.resolveValue
          : returnVal;

        if (this.isPromiseWrapper(valueToResolve)) {
          // Callback returned a promise — adopt its state
          const innerPromise = this.promises.get(
            (valueToResolve as PromiseWrapper).promiseId,
          );
          if (innerPromise) {
            if (innerPromise.state === "fulfilled") {
              this.resolvePromise(resultPromise, innerPromise.result);
            } else if (innerPromise.state === "rejected") {
              this.rejectPromise(resultPromise, innerPromise.result);
            } else {
              // pending inner promise — chain reactions
              innerPromise.fulfillReactions.push({
                id: `reaction-${this.reactionCounter++}`,
                type: "fulfill",
                callbackNode: null,
                callbackSource: "(chain)",
                resultPromiseId: resultPromise.id,
              });
            }
          }
        } else {
          this.resolvePromise(resultPromise, valueToResolve);
        }
      }
    }
  }

  // Handle builtin resolve/reject calls inside Promise executor
  private handleBuiltinCall(
    node: CallExpressionNode,
    builtin: BuiltinFn,
  ): unknown {
    const code = extractSource(this.sourceCode, node);
    const promise = this.promises.get(builtin.promiseId);
    if (!promise) return undefined;

    const value =
      node.arguments.length > 0
        ? this.evaluateExpression(node.arguments[0] as ExpressionNode)
        : undefined;

    if (builtin.kind === "promise-resolve") {
      this.resolvePromise(promise, value);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `resolve(${displayValue(value)}) — Promise fulfilled`,
        code,
      );
    } else {
      this.rejectPromise(promise, value);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        `reject(${displayValue(value)}) — Promise rejected`,
        code,
      );
    }

    return undefined;
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
      isAsync: node.async === true,
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
      isAsync: node.async === true,
      source,
    };
  }

  // === Async/Await Engine ===

  private makeThrownError(reason: unknown): ThrownError {
    return { __isThrownError: true, reason };
  }

  private isThrownError(value: unknown): value is ThrownError {
    return (
      typeof value === "object" &&
      value !== null &&
      "__isThrownError" in value &&
      (value as ThrownError).__isThrownError === true
    );
  }

  /**
   * Call an async function. Creates an implicit pending Promise, pushes an
   * async frame, and executes the body. The first `await` encountered suspends
   * execution and saves a continuation; resumption is scheduled as a microtask.
   */
  private callAsyncFunction(
    funcValue: FunctionValue,
    funcName: string,
    params: Array<{ name: string; value: unknown }>,
    callNode: CallExpressionNode,
  ): PromiseWrapper {
    const code = extractSource(this.sourceCode, callNode);

    // 1. Create the implicit return Promise
    const { promise: returnPromise, wrapper: returnWrapper } =
      this.createInternalPromise();

    // 2. Push async CallStackFrame
    const frameId = generateId("frame", this.frameCounter);
    const color = getFrameColor(this.frameCounter++);

    const frame: CallStackFrame = {
      id: frameId,
      name: funcName,
      type: "async",
      line: this.getLine(callNode),
      column: this.getColumn(callNode),
      scope: {
        name: funcName,
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
      isAsync: true,
      status: "executing",
    };

    const paramEntries: MemoryEntry[] = params.map((p) => {
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
      label: `Local: ${funcName}`,
      type: "local",
      color,
      entries: paramEntries,
      suspended: false,
    };

    this.callStack.push(frame);
    this.memoryBlocks.push(memoryBlock);

    const localEnv: Record<string, unknown> = {};
    for (const p of params) localEnv[p.name] = p.value;
    this.envStack.push(localEnv);

    this.scopes.push({
      name: funcName,
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

    this.snapshot(
      this.getLine(callNode),
      this.getColumn(callNode),
      `Calling async ${funcName}() — returns Promise (pending)`,
      code,
    );

    // 3. Execute body — visitAsyncFunctionBody handles await suspension
    const body = funcValue.body as BlockStatementNode;
    const result = this.visitAsyncFunctionBody(
      body.body as StatementNode[],
      funcName,
      frameId,
      color,
      returnPromise.id,
    );

    // 4. If the function completed without suspension (no await hit), settle the promise
    if (result !== "suspended") {
      const returnVal = result === "completed-with-return" ? this.returnValue : undefined;
      this.hasReturned = false;
      this.returnValue = undefined;

      this.popFrame();

      if (this.isThrownError(returnVal)) {
        this.rejectPromise(returnPromise, (returnVal as ThrownError).reason);
        this.snapshot(
          this.getLine(callNode),
          this.getColumn(callNode),
          `async ${funcName} threw — Promise rejected with ${displayValue((returnVal as ThrownError).reason)}`,
          code,
        );
      } else {
        this.resolvePromise(returnPromise, returnVal);
        this.snapshot(
          this.getLine(callNode),
          this.getColumn(callNode),
          `async ${funcName} completed — Promise resolved with ${displayValue(returnVal)}`,
          code,
        );
      }
    }
    // If "suspended": the frame stays on the stack; resumption will pop it

    return returnWrapper;
  }

  /**
   * Execute statements of an async function body. Returns:
   *   "suspended"           — hit an await, continuation saved, frame stays
   *   "completed-with-return" — hit a return statement (this.returnValue is set)
   *   "completed"           — fell off the end normally
   */
  private visitAsyncFunctionBody(
    statements: StatementNode[],
    funcName: string,
    frameId: string,
    frameColor: string,
    returnPromiseId: string,
  ): "suspended" | "completed-with-return" | "completed" {
    for (let i = 0; i < statements.length; i++) {
      if (this.stepIndex >= MAX_STEPS) return "completed";

      const stmt = statements[i];

      // Check for await somewhere in this statement
      const awaitInfo = this.findAwaitInStatement(stmt);

      if (awaitInfo) {
        // Execute everything up to the await; get the awaited value
        const { awaitedValue, resultVarName } = this.processStatementUpToAwait(stmt);

        const awaitCode = extractSource(this.sourceCode, stmt);

        // Wrap non-promises with Promise.resolve
        let awaitedPromiseId: string | null = null;
        if (this.isPromiseWrapper(awaitedValue)) {
          awaitedPromiseId = (awaitedValue as PromiseWrapper).promiseId;
        } else {
          // Wrap the value in a resolved promise
          const { promise: wrappedP } = this.createInternalPromise();
          this.resolvePromise(wrappedP, awaitedValue);
          awaitedPromiseId = wrappedP.id;
        }

        const awaitedPromise = this.promises.get(awaitedPromiseId)!;

        this.snapshot(
          this.getLine(stmt),
          this.getColumn(stmt),
          `await — checking if Promise is settled`,
          awaitCode,
        );

        // Suspend the async frame
        const frame = this.callStack.find((f) => f.id === frameId);
        if (frame) frame.status = "suspended";
        const block = this.memoryBlocks.find((b) => b.frameId === frameId);
        if (block) block.suspended = true;

        this.snapshot(
          this.getLine(stmt),
          this.getColumn(stmt),
          `async ${funcName} suspended at await — yielding execution`,
          awaitCode,
        );

        // Save continuation (remaining statements after this one)
        const remainingStatements = statements.slice(i + 1);
        const capturedEnvStack = this.envStack.map((env) => ({ ...env }));
        const localEnv = { ...this.getCurrentEnv() };

        const continuation: AsyncContinuation = {
          functionName: funcName,
          frameId,
          frameColor,
          memoryBlockId: frameId, // same id used for lookup
          remainingStatements,
          localEnv,
          awaitResultVarName: resultVarName,
          returnPromiseId,
          capturedEnvStack,
          isRejection: false,
        };

        // Register the continuation as a microtask reaction on the awaited promise
        this.scheduleAsyncContinuation(continuation, awaitedPromise);

        // Pop env/scopes but KEEP frame and memoryBlock (suspended)
        this.envStack.pop();
        this.scopes.pop();

        return "suspended";
      }

      // No await — execute normally
      this.visitStatement(stmt);

      if (this.hasReturned) {
        return "completed-with-return";
      }

      if (this.stepIndex >= MAX_STEPS) return "completed";
    }

    return "completed";
  }

  /**
   * Schedule a microtask that resumes an async function when the awaited
   * promise settles.
   */
  private scheduleAsyncContinuation(
    continuation: AsyncContinuation,
    awaitedPromise: InternalPromise,
  ): void {
    // Create a synthetic microtask id
    const microtaskId = `async-resume-${this.microtaskCounter++}`;

    // We store the continuation in a map keyed by microtaskId so executeMicrotask can find it
    this.asyncContinuations.set(microtaskId, continuation);

    const queueItem: QueueItem = {
      id: microtaskId,
      callbackLabel: `resume ${continuation.functionName}`,
      sourceType: "promise",
      sourceId: awaitedPromise.id,
    };

    if (awaitedPromise.state === "fulfilled") {
      // Already settled — schedule immediately
      const pendingMicrotask: PendingMicrotask = {
        id: microtaskId,
        callbackNode: null as unknown,
        callbackSource: `resume ${continuation.functionName}`,
        sourcePromiseId: awaitedPromise.id,
        resolveValue: awaitedPromise.result,
        capturedEnvStack: continuation.capturedEnvStack,
      };
      this.pendingMicrotasks.push(pendingMicrotask);
      this.microtaskQueue.push(queueItem);
    } else if (awaitedPromise.state === "rejected") {
      // Already rejected — resume with thrown error
      const pendingMicrotask: PendingMicrotask = {
        id: microtaskId,
        callbackNode: null as unknown,
        callbackSource: `resume ${continuation.functionName}`,
        sourcePromiseId: awaitedPromise.id,
        resolveValue: awaitedPromise.result,
        capturedEnvStack: continuation.capturedEnvStack,
      };
      continuation.isRejection = true;
      this.pendingMicrotasks.push(pendingMicrotask);
      this.microtaskQueue.push(queueItem);
    } else {
      // Pending — add a synthetic reaction so we get notified when it settles
      const fulfillReaction: PromiseReaction = {
        id: `reaction-${this.reactionCounter++}`,
        type: "fulfill",
        callbackNode: null as unknown,
        callbackSource: `resume ${continuation.functionName}`,
        resultPromiseId: continuation.returnPromiseId,
      };
      // Override: we use a special marker to route through async resume instead
      (fulfillReaction as unknown as Record<string, unknown>)["__asyncResumeId"] = microtaskId;

      const rejectReaction: PromiseReaction = {
        id: `reaction-${this.reactionCounter++}`,
        type: "reject",
        callbackNode: null as unknown,
        callbackSource: `resume ${continuation.functionName} (rejection)`,
        resultPromiseId: continuation.returnPromiseId,
      };
      (rejectReaction as unknown as Record<string, unknown>)["__asyncResumeId"] = microtaskId;
      (rejectReaction as unknown as Record<string, unknown>)["__isRejection"] = true;

      awaitedPromise.fulfillReactions.push(fulfillReaction);
      awaitedPromise.rejectReactions.push(rejectReaction);
      this.syncPromiseHeap(awaitedPromise);

      // Also keep a queue item so the UI shows the pending microtask
      this.microtaskQueue.push(queueItem);
    }
  }

  /**
   * Resume a previously suspended async function.
   * Called from executeMicrotask when it detects an async-resume microtask.
   */
  private resumeAsyncFunction(
    microtaskId: string,
    resolvedValue: unknown,
    isRejection: boolean,
  ): void {
    const continuation = this.asyncContinuations.get(microtaskId);
    if (!continuation) return;
    this.asyncContinuations.delete(microtaskId);

    // Restore the frame status
    const frame = this.callStack.find((f) => f.id === continuation.frameId);
    if (frame) {
      frame.status = "executing";
    }
    const block = this.memoryBlocks.find(
      (b) => b.frameId === continuation.frameId,
    );
    if (block) {
      block.suspended = false;
    }

    // Restore env stack
    this.envStack.push(continuation.localEnv);
    this.scopes.push({
      name: continuation.functionName,
      type: "function",
      variables: [],
    });

    const resumeValue = isRejection
      ? this.makeThrownError(resolvedValue)
      : resolvedValue;

    this.snapshot(
      0,
      0,
      `async ${continuation.functionName} resumed — await resolved with ${displayValue(resolvedValue)}`,
      "",
    );

    // If the await result goes into a variable, assign it now
    if (continuation.awaitResultVarName && !isRejection) {
      const varName = continuation.awaitResultVarName;
      this.setVariable(varName, resolvedValue);

      // Update memory — either update existing entry or add it
      const existingFrameId = this.findMemoryEntryFrameId(varName);
      if (existingFrameId) {
        const resolved = this.resolveValueForMemory(resolvedValue);
        this.updateMemoryEntry(existingFrameId, varName, {
          displayValue: resolved.displayValue,
          valueType: resolved.valueType,
          heapReferenceId: resolved.heapReferenceId,
          pointerColor: resolved.pointerColor,
        });
      }
      // Note: if not found, the variable will be declared during continuation execution
    }

    // Continue executing the remaining statements
    const returnPromise = this.promises.get(continuation.returnPromiseId);

    if (isRejection && continuation.remainingStatements.length === 0) {
      // Nothing left to execute and we have a rejection — reject the promise
      this.hasReturned = false;
      this.returnValue = undefined;
      this.envStack.pop();
      this.scopes.pop();
      this.popFrame();
      if (returnPromise) {
        this.rejectPromise(returnPromise, resolvedValue);
        this.snapshot(
          0,
          0,
          `async ${continuation.functionName} — await rejected, Promise rejected with ${displayValue(resolvedValue)}`,
          "",
        );
      }
      return;
    }

    void resumeValue; // used conceptually above; suppress lint

    const result = this.visitAsyncFunctionBody(
      continuation.remainingStatements,
      continuation.functionName,
      continuation.frameId,
      continuation.frameColor,
      continuation.returnPromiseId,
    );

    if (result !== "suspended") {
      const returnVal =
        result === "completed-with-return" ? this.returnValue : undefined;
      this.hasReturned = false;
      this.returnValue = undefined;

      this.envStack.pop();
      this.scopes.pop();
      this.popFrame();

      if (returnPromise) {
        if (this.isThrownError(returnVal)) {
          this.rejectPromise(returnPromise, (returnVal as ThrownError).reason);
          this.snapshot(
            0,
            0,
            `async ${continuation.functionName} threw — Promise rejected`,
            "",
          );
        } else {
          this.resolvePromise(returnPromise, returnVal);
          this.snapshot(
            0,
            0,
            `async ${continuation.functionName} completed — Promise resolved with ${displayValue(returnVal)}`,
            "",
          );
        }
      }
    }
  }

  /**
   * Check if a statement contains an AwaitExpression at the top level.
   * Returns the await node or null.
   */
  private findAwaitInStatement(
    stmt: StatementNode,
  ): AwaitExpressionNode | null {
    if (stmt.type === "VariableDeclaration") {
      const decl = stmt as VariableDeclarationNode;
      for (const d of decl.declarations) {
        if (d.init && d.init.type === "AwaitExpression") {
          return d.init as AwaitExpressionNode;
        }
      }
    }
    if (stmt.type === "ExpressionStatement") {
      const expr = (stmt as ExpressionStatementNode).expression;
      if (expr.type === "AwaitExpression") return expr as AwaitExpressionNode;
      if (expr.type === "AssignmentExpression") {
        const right = (expr as AssignmentExpressionNode).right;
        if (right.type === "AwaitExpression") return right as AwaitExpressionNode;
      }
    }
    if (stmt.type === "ReturnStatement") {
      const ret = stmt as ReturnStatementNode;
      if (ret.argument && ret.argument.type === "AwaitExpression") {
        return ret.argument as AwaitExpressionNode;
      }
    }
    return null;
  }

  /**
   * For a statement that contains a top-level await, evaluate everything
   * except the await itself and return the awaited expression's value plus
   * the name of the variable it would be assigned to (if any).
   */
  private processStatementUpToAwait(stmt: StatementNode): {
    awaitedValue: unknown;
    resultVarName: string | null;
  } {
    if (stmt.type === "VariableDeclaration") {
      const decl = stmt as VariableDeclarationNode;
      const d = decl.declarations[0];
      const awaitNode = d.init as AwaitExpressionNode;
      const awaitedValue = this.evaluateExpression(
        awaitNode.argument,
      );
      // Declare the variable as undefined for now (will be assigned on resume)
      const varName = d.id.name;
      this.setVariable(varName, undefined, true);
      const entry: MemoryEntry = {
        name: varName,
        kind: decl.kind as VariableKind,
        valueType: "primitive",
        displayValue: "undefined",
      };
      this.addMemoryEntry(this.getCurrentFrameId(), entry);
      const currentScope = this.scopes[this.scopes.length - 1];
      if (currentScope) {
        currentScope.variables.push({ name: varName, value: undefined, kind: decl.kind as VariableKind });
      }
      const currentFrame = this.callStack[this.callStack.length - 1];
      if (currentFrame) {
        currentFrame.scope.variables.push({ name: varName, value: undefined, kind: decl.kind as VariableKind });
      }
      return { awaitedValue, resultVarName: varName };
    }

    if (stmt.type === "ExpressionStatement") {
      const expr = (stmt as ExpressionStatementNode).expression;
      if (expr.type === "AwaitExpression") {
        const awaitedValue = this.evaluateExpression(
          (expr as AwaitExpressionNode).argument,
        );
        return { awaitedValue, resultVarName: null };
      }
      if (expr.type === "AssignmentExpression") {
        const assignNode = expr as AssignmentExpressionNode;
        const awaitNode = assignNode.right as AwaitExpressionNode;
        const awaitedValue = this.evaluateExpression(awaitNode.argument);
        const varName =
          assignNode.left.type === "Identifier"
            ? (assignNode.left as IdentifierNode).name
            : null;
        return { awaitedValue, resultVarName: varName };
      }
    }

    if (stmt.type === "ReturnStatement") {
      const ret = stmt as ReturnStatementNode;
      const awaitNode = ret.argument as AwaitExpressionNode;
      const awaitedValue = this.evaluateExpression(awaitNode.argument);
      return { awaitedValue, resultVarName: "__return__" };
    }

    return { awaitedValue: undefined, resultVarName: null };
  }

  // === try/catch/finally ===

  private visitTryStatement(node: TryStatementNode): void {
    const savedHasReturned = this.hasReturned;
    const savedReturnValue = this.returnValue;
    let thrownError: ThrownError | null = null;

    try {
      this.hasReturned = false;
      this.returnValue = undefined;

      // Execute try block
      for (const stmt of node.block.body) {
        this.visitStatement(stmt);
        if (this.hasReturned || this.stepIndex >= MAX_STEPS) break;
        // If a thrown error was propagated via returnValue
        if (this.isThrownError(this.returnValue)) {
          thrownError = this.returnValue as ThrownError;
          this.hasReturned = false;
          this.returnValue = undefined;
          break;
        }
      }
    } catch (_e) {
      // Unexpected JS-level error — treat as thrown
      thrownError = this.makeThrownError(_e);
    }

    if (thrownError && node.handler) {
      const catchClause = node.handler;
      const catchCode = extractSource(this.sourceCode, catchClause.body);

      this.snapshot(
        this.getLine(catchClause.body),
        this.getColumn(catchClause.body),
        `Error caught: ${displayValue(thrownError.reason)} — entering catch block`,
        catchCode,
      );

      // Push error variable into current scope if param exists
      if (catchClause.param) {
        const errName = catchClause.param.name;
        this.setVariable(errName, thrownError.reason, true);
        const entry: MemoryEntry = {
          name: errName,
          kind: "let" as VariableKind,
          valueType: "primitive",
          displayValue: displayValue(thrownError.reason),
        };
        this.addMemoryEntry(this.getCurrentFrameId(), entry);
        const currentScope = this.scopes[this.scopes.length - 1];
        if (currentScope) {
          currentScope.variables.push({
            name: errName,
            value: thrownError.reason,
            kind: "let" as VariableKind,
          });
        }
      }

      // Execute catch block
      this.hasReturned = false;
      for (const stmt of catchClause.body.body) {
        this.visitStatement(stmt);
        if (this.hasReturned || this.stepIndex >= MAX_STEPS) break;
      }
      thrownError = null; // caught
    }

    // Run finally block always
    if (node.finalizer) {
      const finallyCode = extractSource(this.sourceCode, node.finalizer);
      this.snapshot(
        this.getLine(node.finalizer),
        this.getColumn(node.finalizer),
        "Entering finally block",
        finallyCode,
      );
      const savedAgain = this.hasReturned;
      const savedRetAgain = this.returnValue;
      this.hasReturned = false;
      for (const stmt of node.finalizer.body) {
        this.visitStatement(stmt);
        if (this.hasReturned || this.stepIndex >= MAX_STEPS) break;
      }
      // Restore return state unless finally itself returned
      if (!this.hasReturned) {
        this.hasReturned = savedAgain;
        this.returnValue = savedRetAgain;
      }
    }

    // Re-propagate if not caught
    if (thrownError) {
      this.returnValue = thrownError;
      this.hasReturned = true;
      return;
    }

    // If no error was thrown but previous return state should be restored
    if (!this.hasReturned) {
      this.hasReturned = savedHasReturned;
      this.returnValue = savedReturnValue;
    }
  }

  private visitThrowStatement(node: ThrowStatementNode): void {
    const value = this.evaluateExpression(node.argument);
    const code = extractSource(this.sourceCode, node);
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      `throw ${displayValue(value)}`,
      code,
    );
    this.returnValue = this.makeThrownError(value);
    this.hasReturned = true;
  }
}
