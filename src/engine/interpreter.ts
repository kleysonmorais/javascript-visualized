import type * as acorn from 'acorn';
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
  ClosureScopeEntry,
  ClosureVariable,
} from '@/types';
import { getFrameColor, getPointerColor } from '@/constants/theme';
import {
  displayValue,
  getValueType,
  extractSource,
  generateObjectLabel,
  generateId,
  deepClone,
  stringifyForConsole,
} from './utils';
import type {
  InternalPromise,
  PendingMicrotask,
  PromiseReaction,
} from './promise';
import description from '@/utils/stepDescriptions';

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
  type: 'Program';
  body: StatementNode[];
}

interface VariableDeclarationNode extends BaseNode {
  type: 'VariableDeclaration';
  declarations: VariableDeclaratorNode[];
  kind: 'var' | 'let' | 'const';
}

interface VariableDeclaratorNode extends BaseNode {
  type: 'VariableDeclarator';
  id: PatternNode;
  init: ExpressionNode | null;
}

interface FunctionDeclarationNode extends BaseNode {
  type: 'FunctionDeclaration';
  id: IdentifierNode;
  params: PatternNode[];
  body: BlockStatementNode;
  async?: boolean;
  generator?: boolean;
}

interface ExpressionStatementNode extends BaseNode {
  type: 'ExpressionStatement';
  expression: ExpressionNode;
}

interface IfStatementNode extends BaseNode {
  type: 'IfStatement';
  test: ExpressionNode;
  consequent: StatementNode;
  alternate: StatementNode | null;
}

interface ForStatementNode extends BaseNode {
  type: 'ForStatement';
  init: VariableDeclarationNode | ExpressionNode | null;
  test: ExpressionNode | null;
  update: ExpressionNode | null;
  body: StatementNode;
}

interface WhileStatementNode extends BaseNode {
  type: 'WhileStatement';
  test: ExpressionNode;
  body: StatementNode;
}

interface BlockStatementNode extends BaseNode {
  type: 'BlockStatement';
  body: StatementNode[];
}

interface ReturnStatementNode extends BaseNode {
  type: 'ReturnStatement';
  argument: ExpressionNode | null;
}

interface CallExpressionNode extends BaseNode {
  type: 'CallExpression';
  callee: ExpressionNode;
  arguments: (ExpressionNode | SpreadElementNode)[];
}

interface MemberExpressionNode extends BaseNode {
  type: 'MemberExpression';
  object: ExpressionNode;
  property: ExpressionNode | IdentifierNode;
  computed: boolean;
}

interface AssignmentExpressionNode extends BaseNode {
  type: 'AssignmentExpression';
  operator: string;
  left: PatternNode | MemberExpressionNode;
  right: ExpressionNode;
}

interface BinaryExpressionNode extends BaseNode {
  type: 'BinaryExpression';
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

interface LogicalExpressionNode extends BaseNode {
  type: 'LogicalExpression';
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

interface UnaryExpressionNode extends BaseNode {
  type: 'UnaryExpression';
  operator: string;
  prefix: boolean;
  argument: ExpressionNode;
}

interface UpdateExpressionNode extends BaseNode {
  type: 'UpdateExpression';
  operator: '++' | '--';
  prefix: boolean;
  argument: IdentifierNode | MemberExpressionNode;
}

interface LiteralNode extends BaseNode {
  type: 'Literal';
  value: string | number | boolean | null | RegExp | bigint;
  raw: string;
}

interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
}

interface ObjectExpressionNode extends BaseNode {
  type: 'ObjectExpression';
  properties: (PropertyNode | SpreadElementNode)[];
}

interface PropertyNode extends BaseNode {
  type: 'Property';
  key: IdentifierNode | LiteralNode;
  value: ExpressionNode | PatternNode; // value can be Identifier, AssignmentPattern, ObjectPattern, ArrayPattern in destructuring
  kind: 'init' | 'get' | 'set';
  computed: boolean;
  shorthand: boolean;
}

interface ArrayExpressionNode extends BaseNode {
  type: 'ArrayExpression';
  elements: (ExpressionNode | SpreadElementNode | null)[];
}

interface FunctionExpressionNode extends BaseNode {
  type: 'FunctionExpression';
  id: IdentifierNode | null;
  params: PatternNode[];
  body: BlockStatementNode;
  async?: boolean;
  generator?: boolean;
}

interface ArrowFunctionExpressionNode extends BaseNode {
  type: 'ArrowFunctionExpression';
  params: PatternNode[];
  body: BlockStatementNode | ExpressionNode;
  expression: boolean;
  async?: boolean;
}

interface TemplateLiteralNode extends BaseNode {
  type: 'TemplateLiteral';
  quasis: TemplateElementNode[];
  expressions: ExpressionNode[];
}

interface TemplateElementNode extends BaseNode {
  type: 'TemplateElement';
  value: { raw: string; cooked: string };
  tail: boolean;
}

interface ConditionalExpressionNode extends BaseNode {
  type: 'ConditionalExpression';
  test: ExpressionNode;
  consequent: ExpressionNode;
  alternate: ExpressionNode;
}

interface NewExpressionNode extends BaseNode {
  type: 'NewExpression';
  callee: ExpressionNode;
  arguments: ExpressionNode[];
}

interface AwaitExpressionNode extends BaseNode {
  type: 'AwaitExpression';
  argument: ExpressionNode;
}

interface YieldExpressionNode extends BaseNode {
  type: 'YieldExpression';
  argument: ExpressionNode | null;
  delegate: boolean; // true for `yield*`
}

interface ForOfStatementNode extends BaseNode {
  type: 'ForOfStatement';
  left: VariableDeclarationNode | IdentifierNode;
  right: ExpressionNode;
  body: StatementNode;
  await: boolean;
}

interface TryStatementNode extends BaseNode {
  type: 'TryStatement';
  block: BlockStatementNode;
  handler: CatchClauseNode | null;
  finalizer: BlockStatementNode | null;
}

interface CatchClauseNode extends BaseNode {
  type: 'CatchClause';
  param: IdentifierNode | null;
  body: BlockStatementNode;
}

interface ThrowStatementNode extends BaseNode {
  type: 'ThrowStatement';
  argument: ExpressionNode;
}

interface BreakStatementNode extends BaseNode {
  type: 'BreakStatement';
}

interface ContinueStatementNode extends BaseNode {
  type: 'ContinueStatement';
}

// Class AST nodes
interface ClassDeclarationNode extends BaseNode {
  type: 'ClassDeclaration';
  id: IdentifierNode;
  superClass: ExpressionNode | null;
  body: ClassBodyNode;
}

interface ClassBodyNode extends BaseNode {
  type: 'ClassBody';
  body: MethodDefinitionNode[];
}

interface MethodDefinitionNode extends BaseNode {
  type: 'MethodDefinition';
  key: IdentifierNode | LiteralNode;
  value: FunctionExpressionNode;
  kind: 'constructor' | 'method' | 'get' | 'set';
  static: boolean;
  computed: boolean;
}

// Destructuring pattern nodes
interface ObjectPatternNode extends BaseNode {
  type: 'ObjectPattern';
  properties: (PropertyNode | RestElementNode)[];
}

interface ArrayPatternNode extends BaseNode {
  type: 'ArrayPattern';
  elements: (PatternNode | null)[];
}

interface AssignmentPatternNode extends BaseNode {
  type: 'AssignmentPattern';
  left: PatternNode;
  right: ExpressionNode;
}

interface RestElementNode extends BaseNode {
  type: 'RestElement';
  argument: PatternNode;
}

interface SpreadElementNode extends BaseNode {
  type: 'SpreadElement';
  argument: ExpressionNode;
}

// Module nodes
interface ImportDeclarationNode extends BaseNode {
  type: 'ImportDeclaration';
  specifiers: ImportSpecifierNode[];
  source: LiteralNode;
}

interface ImportSpecifierNode extends BaseNode {
  type:
    | 'ImportSpecifier'
    | 'ImportDefaultSpecifier'
    | 'ImportNamespaceSpecifier';
  local: IdentifierNode;
  imported?: IdentifierNode;
}

interface ExportNamedDeclarationNode extends BaseNode {
  type: 'ExportNamedDeclaration';
  declaration: StatementNode | null;
  specifiers: ExportSpecifierNode[];
  source: LiteralNode | null;
}

interface ExportDefaultDeclarationNode extends BaseNode {
  type: 'ExportDefaultDeclaration';
  declaration: ExpressionNode | StatementNode;
}

interface ExportSpecifierNode extends BaseNode {
  type: 'ExportSpecifier';
  local: IdentifierNode;
  exported: IdentifierNode;
}

type StatementNode =
  | VariableDeclarationNode
  | FunctionDeclarationNode
  | ExpressionStatementNode
  | IfStatementNode
  | ForStatementNode
  | ForOfStatementNode
  | WhileStatementNode
  | BlockStatementNode
  | ReturnStatementNode
  | TryStatementNode
  | ThrowStatementNode
  | BreakStatementNode
  | ContinueStatementNode
  | ClassDeclarationNode
  | ImportDeclarationNode
  | ExportNamedDeclarationNode
  | ExportDefaultDeclarationNode;

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
  | AwaitExpressionNode
  | YieldExpressionNode;

type PatternNode =
  | IdentifierNode
  | ObjectPatternNode
  | ArrayPatternNode
  | AssignmentPatternNode
  | RestElementNode;

// Metadata about one captured environment layer (for [[Scope]] display)
interface CapturedEnvMeta {
  scopeName: string;
  scopeColor: string;
  // kinds for each variable in this layer (for isMutable flag)
  kinds: Record<string, VariableKind | 'param' | 'function'>;
  // live reference to the env object — mutations here are visible immediately
  env: Record<string, unknown>;
}

// Internal type for function values stored in environment
interface FunctionValue {
  __isFunction: true;
  params: string[];
  paramNodes?: PatternNode[]; // original param nodes for destructuring support
  body: BlockStatementNode | ExpressionNode;
  isArrow: boolean;
  isAsync: boolean;
  isGenerator: boolean;
  source: string;
  // Closure: live references to enclosing envs (non-global) at time of creation
  capturedEnvMeta?: CapturedEnvMeta[];
}

// Internal type for class values stored in environment
interface ClassMethod {
  name: string;
  params: string[];
  body: BlockStatementNode;
  isStatic: boolean;
  isConstructor: boolean;
}

interface ClassValue {
  __isClass: true;
  name: string;
  superClassName: string | null;
  constructor: ClassMethod | null;
  methods: ClassMethod[]; // instance methods
  staticMethods: ClassMethod[]; // static methods
  staticProps: Record<string, unknown>; // static property values
  heapObjectId: string; // the class's own HeapObject id
}

// Thrown error signal — used for try/catch and async rejection propagation
interface ThrownError {
  __isThrownError: true;
  reason: unknown;
}

// Flow control signals — used internally for break/continue/yield, never caught by user try/catch
class BreakSignal {}
class ContinueSignal {}
class YieldSignal {
  value: unknown;
  constructor(value: unknown) {
    this.value = value;
  }
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
  returnPromiseId: string; // the implicit promise the async fn resolves/rejects
  capturedEnvStack: Record<string, unknown>[]; // full env stack snapshot for closures
  isRejection: boolean; // if true, resume with a thrown error
}

// Runtime value stored in variables when a generator is invoked
interface GeneratorWrapper {
  __isGenerator: true;
  generatorId: string; // links to the generator HeapObject
  functionValue: FunctionValue;
  heapObjectId: string;
  functionHeapId: string; // heapId of the generator function
}

// Continuation for a suspended generator
interface GeneratorContinuation {
  generatorId: string; // links to the generator HeapObject
  frameId: string;
  frameColor: string;
  remainingStatements: StatementNode[];
  localEnv: Record<string, unknown>;
  capturedEnvStack: Record<string, unknown>[];
  yieldResultVarName: string | null; // if yield is in assignment: const x = yield 1
  executionPosition: number; // track position in body for resumption
  nextCallCount: number; // track number of next() calls for safety
}

// Runtime value stored in variables when a Promise is created/returned
interface PromiseWrapper {
  __isPromise: true;
  promiseId: string;
}

// Runtime value for built-in resolve/reject functions injected into executor scope
interface BuiltinFn {
  __isBuiltin: true;
  kind: 'promise-resolve' | 'promise-reject';
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
  type: 'setTimeout' | 'setInterval';
  callbackNode: BaseNode;
  callbackSource: string;
  delay: number;
  registeredAtStep: number;
  cancelled: boolean;
  intervalCount: number;
  processed: boolean; // true once picked up by processAsyncCallbacks
  capturedEnvStack: Record<string, unknown>[]; // closure envs captured at registration time
  resolvedFnValue?: FunctionValue; // set when callback is passed as an identifier reference
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
  private eventLoop: EventLoopState = { phase: 'idle', description: 'Idle' };
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
  private sourceCode: string = '';

  // Return value communication
  private returnValue: unknown = undefined;
  private hasReturned: boolean = false;

  // Async engine state
  private pendingTimers: PendingTimer[] = [];
  private timerIdCounter: number = 1;
  private clearedTimerIds: Set<string> = new Set();

  // Fetch engine state
  private pendingFetches: PendingFetch[] = [];

  // Promise engine state
  private promises: Map<string, InternalPromise> = new Map();
  private promiseCounter: number = 0;
  private pendingMicrotasks: PendingMicrotask[] = [];
  private microtaskCounter: number = 0;
  private reactionCounter: number = 0;

  // Async/await engine state
  private asyncContinuations: Map<string, AsyncContinuation> = new Map();

  // Generator engine state
  private generatorContinuations: Map<string, GeneratorContinuation> =
    new Map();
  private generatorCounter: number = 0;
  private static readonly MAX_GENERATOR_NEXT_CALLS = 100; // safety limit per generator

  // Global memory block kept accessible during async phase for closure support
  private globalMemoryBlock: MemoryBlock | null = null;

  // Maps runtime object/function references to their heap object IDs for reference sharing
  private objectHeapMap: WeakMap<object, string> = new WeakMap();

  // Closure display tracking: heapObjectId → CapturedEnvMeta[] for [[Scope]] refresh
  private closureLiveEnvMap: Map<string, CapturedEnvMeta[]> = new Map();

  // Class registry: class name → ClassValue (for new ClassName() lookup)
  private classRegistry: Map<string, ClassValue> = new Map();

  // Tracks kinds of variables in each env layer: env object reference → variable kinds
  private envKindsMap: Map<
    Record<string, unknown>,
    Record<string, VariableKind | 'param' | 'function'>
  > = new Map();

  // Tracks function names captured by closure scope: env → function names
  private envCapturedBy: Map<Record<string, unknown>, string[]> = new Map();

  // Module mode flag
  private isModuleMode: boolean = false;

  execute(
    ast: acorn.Node,
    sourceCode: string,
    sourceType: 'script' | 'module' = 'script'
  ): ExecutionStep[] {
    this.sourceCode = sourceCode;
    this.isModuleMode = sourceType === 'module';

    // Phase 1: Synchronous execution
    this.pushGlobalFrame();
    this.visitProgram(ast as ProgramNode);

    // Remove the global frame from the BOTTOM of the call stack without
    // disturbing any suspended async frames that may sit above it.
    // We do NOT use popFrame() here because that removes from the TOP.
    const globalFrameIndex = this.callStack.findIndex(
      (f) => f.type === 'global'
    );
    if (globalFrameIndex !== -1) {
      const globalFrame = this.callStack[globalFrameIndex];
      this.callStack.splice(globalFrameIndex, 1);
      // Remove global memory block (will be re-attached below for async phase)
      const blockIndex = this.memoryBlocks.findIndex(
        (b) => b.frameId === globalFrame.id
      );
      if (blockIndex !== -1) this.memoryBlocks.splice(blockIndex, 1);
      // Pop global env + scope (they are at the bottom of their stacks)
      this.envStack.shift();
      this.scopes.shift();
    }

    // Re-attach global memory block for async phase so callbacks can
    // read and update global variables in the UI
    if (this.globalMemoryBlock) {
      this.memoryBlocks.push(this.globalMemoryBlock);
      this.envStack.push(this.globalEnv);
    }

    const hasAsyncWork =
      this.pendingMicrotasks.length > 0 ||
      this.pendingTimers.filter((t) => !t.cancelled).length > 0 ||
      this.pendingFetches.filter((f) => !f.processed).length > 0;

    this.eventLoop = {
      phase:
        this.pendingMicrotasks.length > 0
          ? 'checking-microtasks'
          : 'checking-tasks',
      description: 'All synchronous code executed — checking for async tasks',
    };
    this.snapshot(
      0,
      0,
      hasAsyncWork
        ? description.checkingMicrotaskQueue()
        : description.executionComplete(),
      ''
    );

    if (!hasAsyncWork) return this.steps;

    // Phase 2: Process async callbacks (supports nested timers via iteration)
    this.processAsyncCallbacks();

    return this.steps;
  }

  // === Async Phase ===

  private processAsyncCallbacks(): void {
    let iteration = 0;

    // STEP 1: Drain microtasks queued during synchronous execution
    if (this.pendingMicrotasks.length > 0) {
      this.drainMicrotaskQueue();
    }

    while (iteration < MAX_ASYNC_ITERATIONS && this.stepIndex < MAX_STEPS) {
      // Process any pending fetches — they resolve Promises (→ microtasks) before timers run
      const unprocessedFetches = this.pendingFetches.filter(
        (f) => !f.processed
      );
      if (unprocessedFetches.length > 0) {
        this.eventLoop = {
          phase: 'checking-tasks',
          description: 'fetch() completed — resolving Promise',
        };
        this.processPendingFetches();
        // Drain microtasks that the fetch resolution triggered
        if (this.pendingMicrotasks.length > 0) {
          this.eventLoop = {
            phase: 'checking-microtasks',
            description: 'fetch resolved — draining Microtask Queue',
          };
          this.snapshot(0, 0, description.fetchCheckingMicrotasks(), '');
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
            : a.registeredAtStep - b.registeredAtStep
        );

      if (activeTimers.length === 0 && this.pendingMicrotasks.length === 0)
        break;

      // Process microtasks again if any were added during the last iteration
      if (this.pendingMicrotasks.length > 0) {
        this.eventLoop = {
          phase: 'checking-microtasks',
          description: 'Checking Microtask Queue...',
        };
        this.snapshot(0, 0, description.microtasksPending(), '');
        this.drainMicrotaskQueue();
        continue;
      }

      if (activeTimers.length === 0) break;

      // Batch-enqueue all timers that share the same (minimum) delay so they
      // appear in the Task Queue simultaneously — matching real browser behaviour.
      const minDelay = activeTimers[0].delay;
      const batch = activeTimers.filter((t) => t.delay === minDelay);

      if (batch[0].cancelled || this.stepIndex >= MAX_STEPS) {
        iteration++;
        continue;
      }

      // Step 1: Complete all Web API entries for the batch and push queue items.
      for (const t of batch) {
        t.processed = true;
        const webAPI = this.webAPIs.find((w) => w.id === t.id);
        if (webAPI) {
          webAPI.elapsed = t.delay;
          webAPI.status = 'completed';
        }
        const taskItem: QueueItem = {
          id: `task-${t.id}`,
          callbackLabel:
            t.callbackSource.length > 30
              ? t.callbackSource.slice(0, 30) + '...'
              : t.callbackSource,
          sourceType: t.type,
          sourceId: t.id,
        };
        this.taskQueue.push(taskItem);
      }

      // Snapshot showing all batch callbacks in the Task Queue simultaneously.
      this.eventLoop = {
        phase: 'checking-tasks',
        description: 'Timers completed — callbacks moved to Task Queue',
      };
      this.snapshot(0, 0, description.callbackMovedToTaskQueue(), '');

      // Step 2: Execute each queued callback in FIFO order.
      for (const t of batch) {
        this.runTimerCallback(t);

        // Drain microtasks between callbacks
        if (this.pendingMicrotasks.length > 0) {
          this.eventLoop = {
            phase: 'checking-microtasks',
            description: 'Checking Microtask Queue...',
          };
          this.snapshot(0, 0, description.callbackCheckingMicrotasks(), '');
          this.drainMicrotaskQueue();
        }
      }

      iteration++;
    }

    // Final microtask drain
    if (this.pendingMicrotasks.length > 0) {
      this.drainMicrotaskQueue();
    }

    // Remove cancelled timers from Web APIs (they were already shown as cancelled)
    const cancelledIds = new Set(
      this.pendingTimers.filter((t) => t.cancelled).map((t) => t.id)
    );
    if (cancelledIds.size > 0) {
      this.webAPIs = this.webAPIs.filter((w) => !cancelledIds.has(w.id));
    }

    this.eventLoop = { phase: 'idle', description: 'All tasks completed' };
    this.snapshot(0, 0, description.executionComplete(), '');
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
        phase: 'draining-microtasks',
        description:
          'Event Loop: draining Microtask Queue (priority over Task Queue)',
      };

      // Remove from visualization queue
      this.microtaskQueue = this.microtaskQueue.filter(
        (q) => q.id !== microtask.id
      );

      // Execute the microtask
      this.executeMicrotask(microtask);

      this.eventLoop = {
        phase: 'checking-microtasks',
        description: 'Checking for more microtasks...',
      };

      drainCount++;
    }

    if (drainCount >= MAX_MICROTASK_DRAIN) {
      console.warn('Microtask drain limit reached (possible infinite loop)');
    }
  }

  private runTimerCallback(timer: PendingTimer): void {
    // Steps 1 & 2 (Web API completion + Task Queue enqueue) are now performed
    // as a batch in processAsyncCallbacks before this method is called, so that
    // all same-delay callbacks appear in the queue simultaneously.
    const taskItemId = `task-${timer.id}`;

    // Snapshot: event loop is about to pick this specific timer's callback.
    this.eventLoop = {
      phase: 'checking-tasks',
      description: 'Timer completed — checking Task Queue',
    };
    this.snapshot(0, 0, description.timerFired({ delay: timer.delay }), '');

    // Step 3: Event Loop picks task — snapshot while item is still in queue so
    // the UI shows what is being picked, then remove it before execution.
    this.webAPIs = this.webAPIs.filter((w) => w.id !== timer.id);
    this.eventLoop = {
      phase: 'picking-task',
      description: 'Moving callback from Task Queue to Call Stack',
    };
    this.snapshot(0, 0, description.eventLoopPickingTask(), '');
    this.taskQueue = this.taskQueue.filter((q) => q.id !== taskItemId);

    // Step 4: Execute the callback body
    const resolvedFn = timer.resolvedFnValue;
    const callbackNode = resolvedFn
      ? null
      : (timer.callbackNode as
          | FunctionExpressionNode
          | ArrowFunctionExpressionNode);

    const iterationLabel =
      timer.type === 'setInterval'
        ? ` (iteration ${timer.intervalCount + 1})`
        : '';
    const execDescription = `Executing ${timer.type} callback${iterationLabel}`;

    // Determine frame name: use named function id, or identifier name, or "callback"
    const fnIdName =
      resolvedFn != null
        ? timer.callbackSource // identifier name (e.g. "logB")
        : ((callbackNode as FunctionExpressionNode)?.id?.name ?? 'callback');

    // Inject captured closure envs so the callback can access closed-over variables.
    const capturedCount = timer.capturedEnvStack.length;
    if (capturedCount > 0) {
      this.envStack.splice(1, 0, ...timer.capturedEnvStack);
    }

    // Also inject closure envs from FunctionValue itself (for identifier references)
    const fnCapturedMeta = resolvedFn?.capturedEnvMeta ?? [];
    const fnCapturedEnvs = fnCapturedMeta.map((m) => m.env);
    const fnCapturedCount = fnCapturedEnvs.length;
    if (fnCapturedCount > 0) {
      this.envStack.splice(1, 0, ...fnCapturedEnvs);
    }

    const lineNum = callbackNode ? (callbackNode.loc?.start.line ?? 0) : 0;
    const colNum = callbackNode ? (callbackNode.loc?.start.column ?? 0) : 0;

    this.pushFrame(fnIdName, lineNum, colNum, []);
    this.eventLoop = {
      phase: 'executing-task',
      description: 'Executing callback',
    };
    this.snapshot(0, 0, execDescription, timer.callbackSource);

    this.hasReturned = false;
    this.returnValue = undefined;

    if (callbackNode) {
      if (
        callbackNode.type === 'ArrowFunctionExpression' &&
        callbackNode.expression
      ) {
        this.evaluateExpression(callbackNode.body as ExpressionNode);
      } else {
        this.visitBlockStatement(callbackNode.body as BlockStatementNode);
      }
    } else if (resolvedFn) {
      this.visitBlockStatement(resolvedFn.body as BlockStatementNode);
    }

    this.hasReturned = false;
    this.returnValue = undefined;

    this.popFrame();

    // Remove injected closure envs (fn-value envs first, then captured envs)
    if (fnCapturedCount > 0) {
      this.envStack.splice(1, fnCapturedCount);
    }
    if (capturedCount > 0) {
      this.envStack.splice(1, capturedCount);
    }
    this.eventLoop = {
      phase: 'checking-tasks',
      description: 'Callback done — checking for more tasks',
    };
    this.snapshot(0, 0, description.callbackExecutionCompleted(), '');

    // Step 5: For setInterval, re-register if under iteration limit
    if (timer.type === 'setInterval' && !timer.cancelled) {
      const nextCount = timer.intervalCount + 1;
      if (nextCount < MAX_INTERVAL_ITERATIONS) {
        const newWebApiId = generateId('webapi', this.webAPICounter++);
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
          type: 'setInterval',
          label: 'setInterval',
          callback: timer.callbackSource,
          delay: timer.delay,
          elapsed: 0,
          status: 'running',
        });
        this.snapshot(
          0,
          0,
          description.intervalRegistered({ delay: timer.delay }),
          ''
        );
      } else {
        this.snapshot(0, 0, description.setIntervalLimitReached(), '');
      }
    }
  }

  // === Core internal methods ===

  private snapshot(
    line: number,
    column: number,
    description: string,
    code: string
  ): void {
    // Refresh closure scope displays from live env references before cloning
    this.syncClosureScopeDisplays();

    if (this.stepIndex >= MAX_STEPS) {
      if (this.stepIndex === MAX_STEPS) {
        this.steps.push({
          index: this.stepIndex,
          line,
          column,
          description: 'Execution limit reached (2000 steps)',
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
    const frameId = generateId('frame', this.frameCounter);
    const color = getFrameColor(this.frameCounter++);
    const isModule = this.isModuleMode;

    const frame: CallStackFrame = {
      id: frameId,
      name: isModule ? '<module>' : '<global>',
      type: 'global',
      line: 1,
      column: 0,
      scope: {
        name: isModule ? 'Module' : 'Global',
        type: 'global',
        variables: [],
      },
      color,
    };

    const memoryBlock: MemoryBlock = {
      frameId,
      label: isModule ? 'Module Scope' : 'Global Memory',
      type: isModule ? 'module' : 'global',
      color,
      entries: [],
    };

    this.globalMemoryBlock = memoryBlock;

    this.callStack.push(frame);
    this.memoryBlocks.push(memoryBlock);
    this.envStack.push(this.globalEnv);
    this.envKindsMap.set(this.globalEnv, {});

    this.scopes.push({
      name: isModule ? 'Module' : 'Global',
      type: 'global',
      variables: [],
    });

    this.eventLoop = {
      phase: 'executing-task',
      description: 'Executing synchronous code',
    };

    this.snapshot(1, 0, description.startingExecution(isModule), '');
  }

  private pushFrame(
    name: string,
    line: number,
    column: number,
    params: Array<{ name: string; value: unknown }>
  ): void {
    const frameId = generateId('frame', this.frameCounter);
    const color = getFrameColor(this.frameCounter++);

    const frame: CallStackFrame = {
      id: frameId,
      name,
      type: 'function',
      line,
      column,
      scope: {
        name,
        type: 'function',
        variables: params.map((p) => ({
          name: p.name,
          value: p.value,
          kind: 'param' as VariableKind,
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
        kind: 'param' as const,
        valueType: resolved.valueType,
        displayValue: resolved.displayValue,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
      };
    });

    const memoryBlock: MemoryBlock = {
      frameId,
      label: `Local: ${name}`,
      type: 'local',
      color,
      entries,
    };

    this.callStack.push(frame);
    this.memoryBlocks.push(memoryBlock);

    // Create new local environment
    const localEnv: Record<string, unknown> = {};
    const localKinds: Record<string, VariableKind | 'param' | 'function'> = {};
    for (const p of params) {
      localEnv[p.name] = p.value;
      localKinds[p.name] = 'param';
    }
    this.envStack.push(localEnv);
    this.envKindsMap.set(localEnv, localKinds);

    this.scopes.push({
      name,
      type: 'function',
      variables: params.map((p) => ({
        name: p.name,
        value: p.value,
        kind: 'param' as VariableKind,
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
        (b) => b.frameId === frame.id
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
    return this.callStack[this.callStack.length - 1]?.id ?? '';
  }

  private getCurrentFrameName(): string {
    return this.callStack[this.callStack.length - 1]?.name ?? '<global>';
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
    updates: Partial<MemoryEntry>
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
    type: 'object' | 'array' | 'function',
    label: string,
    properties?: HeapObjectProperty[],
    functionSource?: string
  ): HeapObject {
    const id = generateId('heap', this.heapCounter++);
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
      id: generateId('console', this.consoleCounter++),
      method,
      args,
      timestamp: this.stepIndex,
    };
    this.consoleOutput.push(entry);
  }

  private addWebAPIEntry(
    type: 'setTimeout' | 'setInterval',
    callback: string,
    delay: number
  ): string {
    const id = generateId('webapi', this.webAPICounter++);
    const entry: WebAPIEntry = {
      id,
      type,
      label: type,
      callback,
      delay,
      elapsed: 0,
      status: 'running',
    };
    this.webAPIs.push(entry);
    return id;
  }

  private recordVarKind(
    name: string,
    kind: VariableKind | 'param' | 'function'
  ): void {
    const env = this.getCurrentEnv();
    const kinds = this.envKindsMap.get(env);
    if (kinds) {
      kinds[name] = kind;
    } else {
      this.envKindsMap.set(env, { [name]: kind });
    }
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
    isNewDeclaration: boolean = false
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
    // Handle ClassValue FIRST — plain object, must intercept before generic object path
    if (this.isClassValue(value)) {
      const heapObj = this.heap.find((h) => h.id === value.heapObjectId);
      if (heapObj) {
        return {
          value,
          displayValue: 'ⓕ',
          valueType: 'function',
          heapReferenceId: heapObj.id,
          pointerColor: heapObj.color,
        };
      }
    }

    // Handle FunctionValue FIRST — it's a plain object so getValueType returns "object"
    // We must intercept it before the generic object path.
    if (this.isFunctionValue(value)) {
      const existingId = this.objectHeapMap.get(value);
      if (existingId) {
        const existing = this.heap.find((h) => h.id === existingId);
        if (existing) {
          return {
            value,
            displayValue: 'ⓕ',
            valueType: 'function',
            heapReferenceId: existing.id,
            pointerColor: existing.color,
          };
        }
      }
      const heapObj = this.addHeapObject(
        'function',
        'ⓕ',
        undefined,
        value.source
      );
      this.objectHeapMap.set(value, heapObj.id);
      // Attach closure scope if this function has captured envs
      const closureScope = this.buildClosureScopeEntries(value.capturedEnvMeta);
      if (closureScope.length > 0) {
        heapObj.closureScope = closureScope;
        this.closureLiveEnvMap.set(heapObj.id, value.capturedEnvMeta!);
      }
      return {
        value,
        displayValue: 'ⓕ',
        valueType: 'function',
        heapReferenceId: heapObj.id,
        pointerColor: heapObj.color,
      };
    }

    const valueType = getValueType(value);
    const display = displayValue(value);

    // Handle Promise wrappers — link to existing heap object
    if (this.isPromiseWrapper(value)) {
      const promiseId = (value as PromiseWrapper).promiseId;
      const internalPromise = this.promises.get(promiseId);
      if (internalPromise) {
        const heapObj = this.heap.find(
          (h) => h.id === internalPromise.heapObjectId
        );
        if (heapObj) {
          return {
            value,
            displayValue: '[Pointer]',
            valueType: 'object',
            heapReferenceId: heapObj.id,
            pointerColor: heapObj.color,
          };
        }
      }
    }

    if (valueType === 'primitive') {
      return {
        value,
        displayValue: display,
        valueType,
      };
    }

    if (valueType === 'function') {
      // Check if it's a wrapped function we created
      if (this.isFunctionValue(value)) {
        // Reuse existing heap entry if this exact function object was already tracked
        const existingId = this.objectHeapMap.get(value);
        if (existingId) {
          const existing = this.heap.find((h) => h.id === existingId);
          if (existing) {
            return {
              value,
              displayValue: 'ⓕ',
              valueType: 'function',
              heapReferenceId: existing.id,
              pointerColor: existing.color,
            };
          }
        }
        const heapObj = this.addHeapObject(
          'function',
          'ⓕ',
          undefined,
          value.source
        );
        this.objectHeapMap.set(value, heapObj.id);
        // Attach closure scope if this function has captured envs
        const closureScope = this.buildClosureScopeEntries(
          value.capturedEnvMeta
        );
        if (closureScope.length > 0) {
          heapObj.closureScope = closureScope;
          this.closureLiveEnvMap.set(heapObj.id, value.capturedEnvMeta!);
        }
        return {
          value,
          displayValue: 'ⓕ',
          valueType: 'function',
          heapReferenceId: heapObj.id,
          pointerColor: heapObj.color,
        };
      }
      return {
        value,
        displayValue: 'ⓕ',
        valueType: 'function',
      };
    }

    // Object or array — check map first to share references
    if (Array.isArray(value)) {
      const existingId = this.objectHeapMap.get(value);
      if (existingId) {
        const existing = this.heap.find((h) => h.id === existingId);
        if (existing) {
          return {
            value,
            displayValue: '[Pointer]',
            valueType: 'object',
            heapReferenceId: existing.id,
            pointerColor: existing.color,
          };
        }
      }

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
      const heapObj = this.addHeapObject('array', label, properties);
      this.objectHeapMap.set(value, heapObj.id);

      return {
        value,
        displayValue: '[Pointer]',
        valueType: 'object',
        heapReferenceId: heapObj.id,
        pointerColor: heapObj.color,
      };
    }

    if (typeof value === 'object' && value !== null) {
      const existingId = this.objectHeapMap.get(value);
      if (existingId) {
        const existing = this.heap.find((h) => h.id === existingId);
        if (existing) {
          return {
            value,
            displayValue: '[Pointer]',
            valueType: 'object',
            heapReferenceId: existing.id,
            pointerColor: existing.color,
          };
        }
      }

      const properties: HeapObjectProperty[] = Object.entries(
        value as Record<string, unknown>
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
      const heapObj = this.addHeapObject('object', label, properties);
      this.objectHeapMap.set(value, heapObj.id);

      return {
        value,
        displayValue: '[Pointer]',
        valueType: 'object',
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

    if (valueType === 'primitive') {
      return {
        value,
        displayValue: display,
        valueType,
      };
    }

    // For nested objects, we check if they already exist in the heap
    // For simplicity, just display placeholders
    if (valueType === 'function') {
      return {
        value,
        displayValue: 'ⓕ',
        valueType: 'function',
      };
    }

    if (Array.isArray(value)) {
      return {
        value,
        displayValue: generateObjectLabel(value),
        valueType: 'object',
      };
    }

    return {
      value,
      displayValue: generateObjectLabel(value),
      valueType: 'object',
    };
  }

  private isFunctionValue(value: unknown): value is FunctionValue {
    return (
      typeof value === 'object' &&
      value !== null &&
      '__isFunction' in value &&
      (value as FunctionValue).__isFunction === true
    );
  }

  private isClassValue(value: unknown): value is ClassValue {
    return (
      typeof value === 'object' &&
      value !== null &&
      '__isClass' in value &&
      (value as ClassValue).__isClass === true
    );
  }

  private isBuiltinFn(value: unknown): value is BuiltinFn {
    return (
      typeof value === 'object' &&
      value !== null &&
      '__isBuiltin' in value &&
      (value as BuiltinFn).__isBuiltin === true
    );
  }

  private isGeneratorWrapper(value: unknown): value is GeneratorWrapper {
    return (
      typeof value === 'object' &&
      value !== null &&
      '__isGenerator' in value &&
      (value as GeneratorWrapper).__isGenerator === true
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
      case 'VariableDeclaration':
        this.visitVariableDeclaration(node as VariableDeclarationNode);
        break;
      case 'FunctionDeclaration':
        this.visitFunctionDeclaration(node as FunctionDeclarationNode);
        break;
      case 'ExpressionStatement':
        this.visitExpressionStatement(node as ExpressionStatementNode);
        break;
      case 'IfStatement':
        this.visitIfStatement(node as IfStatementNode);
        break;
      case 'ForStatement':
        this.visitForStatement(node as ForStatementNode);
        break;
      case 'ForOfStatement':
        this.visitForOfStatement(node as ForOfStatementNode);
        break;
      case 'WhileStatement':
        this.visitWhileStatement(node as WhileStatementNode);
        break;
      case 'BlockStatement':
        this.visitBlockStatement(node as BlockStatementNode);
        break;
      case 'ReturnStatement':
        this.visitReturnStatement(node as ReturnStatementNode);
        break;
      case 'TryStatement':
        this.visitTryStatement(node as TryStatementNode);
        break;
      case 'ThrowStatement':
        this.visitThrowStatement(node as ThrowStatementNode);
        break;
      case 'BreakStatement':
        this.visitBreakStatement(node as BreakStatementNode);
        break;
      case 'ContinueStatement':
        this.visitContinueStatement(node as ContinueStatementNode);
        break;
      case 'ClassDeclaration':
        this.visitClassDeclaration(node as ClassDeclarationNode);
        break;
      case 'ImportDeclaration':
        this.visitImportDeclaration(node as ImportDeclarationNode);
        break;
      case 'ExportNamedDeclaration':
        this.visitExportNamedDeclaration(node as ExportNamedDeclarationNode);
        break;
      case 'ExportDefaultDeclaration':
        this.visitExportDefaultDeclaration(
          node as ExportDefaultDeclarationNode
        );
        break;
      default:
        // Unsupported statement - skip gracefully
        console.warn(`Unsupported statement type: ${node.type}`);
    }
  }

  private visitVariableDeclaration(
    node: VariableDeclarationNode,
    isExported: boolean = false
  ): void {
    const kind = node.kind;

    for (const declarator of node.declarations) {
      const code = extractSource(this.sourceCode, declarator);

      // Handle different pattern types
      if (declarator.id.type === 'Identifier') {
        // Simple variable declaration
        this.handleSimpleVariableDeclaration(
          declarator,
          kind,
          code,
          isExported
        );
      } else if (declarator.id.type === 'ObjectPattern') {
        // Object destructuring
        this.handleObjectDestructuring(
          declarator.id as ObjectPatternNode,
          declarator.init,
          kind,
          code,
          isExported
        );
      } else if (declarator.id.type === 'ArrayPattern') {
        // Array destructuring
        this.handleArrayDestructuring(
          declarator.id as ArrayPatternNode,
          declarator.init,
          kind,
          code,
          isExported
        );
      }
    }
  }

  private handleSimpleVariableDeclaration(
    declarator: VariableDeclaratorNode,
    kind: string,
    code: string,
    isExported: boolean = false
  ): void {
    const name = (declarator.id as IdentifierNode).name;
    let value: unknown = undefined;
    let resolved: ResolvedValue;

    if (declarator.init) {
      // Check for function expression or arrow function
      if (
        declarator.init.type === 'FunctionExpression' ||
        declarator.init.type === 'ArrowFunctionExpression'
      ) {
        const funcNode = declarator.init as
          | FunctionExpressionNode
          | ArrowFunctionExpressionNode;
        const funcValue = this.createFunctionValue(funcNode);
        value = funcValue;

        // For arrow functions, prefix with the declaration so the label can be extracted
        const heapFunctionSource =
          funcNode.type === 'ArrowFunctionExpression'
            ? `${kind} ${name} = ${funcValue.source}`
            : funcValue.source;

        // Create heap object for function
        const heapObj = this.addHeapObject(
          'function',
          'ⓕ',
          undefined,
          heapFunctionSource
        );
        this.objectHeapMap.set(funcValue, heapObj.id);

        // Attach closure scope to heap object if inside a nested scope
        const closureScope = this.buildClosureScopeEntries(
          funcValue.capturedEnvMeta
        );
        if (closureScope.length > 0) {
          heapObj.closureScope = closureScope;
          this.closureLiveEnvMap.set(heapObj.id, funcValue.capturedEnvMeta!);
        }

        resolved = {
          value: funcValue,
          displayValue: 'ⓕ',
          valueType: 'function',
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
        displayValue: 'undefined',
        valueType: 'primitive',
      };
    }

    // Store in environment
    this.setVariable(name, value, true);
    this.recordVarKind(name, kind as VariableKind);

    // Add to current frame's memory
    const entry: MemoryEntry = {
      name,
      kind: kind as VariableKind,
      valueType: resolved.valueType,
      displayValue: resolved.displayValue,
      heapReferenceId: resolved.heapReferenceId,
      pointerColor: resolved.pointerColor,
      isExported: isExported || undefined,
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
      description.declaringVariable({
        kind,
        name,
        displayValue: resolved.displayValue,
        isExported,
      }),
      code
    );
  }

  private handleObjectDestructuring(
    pattern: ObjectPatternNode,
    init: ExpressionNode | null,
    kind: string,
    code: string,
    isExported: boolean = false
  ): void {
    // Evaluate the source object
    const sourceValue = init ? this.evaluateExpression(init) : undefined;
    const sourceObj = (sourceValue as Record<string, unknown>) ?? {};
    const sourceName =
      init?.type === 'Identifier' ? (init as IdentifierNode).name : 'object';

    // Process each property in the pattern
    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') {
        // Handle ...rest
        const restNode = prop as RestElementNode;
        const restName = (restNode.argument as IdentifierNode).name;

        // Collect remaining properties (not already destructured)
        const usedKeys = pattern.properties
          .filter((p) => p.type === 'Property')
          .map((p) => {
            const propNode = p as PropertyNode;
            return propNode.key.type === 'Identifier'
              ? (propNode.key as IdentifierNode).name
              : String((propNode.key as LiteralNode).value);
          });

        const restObj: Record<string, unknown> = {};
        for (const key of Object.keys(sourceObj)) {
          if (!usedKeys.includes(key)) {
            restObj[key] = sourceObj[key];
          }
        }

        // Create heap object for rest
        const restResolved = this.resolveValueForMemory(restObj);
        this.setVariable(restName, restObj, true);
        this.recordVarKind(restName, kind as VariableKind);

        const entry: MemoryEntry = {
          name: restName,
          kind: kind as VariableKind,
          valueType: restResolved.valueType,
          displayValue: restResolved.displayValue,
          heapReferenceId: restResolved.heapReferenceId,
          pointerColor: restResolved.pointerColor,
          isDestructured: true,
          isExported: isExported || undefined,
        };
        this.addMemoryEntry(this.getCurrentFrameId(), entry);
        this.addToCurrentScope(restName, restObj, kind as VariableKind);

        this.snapshot(
          this.getLine(prop),
          this.getColumn(prop),
          description.destructuringRest({ restName, kind: 'object' }),
          code
        );
        continue;
      }

      // Regular property
      const propNode = prop as PropertyNode;
      const keyName =
        propNode.key.type === 'Identifier'
          ? (propNode.key as IdentifierNode).name
          : String((propNode.key as LiteralNode).value);

      // Get the variable name and possibly default value
      let varName: string;
      let defaultValue: unknown = undefined;
      const valuePattern = propNode.value;

      // Handle rename: { name: firstName }
      if (valuePattern.type === 'Identifier') {
        varName = (valuePattern as IdentifierNode).name;
      } else if (valuePattern.type === 'AssignmentPattern') {
        // Handle default: { x = 10 }
        const assignPattern = valuePattern as AssignmentPatternNode;
        varName = (assignPattern.left as IdentifierNode).name;
        defaultValue = this.evaluateExpression(assignPattern.right);
      } else if (valuePattern.type === 'ObjectPattern') {
        // Nested object destructuring: { address: { city } }
        const nestedValue = sourceObj[keyName] as
          | Record<string, unknown>
          | undefined;
        this.handleObjectDestructuring(
          valuePattern as ObjectPatternNode,
          null,
          kind,
          code,
          isExported
        );
        // Manually set the source for nested destructuring
        const nestedPattern = valuePattern as ObjectPatternNode;
        for (const nestedProp of nestedPattern.properties) {
          if (nestedProp.type === 'Property') {
            const nestedKeyName =
              (nestedProp as PropertyNode).key.type === 'Identifier'
                ? ((nestedProp as PropertyNode).key as IdentifierNode).name
                : String(
                    ((nestedProp as PropertyNode).key as LiteralNode).value
                  );
            const nestedVarName = (
              (nestedProp as PropertyNode).value as IdentifierNode
            ).name;
            const nestedVal = nestedValue?.[nestedKeyName];
            this.setVariable(nestedVarName, nestedVal, true);
          }
        }
        continue;
      } else if (valuePattern.type === 'ArrayPattern') {
        // Nested array destructuring
        const nestedValue = sourceObj[keyName] as unknown[] | undefined;
        this.handleArrayDestructuringWithSource(
          valuePattern as ArrayPatternNode,
          nestedValue ?? [],
          kind,
          code,
          isExported
        );
        continue;
      } else {
        varName = keyName; // shorthand: { name } -> name = name
      }

      // Get the value from source
      let value = sourceObj[keyName];
      if (value === undefined && defaultValue !== undefined) {
        value = defaultValue;
      }

      // Resolve for memory display
      const resolved = this.resolveValueForMemory(value);

      // Store in environment
      this.setVariable(varName, value, true);
      this.recordVarKind(varName, kind as VariableKind);

      // Add to current frame's memory
      const entry: MemoryEntry = {
        name: varName,
        kind: kind as VariableKind,
        valueType: resolved.valueType,
        displayValue: resolved.displayValue,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
        isDestructured: true,
        isExported: isExported || undefined,
      };

      this.addMemoryEntry(this.getCurrentFrameId(), entry);
      this.addToCurrentScope(varName, value, kind as VariableKind);

      this.snapshot(
        this.getLine(prop),
        this.getColumn(prop),
        description.destructuringVariable({
          varName,
          displayValue: resolved.displayValue,
          sourceName,
        }),
        code
      );
    }
  }

  private handleArrayDestructuring(
    pattern: ArrayPatternNode,
    init: ExpressionNode | null,
    kind: string,
    code: string,
    isExported: boolean = false
  ): void {
    // Evaluate the source array
    const sourceValue = init ? this.evaluateExpression(init) : [];
    const sourceArr = (sourceValue as unknown[]) ?? [];

    this.handleArrayDestructuringWithSource(
      pattern,
      sourceArr,
      kind,
      code,
      isExported
    );
  }

  private handleArrayDestructuringWithSource(
    pattern: ArrayPatternNode,
    sourceArr: unknown[],
    kind: string,
    code: string,
    isExported: boolean = false
  ): void {
    // Process each element in the pattern
    for (let i = 0; i < pattern.elements.length; i++) {
      const element = pattern.elements[i];

      // Skip holes: const [a, , c] = [1, 2, 3]
      if (element === null) {
        continue;
      }

      if (element.type === 'RestElement') {
        // Handle ...rest
        const restNode = element as RestElementNode;
        const restName = (restNode.argument as IdentifierNode).name;
        const restArr = sourceArr.slice(i);

        const restResolved = this.resolveValueForMemory(restArr);
        this.setVariable(restName, restArr, true);
        this.recordVarKind(restName, kind as VariableKind);

        const entry: MemoryEntry = {
          name: restName,
          kind: kind as VariableKind,
          valueType: restResolved.valueType,
          displayValue: restResolved.displayValue,
          heapReferenceId: restResolved.heapReferenceId,
          pointerColor: restResolved.pointerColor,
          isDestructured: true,
          isExported: isExported || undefined,
        };
        this.addMemoryEntry(this.getCurrentFrameId(), entry);
        this.addToCurrentScope(restName, restArr, kind as VariableKind);

        this.snapshot(
          this.getLine(element),
          this.getColumn(element),
          description.destructuringRest({ restName, kind: 'array' }),
          code
        );
        break; // Rest must be last
      }

      let varName: string;
      let defaultValue: unknown = undefined;

      if (element.type === 'Identifier') {
        varName = (element as IdentifierNode).name;
      } else if (element.type === 'AssignmentPattern') {
        const assignPattern = element as AssignmentPatternNode;
        varName = (assignPattern.left as IdentifierNode).name;
        defaultValue = this.evaluateExpression(assignPattern.right);
      } else if (element.type === 'ObjectPattern') {
        // Nested object destructuring in array
        const nestedValue = sourceArr[i] as Record<string, unknown> | undefined;
        this.handleObjectDestructuringWithSource(
          element as ObjectPatternNode,
          nestedValue ?? {},
          kind,
          code,
          isExported
        );
        continue;
      } else if (element.type === 'ArrayPattern') {
        // Nested array destructuring
        const nestedValue = sourceArr[i] as unknown[] | undefined;
        this.handleArrayDestructuringWithSource(
          element as ArrayPatternNode,
          nestedValue ?? [],
          kind,
          code,
          isExported
        );
        continue;
      } else {
        continue;
      }

      // Get the value from source
      let value = sourceArr[i];
      if (value === undefined && defaultValue !== undefined) {
        value = defaultValue;
      }

      const resolved = this.resolveValueForMemory(value);

      this.setVariable(varName, value, true);
      this.recordVarKind(varName, kind as VariableKind);

      const entry: MemoryEntry = {
        name: varName,
        kind: kind as VariableKind,
        valueType: resolved.valueType,
        displayValue: resolved.displayValue,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
        isDestructured: true,
        isExported: isExported || undefined,
      };

      this.addMemoryEntry(this.getCurrentFrameId(), entry);
      this.addToCurrentScope(varName, value, kind as VariableKind);

      this.snapshot(
        this.getLine(element),
        this.getColumn(element),
        description.destructuringVariable({
          varName,
          displayValue: resolved.displayValue,
        }),
        code
      );
    }
  }

  private handleObjectDestructuringWithSource(
    pattern: ObjectPatternNode,
    sourceObj: Record<string, unknown>,
    kind: string,
    code: string,
    isExported: boolean = false
  ): void {
    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') {
        const restNode = prop as RestElementNode;
        const restName = (restNode.argument as IdentifierNode).name;

        const usedKeys = pattern.properties
          .filter((p) => p.type === 'Property')
          .map((p) => {
            const propNode = p as PropertyNode;
            return propNode.key.type === 'Identifier'
              ? (propNode.key as IdentifierNode).name
              : String((propNode.key as LiteralNode).value);
          });

        const restObj: Record<string, unknown> = {};
        for (const key of Object.keys(sourceObj)) {
          if (!usedKeys.includes(key)) {
            restObj[key] = sourceObj[key];
          }
        }

        const restResolved = this.resolveValueForMemory(restObj);
        this.setVariable(restName, restObj, true);
        this.recordVarKind(restName, kind as VariableKind);

        const entry: MemoryEntry = {
          name: restName,
          kind: kind as VariableKind,
          valueType: restResolved.valueType,
          displayValue: restResolved.displayValue,
          heapReferenceId: restResolved.heapReferenceId,
          pointerColor: restResolved.pointerColor,
          isDestructured: true,
          isExported: isExported || undefined,
        };
        this.addMemoryEntry(this.getCurrentFrameId(), entry);
        this.addToCurrentScope(restName, restObj, kind as VariableKind);

        this.snapshot(
          this.getLine(prop),
          this.getColumn(prop),
          description.destructuringRest({ restName, kind: 'object' }),
          code
        );
        continue;
      }

      const propNode = prop as PropertyNode;
      const keyName =
        propNode.key.type === 'Identifier'
          ? (propNode.key as IdentifierNode).name
          : String((propNode.key as LiteralNode).value);

      let varName: string;
      let defaultValue: unknown = undefined;
      const valuePattern = propNode.value;

      if (valuePattern.type === 'Identifier') {
        varName = (valuePattern as IdentifierNode).name;
      } else if (valuePattern.type === 'AssignmentPattern') {
        const assignPattern = valuePattern as AssignmentPatternNode;
        varName = (assignPattern.left as IdentifierNode).name;
        defaultValue = this.evaluateExpression(assignPattern.right);
      } else if (valuePattern.type === 'ObjectPattern') {
        const nestedValue = sourceObj[keyName] as
          | Record<string, unknown>
          | undefined;
        this.handleObjectDestructuringWithSource(
          valuePattern as ObjectPatternNode,
          nestedValue ?? {},
          kind,
          code,
          isExported
        );
        continue;
      } else if (valuePattern.type === 'ArrayPattern') {
        const nestedValue = sourceObj[keyName] as unknown[] | undefined;
        this.handleArrayDestructuringWithSource(
          valuePattern as ArrayPatternNode,
          nestedValue ?? [],
          kind,
          code,
          isExported
        );
        continue;
      } else {
        varName = keyName;
      }

      let value = sourceObj[keyName];
      if (value === undefined && defaultValue !== undefined) {
        value = defaultValue;
      }

      const resolved = this.resolveValueForMemory(value);
      this.setVariable(varName, value, true);
      this.recordVarKind(varName, kind as VariableKind);

      const entry: MemoryEntry = {
        name: varName,
        kind: kind as VariableKind,
        valueType: resolved.valueType,
        displayValue: resolved.displayValue,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
        isDestructured: true,
        isExported: isExported || undefined,
      };

      this.addMemoryEntry(this.getCurrentFrameId(), entry);
      this.addToCurrentScope(varName, value, kind as VariableKind);

      this.snapshot(
        this.getLine(prop),
        this.getColumn(prop),
        description.destructuringVariable({
          varName,
          displayValue: resolved.displayValue,
        }),
        code
      );
    }
  }

  private addToCurrentScope(
    name: string,
    value: unknown,
    kind: VariableKind
  ): void {
    const currentScope = this.scopes[this.scopes.length - 1];
    if (currentScope) {
      currentScope.variables.push({ name, value, kind });
    }
    const currentFrame = this.callStack[this.callStack.length - 1];
    if (currentFrame) {
      currentFrame.scope.variables.push({ name, value, kind });
    }
  }

  /**
   * Handle destructuring patterns in function parameters.
   * Called after pushFrame to bind destructured variables.
   */
  private handleParameterDestructuring(
    funcValue: FunctionValue,
    args: unknown[]
  ): void {
    const paramNodes = funcValue.paramNodes;
    if (!paramNodes) return;

    for (let i = 0; i < paramNodes.length; i++) {
      const paramNode = paramNodes[i];
      const argValue = args[i];

      if (paramNode.type === 'ObjectPattern') {
        this.destructureObjectParam(paramNode as ObjectPatternNode, argValue);
      } else if (paramNode.type === 'ArrayPattern') {
        this.destructureArrayParam(paramNode as ArrayPatternNode, argValue);
      } else if (
        paramNode.type === 'AssignmentPattern' &&
        argValue === undefined
      ) {
        // Default parameter: apply default value when argument is missing/undefined
        const assignPattern = paramNode as AssignmentPatternNode;
        const varName = (assignPattern.left as IdentifierNode).name;
        const defaultValue = this.evaluateExpression(assignPattern.right);
        this.setVariable(varName, defaultValue, true);
        // Update memory block entry to reflect the default value
        const resolved = this.resolveValueForMemory(defaultValue);
        const currentBlock = this.memoryBlocks[this.memoryBlocks.length - 1];
        if (currentBlock) {
          const entry = currentBlock.entries.find((e) => e.name === varName);
          if (entry) {
            entry.valueType = resolved.valueType;
            entry.displayValue = resolved.displayValue;
            entry.heapReferenceId = resolved.heapReferenceId;
            entry.pointerColor = resolved.pointerColor;
          }
        }
      }
      // Identifier params are already handled by pushFrame
    }
  }

  private destructureObjectParam(
    pattern: ObjectPatternNode,
    value: unknown
  ): void {
    const sourceObj = (value as Record<string, unknown>) ?? {};

    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') {
        const restNode = prop as RestElementNode;
        const restName = (restNode.argument as IdentifierNode).name;

        const usedKeys = pattern.properties
          .filter((p) => p.type === 'Property')
          .map((p) => {
            const propNode = p as PropertyNode;
            return propNode.key.type === 'Identifier'
              ? (propNode.key as IdentifierNode).name
              : String((propNode.key as LiteralNode).value);
          });

        const restObj: Record<string, unknown> = {};
        for (const key of Object.keys(sourceObj)) {
          if (!usedKeys.includes(key)) {
            restObj[key] = sourceObj[key];
          }
        }

        const resolved = this.resolveValueForMemory(restObj);
        this.setVariable(restName, restObj, true);
        this.recordVarKind(restName, 'param');

        const entry: MemoryEntry = {
          name: restName,
          kind: 'param',
          valueType: resolved.valueType,
          displayValue: resolved.displayValue,
          heapReferenceId: resolved.heapReferenceId,
          pointerColor: resolved.pointerColor,
          isDestructured: true,
        };
        this.addMemoryEntry(this.getCurrentFrameId(), entry);
        this.addToCurrentScope(restName, restObj, 'param' as VariableKind);
        continue;
      }

      const propNode = prop as PropertyNode;
      const keyName =
        propNode.key.type === 'Identifier'
          ? (propNode.key as IdentifierNode).name
          : String((propNode.key as LiteralNode).value);

      let varName: string;
      let defaultValue: unknown = undefined;
      const valuePattern = propNode.value;

      if (valuePattern.type === 'Identifier') {
        varName = (valuePattern as IdentifierNode).name;
      } else if (valuePattern.type === 'AssignmentPattern') {
        const assignPattern = valuePattern as AssignmentPatternNode;
        varName = (assignPattern.left as IdentifierNode).name;
        defaultValue = this.evaluateExpression(assignPattern.right);
      } else if (valuePattern.type === 'ObjectPattern') {
        this.destructureObjectParam(
          valuePattern as ObjectPatternNode,
          sourceObj[keyName]
        );
        continue;
      } else if (valuePattern.type === 'ArrayPattern') {
        this.destructureArrayParam(
          valuePattern as ArrayPatternNode,
          sourceObj[keyName] as unknown[]
        );
        continue;
      } else {
        varName = keyName;
      }

      let paramValue = sourceObj[keyName];
      if (paramValue === undefined && defaultValue !== undefined) {
        paramValue = defaultValue;
      }

      const resolved = this.resolveValueForMemory(paramValue);
      this.setVariable(varName, paramValue, true);
      this.recordVarKind(varName, 'param');

      const entry: MemoryEntry = {
        name: varName,
        kind: 'param',
        valueType: resolved.valueType,
        displayValue: resolved.displayValue,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
        isDestructured: true,
      };
      this.addMemoryEntry(this.getCurrentFrameId(), entry);
      this.addToCurrentScope(varName, paramValue, 'param' as VariableKind);
    }
  }

  private destructureArrayParam(
    pattern: ArrayPatternNode,
    value: unknown
  ): void {
    const sourceArr = (value as unknown[]) ?? [];

    for (let i = 0; i < pattern.elements.length; i++) {
      const element = pattern.elements[i];
      if (element === null) continue;

      if (element.type === 'RestElement') {
        const restNode = element as RestElementNode;
        const restName = (restNode.argument as IdentifierNode).name;
        const restArr = sourceArr.slice(i);

        const resolved = this.resolveValueForMemory(restArr);
        this.setVariable(restName, restArr, true);
        this.recordVarKind(restName, 'param');

        const entry: MemoryEntry = {
          name: restName,
          kind: 'param',
          valueType: resolved.valueType,
          displayValue: resolved.displayValue,
          heapReferenceId: resolved.heapReferenceId,
          pointerColor: resolved.pointerColor,
          isDestructured: true,
        };
        this.addMemoryEntry(this.getCurrentFrameId(), entry);
        this.addToCurrentScope(restName, restArr, 'param' as VariableKind);
        break;
      }

      let varName: string;
      let defaultValue: unknown = undefined;

      if (element.type === 'Identifier') {
        varName = (element as IdentifierNode).name;
      } else if (element.type === 'AssignmentPattern') {
        const assignPattern = element as AssignmentPatternNode;
        varName = (assignPattern.left as IdentifierNode).name;
        defaultValue = this.evaluateExpression(assignPattern.right);
      } else if (element.type === 'ObjectPattern') {
        this.destructureObjectParam(element as ObjectPatternNode, sourceArr[i]);
        continue;
      } else if (element.type === 'ArrayPattern') {
        this.destructureArrayParam(
          element as ArrayPatternNode,
          sourceArr[i] as unknown[]
        );
        continue;
      } else {
        continue;
      }

      let paramValue = sourceArr[i];
      if (paramValue === undefined && defaultValue !== undefined) {
        paramValue = defaultValue;
      }

      const resolved = this.resolveValueForMemory(paramValue);
      this.setVariable(varName, paramValue, true);
      this.recordVarKind(varName, 'param');

      const entry: MemoryEntry = {
        name: varName,
        kind: 'param',
        valueType: resolved.valueType,
        displayValue: resolved.displayValue,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
        isDestructured: true,
      };
      this.addMemoryEntry(this.getCurrentFrameId(), entry);
      this.addToCurrentScope(varName, paramValue, 'param' as VariableKind);
    }
  }

  private visitFunctionDeclaration(
    node: FunctionDeclarationNode,
    isExported: boolean = false
  ): void {
    const name = node.id.name;
    const code = extractSource(this.sourceCode, node);
    const isGenerator = node.generator === true;

    // Create function value
    const funcValue = this.createFunctionValueFromDeclaration(node);

    // Store in environment
    this.setVariable(name, funcValue, true);
    this.recordVarKind(name, 'function');

    // Display value differs for generators
    const funcDisplayValue = isGenerator ? 'ⓕ*' : 'ⓕ';

    // Create heap object
    const heapObj = this.addHeapObject(
      'function',
      funcDisplayValue,
      undefined,
      funcValue.source
    );
    this.objectHeapMap.set(funcValue, heapObj.id);

    // Attach closure scope to heap object if inside a nested scope
    const closureScope = this.buildClosureScopeEntries(
      funcValue.capturedEnvMeta
    );
    if (closureScope.length > 0) {
      heapObj.closureScope = closureScope;
      this.closureLiveEnvMap.set(heapObj.id, funcValue.capturedEnvMeta!);
    }

    // Add to current frame's memory
    const entry: MemoryEntry = {
      name,
      kind: 'function',
      valueType: 'function',
      displayValue: funcDisplayValue,
      heapReferenceId: heapObj.id,
      pointerColor: heapObj.color,
      isExported: isExported || undefined,
    };

    this.addMemoryEntry(this.getCurrentFrameId(), entry);

    // Update scope
    const currentScope = this.scopes[this.scopes.length - 1];
    if (currentScope) {
      currentScope.variables.push({
        name,
        value: funcValue,
        kind: 'const' as VariableKind,
      });
    }

    // Update stack frame scope
    const currentFrame = this.callStack[this.callStack.length - 1];
    if (currentFrame) {
      currentFrame.scope.variables.push({
        name,
        value: funcValue,
        kind: 'const' as VariableKind,
      });
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.declaringFunction({
        name,
        isAsync: node.async,
        isGenerator,
      }),
      code
    );
  }

  private visitClassDeclaration(node: ClassDeclarationNode): void {
    const name = node.id.name;
    const code = extractSource(this.sourceCode, node);
    const superClassName = node.superClass
      ? node.superClass.type === 'Identifier'
        ? (node.superClass as IdentifierNode).name
        : null
      : null;

    // Extract constructor and instance/static methods from class body
    let constructorMethod: ClassMethod | null = null;
    const instanceMethods: ClassMethod[] = [];
    const staticMethods: ClassMethod[] = [];
    const staticProps: Record<string, unknown> = {};

    for (const member of node.body.body) {
      const methodName =
        member.key.type === 'Identifier'
          ? (member.key as IdentifierNode).name
          : String((member.key as LiteralNode).value);
      const params = member.value.params.map((p) => (p as IdentifierNode).name);
      const body = member.value.body as BlockStatementNode;

      const cm: ClassMethod = {
        name: methodName,
        params,
        body,
        isStatic: member.static,
        isConstructor: member.kind === 'constructor',
      };

      if (member.kind === 'constructor') {
        constructorMethod = cm;
      } else if (member.static) {
        staticMethods.push(cm);
      } else {
        instanceMethods.push(cm);
      }
    }

    // Build HeapObject properties list for the class
    const classProps: HeapObjectProperty[] = [];
    if (constructorMethod) {
      classProps.push({
        key: 'constructor',
        displayValue: 'ⓕ',
        valueType: 'function',
      });
    }
    for (const m of instanceMethods) {
      classProps.push({
        key: `prototype.${m.name}`,
        displayValue: 'ⓕ',
        valueType: 'function',
      });
    }
    for (const m of staticMethods) {
      classProps.push({
        key: `static ${m.name}`,
        displayValue: 'ⓕ',
        valueType: 'function',
      });
    }

    // Create class HeapObject
    const heapObj = this.addHeapObject(
      'function',
      `class ${name}`,
      classProps,
      code
    );

    // Add [[Prototype]] link if extends
    if (superClassName) {
      const superClass = this.classRegistry.get(superClassName);
      if (superClass) {
        const superHeap = this.heap.find(
          (h) => h.id === superClass.heapObjectId
        );
        heapObj.properties = heapObj.properties ?? [];
        heapObj.properties.push({
          key: '[[Prototype]]',
          displayValue: superClassName,
          valueType: 'object',
          heapReferenceId: superHeap?.id,
          pointerColor: superHeap?.color,
        });
      }
    }

    const classVal: ClassValue = {
      __isClass: true,
      name,
      superClassName,
      constructor: constructorMethod,
      methods: instanceMethods,
      staticMethods,
      staticProps,
      heapObjectId: heapObj.id,
    };

    // Store in environment and registry
    this.setVariable(name, classVal, true);
    this.recordVarKind(name, 'function');
    this.classRegistry.set(name, classVal);

    // Evaluate static property initialisers (class fields with static keyword are
    // represented as class body members of kind "init" in some parsers, but acorn
    // uses ClassProperty — not yet handled; static *methods* are stored above)
    // For static methods, register them as callable on the class value
    for (const m of staticMethods) {
      const fnVal: FunctionValue = {
        __isFunction: true,
        params: m.params,
        body: m.body,
        isArrow: false,
        isAsync: false,
        isGenerator: false,
        source: extractSource(this.sourceCode, node),
        capturedEnvMeta: this.captureEnclosingScopes(),
      };
      staticProps[m.name] = fnVal;
    }

    // Add class to memory as a function entry
    const entry: MemoryEntry = {
      name,
      kind: 'function',
      valueType: 'function',
      displayValue: 'ⓕ',
      heapReferenceId: heapObj.id,
      pointerColor: heapObj.color,
    };
    this.addMemoryEntry(this.getCurrentFrameId(), entry);

    // Update scope
    const currentScope = this.scopes[this.scopes.length - 1];
    if (currentScope) {
      currentScope.variables.push({
        name,
        value: classVal,
        kind: 'const' as VariableKind,
      });
    }
    const currentFrame = this.callStack[this.callStack.length - 1];
    if (currentFrame) {
      currentFrame.scope.variables.push({
        name,
        value: classVal,
        kind: 'const' as VariableKind,
      });
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.declaringClass({ name, superClassName }),
      code
    );
  }

  // === Module Statement Handlers ===

  private visitImportDeclaration(node: ImportDeclarationNode): void {
    const source = node.source.value as string;
    const code = extractSource(this.sourceCode, node);

    // Since we can't actually load modules, we create placeholder entries
    for (const specifier of node.specifiers) {
      const localName = specifier.local.name;
      let importedName = localName;

      if (specifier.type === 'ImportDefaultSpecifier') {
        importedName = 'default';
      } else if (specifier.type === 'ImportNamespaceSpecifier') {
        importedName = '*';
      } else if (specifier.type === 'ImportSpecifier' && specifier.imported) {
        importedName = specifier.imported.name;
      }

      // Create a placeholder value
      const placeholderValue = `[imported: ${importedName}]`;

      // Store in environment
      this.setVariable(localName, placeholderValue, true);
      this.recordVarKind(localName, 'const');

      // Add to memory as a primitive placeholder
      const entry: MemoryEntry = {
        name: localName,
        kind: 'const',
        valueType: 'primitive',
        displayValue: `"[imported]"`,
      };
      this.addMemoryEntry(this.getCurrentFrameId(), entry);
      this.addToCurrentScope(localName, placeholderValue, 'const');
    }

    const specifierNames = node.specifiers
      .map((s) => {
        if (s.type === 'ImportDefaultSpecifier') return s.local.name;
        if (s.type === 'ImportNamespaceSpecifier')
          return `* as ${s.local.name}`;
        if (
          s.type === 'ImportSpecifier' &&
          s.imported &&
          s.imported.name !== s.local.name
        ) {
          return `${s.imported.name} as ${s.local.name}`;
        }
        return s.local.name;
      })
      .join(', ');

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.importDeclaration({ specifierNames, source }),
      code
    );
  }

  private visitExportNamedDeclaration(node: ExportNamedDeclarationNode): void {
    const code = extractSource(this.sourceCode, node);

    // If there's a declaration, handle it with isExported flag
    if (node.declaration) {
      if (node.declaration.type === 'VariableDeclaration') {
        this.visitVariableDeclaration(
          node.declaration as VariableDeclarationNode,
          true
        );
        return;
      } else if (node.declaration.type === 'FunctionDeclaration') {
        this.visitFunctionDeclaration(
          node.declaration as FunctionDeclarationNode,
          true
        );
        return;
      } else if (node.declaration.type === 'ClassDeclaration') {
        this.visitClassDeclaration(node.declaration as ClassDeclarationNode);
        // Mark the class as exported in memory
        const className = (node.declaration as ClassDeclarationNode).id.name;
        this.markAsExported(className);
        return;
      }
    }

    // Handle export specifiers: export { a, b }
    if (node.specifiers.length > 0) {
      const exportedNames = node.specifiers
        .map((s) => {
          // Mark each exported variable
          this.markAsExported(s.local.name);
          return s.exported.name !== s.local.name
            ? `${s.local.name} as ${s.exported.name}`
            : s.local.name;
        })
        .join(', ');

      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.exportNamedDeclaration({ exportedNames }),
        code
      );
    }
  }

  private visitExportDefaultDeclaration(
    node: ExportDefaultDeclarationNode
  ): void {
    const code = extractSource(this.sourceCode, node);

    if (node.declaration.type === 'FunctionDeclaration') {
      const funcNode = node.declaration as FunctionDeclarationNode;
      const name = funcNode.id?.name ?? 'default';
      this.visitFunctionDeclaration(funcNode, true);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.exportDefaultFunction({ name }),
        code
      );
      return;
    }

    if (node.declaration.type === 'ClassDeclaration') {
      const classNode = node.declaration as ClassDeclarationNode;
      const name = classNode.id.name;
      this.visitClassDeclaration(classNode);
      this.markAsExported(name);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.exportDefaultClass({ name }),
        code
      );
      return;
    }

    // For expression exports: export default expression
    const value = this.evaluateExpression(node.declaration as ExpressionNode);
    const resolved = this.resolveValueForMemory(value);

    // Store as "default" export
    this.setVariable('default', value, true);
    this.recordVarKind('default', 'const');

    const entry: MemoryEntry = {
      name: 'default',
      kind: 'const',
      valueType: resolved.valueType,
      displayValue: resolved.displayValue,
      heapReferenceId: resolved.heapReferenceId,
      pointerColor: resolved.pointerColor,
      isExported: true,
    };
    this.addMemoryEntry(this.getCurrentFrameId(), entry);

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.exportDefaultValue({ displayValue: resolved.displayValue }),
      code
    );
  }

  private markAsExported(varName: string): void {
    // Find the memory entry and mark it as exported
    for (const block of this.memoryBlocks) {
      const entry = block.entries.find((e) => e.name === varName);
      if (entry) {
        entry.isExported = true;
        break;
      }
    }
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
      description.evaluatingIfCondition({ result: displayValue(testResult) }),
      code
    );

    if (testResult) {
      this.visitStatement(node.consequent as StatementNode);
    } else if (node.alternate) {
      this.visitStatement(node.alternate as StatementNode);
    }
  }

  private visitForStatement(node: ForStatementNode): void {
    // Determine if the init uses block-scoped let/const (requires per-iteration scope)
    const initDecl =
      node.init?.type === 'VariableDeclaration'
        ? (node.init as VariableDeclarationNode)
        : null;
    const isBlockScoped =
      initDecl?.kind === 'let' || initDecl?.kind === 'const';
    const iteratorNames: string[] =
      isBlockScoped && initDecl
        ? initDecl.declarations.map((d) => (d.id as IdentifierNode).name)
        : [];

    // Visit init (declares variable in the current env)
    if (node.init) {
      if (node.init.type === 'VariableDeclaration') {
        this.visitVariableDeclaration(node.init as VariableDeclarationNode);
      } else {
        this.evaluateExpression(node.init as ExpressionNode);
      }
    }

    let iteration = 0;

    while (iteration < MAX_LOOP_ITERATIONS && this.stepIndex < MAX_STEPS) {
      // Test condition (evaluated in outer env so the iterator var is visible)
      if (node.test) {
        const testResult = this.evaluateExpression(node.test);
        if (!testResult) break;
      }

      iteration++;
      const code = extractSource(this.sourceCode, node);

      // For let/const: push a per-iteration env that holds a snapshot of the
      // iterator variable(s). Closures created inside the body will capture
      // this fresh env rather than the shared outer one.
      let iterEnv: Record<string, unknown> | null = null;
      if (isBlockScoped && iteratorNames.length > 0) {
        const outerEnv = this.getCurrentEnv();
        iterEnv = {};
        const iterKinds: Record<string, VariableKind | 'param' | 'function'> =
          {};
        for (const name of iteratorNames) {
          iterEnv[name] = outerEnv[name];
          iterKinds[name] = (initDecl!.kind as VariableKind) ?? 'let';
        }
        this.envStack.push(iterEnv);
        this.envKindsMap.set(iterEnv, iterKinds);
      }

      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.forLoopIteration({ iteration }),
        code
      );

      // Execute body
      let didBreak = false;
      try {
        this.visitStatement(node.body as StatementNode);
      } catch (e) {
        if (e instanceof BreakSignal) {
          didBreak = true;
        } else if (!(e instanceof ContinueSignal)) {
          throw e;
        }
      }

      // Pop the per-iteration env before running the update (update writes to
      // the outer loop env so the next iteration's test/init sees it)
      if (iterEnv !== null) {
        // Sync any mutation of the iterator vars back to the outer env
        const outerEnv = this.envStack[this.envStack.length - 2];
        if (outerEnv) {
          for (const name of iteratorNames) {
            outerEnv[name] = iterEnv[name];
          }
        }
        this.envStack.pop();
      }

      if (didBreak) break;

      // Check for return
      if (this.hasReturned) break;

      // Update (runs in outer env)
      if (node.update) {
        this.evaluateExpression(node.update);
      }
    }

    if (iteration >= MAX_LOOP_ITERATIONS) {
      console.warn('For loop iteration limit reached');
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
        description.whileLoopIteration({ iteration }),
        code
      );

      // Execute body
      let didBreak = false;
      try {
        this.visitStatement(node.body as StatementNode);
      } catch (e) {
        if (e instanceof BreakSignal) {
          didBreak = true;
        } else if (e instanceof ContinueSignal) {
          /* continue to next iteration */
        } else throw e;
      }

      if (didBreak) break;

      // Check for return
      if (this.hasReturned) break;
    }

    if (iteration >= MAX_LOOP_ITERATIONS) {
      console.warn('While loop iteration limit reached');
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
      description.returningValue({
        funcName,
        displayValue: displayValue(value),
      }),
      code
    );
  }

  // === Expression Evaluation ===

  private evaluateExpression(node: ExpressionNode | BaseNode): unknown {
    if (this.stepIndex >= MAX_STEPS) return undefined;

    switch (node.type) {
      case 'Literal':
        return this.evaluateLiteral(node as LiteralNode);
      case 'Identifier':
        return this.evaluateIdentifier(node as IdentifierNode);
      case 'BinaryExpression':
        return this.evaluateBinaryExpression(node as BinaryExpressionNode);
      case 'LogicalExpression':
        return this.evaluateLogicalExpression(node as LogicalExpressionNode);
      case 'UnaryExpression':
        return this.evaluateUnaryExpression(node as UnaryExpressionNode);
      case 'UpdateExpression':
        return this.evaluateUpdateExpression(node as UpdateExpressionNode);
      case 'AssignmentExpression':
        return this.evaluateAssignment(node as AssignmentExpressionNode);
      case 'CallExpression':
        return this.evaluateCallExpression(node as CallExpressionNode);
      case 'MemberExpression':
        return this.evaluateMemberExpression(node as MemberExpressionNode);
      case 'ObjectExpression':
        return this.evaluateObjectExpression(node as ObjectExpressionNode);
      case 'ArrayExpression':
        return this.evaluateArrayExpression(node as ArrayExpressionNode);
      case 'FunctionExpression':
        return this.createFunctionValue(node as FunctionExpressionNode);
      case 'ArrowFunctionExpression':
        return this.createFunctionValue(node as ArrowFunctionExpressionNode);
      case 'TemplateLiteral':
        return this.evaluateTemplateLiteral(node as TemplateLiteralNode);
      case 'ConditionalExpression':
        return this.evaluateConditionalExpression(
          node as ConditionalExpressionNode
        );
      case 'NewExpression':
        return this.evaluateNewExpression(node as NewExpressionNode);
      case 'AwaitExpression': {
        // Reached only when await is evaluated outside visitAsyncFunctionBody
        // (e.g. inside a try block). Evaluate the argument and propagate rejection.
        const awaitArgValue = this.evaluateExpression(
          (node as AwaitExpressionNode).argument
        );
        if (this.isPromiseWrapper(awaitArgValue)) {
          const p = this.promises.get(
            (awaitArgValue as PromiseWrapper).promiseId
          );
          if (p && p.state === 'rejected') {
            // Signal as a thrown error — do NOT set hasReturned so that
            // visitTryStatement can intercept it via isThrownError(returnValue)
            this.returnValue = this.makeThrownError(p.result);
            return undefined;
          }
          // Fulfilled — return the resolved value
          if (p && p.state === 'fulfilled') {
            return p.result;
          }
        }
        return awaitArgValue;
      }
      case 'YieldExpression': {
        // Throw YieldSignal so it propagates up through any loop bodies back to
        // executeGeneratorBody, which catches it and suspends the generator.
        const yieldNode = node as YieldExpressionNode;
        const yieldedValue = yieldNode.argument
          ? this.evaluateExpression(yieldNode.argument)
          : undefined;
        throw new YieldSignal(yieldedValue);
      }
      case 'ThisExpression':
        return this.lookupVariable('this');
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
      case '+':
        return (left as number) + (right as number);
      case '-':
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        return (left as number) / (right as number);
      case '%':
        return (left as number) % (right as number);
      case '**':
        return (left as number) ** (right as number);
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '===':
        return left === right;
      case '!==':
        return left !== right;
      case '<':
        return (left as number) < (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case '>':
        return (left as number) > (right as number);
      case '>=':
        return (left as number) >= (right as number);
      case '&':
        return (left as number) & (right as number);
      case '|':
        return (left as number) | (right as number);
      case '^':
        return (left as number) ^ (right as number);
      case '<<':
        return (left as number) << (right as number);
      case '>>':
        return (left as number) >> (right as number);
      case '>>>':
        return (left as number) >>> (right as number);
      default:
        console.warn(`Unsupported binary operator: ${node.operator}`);
        return undefined;
    }
  }

  private evaluateLogicalExpression(node: LogicalExpressionNode): unknown {
    const left = this.evaluateExpression(node.left);

    switch (node.operator) {
      case '&&':
        return left ? this.evaluateExpression(node.right) : left;
      case '||':
        return left ? left : this.evaluateExpression(node.right);
      case '??':
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
      case '!':
        return !arg;
      case '-':
        return -(arg as number);
      case '+':
        return +(arg as number);
      case 'typeof':
        return typeof arg;
      case 'void':
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

    if (argNode.type === 'Identifier') {
      name = argNode.name;
      currentValue = this.lookupVariable(name);
    } else {
      // MemberExpression - simplified handling
      console.warn(
        'Update expression on member expressions not fully supported'
      );
      return undefined;
    }

    const numValue = Number(currentValue);
    let newValue: number;
    let returnValue: number;

    if (node.operator === '++') {
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

    // Snapshot the update operation as an assignment
    const code = extractSource(this.sourceCode, node);
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.incrementDecrement({
        name,
        operator: node.operator as '++' | '--',
      }),
      code
    );

    return returnValue;
  }

  private evaluateAssignment(node: AssignmentExpressionNode): unknown {
    const rightValue = this.evaluateExpression(node.right);
    let name: string;

    if (node.left.type === 'Identifier') {
      name = (node.left as IdentifierNode).name;
    } else if (node.left.type === 'MemberExpression') {
      // Handle member expression assignment (e.g., obj.prop = value)
      const memberNode = node.left as MemberExpressionNode;
      const obj = this.evaluateExpression(memberNode.object) as Record<
        string,
        unknown
      >;
      let propName: string;

      if (memberNode.computed) {
        propName = String(
          this.evaluateExpression(memberNode.property as ExpressionNode)
        );
      } else {
        propName = (memberNode.property as IdentifierNode).name;
      }

      // Resolve object — handle `this` specially (ThisExpression in AST)
      const isThisExpr =
        (memberNode.object as BaseNode).type === 'ThisExpression';
      let resolvedObj: Record<string, unknown> | null = null;
      if (isThisExpr) {
        resolvedObj =
          (this.lookupVariable('this') as Record<string, unknown>) ?? obj;
      } else {
        resolvedObj = obj;
      }

      if (resolvedObj && typeof resolvedObj === 'object') {
        let finalValue = rightValue;

        if (node.operator !== '=') {
          const currentValue = resolvedObj[propName];
          finalValue = this.applyAssignmentOperator(
            node.operator,
            currentValue,
            rightValue
          );
        }

        resolvedObj[propName] = finalValue;

        // Sync the heap object for any object property assignment
        const heapId = this.objectHeapMap.get(resolvedObj);
        const heapObj = heapId
          ? this.heap.find((h) => h.id === heapId)
          : undefined;
        if (heapObj) {
          if (isThisExpr) {
            this.syncInstanceHeapObject(heapObj, resolvedObj);
          } else {
            const newProps: HeapObjectProperty[] = [];
            for (const [key, val] of Object.entries(resolvedObj)) {
              const propResolved = this.resolveValueForMemoryShallow(val);
              newProps.push({
                key,
                displayValue: propResolved.displayValue,
                valueType: propResolved.valueType,
                heapReferenceId: propResolved.heapReferenceId,
                pointerColor: propResolved.pointerColor,
              });
            }
            heapObj.properties = newProps;
          }
        }
      }

      const objLabel = isThisExpr
        ? 'this'
        : memberNode.object.type === 'Identifier'
          ? (memberNode.object as IdentifierNode).name
          : 'object';

      const code = extractSource(this.sourceCode, node);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.assigningProperty({
          objLabel,
          propName,
          displayValue: displayValue(rightValue),
        }),
        code
      );

      return rightValue;
    } else {
      console.warn('Unsupported assignment target');
      return undefined;
    }

    // Get current value for compound assignments
    let finalValue = rightValue;
    if (node.operator !== '=') {
      const currentValue = this.lookupVariable(name);
      finalValue = this.applyAssignmentOperator(
        node.operator,
        currentValue,
        rightValue
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
      description.assigningVariable({
        name,
        displayValue: resolved.displayValue,
      }),
      code
    );

    return finalValue;
  }

  private applyAssignmentOperator(
    operator: string,
    left: unknown,
    right: unknown
  ): unknown {
    switch (operator) {
      case '+=':
        return (left as number) + (right as number);
      case '-=':
        return (left as number) - (right as number);
      case '*=':
        return (left as number) * (right as number);
      case '/=':
        return (left as number) / (right as number);
      case '%=':
        return (left as number) % (right as number);
      case '**=':
        return (left as number) ** (right as number);
      case '&=':
        return (left as number) & (right as number);
      case '|=':
        return (left as number) | (right as number);
      case '^=':
        return (left as number) ^ (right as number);
      case '<<=':
        return (left as number) << (right as number);
      case '>>=':
        return (left as number) >> (right as number);
      case '>>>=':
        return (left as number) >>> (right as number);
      default:
        return right;
    }
  }

  private evaluateCallExpression(node: CallExpressionNode): unknown {
    // Check for console.log, console.warn, etc.
    if (
      node.callee.type === 'MemberExpression' &&
      (node.callee as MemberExpressionNode).object.type === 'Identifier' &&
      ((node.callee as MemberExpressionNode).object as IdentifierNode).name ===
        'console'
    ) {
      return this.handleConsoleCall(node);
    }

    // Check for setTimeout/setInterval
    if (
      node.callee.type === 'Identifier' &&
      ['setTimeout', 'setInterval'].includes(
        (node.callee as IdentifierNode).name
      )
    ) {
      return this.handleTimerCall(node);
    }

    // Check for clearTimeout/clearInterval
    if (
      node.callee.type === 'Identifier' &&
      ['clearTimeout', 'clearInterval'].includes(
        (node.callee as IdentifierNode).name
      )
    ) {
      return this.handleClearTimerCall(node);
    }

    // Check for fetch(url)
    if (
      node.callee.type === 'Identifier' &&
      (node.callee as IdentifierNode).name === 'fetch'
    ) {
      return this.handleFetchCall(node);
    }

    // Check for Promise.resolve / Promise.reject / Promise.all / Promise.race
    if (
      node.callee.type === 'MemberExpression' &&
      (node.callee as MemberExpressionNode).object.type === 'Identifier' &&
      ((node.callee as MemberExpressionNode).object as IdentifierNode).name ===
        'Promise'
    ) {
      return this.handlePromiseStaticCall(node);
    }

    // Check for static class method call: ClassName.staticMethod()
    if (node.callee.type === 'MemberExpression') {
      const memberCallee = node.callee as MemberExpressionNode;
      if (memberCallee.object.type === 'Identifier') {
        const objVal = this.lookupVariable(
          (memberCallee.object as IdentifierNode).name
        );
        if (this.isClassValue(objVal)) {
          const methodName = (memberCallee.property as IdentifierNode).name;
          return this.callStaticMethod(objVal, methodName, node);
        }
      }
    }

    // Check for promise.then() / promise.catch() / promise.finally()
    if (node.callee.type === 'MemberExpression') {
      const memberCallee = node.callee as MemberExpressionNode;
      const propName = (memberCallee.property as IdentifierNode).name;
      if (['then', 'catch', 'finally'].includes(propName)) {
        // Check if the object resolves to a promise wrapper
        const objValue = this.evaluateExpression(memberCallee.object);
        if (this.isPromiseWrapper(objValue)) {
          return this.handlePromiseChainCall(
            objValue as PromiseWrapper,
            propName,
            node
          );
        }
      }

      // Handle generator.next() / generator.return() / generator.throw()
      if (['next', 'return', 'throw'].includes(propName)) {
        const objValue = this.evaluateExpression(memberCallee.object);
        if (this.isGeneratorWrapper(objValue)) {
          return this.handleGeneratorMethodCall(objValue, propName, node);
        }
      }

      // Handle response.json() on a FetchResponse runtime value
      if (propName === 'json') {
        const objValue = this.evaluateExpression(memberCallee.object);
        if (
          typeof objValue === 'object' &&
          objValue !== null &&
          '__isFetchResponse' in (objValue as Record<string, unknown>)
        ) {
          return this.handleResponseJsonCall(objValue as FetchResponse, node);
        }
      }

      // Handle native array methods
      const arrayMethods = [
        'join',
        'push',
        'pop',
        'shift',
        'unshift',
        'slice',
        'splice',
        'concat',
        'indexOf',
        'includes',
        'reverse',
        'sort',
        'map',
        'filter',
        'reduce',
        'forEach',
        'find',
        'findIndex',
        'some',
        'every',
        'flat',
        'flatMap',
        'fill',
        'copyWithin',
        'entries',
        'keys',
        'values',
        'toString',
        'toLocaleString',
      ];
      if (arrayMethods.includes(propName)) {
        const objValue = this.evaluateExpression(memberCallee.object);
        if (Array.isArray(objValue)) {
          return this.handleArrayMethodCall(objValue, propName, node);
        }
      }

      // Handle String methods
      const stringMethods = [
        'charAt',
        'charCodeAt',
        'concat',
        'includes',
        'endsWith',
        'indexOf',
        'lastIndexOf',
        'match',
        'padEnd',
        'padStart',
        'repeat',
        'replace',
        'replaceAll',
        'search',
        'slice',
        'split',
        'startsWith',
        'substring',
        'toLowerCase',
        'toUpperCase',
        'trim',
        'trimEnd',
        'trimStart',
        'toString',
      ];
      if (stringMethods.includes(propName)) {
        const objValue = this.evaluateExpression(memberCallee.object);
        if (typeof objValue === 'string') {
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
      []
    );

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.callingConsole({ methodName }),
      code
    );

    // Add console entry
    this.addConsoleEntry(methodName, args);

    // Pop frame
    this.popFrame();

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.consoleOutput({ methodName, args }),
      code
    );
  }

  private handleTimerCall(node: CallExpressionNode): number {
    const timerName = (node.callee as IdentifierNode).name as
      | 'setTimeout'
      | 'setInterval';
    const code = extractSource(this.sourceCode, node);

    // Validate first argument is a function/arrow function
    if (
      node.arguments.length === 0 ||
      (node.arguments[0].type !== 'FunctionExpression' &&
        node.arguments[0].type !== 'ArrowFunctionExpression' &&
        node.arguments[0].type !== 'Identifier')
    ) {
      const numId = this.timerIdCounter++;
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.timerInvalidCallback({ timerName }),
        code
      );
      return numId;
    }

    // Resolve callback node (may be identifier pointing to a variable)
    const callbackNode: BaseNode = node.arguments[0] as BaseNode;
    const callbackSource = extractSource(this.sourceCode, callbackNode);

    // If it's an identifier, resolve to FunctionValue — store on the timer
    let resolvedTimerFn: FunctionValue | undefined;
    if (callbackNode.type === 'Identifier') {
      const val = this.lookupVariable((callbackNode as IdentifierNode).name);
      if (val !== undefined && this.isFunctionValue(val)) {
        resolvedTimerFn = val;
      } else {
        const numId = this.timerIdCounter++;
        this.snapshot(
          this.getLine(node),
          this.getColumn(node),
          description.timerInvalidCallback({ timerName }),
          code
        );
        return numId;
      }
    }

    // Get delay (default 0)
    let delay = 0;
    if (node.arguments.length > 1) {
      const delayValue = this.evaluateExpression(
        node.arguments[1] as ExpressionNode
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
      // Capture live env references (skip global at index 0) so the callback
      // can close over variables from enclosing scopes (e.g. onPrime, currNum).
      capturedEnvStack: this.envStack.slice(1),
      resolvedFnValue: resolvedTimerFn,
    };
    this.pendingTimers.push(timer);

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.timerRegistered({ timerName, delay: `${delay}ms` }),
      code
    );

    return numericId;
  }

  private handleClearTimerCall(node: CallExpressionNode): void {
    const code = extractSource(this.sourceCode, node);
    const calleeName = (node.callee as IdentifierNode).name;

    if (node.arguments.length > 0) {
      const idValue = this.evaluateExpression(
        node.arguments[0] as ExpressionNode
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
          webAPI.status = 'cancelled';
        }
        this.snapshot(
          this.getLine(node),
          this.getColumn(node),
          description.timerCancelled({ calleeName }),
          code
        );
        return;
      }
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.timerCancelled({ calleeName }),
      code
    );
  }

  // === Fetch Simulation ===

  private handleFetchCall(node: CallExpressionNode): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);

    // Evaluate the URL argument
    const urlArg =
      node.arguments.length > 0
        ? this.evaluateExpression(node.arguments[0] as ExpressionNode)
        : 'https://api.example.com/data';
    const url = String(urlArg);

    // 1. Create a pending Promise for the fetch result
    const { promise: fetchPromise, wrapper } = this.createInternalPromise();

    // 2. Register in Web APIs
    const fetchId = generateId('webapi', this.webAPICounter++);
    const delay = 1500; // simulated network delay

    const entry: WebAPIEntry = {
      id: fetchId,
      type: 'fetch',
      label: 'fetch',
      callback: url,
      delay,
      elapsed: 0,
      status: 'running',
      promiseState: 'pending',
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
      description.fetchRegistered({ url }),
      code
    );

    return wrapper;
  }

  private handleResponseJsonCall(
    _response: FetchResponse,
    node: CallExpressionNode
  ): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);

    // Create mock parsed data HeapObject
    const dataHeapId = generateId('heap', this.heapCounter++);
    const dataColor = getPointerColor(this.pointerCounter++);
    const dataHeapObj: HeapObject = {
      id: dataHeapId,
      type: 'object',
      color: dataColor,
      label: '{ message: "Mock data" }',
      properties: [
        {
          key: 'message',
          displayValue: '"Mock data from fetch"',
          valueType: 'primitive',
        },
        {
          key: 'status',
          displayValue: '"success"',
          valueType: 'primitive',
        },
      ],
    };
    this.heap.push(dataHeapObj);

    // Create a resolved Promise with the data object
    const { promise: jsonPromise, wrapper } = this.createInternalPromise();

    // The runtime value for data — a plain object with the heap link
    const dataValue: Record<string, unknown> & { __heapId: string } = {
      __heapId: dataHeapId,
      message: 'Mock data from fetch',
      status: 'success',
    };

    this.resolvePromise(jsonPromise, dataValue);

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.responseJson(),
      code
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
        webAPI.status = 'completed';
        webAPI.promiseState = 'fulfilled';
      }

      this.snapshot(0, 0, description.fetchCompleted(), '');

      // Create mock Response HeapObject
      const responseHeapId = generateId('heap', this.heapCounter++);
      const responseColor = getPointerColor(this.pointerCounter++);

      // Create a placeholder heap entry for the json() function
      const jsonFnHeapId = generateId('heap', this.heapCounter++);
      this.heap.push({
        id: jsonFnHeapId,
        type: 'function',
        color: getPointerColor(this.pointerCounter++),
        label: 'json()',
        functionSource: 'json()',
      });

      const responseHeapObj: HeapObject = {
        id: responseHeapId,
        type: 'object',
        color: responseColor,
        label: 'Response',
        properties: [
          {
            key: 'status',
            displayValue: '200',
            valueType: 'primitive',
          },
          {
            key: 'ok',
            displayValue: 'true',
            valueType: 'primitive',
          },
          {
            key: 'url',
            displayValue: `"${fetch.url}"`,
            valueType: 'primitive',
          },
          {
            key: 'json',
            displayValue: 'ⓕ',
            valueType: 'function',
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
    node: CallExpressionNode
  ): unknown {
    const args = node.arguments.map((arg) =>
      this.evaluateExpression(arg as ExpressionNode)
    );

    // Type-safe method invocation
    type ArrayMethod = keyof unknown[];
    const fn = (arr as unknown[])[method as ArrayMethod];
    if (typeof fn === 'function') {
      return fn.apply(arr, args);
    }
    return undefined;
  }

  // Handle native string method calls
  private handleStringMethodCall(
    str: string,
    method: string,
    node: CallExpressionNode
  ): unknown {
    const args = node.arguments.map((arg) =>
      this.evaluateExpression(arg as ExpressionNode)
    );

    // Type-safe method invocation
    type StringMethod = keyof string;
    const fn = (str as string)[method as StringMethod];
    if (typeof fn === 'function') {
      return (fn as (...args: unknown[]) => unknown).apply(str, args);
    }
    return undefined;
  }

  private handleFunctionCall(node: CallExpressionNode): unknown {
    let funcName: string;
    let funcValue: unknown;
    let receiver: Record<string, unknown> | null = null; // `this` for method calls

    if (node.callee.type === 'Identifier') {
      funcName = (node.callee as IdentifierNode).name;
      funcValue = this.lookupVariable(funcName);

      // Check if this is a static method call on a class: ClassName.method()
      // (handled below in MemberExpression branch when callee is member)
    } else if (node.callee.type === 'MemberExpression') {
      // Method call
      const memberExpr = node.callee as MemberExpressionNode;
      const propName = memberExpr.computed
        ? String(this.evaluateExpression(memberExpr.property as ExpressionNode))
        : (memberExpr.property as IdentifierNode).name;
      funcName = propName;
      const obj = this.evaluateExpression(memberExpr.object) as Record<
        string,
        unknown
      >;

      // Look up method: first check own properties, then search class prototype chain
      if (obj && typeof obj === 'object') {
        funcValue = obj[propName];
        // If not found directly, look in class method registry
        if (funcValue === undefined || funcValue === null) {
          funcValue = this.findMethodOnClass(obj, propName);
        }
        receiver = obj;
      } else if (this.isClassValue(obj as unknown)) {
        // Static method call: ClassName.method()
        const cv = obj as unknown as ClassValue;
        funcValue = cv.staticProps[propName];
        // funcName stays as propName; no receiver for static
      }
    } else if (
      node.callee.type === 'FunctionExpression' ||
      node.callee.type === 'ArrowFunctionExpression'
    ) {
      // IIFE - immediately invoked function expression
      funcName = '<anonymous>';
      funcValue = this.createFunctionValue(
        node.callee as FunctionExpressionNode | ArrowFunctionExpressionNode
      );
    } else {
      console.warn('Unsupported callee type:', node.callee.type);
      return undefined;
    }

    // Handle builtin resolve/reject calls
    if (this.isBuiltinFn(funcValue)) {
      return this.handleBuiltinCall(node, funcValue);
    }

    // Check for class value — static method call like ClassName.method()
    if (this.isClassValue(funcValue)) {
      // Already handled above — shouldn't reach here
      console.warn(`${funcName} is a class, not a function`);
      return undefined;
    }

    if (!this.isFunctionValue(funcValue)) {
      console.warn(`${funcName} is not a function`);
      return undefined;
    }

    // Evaluate arguments, handling spread
    const evaluatedArgs: unknown[] = [];
    for (const arg of node.arguments) {
      if (arg.type === 'SpreadElement') {
        const spreadValue = this.evaluateExpression(
          (arg as SpreadElementNode).argument
        );
        if (Array.isArray(spreadValue)) {
          evaluatedArgs.push(...spreadValue);
        } else if (spreadValue && typeof spreadValue === 'object') {
          evaluatedArgs.push(...Object.values(spreadValue));
        }
      } else {
        evaluatedArgs.push(this.evaluateExpression(arg as ExpressionNode));
      }
    }

    // Build params with values
    const params = funcValue.params.map((paramName: string, index: number) => ({
      name: paramName,
      value: evaluatedArgs[index],
    }));

    // Route async functions to the async engine
    if (funcValue.isAsync) {
      return this.callAsyncFunction(funcValue, funcName, params, node);
    }

    // Route generator functions to create a generator object (no execution yet)
    if (funcValue.isGenerator) {
      return this.createGeneratorObject(funcValue, funcName, params, node);
    }

    const code = extractSource(this.sourceCode, node);
    const argsDisplay = evaluatedArgs.map((v) => displayValue(v)).join(', ');

    // Inject captured closure envs into envStack so lookupVariable finds them.
    const capturedMeta = funcValue.capturedEnvMeta;
    const injectedCount = capturedMeta ? capturedMeta.length : 0;
    if (capturedMeta && capturedMeta.length > 0) {
      this.envStack.splice(1, 0, ...capturedMeta.map((m) => m.env));
    }

    // Push frame
    this.pushFrame(funcName, this.getLine(node), this.getColumn(node), params);

    // Handle destructuring in function parameters
    this.handleParameterDestructuring(funcValue, evaluatedArgs);

    // If called as a method on an instance, inject `this` into the local env + memory
    if (receiver !== null) {
      this.getCurrentEnv()['this'] = receiver;
      const instanceHeapId = this.objectHeapMap.get(receiver);
      const instanceHeap = instanceHeapId
        ? this.heap.find((h) => h.id === instanceHeapId)
        : undefined;
      const thisEntry: MemoryEntry = {
        name: 'this',
        kind: 'param',
        valueType: 'object',
        displayValue: '[Pointer]',
        heapReferenceId: instanceHeap?.id,
        pointerColor: instanceHeap?.color,
      };
      const currentBlock = this.memoryBlocks[this.memoryBlocks.length - 1];
      if (currentBlock) currentBlock.entries.unshift(thisEntry);
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.callingFunction({
        name: funcName,
        argsDisplay,
        receiver,
      }),
      code
    );

    // Execute function body
    this.hasReturned = false;
    this.returnValue = undefined;

    if (
      funcValue.isArrow &&
      !('body' in funcValue.body && funcValue.body.type === 'BlockStatement')
    ) {
      this.returnValue = this.evaluateExpression(
        funcValue.body as ExpressionNode
      );
      this.hasReturned = true;
    } else {
      this.visitBlockStatement(funcValue.body as BlockStatementNode);
    }

    const returnVal = this.returnValue;
    this.hasReturned = false;
    this.returnValue = undefined;

    // Check if any closures captured this frame's env (for the description)
    const currentEnv = this.getCurrentEnv();
    const hasClosure = this.isEnvCapturedByClosure(currentEnv);

    this.popFrame();

    if (injectedCount > 0) {
      this.envStack.splice(1, injectedCount);
    }

    const returnDescription = hasClosure
      ? description.returningWithClosure({ funcName })
      : description.returningValue({
          funcName,
          displayValue: displayValue(returnVal),
        });

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      returnDescription,
      code
    );

    return returnVal;
  }

  /**
   * Find a method FunctionValue by searching the class prototype chain for an instance.
   * Called when obj[propName] is undefined but the object may be a class instance.
   */
  private findMethodOnClass(
    obj: Record<string, unknown>,
    methodName: string
  ): FunctionValue | undefined {
    // Find which class this object belongs to by checking objectHeapMap
    const heapId = this.objectHeapMap.get(obj);
    if (!heapId) return undefined;

    // Find the class that owns this instance heap object
    for (const [, classVal] of this.classRegistry) {
      // Check instance methods
      const method = classVal.methods.find((m) => m.name === methodName);
      if (method) {
        // Check if this instance was created from this class or its subclass
        // by verifying the [[Prototype]] chain in the heap
        const instanceHeap = this.heap.find((h) => h.id === heapId);
        const protoRef = instanceHeap?.properties?.find(
          (p) => p.key === '[[Prototype]]'
        );
        if (
          protoRef?.heapReferenceId === classVal.heapObjectId ||
          this.isInstanceOf(heapId, classVal)
        ) {
          return {
            __isFunction: true,
            params: method.params,
            body: method.body,
            isArrow: false,
            isAsync: false,
            isGenerator: false,
            source: `${methodName}() { ... }`,
            capturedEnvMeta: undefined,
          };
        }
      }
    }
    return undefined;
  }

  /**
   * Call a static method on a class value.
   */
  private callStaticMethod(
    classVal: ClassValue,
    methodName: string,
    node: CallExpressionNode
  ): unknown {
    const fnVal = classVal.staticProps[methodName];
    if (!this.isFunctionValue(fnVal)) {
      console.warn(`${classVal.name}.${methodName} is not a static method`);
      return undefined;
    }

    const code = extractSource(this.sourceCode, node);
    const evaluatedArgs = node.arguments.map((a) =>
      this.evaluateExpression(a as ExpressionNode)
    );
    const params = fnVal.params.map((name: string, i: number) => ({
      name,
      value: evaluatedArgs[i],
    }));
    const argsDisplay = evaluatedArgs.map((v) => displayValue(v)).join(', ');

    this.pushFrame(
      `${classVal.name}.${methodName}`,
      this.getLine(node),
      this.getColumn(node),
      params
    );

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.callingMethod({
        className: classVal.name,
        methodName,
        argsDisplay,
      }),
      code
    );

    this.hasReturned = false;
    this.returnValue = undefined;
    this.visitBlockStatement(fnVal.body as BlockStatementNode);

    const returnVal = this.returnValue;
    this.hasReturned = false;
    this.returnValue = undefined;

    this.popFrame();

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.methodReturned({
        className: classVal.name,
        methodName,
        displayValue: displayValue(returnVal),
      }),
      code
    );

    return returnVal;
  }

  /**
   * Returns true if the heap object (by id) is an instance of the given class
   * or any subclass of it (walks the [[Prototype]] chain).
   */
  private isInstanceOf(heapId: string, classVal: ClassValue): boolean {
    const heap = this.heap.find((h) => h.id === heapId);
    if (!heap) return false;
    const protoRef = heap.properties?.find((p) => p.key === '[[Prototype]]');
    if (!protoRef?.heapReferenceId) return false;
    if (protoRef.heapReferenceId === classVal.heapObjectId) return true;
    // Recurse up the chain
    return this.isInstanceOf(protoRef.heapReferenceId, classVal);
  }

  /**
   * Returns true if any closure has captured the given env (for return description).
   */
  private isEnvCapturedByClosure(env: Record<string, unknown>): boolean {
    return this.envCapturedBy.has(env);
  }

  private evaluateMemberExpression(node: MemberExpressionNode): unknown {
    // Special: `this` is a ThisExpression node (not Identifier) in the AST
    let obj: unknown;
    if ((node.object as BaseNode).type === 'ThisExpression') {
      obj = this.lookupVariable('this');
    } else {
      obj = this.evaluateExpression(node.object);
    }

    const objRecord = obj as Record<string, unknown>;

    if (obj === null || obj === undefined) {
      return undefined;
    }

    let propName: string;

    if (node.computed) {
      propName = String(
        this.evaluateExpression(node.property as ExpressionNode)
      );
    } else {
      propName = (node.property as IdentifierNode).name;
    }

    // Handle array length property
    if (Array.isArray(obj) && propName === 'length') {
      return obj.length;
    }

    // Handle FetchResponse runtime value — map to its logical properties
    if (
      typeof obj === 'object' &&
      obj !== null &&
      '__isFetchResponse' in (obj as Record<string, unknown>)
    ) {
      const fetchResp = obj as unknown as FetchResponse;
      if (propName === 'ok') return true;
      if (propName === 'status') return 200;
      if (propName === 'url') return fetchResp.url;
      // "json" is handled in evaluateCallExpression
    }

    // For class instances: if property not found directly, search prototype chain methods
    if (typeof obj === 'object' && obj !== null && !(propName in objRecord)) {
      const method = this.findMethodOnClass(objRecord, propName);
      if (method) return method;
    }

    return objRecord[propName];
  }

  private evaluateObjectExpression(
    node: ObjectExpressionNode
  ): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    for (const prop of node.properties) {
      // Handle spread: { ...base, extra: true }
      if (prop.type === 'SpreadElement') {
        const spreadValue = this.evaluateExpression(
          (prop as SpreadElementNode).argument
        );
        if (
          spreadValue &&
          typeof spreadValue === 'object' &&
          !Array.isArray(spreadValue)
        ) {
          Object.assign(obj, spreadValue);
        }
        continue;
      }

      const propNode = prop as PropertyNode;
      let key: string;

      if (propNode.key.type === 'Identifier') {
        key = propNode.key.name;
      } else if (propNode.key.type === 'Literal') {
        key = String(propNode.key.value);
      } else {
        continue;
      }

      const value = this.evaluateExpression(propNode.value as ExpressionNode);
      obj[key] = value;
    }

    return obj;
  }

  private evaluateArrayExpression(node: ArrayExpressionNode): unknown[] {
    const arr: unknown[] = [];

    for (const element of node.elements) {
      if (element === null) {
        arr.push(undefined);
      } else if (element.type === 'SpreadElement') {
        // Handle spread: [1, ...other, 3]
        const spreadValue = this.evaluateExpression(
          (element as SpreadElementNode).argument
        );
        if (Array.isArray(spreadValue)) {
          arr.push(...spreadValue);
        } else if (spreadValue && typeof spreadValue === 'object') {
          // Spread object values (like Object.values)
          arr.push(...Object.values(spreadValue));
        }
      } else {
        arr.push(this.evaluateExpression(element as ExpressionNode));
      }
    }

    return arr;
  }

  private evaluateTemplateLiteral(node: TemplateLiteralNode): string {
    let result = '';

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
    node: ConditionalExpressionNode
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
      typeof value === 'object' &&
      value !== null &&
      '__isPromise' in value &&
      (value as PromiseWrapper).__isPromise === true
    );
  }

  // Create a new InternalPromise + matching HeapObject, return the wrapper.
  private createInternalPromise(): {
    promise: InternalPromise;
    wrapper: PromiseWrapper;
  } {
    const id = `promise-${this.promiseCounter++}`;
    const heapId = generateId('heap', this.heapCounter++);
    const color = getPointerColor(this.pointerCounter++);

    const heapObj: HeapObject = {
      id: heapId,
      type: 'object',
      color,
      label: 'Promise',
      properties: [
        {
          key: '[[PromiseState]]',
          displayValue: '"pending"',
          valueType: 'primitive',
        },
        {
          key: '[[PromiseResult]]',
          displayValue: 'undefined',
          valueType: 'primitive',
        },
        {
          key: '[[PromiseFulfillReactions]]',
          displayValue: '[]',
          valueType: 'primitive',
        },
      ],
    };
    this.heap.push(heapObj);

    const promise: InternalPromise = {
      id,
      heapObjectId: heapId,
      state: 'pending',
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
      .join(', ');

    heapObj.properties = [
      {
        key: '[[PromiseState]]',
        displayValue: `"${promise.state}"`,
        valueType: 'primitive',
      },
      {
        key: '[[PromiseResult]]',
        displayValue:
          promise.state === 'pending'
            ? 'undefined'
            : displayValue(promise.result),
        valueType: 'primitive',
      },
      {
        key: '[[PromiseFulfillReactions]]',
        displayValue:
          promise.fulfillReactions.length === 0 ? '[]' : `[${reactionLabels}]`,
        valueType: 'primitive',
      },
    ];
  }

  // Settle a promise (fulfill or reject) and schedule reactions as microtasks.
  private resolvePromise(promise: InternalPromise, value: unknown): void {
    if (promise.state !== 'pending') return; // already settled

    // If resolved with another promise wrapper, adopt its state (simplified: use value directly)
    promise.state = 'fulfilled';
    promise.result = value;
    this.syncPromiseHeap(promise);

    for (const reaction of promise.fulfillReactions) {
      this.scheduleMicrotask(reaction, value);
    }
    promise.fulfillReactions = [];
    promise.rejectReactions = [];
  }

  private rejectPromise(promise: InternalPromise, reason: unknown): void {
    if (promise.state !== 'pending') return;

    promise.state = 'rejected';
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
    const asyncResumeId = (reaction as unknown as Record<string, unknown>)[
      '__asyncResumeId'
    ] as string | undefined;
    if (asyncResumeId) {
      const isRejection = !!(reaction as unknown as Record<string, unknown>)[
        '__isRejection'
      ];
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
          sourceType: 'promise',
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
      resolvedFnValue: reaction.resolvedFnValue,
    };
    this.pendingMicrotasks.push(microtask);

    // Show in microtask queue panel
    const queueItem: QueueItem = {
      id: microtaskId,
      callbackLabel:
        reaction.callbackSource.length > 35
          ? reaction.callbackSource.slice(0, 35) + '...'
          : reaction.callbackSource,
      sourceType: 'promise',
      sourceId: reaction.id,
    };
    this.microtaskQueue.push(queueItem);
  }

  // Handle new Promise(executor) or new UserClass(args)
  private evaluateNewExpression(node: NewExpressionNode): unknown {
    const callee = node.callee;
    if (
      callee.type === 'Identifier' &&
      (callee as IdentifierNode).name === 'Promise'
    ) {
      return this.handleNewPromise(node);
    }

    // Check for user-defined class
    if (callee.type === 'Identifier') {
      const className = (callee as IdentifierNode).name;
      const classVal = this.lookupVariable(className);
      if (this.isClassValue(classVal)) {
        return this.handleNewClass(classVal, node);
      }
    }

    // Fallback: unsupported
    const code = extractSource(this.sourceCode, node);
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.unsupportedNew({
        name:
          callee.type === 'Identifier' ? (callee as IdentifierNode).name : '?',
      }),
      code
    );
    return undefined;
  }

  /**
   * Execute `new ClassName(args)`. Creates instance HeapObject, runs constructor
   * (incl. parent constructor via super()), returns an instance wrapper.
   */
  private handleNewClass(
    classVal: ClassValue,
    node: NewExpressionNode
  ): Record<string, unknown> {
    const code = extractSource(this.sourceCode, node);
    const args = node.arguments.map((a) =>
      this.evaluateExpression(a as ExpressionNode)
    );

    // 1. Create the instance heap object
    const instanceHeapObj = this.addHeapObject(
      'object',
      `${classVal.name} instance`,
      []
    );
    // Mark as a class instance so the heap card renders correctly
    (instanceHeapObj as HeapObject & { __className?: string }).__className =
      classVal.name;

    // Add [[Prototype]] property
    const classHeap = this.heap.find((h) => h.id === classVal.heapObjectId);
    instanceHeapObj.properties = [
      {
        key: '[[Prototype]]',
        displayValue: `${classVal.name}.prototype`,
        valueType: 'object',
        heapReferenceId: classHeap?.id,
        pointerColor: classHeap?.color,
      },
    ];

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.instantiatingClass({
        className: classVal.name,
        argsDisplay: args.map((a) => displayValue(a)).join(', '),
      }),
      code
    );

    // 2. Runtime "this" object — a plain JS object whose properties we'll populate
    //    We track it via objectHeapMap so resolveValueForMemory finds the right heap entry
    const thisObj: Record<string, unknown> = {};
    this.objectHeapMap.set(thisObj, instanceHeapObj.id);

    // 3. Run constructors (parent first via super chain)
    this.runConstructorChain(classVal, thisObj, args, instanceHeapObj, node);

    return thisObj;
  }

  /**
   * Run constructor chain: if class extends a parent, run parent constructor first,
   * then run own constructor. "thisObj" is mutated in-place.
   */
  private runConstructorChain(
    classVal: ClassValue,
    thisObj: Record<string, unknown>,
    args: unknown[],
    instanceHeapObj: HeapObject,
    callNode: NewExpressionNode
  ): void {
    const code = extractSource(this.sourceCode, callNode);

    if (!classVal.constructor) {
      // No constructor — if extends, call parent constructor with same args
      if (classVal.superClassName) {
        const parentClass = this.classRegistry.get(classVal.superClassName);
        if (parentClass) {
          this.runConstructorChain(
            parentClass,
            thisObj,
            args,
            instanceHeapObj,
            callNode
          );
        }
      }
      return;
    }

    // Build params for this constructor
    const ctor = classVal.constructor;
    const params = ctor.params.map((name, i) => ({ name, value: args[i] }));

    // Push constructor frame
    this.pushFrame(
      `${classVal.name}.constructor`,
      callNode.loc?.start.line ?? 0,
      callNode.loc?.start.column ?? 0,
      params
    );

    // Inject `this` as a special memory entry at top of the current frame
    const resolved = this.resolveValueForMemory(thisObj);
    const thisEntry: MemoryEntry = {
      name: 'this',
      kind: 'param',
      valueType: 'object',
      displayValue: '[Pointer]',
      heapReferenceId: instanceHeapObj.id,
      pointerColor: instanceHeapObj.color,
    };
    const currentBlock = this.memoryBlocks[this.memoryBlocks.length - 1];
    if (currentBlock) {
      // Insert `this` at position 0 (before params)
      currentBlock.entries.unshift(thisEntry);
    }
    void resolved;

    // Store `this` in env so constructor body can read it
    this.getCurrentEnv()['this'] = thisObj;

    this.snapshot(
      callNode.loc?.start.line ?? 0,
      callNode.loc?.start.column ?? 0,
      description.executingConstructor({ className: classVal.name }),
      code
    );

    // Execute constructor body, handling super() calls
    this.hasReturned = false;
    this.returnValue = undefined;
    this.executeConstructorBody(
      ctor.body,
      classVal,
      thisObj,
      instanceHeapObj,
      callNode
    );
    this.hasReturned = false;
    this.returnValue = undefined;

    this.popFrame();

    this.snapshot(
      callNode.loc?.start.line ?? 0,
      callNode.loc?.start.column ?? 0,
      description.constructorCompleted({ className: classVal.name }),
      code
    );
  }

  /**
   * Execute constructor body, intercepting `this.x = ...` assignments and
   * `super(args)` calls, then syncing the instance HeapObject.
   */
  private executeConstructorBody(
    body: BlockStatementNode,
    classVal: ClassValue,
    thisObj: Record<string, unknown>,
    instanceHeapObj: HeapObject,
    callNode: NewExpressionNode
  ): void {
    for (const stmt of body.body) {
      if (this.hasReturned || this.stepIndex >= MAX_STEPS) break;

      // Detect super() call: ExpressionStatement → CallExpression with callee=super
      if (
        stmt.type === 'ExpressionStatement' &&
        (stmt as ExpressionStatementNode).expression.type === 'CallExpression'
      ) {
        const callExpr = (stmt as ExpressionStatementNode)
          .expression as CallExpressionNode;
        if (
          (callExpr.callee as BaseNode).type === 'Super' ||
          (callExpr.callee.type === 'Identifier' &&
            (callExpr.callee as IdentifierNode).name === 'super')
        ) {
          this.handleSuperCall(
            callExpr,
            classVal,
            thisObj,
            instanceHeapObj,
            callNode
          );
          continue;
        }
      }

      // Detect `this.prop = value` assignment
      if (
        stmt.type === 'ExpressionStatement' &&
        (stmt as ExpressionStatementNode).expression.type ===
          'AssignmentExpression'
      ) {
        const assign = (stmt as ExpressionStatementNode)
          .expression as AssignmentExpressionNode;
        if (
          assign.left.type === 'MemberExpression' &&
          ((assign.left as MemberExpressionNode).object.type === 'Identifier'
            ? ((assign.left as MemberExpressionNode).object as IdentifierNode)
                .name === 'this'
            : ((assign.left as MemberExpressionNode).object as BaseNode)
                .type === 'ThisExpression')
        ) {
          const memberNode = assign.left as MemberExpressionNode;
          const propName = (memberNode.property as IdentifierNode).name;
          const val = this.evaluateExpression(assign.right);
          thisObj[propName] = val;
          this.syncInstanceHeapObject(instanceHeapObj, thisObj);
          const stmtCode = extractSource(this.sourceCode, stmt);
          this.snapshot(
            this.getLine(stmt),
            this.getColumn(stmt),
            description.assigningThisProperty({
              propName,
              displayValue: displayValue(val),
            }),
            stmtCode
          );
          continue;
        }
      }

      this.visitStatement(stmt);
      // After each statement, sync heap in case body used `this` assignments
      this.syncInstanceHeapObject(instanceHeapObj, thisObj);
    }
  }

  /**
   * Handle super(args) inside a subclass constructor.
   * Calls the parent class constructor with the same `this` object.
   */
  private handleSuperCall(
    callExpr: CallExpressionNode,
    classVal: ClassValue,
    thisObj: Record<string, unknown>,
    instanceHeapObj: HeapObject,
    callNode: NewExpressionNode
  ): void {
    const code = extractSource(this.sourceCode, callExpr);
    const superArgs = callExpr.arguments.map((a) =>
      this.evaluateExpression(a as ExpressionNode)
    );
    const parentClassName = classVal.superClassName;
    if (!parentClassName) return;

    const parentClass = this.classRegistry.get(parentClassName);
    if (!parentClass) return;

    this.snapshot(
      this.getLine(callExpr),
      this.getColumn(callExpr),
      description.callingSuperConstructor({
        parentClassName,
        argsDisplay: superArgs.map((a) => displayValue(a)).join(', '),
      }),
      code
    );

    if (!parentClass.constructor) return;

    const ctor = parentClass.constructor;
    const params = ctor.params.map((name, i) => ({
      name,
      value: superArgs[i],
    }));

    this.pushFrame(
      `${parentClassName}.constructor`,
      callExpr.loc?.start.line ?? 0,
      callExpr.loc?.start.column ?? 0,
      params
    );

    // Inject `this` into parent constructor frame
    const thisEntry: MemoryEntry = {
      name: 'this',
      kind: 'param',
      valueType: 'object',
      displayValue: '[Pointer]',
      heapReferenceId: instanceHeapObj.id,
      pointerColor: instanceHeapObj.color,
    };
    const currentBlock = this.memoryBlocks[this.memoryBlocks.length - 1];
    if (currentBlock) currentBlock.entries.unshift(thisEntry);
    this.getCurrentEnv()['this'] = thisObj;

    this.snapshot(
      callExpr.loc?.start.line ?? 0,
      callExpr.loc?.start.column ?? 0,
      description.executingParentConstructor({ parentClassName }),
      code
    );

    this.hasReturned = false;
    this.returnValue = undefined;
    this.executeConstructorBody(
      ctor.body,
      parentClass,
      thisObj,
      instanceHeapObj,
      callNode
    );
    this.hasReturned = false;
    this.returnValue = undefined;

    this.popFrame();
  }

  /**
   * Sync the instance HeapObject properties from the live thisObj runtime value.
   * Called after each this.x = assignment so the heap display stays current.
   */
  private syncInstanceHeapObject(
    instanceHeapObj: HeapObject,
    thisObj: Record<string, unknown>
  ): void {
    // Keep the [[Prototype]] entry (always first) and rebuild the rest
    const protoEntry = instanceHeapObj.properties?.find(
      (p) => p.key === '[[Prototype]]'
    );
    const newProps: HeapObjectProperty[] = protoEntry ? [protoEntry] : [];

    for (const [key, val] of Object.entries(thisObj)) {
      if (key === 'this') continue; // skip internal env entry
      const propResolved = this.resolveValueForMemoryShallow(val);
      newProps.push({
        key,
        displayValue: propResolved.displayValue,
        valueType: propResolved.valueType,
        heapReferenceId: propResolved.heapReferenceId,
        pointerColor: propResolved.pointerColor,
      });
    }

    instanceHeapObj.properties = newProps;
    instanceHeapObj.label = `${instanceHeapObj.label.split(' instance')[0]} instance`;
  }

  private handleNewPromise(node: NewExpressionNode): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);
    const { promise, wrapper } = this.createInternalPromise();

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.newPromise(),
      code
    );

    // Executor must be a function/arrow expression (first arg)
    if (node.arguments.length === 0) return wrapper;

    const executorArg = node.arguments[0] as ExpressionNode;
    const executorNode =
      executorArg.type === 'FunctionExpression' ||
      executorArg.type === 'ArrowFunctionExpression'
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
      kind: 'promise-resolve',
      promiseId: promise.id,
    };
    const rejectFn: BuiltinFn = {
      __isBuiltin: true,
      kind: 'promise-reject',
      promiseId: promise.id,
    };

    const executorParams = executorNode.params.map(
      (p) => (p as IdentifierNode).name
    );
    const resolveParamName = executorParams[0] ?? 'resolve';
    const rejectParamName = executorParams[1] ?? 'reject';

    // Push executor frame with resolve + reject as params
    this.pushFrame(
      'Promise executor',
      this.getLine(executorNode),
      this.getColumn(executorNode),
      [
        { name: resolveParamName, value: resolveFn },
        { name: rejectParamName, value: rejectFn },
      ]
    );

    this.snapshot(
      this.getLine(executorNode),
      this.getColumn(executorNode),
      description.executingPromiseExecutor(),
      executorSource
    );

    this.hasReturned = false;
    this.returnValue = undefined;

    if (
      executorNode.type === 'ArrowFunctionExpression' &&
      (executorNode as ArrowFunctionExpressionNode).expression
    ) {
      this.evaluateExpression(
        (executorNode as ArrowFunctionExpressionNode).body as ExpressionNode
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
    node: CallExpressionNode
  ): PromiseWrapper | unknown {
    const memberExpr = node.callee as MemberExpressionNode;
    const methodName = (memberExpr.property as IdentifierNode).name;
    const code = extractSource(this.sourceCode, node);

    if (methodName === 'resolve') {
      const value =
        node.arguments.length > 0
          ? this.evaluateExpression(node.arguments[0] as ExpressionNode)
          : undefined;

      const { promise, wrapper } = this.createInternalPromise();
      this.resolvePromise(promise, value);

      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.promiseResolveStatic({ displayValue: displayValue(value) }),
        code
      );
      return wrapper;
    }

    if (methodName === 'reject') {
      const reason =
        node.arguments.length > 0
          ? this.evaluateExpression(node.arguments[0] as ExpressionNode)
          : undefined;

      const { promise, wrapper } = this.createInternalPromise();
      this.rejectPromise(promise, reason);

      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.promiseRejectStatic({ displayValue: displayValue(reason) }),
        code
      );
      return wrapper;
    }

    if (methodName === 'all') {
      return this.handlePromiseAll(node, false);
    }

    if (methodName === 'race') {
      return this.handlePromiseRace(node);
    }

    if (methodName === 'allSettled') {
      return this.handlePromiseAll(node, true);
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.promiseMethodNotSupported({ methodName }),
      code
    );
    return undefined;
  }

  private handlePromiseAll(
    node: CallExpressionNode,
    settled: boolean
  ): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);
    const { promise: resultPromise, wrapper } = this.createInternalPromise();

    if (node.arguments.length === 0) {
      this.resolvePromise(resultPromise, []);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        settled
          ? description.promiseAllSettledEmpty()
          : description.promiseAllEmpty(),
        code
      );
      return wrapper;
    }

    const iterableArg = this.evaluateExpression(
      node.arguments[0] as ExpressionNode
    );
    if (!Array.isArray(iterableArg)) {
      this.resolvePromise(resultPromise, []);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.promiseNotIterable({
          method: settled ? 'allSettled' : 'all',
        }),
        code
      );
      return wrapper;
    }

    const values: unknown[] = [];
    let hasRejected = false;

    for (const item of iterableArg) {
      if (this.isPromiseWrapper(item)) {
        const p = this.promises.get((item as PromiseWrapper).promiseId);
        if (p) {
          if (p.state === 'fulfilled') {
            values.push(
              settled ? { status: 'fulfilled', value: p.result } : p.result
            );
          } else if (p.state === 'rejected') {
            if (!settled) {
              hasRejected = true;
              this.rejectPromise(resultPromise, p.result);
              break;
            } else {
              values.push({ status: 'rejected', reason: p.result });
            }
          } else {
            // pending — treat as undefined for simplicity
            values.push(settled ? { status: 'pending' } : undefined);
          }
        }
      } else {
        values.push(settled ? { status: 'fulfilled', value: item } : item);
      }
    }

    if (!hasRejected) {
      this.resolvePromise(resultPromise, values);
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      settled
        ? description.promiseAllSettled({
            count: iterableArg.length,
            hasRejected,
            values: values.length,
          })
        : description.promiseAll({
            count: iterableArg.length,
            hasRejected,
            values: values.length,
          }),
      code
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
        description.promiseRaceEmpty(),
        code
      );
      return wrapper;
    }

    const iterableArg = this.evaluateExpression(
      node.arguments[0] as ExpressionNode
    );
    if (!Array.isArray(iterableArg)) {
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.promiseNotIterable({ method: 'race' }),
        code
      );
      return wrapper;
    }

    for (const item of iterableArg) {
      if (this.isPromiseWrapper(item)) {
        const p = this.promises.get((item as PromiseWrapper).promiseId);
        if (p && p.state !== 'pending') {
          if (p.state === 'fulfilled') {
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
      description.promiseRace({
        count: iterableArg.length,
        state: resultPromise.state,
        displayValue:
          resultPromise.state !== 'pending'
            ? displayValue(resultPromise.result)
            : undefined,
      }),
      code
    );
    return wrapper;
  }

  // Handle promise.then(onFulfilled, onRejected), .catch(onRejected), .finally(onFinally)
  private handlePromiseChainCall(
    wrapper: PromiseWrapper,
    method: string,
    node: CallExpressionNode
  ): PromiseWrapper {
    const code = extractSource(this.sourceCode, node);
    const sourcePromise = this.promises.get(wrapper.promiseId);
    if (!sourcePromise) return wrapper;

    // Create the result promise that .then()/.catch()/.finally() returns
    const { promise: resultPromise, wrapper: resultWrapper } =
      this.createInternalPromise();

    const getCallbackNode = (
      index: number
    ): {
      node: FunctionExpressionNode | ArrowFunctionExpressionNode | null;
      fnValue: FunctionValue | null;
    } => {
      const arg = node.arguments[index];
      if (!arg) return { node: null, fnValue: null };
      if (
        arg.type === 'FunctionExpression' ||
        arg.type === 'ArrowFunctionExpression'
      ) {
        return {
          node: arg as FunctionExpressionNode | ArrowFunctionExpressionNode,
          fnValue: null,
        };
      }
      if (arg.type === 'Identifier') {
        const val = this.lookupVariable((arg as IdentifierNode).name);
        if (val !== undefined && this.isFunctionValue(val)) {
          return { node: null, fnValue: val };
        }
      }
      return { node: null, fnValue: null };
    };

    const getCallbackSource = (index: number): string => {
      const arg = node.arguments[index];
      if (!arg) return '(no callback)';
      return extractSource(this.sourceCode, arg as BaseNode);
    };

    if (method === 'then') {
      const { node: onFulfilledNode, fnValue: onFulfilledFn } =
        getCallbackNode(0);
      const { node: onRejectedNode, fnValue: onRejectedFn } =
        getCallbackNode(1);

      if (onFulfilledNode || onFulfilledFn) {
        const reaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: 'fulfill',
          callbackNode: onFulfilledNode,
          callbackSource: getCallbackSource(0),
          resultPromiseId: resultPromise.id,
          resolvedFnValue: onFulfilledFn ?? undefined,
        };

        if (sourcePromise.state === 'fulfilled') {
          this.scheduleMicrotask(reaction, sourcePromise.result);
        } else if (sourcePromise.state === 'pending') {
          sourcePromise.fulfillReactions.push(reaction);
          this.syncPromiseHeap(sourcePromise);
        }
        // If already rejected, onFulfilled is skipped — resultPromise stays pending
        // (simplified: propagate rejection)
        if (sourcePromise.state === 'rejected') {
          this.rejectPromise(resultPromise, sourcePromise.result);
        }
      } else {
        // Empty .then() — pass value through to next promise
        if (sourcePromise.state === 'fulfilled') {
          this.resolvePromise(resultPromise, sourcePromise.result);
        } else if (sourcePromise.state === 'rejected') {
          this.rejectPromise(resultPromise, sourcePromise.result);
        } else {
          // pending — add identity reactions to propagate when settled
          const identityFulfillReaction: PromiseReaction = {
            id: `reaction-${this.reactionCounter++}`,
            type: 'fulfill',
            callbackNode: null as unknown,
            callbackSource: '(identity)',
            resultPromiseId: resultPromise.id,
          };
          sourcePromise.fulfillReactions.push(identityFulfillReaction);
        }
      }

      if (onRejectedNode || onRejectedFn) {
        const reaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: 'reject',
          callbackNode: onRejectedNode,
          callbackSource: getCallbackSource(1),
          resultPromiseId: resultPromise.id,
          resolvedFnValue: onRejectedFn ?? undefined,
        };

        if (sourcePromise.state === 'rejected') {
          this.scheduleMicrotask(reaction, sourcePromise.result);
        } else if (sourcePromise.state === 'pending') {
          sourcePromise.rejectReactions.push(reaction);
        }
      }
    } else if (method === 'catch') {
      const { node: onRejectedNode, fnValue: onRejectedFn } =
        getCallbackNode(0);

      if (onRejectedNode || onRejectedFn) {
        const reaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: 'reject',
          callbackNode: onRejectedNode,
          callbackSource: getCallbackSource(0),
          resultPromiseId: resultPromise.id,
          resolvedFnValue: onRejectedFn ?? undefined,
        };

        if (sourcePromise.state === 'rejected') {
          this.scheduleMicrotask(reaction, sourcePromise.result);
        } else if (sourcePromise.state === 'pending') {
          sourcePromise.rejectReactions.push(reaction);
        } else {
          // fulfilled — propagate to result promise
          this.resolvePromise(resultPromise, sourcePromise.result);
        }
      }
    } else if (method === 'finally') {
      const { node: onFinallyNode, fnValue: onFinallyFn } = getCallbackNode(0);
      const finallySource = getCallbackSource(0);

      if (onFinallyNode || onFinallyFn) {
        // Both fulfill and reject call the same callback, then propagate original value
        const fulfillReaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: 'fulfill',
          callbackNode: onFinallyNode,
          callbackSource: finallySource,
          resultPromiseId: resultPromise.id,
          preserveValue: true, // .finally() preserves original value
          resolvedFnValue: onFinallyFn ?? undefined,
        };
        const rejectReaction: PromiseReaction = {
          id: `reaction-${this.reactionCounter++}`,
          type: 'reject',
          callbackNode: onFinallyNode,
          callbackSource: finallySource,
          resultPromiseId: resultPromise.id,
          preserveValue: true, // .finally() preserves original value
          resolvedFnValue: onFinallyFn ?? undefined,
        };

        if (sourcePromise.state === 'fulfilled') {
          this.scheduleMicrotask(fulfillReaction, sourcePromise.result);
        } else if (sourcePromise.state === 'rejected') {
          this.scheduleMicrotask(rejectReaction, sourcePromise.result);
        } else {
          sourcePromise.fulfillReactions.push(fulfillReaction);
          sourcePromise.rejectReactions.push(rejectReaction);
          this.syncPromiseHeap(sourcePromise);
        }
      }
    }

    // Generate educational description for the step
    let chainDesc: string;
    if (method === 'then') {
      if (sourcePromise.state === 'fulfilled') {
        chainDesc = description.thenRegistered();
      } else if (sourcePromise.state === 'rejected') {
        chainDesc = description.thenSkipped();
      } else {
        chainDesc = description.thenRegistered();
      }
    } else if (method === 'catch') {
      if (sourcePromise.state === 'rejected') {
        chainDesc = description.catchQueued();
      } else if (sourcePromise.state === 'fulfilled') {
        chainDesc = description.catchSkipped();
      } else {
        chainDesc = description.catchRegistered();
      }
    } else {
      // finally
      if (sourcePromise.state !== 'pending') {
        chainDesc = description.finallyQueued();
      } else {
        chainDesc = description.finallyRegistered();
      }
    }

    this.snapshot(this.getLine(node), this.getColumn(node), chainDesc, code);

    return resultWrapper;
  }

  // Execute a single microtask (a .then/.catch/.finally callback or async resume)
  private executeMicrotask(microtask: PendingMicrotask): void {
    // Check if this is an async-resume microtask
    if (
      microtask.callbackNode === null &&
      this.asyncContinuations.has(microtask.id)
    ) {
      const continuation = this.asyncContinuations.get(microtask.id)!;
      this.resumeAsyncFunction(
        microtask.id,
        microtask.resolveValue,
        continuation.isRejection
      );
      return;
    }

    const callbackNode = microtask.callbackNode as
      | FunctionExpressionNode
      | ArrowFunctionExpressionNode
      | null;

    // Support callbacks passed as identifier references (FunctionValue)
    const resolvedFn = microtask.resolvedFnValue as FunctionValue | undefined;

    let resolveParamName: string | undefined;
    if (callbackNode) {
      resolveParamName = callbackNode.params
        .map((p) => (p as IdentifierNode).name)
        .at(0);
    } else if (resolvedFn) {
      resolveParamName = resolvedFn.params[0];
    }

    const frameParams =
      resolveParamName !== undefined
        ? [{ name: resolveParamName, value: microtask.resolveValue }]
        : [];

    // Inject captured closure envs so the callback can access closed-over variables.
    const capturedEnvs = microtask.capturedEnvStack ?? [];
    const capturedCount = capturedEnvs.length;
    if (capturedCount > 0) {
      this.envStack.splice(1, 0, ...capturedEnvs);
    }

    // Also inject closure envs from FunctionValue itself (for fn references)
    const fnCapturedMeta = resolvedFn?.capturedEnvMeta ?? [];
    const fnCapturedEnvs = fnCapturedMeta.map((m) => m.env);
    const fnCapturedCount = fnCapturedEnvs.length;
    if (fnCapturedCount > 0) {
      this.envStack.splice(1, 0, ...fnCapturedEnvs);
    }

    const displaySource =
      microtask.callbackSource.length > 20
        ? microtask.callbackSource.slice(0, 20) + '...'
        : microtask.callbackSource;
    const lineNum = callbackNode ? this.getLine(callbackNode) : 0;
    const colNum = callbackNode ? this.getColumn(callbackNode) : 0;

    this.pushFrame(displaySource, lineNum, colNum, frameParams);

    this.eventLoop = {
      phase: 'draining-microtasks',
      description:
        'Event Loop: draining Microtask Queue (priority over Task Queue)',
    };

    this.snapshot(
      lineNum,
      colNum,
      description.executingMicrotask({
        displayValue: displayValue(microtask.resolveValue),
      }),
      microtask.callbackSource
    );

    this.hasReturned = false;
    this.returnValue = undefined;

    if (callbackNode) {
      if (
        callbackNode.type === 'ArrowFunctionExpression' &&
        (callbackNode as ArrowFunctionExpressionNode).expression
      ) {
        this.returnValue = this.evaluateExpression(
          (callbackNode as ArrowFunctionExpressionNode).body as ExpressionNode
        );
        this.hasReturned = true;
      } else {
        this.visitBlockStatement(callbackNode.body as BlockStatementNode);
      }
    } else if (resolvedFn) {
      this.visitBlockStatement(resolvedFn.body as BlockStatementNode);
    }

    const returnVal = this.returnValue;
    this.hasReturned = false;
    this.returnValue = undefined;

    this.popFrame();

    // Remove injected closure envs (fn-value envs first, then captured envs)
    if (fnCapturedCount > 0) {
      this.envStack.splice(1, fnCapturedCount);
    }
    if (capturedCount > 0) {
      this.envStack.splice(1, capturedCount);
    }

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
            (valueToResolve as PromiseWrapper).promiseId
          );
          if (innerPromise) {
            if (innerPromise.state === 'fulfilled') {
              this.resolvePromise(resultPromise, innerPromise.result);
            } else if (innerPromise.state === 'rejected') {
              this.rejectPromise(resultPromise, innerPromise.result);
            } else {
              // pending inner promise — chain reactions
              innerPromise.fulfillReactions.push({
                id: `reaction-${this.reactionCounter++}`,
                type: 'fulfill',
                callbackNode: null,
                callbackSource: '(chain)',
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
    builtin: BuiltinFn
  ): unknown {
    const code = extractSource(this.sourceCode, node);
    const promise = this.promises.get(builtin.promiseId);
    if (!promise) return undefined;

    const value =
      node.arguments.length > 0
        ? this.evaluateExpression(node.arguments[0] as ExpressionNode)
        : undefined;

    if (builtin.kind === 'promise-resolve') {
      this.resolvePromise(promise, value);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.promiseResolveCallback({
          displayValue: displayValue(value),
        }),
        code
      );
    } else {
      this.rejectPromise(promise, value);
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.promiseRejectCallback({
          displayValue: displayValue(value),
        }),
        code
      );
    }

    return undefined;
  }

  // === Function Creation ===

  private createFunctionValue(
    node: FunctionExpressionNode | ArrowFunctionExpressionNode
  ): FunctionValue {
    // Extract param names (for simple params) and store nodes for destructuring
    const params: string[] = [];
    for (const p of node.params) {
      if (p.type === 'Identifier') {
        params.push((p as IdentifierNode).name);
      } else if (p.type === 'AssignmentPattern') {
        // Default parameter: extract the variable name from the left side
        const left = (p as AssignmentPatternNode).left;
        params.push(
          left.type === 'Identifier'
            ? (left as IdentifierNode).name
            : `__pattern_${params.length}`
        );
      } else {
        // Placeholder name for pattern params - actual binding happens at call time
        params.push(`__pattern_${params.length}`);
      }
    }
    const source = extractSource(this.sourceCode, node);
    const isArrow = node.type === 'ArrowFunctionExpression';
    const isGenerator =
      node.type === 'FunctionExpression' &&
      (node as FunctionExpressionNode).generator === true;

    return {
      __isFunction: true,
      params,
      paramNodes: node.params as PatternNode[],
      body: node.body as BlockStatementNode | ExpressionNode,
      isArrow,
      isAsync: node.async === true,
      isGenerator,
      source,
      capturedEnvMeta: this.captureEnclosingScopes(),
    };
  }

  private createFunctionValueFromDeclaration(
    node: FunctionDeclarationNode
  ): FunctionValue {
    // Extract param names (for simple params) and store nodes for destructuring
    const params: string[] = [];
    for (const p of node.params) {
      if (p.type === 'Identifier') {
        params.push((p as IdentifierNode).name);
      } else if (p.type === 'AssignmentPattern') {
        // Default parameter: extract the variable name from the left side
        const left = (p as AssignmentPatternNode).left;
        params.push(
          left.type === 'Identifier'
            ? (left as IdentifierNode).name
            : `__pattern_${params.length}`
        );
      } else {
        params.push(`__pattern_${params.length}`);
      }
    }
    const source = extractSource(this.sourceCode, node);

    return {
      __isFunction: true,
      params,
      paramNodes: node.params as PatternNode[],
      body: node.body,
      isArrow: false,
      isAsync: node.async === true,
      isGenerator: node.generator === true,
      source,
      capturedEnvMeta: this.captureEnclosingScopes(),
    };
  }

  /**
   * Capture metadata for enclosing non-global scopes (for closure display and execution).
   * Returns an array from outermost to innermost (excluding global).
   * Also registers each captured env in envCapturedBy for return-description lookup.
   */
  private captureEnclosingScopes(): CapturedEnvMeta[] | undefined {
    // envStack[0] = global, envStack[1..] = local frames (and any block envs
    // pushed mid-loop for per-iteration let/const scoping).
    // callStack[i] corresponds to envStack[i] for function frames, but block
    // envs pushed inside a loop body have no callStack entry.
    const result: CapturedEnvMeta[] = [];

    for (let i = 1; i < this.envStack.length; i++) {
      const env = this.envStack[i];

      // callStack[i] exists for function frames. Block envs pushed mid-loop
      // (for per-iteration let/const scoping) have no own callStack entry;
      // associate them with the innermost function frame instead.
      const frameForEntry =
        this.callStack[i] ?? this.callStack[this.callStack.length - 1];
      if (!frameForEntry) continue;

      const block = this.memoryBlocks.find(
        (b) => b.frameId === frameForEntry.id
      );
      if (!block) continue;

      const kinds = this.envKindsMap.get(env) ?? {};

      result.push({
        scopeName: frameForEntry.name,
        scopeColor: frameForEntry.color,
        kinds,
        env,
      });

      // Register this env as captured so we can generate the closure return description
      const existing = this.envCapturedBy.get(env) ?? [];
      if (!existing.includes(frameForEntry.name)) {
        existing.push(frameForEntry.name);
        this.envCapturedBy.set(env, existing);
      }
    }

    return result.length > 0 ? result : undefined;
  }

  /**
   * Build ClosureScopeEntry[] from CapturedEnvMeta[] for display on HeapObject.
   */
  private buildClosureScopeEntries(
    meta: CapturedEnvMeta[] | undefined
  ): ClosureScopeEntry[] {
    if (!meta || meta.length === 0) return [];

    return meta.map((m) => {
      const variables: ClosureVariable[] = Object.keys(m.env).map((varName) => {
        const val = m.env[varName];
        const resolved = this.resolveValueForMemoryShallow(val);
        const kind = m.kinds[varName];
        return {
          name: varName,
          displayValue: resolved.displayValue,
          valueType: resolved.valueType,
          heapReferenceId: resolved.heapReferenceId,
          pointerColor: resolved.pointerColor,
          isMutable: kind === 'let' || kind === 'var' || kind === 'param',
        };
      });

      return {
        scopeName: m.scopeName,
        scopeColor: m.scopeColor,
        variables,
      };
    });
  }

  /**
   * Resolve a value for display in closure scope without creating new heap objects.
   */
  private resolveValueForMemoryShallow(val: unknown): {
    displayValue: string;
    valueType: MemoryValueType;
    heapReferenceId?: string;
    pointerColor?: string;
  } {
    if (this.isFunctionValue(val)) {
      const existingId = this.objectHeapMap.get(val);
      const existing = existingId
        ? this.heap.find((h) => h.id === existingId)
        : undefined;
      return {
        displayValue: 'ⓕ',
        valueType: 'function',
        heapReferenceId: existing?.id,
        pointerColor: existing?.color,
      };
    }
    if (this.isPromiseWrapper(val)) {
      const p = this.promises.get((val as { promiseId: string }).promiseId);
      const heapObj = p
        ? this.heap.find((h) => h.id === p.heapObjectId)
        : undefined;
      return {
        displayValue: '[Pointer]',
        valueType: 'object',
        heapReferenceId: heapObj?.id,
        pointerColor: heapObj?.color,
      };
    }
    if (val !== null && typeof val === 'object') {
      const existingId = this.objectHeapMap.get(val as object);
      const existing = existingId
        ? this.heap.find((h) => h.id === existingId)
        : undefined;
      return {
        displayValue: '[Pointer]',
        valueType: 'object',
        heapReferenceId: existing?.id,
        pointerColor: existing?.color,
      };
    }
    const dv = displayValue(val);
    return { displayValue: dv, valueType: 'primitive' };
  }

  /**
   * Refresh all HeapObject.closureScope entries from their live env references.
   * Called before each snapshot so the displayed values are always current.
   */
  private syncClosureScopeDisplays(): void {
    for (const [heapId, meta] of this.closureLiveEnvMap) {
      const heapObj = this.heap.find((h) => h.id === heapId);
      if (!heapObj) continue;
      const entries = this.buildClosureScopeEntries(meta);
      if (entries.length > 0) {
        heapObj.closureScope = entries;
      }
    }
  }

  // === Async/Await Engine ===

  private makeThrownError(reason: unknown): ThrownError {
    return { __isThrownError: true, reason };
  }

  private isThrownError(value: unknown): value is ThrownError {
    return (
      typeof value === 'object' &&
      value !== null &&
      '__isThrownError' in value &&
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
    callNode: CallExpressionNode
  ): PromiseWrapper {
    const code = extractSource(this.sourceCode, callNode);

    // 1. Create the implicit return Promise
    const { promise: returnPromise, wrapper: returnWrapper } =
      this.createInternalPromise();

    // 2. Push async CallStackFrame
    const frameId = generateId('frame', this.frameCounter);
    const color = getFrameColor(this.frameCounter++);

    const frame: CallStackFrame = {
      id: frameId,
      name: funcName,
      type: 'async',
      line: this.getLine(callNode),
      column: this.getColumn(callNode),
      scope: {
        name: funcName,
        type: 'function',
        variables: params.map((p) => ({
          name: p.name,
          value: p.value,
          kind: 'param' as VariableKind,
        })),
        parentScope:
          this.callStack.length > 0
            ? this.callStack[this.callStack.length - 1].name
            : undefined,
      },
      color,
      isAsync: true,
      status: 'executing',
    };

    const paramEntries: MemoryEntry[] = params.map((p) => {
      const resolved = this.resolveValueForMemory(p.value);
      return {
        name: p.name,
        kind: 'param' as const,
        valueType: resolved.valueType,
        displayValue: resolved.displayValue,
        heapReferenceId: resolved.heapReferenceId,
        pointerColor: resolved.pointerColor,
      };
    });

    const memoryBlock: MemoryBlock = {
      frameId,
      label: `Local: ${funcName}`,
      type: 'local',
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
      type: 'function',
      variables: params.map((p) => ({
        name: p.name,
        value: p.value,
        kind: 'param' as VariableKind,
      })),
      parentScope:
        this.scopes.length > 0
          ? this.scopes[this.scopes.length - 1].name
          : undefined,
    });

    this.snapshot(
      this.getLine(callNode),
      this.getColumn(callNode),
      description.callingAsyncFunction({ funcName }),
      code
    );

    // 3. Execute body — visitAsyncFunctionBody handles await suspension
    const body = funcValue.body as BlockStatementNode;
    const result = this.visitAsyncFunctionBody(
      body.body as StatementNode[],
      funcName,
      frameId,
      color,
      returnPromise.id
    );

    // 4. If the function completed without suspension (no await hit), settle the promise
    if (result !== 'suspended') {
      const returnVal =
        result === 'completed-with-return' ? this.returnValue : undefined;
      this.hasReturned = false;
      this.returnValue = undefined;

      this.popFrame();

      if (this.isThrownError(returnVal)) {
        this.rejectPromise(returnPromise, (returnVal as ThrownError).reason);
        this.snapshot(
          this.getLine(callNode),
          this.getColumn(callNode),
          description.asyncFunctionThrew({
            funcName,
            displayValue: displayValue((returnVal as ThrownError).reason),
          }),
          code
        );
      } else {
        this.resolvePromise(returnPromise, returnVal);
        this.snapshot(
          this.getLine(callNode),
          this.getColumn(callNode),
          description.asyncFunctionCompleted({
            funcName,
            displayValue: displayValue(returnVal),
          }),
          code
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
    returnPromiseId: string
  ): 'suspended' | 'completed-with-return' | 'completed' {
    // Pre-check: if hasReturned was set before the loop (e.g. by `return await`), honour it
    if (this.hasReturned) return 'completed-with-return';

    for (let i = 0; i < statements.length; i++) {
      if (this.stepIndex >= MAX_STEPS) return 'completed';

      const stmt = statements[i];

      // Check for await somewhere in this statement
      const awaitInfo = this.findAwaitInStatement(stmt);

      if (awaitInfo) {
        // Execute everything up to the await; get the awaited value
        const { awaitedValue, resultVarName } =
          this.processStatementUpToAwait(stmt);

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
          description.awaitCheckingPromise(),
          awaitCode
        );

        // Suspend the async frame
        const frame = this.callStack.find((f) => f.id === frameId);
        if (frame) frame.status = 'suspended';
        const block = this.memoryBlocks.find((b) => b.frameId === frameId);
        if (block) block.suspended = true;

        this.snapshot(
          this.getLine(stmt),
          this.getColumn(stmt),
          description.asyncFunctionSuspended({ funcName }),
          awaitCode
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

        return 'suspended';
      }

      // No await — execute normally
      this.visitStatement(stmt);

      if (this.hasReturned) {
        return 'completed-with-return';
      }

      // Propagate thrown errors (e.g. from rejected await inside a try block
      // that wasn't caught, or from the AwaitExpression fallback path)
      if (this.isThrownError(this.returnValue)) {
        this.hasReturned = true;
        return 'completed-with-return';
      }

      if (this.stepIndex >= MAX_STEPS) return 'completed';
    }

    return 'completed';
  }

  /**
   * Schedule a microtask that resumes an async function when the awaited
   * promise settles.
   */
  private scheduleAsyncContinuation(
    continuation: AsyncContinuation,
    awaitedPromise: InternalPromise
  ): void {
    // Create a synthetic microtask id
    const microtaskId = `async-resume-${this.microtaskCounter++}`;

    // We store the continuation in a map keyed by microtaskId so executeMicrotask can find it
    this.asyncContinuations.set(microtaskId, continuation);

    const queueItem: QueueItem = {
      id: microtaskId,
      callbackLabel: `resume ${continuation.functionName}`,
      sourceType: 'promise',
      sourceId: awaitedPromise.id,
    };

    if (awaitedPromise.state === 'fulfilled') {
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
    } else if (awaitedPromise.state === 'rejected') {
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
        type: 'fulfill',
        callbackNode: null as unknown,
        callbackSource: `resume ${continuation.functionName}`,
        resultPromiseId: continuation.returnPromiseId,
      };
      // Override: we use a special marker to route through async resume instead
      (fulfillReaction as unknown as Record<string, unknown>)[
        '__asyncResumeId'
      ] = microtaskId;

      const rejectReaction: PromiseReaction = {
        id: `reaction-${this.reactionCounter++}`,
        type: 'reject',
        callbackNode: null as unknown,
        callbackSource: `resume ${continuation.functionName} (rejection)`,
        resultPromiseId: continuation.returnPromiseId,
      };
      (rejectReaction as unknown as Record<string, unknown>)[
        '__asyncResumeId'
      ] = microtaskId;
      (rejectReaction as unknown as Record<string, unknown>)['__isRejection'] =
        true;

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
    isRejection: boolean
  ): void {
    const continuation = this.asyncContinuations.get(microtaskId);
    if (!continuation) return;
    this.asyncContinuations.delete(microtaskId);

    // Restore the frame status
    const frame = this.callStack.find((f) => f.id === continuation.frameId);
    if (frame) {
      frame.status = 'executing';
    }
    const block = this.memoryBlocks.find(
      (b) => b.frameId === continuation.frameId
    );
    if (block) {
      block.suspended = false;
    }

    // Restore env stack
    this.envStack.push(continuation.localEnv);
    this.scopes.push({
      name: continuation.functionName,
      type: 'function',
      variables: [],
    });

    const resumeValue = isRejection
      ? this.makeThrownError(resolvedValue)
      : resolvedValue;

    this.snapshot(
      0,
      0,
      description.asyncFunctionResumed({
        funcName: continuation.functionName,
        displayValue: displayValue(resolvedValue),
      }),
      ''
    );

    // If the await result goes into a variable, assign it now
    if (continuation.awaitResultVarName && !isRejection) {
      const varName = continuation.awaitResultVarName;

      if (varName === '__return__') {
        // `return await <expr>` — the async function should return with resolvedValue
        this.hasReturned = true;
        this.returnValue = resolvedValue;
      } else {
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
    }

    // Continue executing the remaining statements
    const returnPromise = this.promises.get(continuation.returnPromiseId);

    if (isRejection && continuation.remainingStatements.length === 0) {
      // Nothing left to execute and we have a rejection — reject the promise
      this.hasReturned = false;
      this.returnValue = undefined;
      this.popFrame();
      if (returnPromise) {
        this.rejectPromise(returnPromise, resolvedValue);
        this.snapshot(
          0,
          0,
          description.asyncContinuationRejected({
            funcName: continuation.functionName,
            displayValue: displayValue(resolvedValue),
          }),
          ''
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
      continuation.returnPromiseId
    );

    if (result !== 'suspended') {
      const returnVal =
        result === 'completed-with-return' ? this.returnValue : undefined;
      this.hasReturned = false;
      this.returnValue = undefined;

      this.popFrame();

      if (returnPromise) {
        if (this.isThrownError(returnVal)) {
          this.rejectPromise(returnPromise, (returnVal as ThrownError).reason);
          this.snapshot(
            0,
            0,
            description.asyncContinuationThrew({
              funcName: continuation.functionName,
            }),
            ''
          );
        } else {
          this.resolvePromise(returnPromise, returnVal);
          this.snapshot(
            0,
            0,
            description.asyncContinuationCompleted({
              funcName: continuation.functionName,
              displayValue: displayValue(returnVal),
            }),
            ''
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
    stmt: StatementNode
  ): AwaitExpressionNode | null {
    if (stmt.type === 'VariableDeclaration') {
      const decl = stmt as VariableDeclarationNode;
      for (const d of decl.declarations) {
        if (d.init && d.init.type === 'AwaitExpression') {
          return d.init as AwaitExpressionNode;
        }
      }
    }
    if (stmt.type === 'ExpressionStatement') {
      const expr = (stmt as ExpressionStatementNode).expression;
      if (expr.type === 'AwaitExpression') return expr as AwaitExpressionNode;
      if (expr.type === 'AssignmentExpression') {
        const right = (expr as AssignmentExpressionNode).right;
        if (right.type === 'AwaitExpression')
          return right as AwaitExpressionNode;
      }
    }
    if (stmt.type === 'ReturnStatement') {
      const ret = stmt as ReturnStatementNode;
      if (ret.argument && ret.argument.type === 'AwaitExpression') {
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
    if (stmt.type === 'VariableDeclaration') {
      const decl = stmt as VariableDeclarationNode;
      const d = decl.declarations[0];
      const awaitNode = d.init as AwaitExpressionNode;
      const awaitedValue = this.evaluateExpression(awaitNode.argument);
      // Declare the variable as undefined for now (will be assigned on resume)
      // For await, we only support simple identifiers
      const varName =
        d.id.type === 'Identifier'
          ? (d.id as IdentifierNode).name
          : '__await_result__';
      this.setVariable(varName, undefined, true);
      const entry: MemoryEntry = {
        name: varName,
        kind: decl.kind as VariableKind,
        valueType: 'primitive',
        displayValue: 'undefined',
      };
      this.addMemoryEntry(this.getCurrentFrameId(), entry);
      const currentScope = this.scopes[this.scopes.length - 1];
      if (currentScope) {
        currentScope.variables.push({
          name: varName,
          value: undefined,
          kind: decl.kind as VariableKind,
        });
      }
      const currentFrame = this.callStack[this.callStack.length - 1];
      if (currentFrame) {
        currentFrame.scope.variables.push({
          name: varName,
          value: undefined,
          kind: decl.kind as VariableKind,
        });
      }
      return { awaitedValue, resultVarName: varName };
    }

    if (stmt.type === 'ExpressionStatement') {
      const expr = (stmt as ExpressionStatementNode).expression;
      if (expr.type === 'AwaitExpression') {
        const awaitedValue = this.evaluateExpression(
          (expr as AwaitExpressionNode).argument
        );
        return { awaitedValue, resultVarName: null };
      }
      if (expr.type === 'AssignmentExpression') {
        const assignNode = expr as AssignmentExpressionNode;
        const awaitNode = assignNode.right as AwaitExpressionNode;
        const awaitedValue = this.evaluateExpression(awaitNode.argument);
        const varName =
          assignNode.left.type === 'Identifier'
            ? (assignNode.left as IdentifierNode).name
            : null;
        return { awaitedValue, resultVarName: varName };
      }
    }

    if (stmt.type === 'ReturnStatement') {
      const ret = stmt as ReturnStatementNode;
      const awaitNode = ret.argument as AwaitExpressionNode;
      const awaitedValue = this.evaluateExpression(awaitNode.argument);
      return { awaitedValue, resultVarName: '__return__' };
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
      // Flow control signals must propagate through try/catch
      if (_e instanceof BreakSignal || _e instanceof ContinueSignal) throw _e;
      // Unexpected JS-level error — treat as thrown
      thrownError = this.makeThrownError(_e);
    }

    if (thrownError && node.handler) {
      const catchClause = node.handler;
      const catchCode = extractSource(this.sourceCode, catchClause.body);

      this.snapshot(
        this.getLine(catchClause.body),
        this.getColumn(catchClause.body),
        description.errorCaught({
          displayValue: displayValue(thrownError.reason),
        }),
        catchCode
      );

      // Push error variable into current scope if param exists
      if (catchClause.param) {
        const errName = catchClause.param.name;
        this.setVariable(errName, thrownError.reason, true);
        const entry: MemoryEntry = {
          name: errName,
          kind: 'let' as VariableKind,
          valueType: 'primitive',
          displayValue: displayValue(thrownError.reason),
        };
        this.addMemoryEntry(this.getCurrentFrameId(), entry);
        const currentScope = this.scopes[this.scopes.length - 1];
        if (currentScope) {
          currentScope.variables.push({
            name: errName,
            value: thrownError.reason,
            kind: 'let' as VariableKind,
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
        description.enteringFinally(),
        finallyCode
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
      description.throwStatement({ displayValue: displayValue(value) }),
      code
    );
    this.returnValue = this.makeThrownError(value);
    this.hasReturned = true;
  }

  private visitBreakStatement(node: BreakStatementNode): void {
    const code = extractSource(this.sourceCode, node);
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.breakStatement(),
      code
    );
    throw new BreakSignal();
  }

  private visitContinueStatement(node: ContinueStatementNode): void {
    const code = extractSource(this.sourceCode, node);
    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.continueStatement(),
      code
    );
    throw new ContinueSignal();
  }

  // === Generator Methods ===

  /**
   * Create a generator object when a generator function is invoked.
   * Does NOT execute the generator body - just creates the generator object.
   */
  private createGeneratorObject(
    funcValue: FunctionValue,
    funcName: string,
    params: Array<{ name: string; value: unknown }>,
    callNode: CallExpressionNode
  ): GeneratorWrapper {
    const code = extractSource(this.sourceCode, callNode);
    const generatorId = `gen-${this.generatorCounter++}`;

    // Get the function's heap object ID for reference
    const functionHeapId = this.objectHeapMap.get(funcValue) ?? '';
    const functionHeap = functionHeapId
      ? this.heap.find((h) => h.id === functionHeapId)
      : undefined;

    // Create generator HeapObject with properties
    const genHeapObj = this.addHeapObject('object', `Generator (${funcName})`, [
      {
        key: '[[GeneratorState]]',
        displayValue: '"suspended"',
        valueType: 'primitive',
      },
      {
        key: '[[GeneratorFunction]]',
        displayValue: `ⓕ* ${funcName}`,
        valueType: 'function',
        heapReferenceId: functionHeapId || undefined,
        pointerColor: functionHeap?.color,
      },
      { key: 'next', displayValue: 'ⓕ', valueType: 'function' },
      { key: 'return', displayValue: 'ⓕ', valueType: 'function' },
      { key: 'throw', displayValue: 'ⓕ', valueType: 'function' },
    ]);
    genHeapObj.generatorState = 'suspended';

    // Create the continuation for this generator
    const frameId = generateId('gen-frame', this.frameCounter++);
    const frameColor = getFrameColor(this.frameCounter);
    const localEnv: Record<string, unknown> = {};
    for (const p of params) localEnv[p.name] = p.value;

    const continuation: GeneratorContinuation = {
      generatorId,
      frameId,
      frameColor,
      remainingStatements: (funcValue.body as BlockStatementNode)
        .body as StatementNode[],
      localEnv,
      capturedEnvStack: funcValue.capturedEnvMeta?.map((m) => m.env) ?? [],
      yieldResultVarName: null,
      executionPosition: 0,
      nextCallCount: 0,
    };

    this.generatorContinuations.set(generatorId, continuation);

    // Create the generator wrapper runtime value
    const wrapper: GeneratorWrapper = {
      __isGenerator: true,
      generatorId,
      functionValue: funcValue,
      heapObjectId: genHeapObj.id,
      functionHeapId,
    };

    // Map the wrapper to its heap object
    this.objectHeapMap.set(wrapper, genHeapObj.id);

    const argsDisplay = params.map((p) => displayValue(p.value)).join(', ');
    this.snapshot(
      this.getLine(callNode),
      this.getColumn(callNode),
      description.generatorCreated({ funcName, argsDisplay }),
      code
    );

    return wrapper;
  }

  /**
   * Handle generator.next(), generator.return(), generator.throw() calls.
   */
  private handleGeneratorMethodCall(
    wrapper: GeneratorWrapper,
    method: string,
    node: CallExpressionNode
  ): unknown {
    const code = extractSource(this.sourceCode, node);
    const genHeap = this.heap.find((h) => h.id === wrapper.heapObjectId);

    if (!genHeap) {
      console.warn(`Generator heap object not found: ${wrapper.heapObjectId}`);
      return { value: undefined, done: true };
    }

    // Check if generator is already closed
    if (genHeap.generatorState === 'closed') {
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.generatorAlreadyClosed({ method }),
        code
      );
      return { value: undefined, done: true };
    }

    // Get the argument value if provided
    const argValue =
      node.arguments.length > 0
        ? this.evaluateExpression(node.arguments[0] as ExpressionNode)
        : undefined;

    if (method === 'return') {
      return this.executeGeneratorReturn(wrapper, argValue, node);
    }

    if (method === 'throw') {
      return this.executeGeneratorThrow(wrapper, argValue, node);
    }

    // method === "next"
    return this.executeGeneratorNext(wrapper, argValue, node);
  }

  /**
   * Execute generator.next(value) - run the generator body until yield or completion.
   */
  private executeGeneratorNext(
    wrapper: GeneratorWrapper,
    inputValue: unknown,
    node: CallExpressionNode
  ): unknown {
    const code = extractSource(this.sourceCode, node);
    const continuation = this.generatorContinuations.get(wrapper.generatorId);
    const genHeap = this.heap.find((h) => h.id === wrapper.heapObjectId);

    if (!continuation || !genHeap) {
      return { value: undefined, done: true };
    }

    // Safety check for infinite loops
    continuation.nextCallCount++;
    if (continuation.nextCallCount > Interpreter.MAX_GENERATOR_NEXT_CALLS) {
      genHeap.generatorState = 'closed';
      this.updateGeneratorHeapState(genHeap, 'closed');
      this.snapshot(
        this.getLine(node),
        this.getColumn(node),
        description.generatorMaxIterations(),
        code
      );
      return { value: undefined, done: true };
    }

    const funcValue = wrapper.functionValue;
    const funcName =
      funcValue.source.match(/function\*?\s*(\w+)/)?.[1] ?? '<generator>';

    // Update generator state to executing
    genHeap.generatorState = 'executing';
    this.updateGeneratorHeapState(genHeap, 'executing');

    // Push the generator frame
    const frame: CallStackFrame = {
      id: continuation.frameId,
      name: funcName,
      type: 'generator',
      line: this.getLine(node),
      column: this.getColumn(node),
      scope: {
        name: funcName,
        type: 'function',
        variables: Object.entries(continuation.localEnv).map(
          ([name, value]) => ({
            name,
            value,
            kind: 'let' as VariableKind,
          })
        ),
      },
      color: continuation.frameColor,
      isGenerator: true,
      status: 'executing',
    };

    // Create memory entries from local environment
    const memEntries: MemoryEntry[] = Object.entries(continuation.localEnv).map(
      ([name, value]) => {
        const resolved = this.resolveValueForMemory(value);
        return {
          name,
          kind: 'let' as const,
          valueType: resolved.valueType,
          displayValue: resolved.displayValue,
          heapReferenceId: resolved.heapReferenceId,
          pointerColor: resolved.pointerColor,
        };
      }
    );

    const memoryBlock: MemoryBlock = {
      frameId: continuation.frameId,
      label: `Local: ${funcName}`,
      type: 'local',
      color: continuation.frameColor,
      entries: memEntries,
      suspended: false,
    };

    // Check if frame already exists (resumed generator)
    const existingFrameIndex = this.callStack.findIndex(
      (f) => f.id === continuation.frameId
    );
    if (existingFrameIndex >= 0) {
      this.callStack[existingFrameIndex] = frame;
      const existingBlockIndex = this.memoryBlocks.findIndex(
        (b) => b.frameId === continuation.frameId
      );
      if (existingBlockIndex >= 0) {
        this.memoryBlocks[existingBlockIndex] = memoryBlock;
      }
    } else {
      this.callStack.push(frame);
      this.memoryBlocks.push(memoryBlock);
    }

    // Push local env
    this.envStack.push(continuation.localEnv);
    this.scopes.push({
      name: funcName,
      type: 'function',
      variables: Object.entries(continuation.localEnv).map(([name, value]) => ({
        name,
        value,
        kind: 'let' as VariableKind,
      })),
    });

    // If resuming from a yield and input was provided, assign it
    if (continuation.yieldResultVarName && inputValue !== undefined) {
      continuation.localEnv[continuation.yieldResultVarName] = inputValue;
      this.setVariable(continuation.yieldResultVarName, inputValue);
      continuation.yieldResultVarName = null;
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.generatorNext({
        inputValue:
          inputValue !== undefined ? displayValue(inputValue) : undefined,
      }),
      code
    );

    // Execute the remaining statements until yield or completion
    const result = this.executeGeneratorBody(
      continuation.remainingStatements,
      funcName,
      continuation,
      wrapper
    );

    return result;
  }

  /**
   * Execute generator body until yield or completion.
   */
  private executeGeneratorBody(
    statements: StatementNode[],
    _funcName: string,
    continuation: GeneratorContinuation,
    wrapper: GeneratorWrapper
  ): { value: unknown; done: boolean } {
    const genHeap = this.heap.find((h) => h.id === wrapper.heapObjectId);
    if (!genHeap) {
      return { value: undefined, done: true };
    }

    this.hasReturned = false;
    this.returnValue = undefined;

    for (let i = 0; i < statements.length; i++) {
      if (this.stepIndex >= MAX_STEPS) {
        break;
      }

      const stmt = statements[i];

      // Check for yield in this statement
      const yieldInfo = this.findYieldInStatement(stmt);

      if (yieldInfo) {
        // Process statement up to yield and get yielded value
        const { yieldedValue, resultVarName } =
          this.processStatementUpToYield(stmt);

        // Update continuation for resumption
        continuation.remainingStatements = statements.slice(i + 1);
        continuation.yieldResultVarName = resultVarName;
        continuation.localEnv = { ...this.getCurrentEnv() };

        // Suspend the generator
        genHeap.generatorState = 'suspended';
        genHeap.lastYieldedValue = displayValue(yieldedValue);
        this.updateGeneratorHeapState(
          genHeap,
          'suspended',
          displayValue(yieldedValue)
        );

        // Update frame and memory block as suspended
        const frame = this.callStack.find((f) => f.id === continuation.frameId);
        if (frame) frame.status = 'suspended';
        const block = this.memoryBlocks.find(
          (b) => b.frameId === continuation.frameId
        );
        if (block) block.suspended = true;

        const yieldCode = extractSource(this.sourceCode, stmt);
        this.snapshot(
          this.getLine(stmt),
          this.getColumn(stmt),
          description.yieldStatement({
            displayValue: displayValue(yieldedValue),
          }),
          yieldCode
        );

        // Pop env/scope but keep frame and memory block (suspended)
        this.envStack.pop();
        this.scopes.pop();

        return { value: yieldedValue, done: false };
      }

      // For/while loops: expand one iteration at a time so yield inside the
      // body surfaces as a top-level yield in a recursive executeGeneratorBody call.
      if (stmt.type === 'ForStatement' || stmt.type === 'WhileStatement') {
        const expanded = this.expandLoopForGenerator(
          stmt as ForStatementNode | WhileStatementNode,
          statements.slice(i + 1)
        );
        if (expanded !== null) {
          // Recurse with the expanded flat statement list
          return this.executeGeneratorBody(expanded, _funcName, continuation, wrapper);
        }
        // Loop condition was false on first check — nothing to do, continue
      } else {
        this.visitStatement(stmt);
      }

      // Check for return
      if (this.hasReturned) {
        const returnVal = this.returnValue;
        this.hasReturned = false;
        this.returnValue = undefined;

        // Generator completed
        return this.completeGenerator(
          wrapper,
          genHeap,
          continuation,
          returnVal
        );
      }

      if (this.stepIndex >= MAX_STEPS) break;
    }

    // Reached end of generator body — complete with undefined
    return this.completeGenerator(wrapper, genHeap, continuation, undefined);
  }

  /**
   * Expand a for/while loop one iteration for generator execution.
   *
   * Runs the for-init (once), checks the condition. If false returns null
   * (loop never executes). If true returns a flat statement list:
   *   [...body statements, optional update expression, loop node again, ...tail]
   *
   * By re-appending the loop node, the next executeGeneratorBody iteration
   * re-checks the condition — giving us one iteration per recursive call.
   * This means yield inside the body naturally surfaces at the top level.
   */
  private expandLoopForGenerator(
    node: ForStatementNode | WhileStatementNode,
    tail: StatementNode[]
  ): StatementNode[] | null {
    const forNode = node.type === 'ForStatement' ? (node as ForStatementNode) : null;
    const whileNode = node.type === 'WhileStatement' ? (node as WhileStatementNode) : null;

    // Run for-loop init exactly once
    if (forNode?.init) {
      if (forNode.init.type === 'VariableDeclaration') {
        this.visitVariableDeclaration(forNode.init as VariableDeclarationNode);
      } else {
        this.evaluateExpression(forNode.init as ExpressionNode);
      }
    }

    // Check condition
    const testNode = forNode ? forNode.test : whileNode!.test;
    if (testNode) {
      const ok = this.evaluateExpression(testNode);
      if (!ok) return null;
    }

    // Collect body statements
    const bodyStmt = forNode ? (forNode.body as StatementNode) : (whileNode!.body as StatementNode);
    const bodyStatements: StatementNode[] =
      bodyStmt.type === 'BlockStatement'
        ? (bodyStmt as BlockStatementNode).body as StatementNode[]
        : [bodyStmt];

    // Build an update-then-loop synthetic node sequence.
    // We wrap the update expression in an ExpressionStatement so it fits StatementNode[].
    const updateStmts: StatementNode[] = [];
    if (forNode?.update) {
      updateStmts.push({
        type: 'ExpressionStatement',
        expression: forNode.update,
        start: forNode.update.start,
        end: forNode.update.end,
        loc: forNode.update.loc,
      } as ExpressionStatementNode);
    }

    // Build a "loopWithoutInit" node so the next iteration skips the init
    let loopContinuation: StatementNode;
    if (forNode) {
      loopContinuation = {
        ...forNode,
        init: null,
      } as ForStatementNode;
    } else {
      loopContinuation = node;
    }

    return [...bodyStatements, ...updateStmts, loopContinuation, ...tail];
  }

  /**
   * Complete a generator and clean up.
   */
  private completeGenerator(
    wrapper: GeneratorWrapper,
    genHeap: HeapObject,
    _continuation: GeneratorContinuation,
    returnValue: unknown
  ): { value: unknown; done: boolean } {
    genHeap.generatorState = 'closed';
    this.updateGeneratorHeapState(genHeap, 'closed');

    // Remove the generator frame and memory
    this.popFrame();

    // Clean up continuation
    this.generatorContinuations.delete(wrapper.generatorId);

    const funcName =
      wrapper.functionValue.source.match(/function\*?\s*(\w+)/)?.[1] ??
      '<generator>';
    this.snapshot(
      0,
      0,
      description.generatorCompleted({
        funcName,
        displayValue: displayValue(returnValue),
      }),
      ''
    );

    return { value: returnValue, done: true };
  }

  /**
   * Execute generator.return(value) - force close the generator.
   */
  private executeGeneratorReturn(
    wrapper: GeneratorWrapper,
    value: unknown,
    node: CallExpressionNode
  ): { value: unknown; done: boolean } {
    const code = extractSource(this.sourceCode, node);
    const genHeap = this.heap.find((h) => h.id === wrapper.heapObjectId);
    const continuation = this.generatorContinuations.get(wrapper.generatorId);

    if (genHeap) {
      genHeap.generatorState = 'closed';
      this.updateGeneratorHeapState(genHeap, 'closed');
    }

    // Remove frame and memory if they exist
    if (continuation) {
      const frameIndex = this.callStack.findIndex(
        (f) => f.id === continuation.frameId
      );
      if (frameIndex >= 0) this.callStack.splice(frameIndex, 1);
      const blockIndex = this.memoryBlocks.findIndex(
        (b) => b.frameId === continuation.frameId
      );
      if (blockIndex >= 0) this.memoryBlocks.splice(blockIndex, 1);
      this.generatorContinuations.delete(wrapper.generatorId);
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.generatorReturn({ displayValue: displayValue(value) }),
      code
    );

    return { value, done: true };
  }

  /**
   * Execute generator.throw(error) - throw error into generator.
   */
  private executeGeneratorThrow(
    wrapper: GeneratorWrapper,
    error: unknown,
    node: CallExpressionNode
  ): { value: unknown; done: boolean } {
    const code = extractSource(this.sourceCode, node);
    const genHeap = this.heap.find((h) => h.id === wrapper.heapObjectId);
    const continuation = this.generatorContinuations.get(wrapper.generatorId);

    // For now, just close the generator and propagate error
    // TODO: implement try/catch within generator body
    if (genHeap) {
      genHeap.generatorState = 'closed';
      this.updateGeneratorHeapState(genHeap, 'closed');
    }

    if (continuation) {
      const frameIndex = this.callStack.findIndex(
        (f) => f.id === continuation.frameId
      );
      if (frameIndex >= 0) this.callStack.splice(frameIndex, 1);
      const blockIndex = this.memoryBlocks.findIndex(
        (b) => b.frameId === continuation.frameId
      );
      if (blockIndex >= 0) this.memoryBlocks.splice(blockIndex, 1);
      this.generatorContinuations.delete(wrapper.generatorId);
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.generatorThrow({ displayValue: displayValue(error) }),
      code
    );

    return { value: undefined, done: true };
  }

  /**
   * Update generator heap object's [[GeneratorState]] property.
   */
  private updateGeneratorHeapState(
    genHeap: HeapObject,
    state: 'suspended' | 'executing' | 'closed',
    lastYieldValue?: string
  ): void {
    if (!genHeap.properties) return;

    const stateStrMap: Record<string, string> = {
      suspended: '"suspended"',
      executing: '"executing"',
      closed: '"closed"',
    };

    const stateProp = genHeap.properties.find(
      (p) => p.key === '[[GeneratorState]]'
    );
    if (stateProp) {
      stateProp.displayValue = stateStrMap[state];
    }

    if (lastYieldValue !== undefined) {
      genHeap.lastYieldedValue = lastYieldValue;
    }
  }

  /**
   * Check if a statement contains a YieldExpression at the top level.
   */
  private findYieldInStatement(
    stmt: StatementNode
  ): YieldExpressionNode | null {
    if (stmt.type === 'VariableDeclaration') {
      const decl = stmt as VariableDeclarationNode;
      for (const d of decl.declarations) {
        if (d.init && d.init.type === 'YieldExpression') {
          return d.init as YieldExpressionNode;
        }
      }
    }
    if (stmt.type === 'ExpressionStatement') {
      const expr = (stmt as ExpressionStatementNode).expression;
      if (expr.type === 'YieldExpression') return expr as YieldExpressionNode;
      if (expr.type === 'AssignmentExpression') {
        const right = (expr as AssignmentExpressionNode).right;
        if (right.type === 'YieldExpression')
          return right as YieldExpressionNode;
      }
    }
    if (stmt.type === 'ReturnStatement') {
      const ret = stmt as ReturnStatementNode;
      if (ret.argument && ret.argument.type === 'YieldExpression') {
        return ret.argument as YieldExpressionNode;
      }
    }
    return null;
  }

  /**
   * Process a statement containing yield, returning the yielded value and variable name.
   */
  private processStatementUpToYield(stmt: StatementNode): {
    yieldedValue: unknown;
    resultVarName: string | null;
  } {
    if (stmt.type === 'VariableDeclaration') {
      const decl = stmt as VariableDeclarationNode;
      const d = decl.declarations[0];
      const yieldNode = d.init as YieldExpressionNode;
      const yieldedValue = yieldNode.argument
        ? this.evaluateExpression(yieldNode.argument)
        : undefined;
      const varName =
        d.id.type === 'Identifier'
          ? (d.id as IdentifierNode).name
          : '__yield_result__';

      // Declare the variable as undefined (will be assigned on resume with next(value))
      this.setVariable(varName, undefined, true);
      const entry: MemoryEntry = {
        name: varName,
        kind: decl.kind as VariableKind,
        valueType: 'primitive',
        displayValue: 'undefined',
      };
      this.addMemoryEntry(this.getCurrentFrameId(), entry);

      return { yieldedValue, resultVarName: varName };
    }

    if (stmt.type === 'ExpressionStatement') {
      const expr = (stmt as ExpressionStatementNode).expression;
      if (expr.type === 'YieldExpression') {
        const yieldNode = expr as YieldExpressionNode;
        const yieldedValue = yieldNode.argument
          ? this.evaluateExpression(yieldNode.argument)
          : undefined;
        return { yieldedValue, resultVarName: null };
      }
      if (expr.type === 'AssignmentExpression') {
        const assign = expr as AssignmentExpressionNode;
        const right = assign.right as YieldExpressionNode;
        const yieldedValue = right.argument
          ? this.evaluateExpression(right.argument)
          : undefined;
        const varName = (assign.left as IdentifierNode).name;
        return { yieldedValue, resultVarName: varName };
      }
    }

    // Default case
    return { yieldedValue: undefined, resultVarName: null };
  }

  /**
   * Visit for...of statement - iterates over an iterable (including generators).
   */
  private visitForOfStatement(node: ForOfStatementNode): void {
    const code = extractSource(this.sourceCode, node);
    const iterableValue = this.evaluateExpression(node.right);

    // Determine the loop variable name
    let varName: string;
    let varKind: VariableKind = 'let';
    if (node.left.type === 'VariableDeclaration') {
      const decl = node.left as VariableDeclarationNode;
      const id = decl.declarations[0].id;
      varName =
        id.type === 'Identifier' ? (id as IdentifierNode).name : '__item__';
      varKind = decl.kind as VariableKind;
    } else {
      varName = (node.left as IdentifierNode).name;
    }

    this.snapshot(
      this.getLine(node),
      this.getColumn(node),
      description.forOfStart({
        isGenerator: this.isGeneratorWrapper(iterableValue),
      }),
      code
    );

    let iterations = 0;

    // Handle generator iteration
    if (this.isGeneratorWrapper(iterableValue)) {
      while (iterations < MAX_LOOP_ITERATIONS && this.stepIndex < MAX_STEPS) {
        // Call next() on the generator
        const result = this.executeGeneratorNext(
          iterableValue,
          undefined,
          // Create a synthetic call node for the internal next() call
          {
            type: 'CallExpression',
            callee: node.right,
            arguments: [],
            start: node.start,
            end: node.end,
          } as CallExpressionNode
        ) as { value: unknown; done: boolean };

        if (result.done) {
          break;
        }

        // Declare/assign the loop variable
        if (iterations === 0 && node.left.type === 'VariableDeclaration') {
          this.setVariable(varName, result.value, true);
          this.recordVarKind(varName, varKind);
        } else {
          this.setVariable(varName, result.value);
        }

        const resolved = this.resolveValueForMemory(result.value);
        const entry: MemoryEntry = {
          name: varName,
          kind: varKind,
          valueType: resolved.valueType,
          displayValue: resolved.displayValue,
          heapReferenceId: resolved.heapReferenceId,
          pointerColor: resolved.pointerColor,
        };

        if (iterations === 0) {
          this.addMemoryEntry(this.getCurrentFrameId(), entry);
        } else {
          this.updateMemoryEntry(this.getCurrentFrameId(), varName, {
            displayValue: resolved.displayValue,
            valueType: resolved.valueType,
            heapReferenceId: resolved.heapReferenceId,
            pointerColor: resolved.pointerColor,
          });
        }

        this.snapshot(
          this.getLine(node),
          this.getColumn(node),
          description.forOfGeneratorValue({
            displayValue: displayValue(result.value),
          }),
          code
        );

        // Execute loop body
        try {
          this.visitStatement(node.body);
        } catch (e) {
          if (e instanceof BreakSignal) break;
          if (e instanceof ContinueSignal) {
            iterations++;
            continue;
          }
          throw e;
        }

        if (this.hasReturned) return;
        iterations++;
      }
    } else if (Array.isArray(iterableValue)) {
      // Handle array iteration
      for (
        let i = 0;
        i < iterableValue.length &&
        iterations < MAX_LOOP_ITERATIONS &&
        this.stepIndex < MAX_STEPS;
        i++
      ) {
        const value = iterableValue[i];

        if (i === 0 && node.left.type === 'VariableDeclaration') {
          this.setVariable(varName, value, true);
          this.recordVarKind(varName, varKind);
        } else {
          this.setVariable(varName, value);
        }

        const resolved = this.resolveValueForMemory(value);
        const entry: MemoryEntry = {
          name: varName,
          kind: varKind,
          valueType: resolved.valueType,
          displayValue: resolved.displayValue,
          heapReferenceId: resolved.heapReferenceId,
          pointerColor: resolved.pointerColor,
        };

        if (i === 0) {
          this.addMemoryEntry(this.getCurrentFrameId(), entry);
        } else {
          this.updateMemoryEntry(this.getCurrentFrameId(), varName, {
            displayValue: resolved.displayValue,
            valueType: resolved.valueType,
            heapReferenceId: resolved.heapReferenceId,
            pointerColor: resolved.pointerColor,
          });
        }

        this.snapshot(
          this.getLine(node),
          this.getColumn(node),
          description.forOfIteration({
            iteration: i + 1,
            varName,
            displayValue: resolved.displayValue,
          }),
          code
        );

        try {
          this.visitStatement(node.body);
        } catch (e) {
          if (e instanceof BreakSignal) break;
          if (e instanceof ContinueSignal) {
            iterations++;
            continue;
          }
          throw e;
        }

        if (this.hasReturned) return;
        iterations++;
      }
    } else if (typeof iterableValue === 'string') {
      // Handle string iteration
      for (
        let i = 0;
        i < iterableValue.length &&
        iterations < MAX_LOOP_ITERATIONS &&
        this.stepIndex < MAX_STEPS;
        i++
      ) {
        const char = iterableValue[i];

        if (i === 0 && node.left.type === 'VariableDeclaration') {
          this.setVariable(varName, char, true);
          this.recordVarKind(varName, varKind);
        } else {
          this.setVariable(varName, char);
        }

        const resolved = this.resolveValueForMemory(char);
        const entry: MemoryEntry = {
          name: varName,
          kind: varKind,
          valueType: resolved.valueType,
          displayValue: resolved.displayValue,
        };

        if (i === 0) {
          this.addMemoryEntry(this.getCurrentFrameId(), entry);
        } else {
          this.updateMemoryEntry(this.getCurrentFrameId(), varName, {
            displayValue: resolved.displayValue,
            valueType: resolved.valueType,
          });
        }

        this.snapshot(
          this.getLine(node),
          this.getColumn(node),
          description.forOfIteration({
            iteration: i + 1,
            varName,
            displayValue: resolved.displayValue,
          }),
          code
        );

        try {
          this.visitStatement(node.body);
        } catch (e) {
          if (e instanceof BreakSignal) break;
          if (e instanceof ContinueSignal) {
            iterations++;
            continue;
          }
          throw e;
        }

        if (this.hasReturned) return;
        iterations++;
      }
    }
  }
}
