// === Execution Engine Types ===

export type VariableKind = 'var' | 'let' | 'const';

export interface Variable {
  name: string;
  value: unknown;
  kind: VariableKind;
}

export interface VariableScope {
  name: string;            // "Global", "myFunction", "anonymous"
  type: 'global' | 'function' | 'block';
  variables: Variable[];
  parentScope?: string;    // parent scope name
}

export interface CallStackFrame {
  id: string;
  name: string;            // function name or "<anonymous>" or "<global>"
  type: 'function' | 'method' | 'global' | 'async' | 'generator';
  line: number;
  column: number;
  scope: VariableScope;
  isAsync?: boolean;
  isGenerator?: boolean;
  status?: 'executing' | 'suspended'; // for async/generators
}

export type WebAPIType = 'setTimeout' | 'setInterval' | 'fetch' | 'promise';

export interface WebAPIEntry {
  id: string;
  type: WebAPIType;
  label: string;           // e.g. "setTimeout", "fetch"
  callback: string;        // string representation of callback: "() => console.log('hi')"
  delay?: number;          // ms for timers
  elapsed?: number;        // ms already elapsed
  status: 'running' | 'completed' | 'cancelled';
  // Promise-specific
  promiseState?: 'pending' | 'fulfilled' | 'rejected';
  promiseResult?: string;  // string representation of result
  promiseReactions?: string[];
}

export interface QueueItem {
  id: string;
  callbackLabel: string;   // short representation of callback
  sourceType: WebAPIType;  // origin type
  sourceId: string;        // id of the WebAPIEntry that generated it
}

export type ConsoleMethod = 'log' | 'warn' | 'error' | 'info';

export interface ConsoleEntry {
  id: string;
  method: ConsoleMethod;
  args: string[];          // string representation of arguments
  timestamp: number;       // step index when it was logged
}

export type EventLoopPhase =
  | 'idle'
  | 'executing-task'
  | 'checking-microtasks'
  | 'draining-microtasks'
  | 'checking-tasks'
  | 'picking-task';

export interface EventLoopState {
  phase: EventLoopPhase;
  description: string;     // descriptive text of what's happening
}

export interface ExecutionStep {
  index: number;
  line: number;
  column: number;
  description: string;     // e.g. "Pushing myFunction onto Call Stack"
  code: string;            // code snippet being executed
  callStack: CallStackFrame[];
  webAPIs: WebAPIEntry[];
  taskQueue: QueueItem[];
  microtaskQueue: QueueItem[];
  console: ConsoleEntry[];
  eventLoop: EventLoopState;
  scopes: VariableScope[];
  highlightedLine: number; // line to highlight in editor
}

// === UI State Types ===

export type PlaybackSpeed = 0.5 | 1 | 1.5 | 2 | 3;

export interface PlaybackState {
  steps: ExecutionStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  totalSteps: number;
}

// === Code Examples ===

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  code: string;
  category: 'sync' | 'async' | 'promise' | 'advanced';
}
