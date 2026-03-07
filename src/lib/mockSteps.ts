import type { ExecutionStep, MemoryBlock } from '@/types';
import { getFrameColor, getPointerColor } from '@/constants/theme';

const GLOBAL_COLOR = getFrameColor(0); // amber
const FN_COLOR = getFrameColor(1);     // green
const FN2_COLOR = getFrameColor(2);    // blue

const globalScope = {
  name: 'Global',
  type: 'global' as const,
  variables: [],
};

// Global memory — script starts, no variables yet
const globalMemoryEmpty: MemoryBlock = {
  frameId: 'frame-global',
  label: 'Global Memory',
  type: 'global',
  color: GLOBAL_COLOR,
  entries: [],
};

// Global memory with the two setTimeout callbacks visible as function refs
const globalMemoryWithCallbacks: MemoryBlock = {
  frameId: 'frame-global',
  label: 'Global Memory',
  type: 'global',
  color: GLOBAL_COLOR,
  entries: [
    {
      name: 'person',
      kind: 'const',
      valueType: 'object',
      displayValue: '[Pointer]',
      heapReferenceId: 'heap-person',
      pointerColor: getPointerColor(0),
    },
    {
      name: 'greet',
      kind: 'const',
      valueType: 'function',
      displayValue: 'ⓕ',
      heapReferenceId: 'heap-fn-greet',
      pointerColor: getPointerColor(1),
    },
    {
      name: 'count',
      kind: 'let',
      valueType: 'primitive',
      displayValue: '0',
    },
    {
      name: 'message',
      kind: 'const',
      valueType: 'primitive',
      displayValue: '"Hello"',
    },
  ],
};

export const mockSteps: ExecutionStep[] = [
  // Step 0 — Script starts, global frame on stack
  {
    index: 0,
    line: 1,
    column: 1,
    highlightedLine: 1,
    description: 'Script starts executing — global execution context created',
    code: 'setTimeout(() => { console.log("2000ms"); }, 2000);',
    callStack: [
      {
        id: 'frame-global',
        name: '<global>',
        type: 'global',
        line: 1,
        column: 1,
        color: GLOBAL_COLOR,
        scope: globalScope,
      },
    ],
    webAPIs: [],
    taskQueue: [],
    microtaskQueue: [],
    console: [],
    eventLoop: { phase: 'executing-task', description: 'Running script' },
    scopes: [globalScope],
    memoryBlocks: [globalMemoryEmpty],
    heap: [],
  },

  // Step 1 — setTimeout(cb, 2000) is called
  {
    index: 1,
    line: 1,
    column: 1,
    highlightedLine: 1,
    description: 'Calling setTimeout with 2000ms delay — pushed onto Call Stack',
    code: 'setTimeout(() => { console.log("2000ms"); }, 2000)',
    callStack: [
      {
        id: 'frame-global',
        name: '<global>',
        type: 'global',
        line: 1,
        column: 1,
        color: GLOBAL_COLOR,
        scope: globalScope,
      },
      {
        id: 'frame-st1',
        name: 'setTimeout',
        type: 'function',
        line: 1,
        column: 1,
        color: FN_COLOR,
        scope: { name: 'setTimeout', type: 'function', variables: [] },
      },
    ],
    webAPIs: [],
    taskQueue: [],
    microtaskQueue: [],
    console: [],
    eventLoop: { phase: 'executing-task', description: 'Running script' },
    scopes: [globalScope],
    memoryBlocks: [
      globalMemoryEmpty,
      {
        frameId: 'frame-st1',
        label: 'Local: setTimeout',
        type: 'local',
        color: FN_COLOR,
        entries: [
          { name: 'callback', kind: 'param', valueType: 'function', displayValue: 'ⓕ', heapReferenceId: 'heap-cb-2000', pointerColor: getPointerColor(0) },
          { name: 'delay', kind: 'param', valueType: 'primitive', displayValue: '2000' },
        ],
      },
    ],
    heap: [
      {
        id: 'heap-cb-2000',
        type: 'function',
        color: getPointerColor(0),
        label: '() => console.log("2000ms")',
        functionSource: '() => console.log("2000ms")',
      },
    ],
  },

  // Step 2 — setTimeout leaves stack, timer registered in Web APIs
  {
    index: 2,
    line: 5,
    column: 1,
    highlightedLine: 5,
    description: 'setTimeout registered in Web APIs — 2000ms timer starts ticking',
    code: 'setTimeout(() => { console.log("100ms"); }, 100)',
    callStack: [
      {
        id: 'frame-global',
        name: '<global>',
        type: 'global',
        line: 5,
        column: 1,
        color: GLOBAL_COLOR,
        scope: globalScope,
      },
    ],
    webAPIs: [
      {
        id: 'timer-2000',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("2000ms")',
        delay: 2000,
        elapsed: 0,
        status: 'running',
      },
    ],
    taskQueue: [],
    microtaskQueue: [],
    console: [],
    eventLoop: { phase: 'executing-task', description: 'Running script' },
    scopes: [globalScope],
    memoryBlocks: [globalMemoryEmpty],
    heap: [],
  },

  // Step 3 — setTimeout(cb, 100) is called
  {
    index: 3,
    line: 5,
    column: 1,
    highlightedLine: 5,
    description: 'Calling setTimeout with 100ms delay — pushed onto Call Stack',
    code: 'setTimeout(() => { console.log("100ms"); }, 100)',
    callStack: [
      {
        id: 'frame-global',
        name: '<global>',
        type: 'global',
        line: 5,
        column: 1,
        color: GLOBAL_COLOR,
        scope: globalScope,
      },
      {
        id: 'frame-st2',
        name: 'setTimeout',
        type: 'function',
        line: 5,
        column: 1,
        color: FN_COLOR,
        scope: { name: 'setTimeout', type: 'function', variables: [] },
      },
    ],
    webAPIs: [
      {
        id: 'timer-2000',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("2000ms")',
        delay: 2000,
        elapsed: 0,
        status: 'running',
      },
    ],
    taskQueue: [],
    microtaskQueue: [],
    console: [],
    eventLoop: { phase: 'executing-task', description: 'Running script' },
    scopes: [globalScope],
    memoryBlocks: [
      globalMemoryEmpty,
      {
        frameId: 'frame-st2',
        label: 'Local: setTimeout',
        type: 'local',
        color: FN_COLOR,
        entries: [
          { name: 'callback', kind: 'param', valueType: 'function', displayValue: 'ⓕ', heapReferenceId: 'heap-cb-100', pointerColor: getPointerColor(1) },
          { name: 'delay', kind: 'param', valueType: 'primitive', displayValue: '100' },
        ],
      },
    ],
    heap: [
      {
        id: 'heap-cb-100',
        type: 'function',
        color: getPointerColor(1),
        label: '() => console.log("100ms")',
        functionSource: '() => console.log("100ms")',
      },
    ],
  },

  // Step 4 — second setTimeout leaves stack, timer registered
  {
    index: 4,
    line: 9,
    column: 1,
    highlightedLine: 9,
    description: 'setTimeout registered in Web APIs — 100ms timer starts ticking',
    code: 'console.log("End of script")',
    callStack: [
      {
        id: 'frame-global',
        name: '<global>',
        type: 'global',
        line: 9,
        column: 1,
        color: GLOBAL_COLOR,
        scope: globalScope,
      },
    ],
    webAPIs: [
      {
        id: 'timer-2000',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("2000ms")',
        delay: 2000,
        elapsed: 0,
        status: 'running',
      },
      {
        id: 'timer-100',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("100ms")',
        delay: 100,
        elapsed: 0,
        status: 'running',
      },
    ],
    taskQueue: [],
    microtaskQueue: [],
    console: [],
    eventLoop: { phase: 'executing-task', description: 'Running script' },
    scopes: [globalScope],
    memoryBlocks: [globalMemoryEmpty],
    heap: [],
  },

  // Step 5 — console.log("End of script") executes
  {
    index: 5,
    line: 9,
    column: 1,
    highlightedLine: 9,
    description: 'Executing console.log("End of script")',
    code: 'console.log("End of script")',
    callStack: [
      {
        id: 'frame-global',
        name: '<global>',
        type: 'global',
        line: 9,
        column: 1,
        color: GLOBAL_COLOR,
        scope: globalScope,
      },
      {
        id: 'frame-cl1',
        name: 'console.log',
        type: 'function',
        line: 9,
        column: 1,
        color: FN_COLOR,
        scope: { name: 'console.log', type: 'function', variables: [] },
      },
    ],
    webAPIs: [
      {
        id: 'timer-2000',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("2000ms")',
        delay: 2000,
        elapsed: 0,
        status: 'running',
      },
      {
        id: 'timer-100',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("100ms")',
        delay: 100,
        elapsed: 0,
        status: 'running',
      },
    ],
    taskQueue: [],
    microtaskQueue: [],
    console: [
      { id: 'log-1', method: 'log', args: ['"End of script"'], timestamp: 5 },
    ],
    eventLoop: { phase: 'executing-task', description: 'Running script' },
    scopes: [globalScope],
    memoryBlocks: [
      globalMemoryEmpty,
      {
        frameId: 'frame-cl1',
        label: 'Local: console.log',
        type: 'local',
        color: FN_COLOR,
        entries: [
          { name: 'args', kind: 'param', valueType: 'primitive', displayValue: '"End of script"' },
        ],
      },
    ],
    heap: [],
  },

  // Step 6 — Call stack empties, 100ms timer fires → callback in Task Queue
  {
    index: 6,
    line: 9,
    column: 1,
    highlightedLine: 9,
    description: 'Call stack empty — 100ms timer completed, callback moved to Task Queue',
    code: '',
    callStack: [],
    webAPIs: [
      {
        id: 'timer-2000',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("2000ms")',
        delay: 2000,
        elapsed: 100,
        status: 'running',
      },
      {
        id: 'timer-100',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("100ms")',
        delay: 100,
        elapsed: 100,
        status: 'completed',
      },
    ],
    taskQueue: [
      { id: 'task-1', callbackLabel: '() => console.log("100ms")', sourceType: 'setTimeout', sourceId: 'timer-100' },
    ],
    microtaskQueue: [],
    console: [
      { id: 'log-1', method: 'log', args: ['"End of script"'], timestamp: 5 },
    ],
    eventLoop: { phase: 'checking-tasks', description: 'Checking Task Queue' },
    scopes: [globalScope],
    memoryBlocks: [],
    heap: [],
  },

  // Step 7 — Event Loop picks task, moves to Call Stack
  {
    index: 7,
    line: 9,
    column: 1,
    highlightedLine: 9,
    description: 'Event Loop picks callback from Task Queue and pushes it onto the Call Stack',
    code: '() => console.log("100ms")',
    callStack: [
      {
        id: 'frame-cb1',
        name: 'anonymous (setTimeout cb)',
        type: 'function',
        line: 9,
        column: 1,
        color: GLOBAL_COLOR,
        scope: { name: 'anonymous', type: 'function', variables: [] },
      },
    ],
    webAPIs: [
      {
        id: 'timer-2000',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("2000ms")',
        delay: 2000,
        elapsed: 100,
        status: 'running',
      },
    ],
    taskQueue: [],
    microtaskQueue: [],
    console: [
      { id: 'log-1', method: 'log', args: ['"End of script"'], timestamp: 5 },
    ],
    eventLoop: { phase: 'picking-task', description: 'Executing task from queue' },
    scopes: [{ name: 'anonymous', type: 'function', variables: [] }],
    memoryBlocks: [
      {
        frameId: 'frame-cb1',
        label: 'Local: anonymous',
        type: 'local',
        color: GLOBAL_COLOR,
        entries: [],
      },
    ],
    heap: [],
  },

  // Step 8 — Callback executes console.log("100ms")
  {
    index: 8,
    line: 2,
    column: 3,
    highlightedLine: 2,
    description: 'Callback executes: console.log("100ms")',
    code: 'console.log("100ms")',
    callStack: [
      {
        id: 'frame-cb1',
        name: 'anonymous (setTimeout cb)',
        type: 'function',
        line: 2,
        column: 3,
        color: GLOBAL_COLOR,
        scope: { name: 'anonymous', type: 'function', variables: [] },
      },
      {
        id: 'frame-cl2',
        name: 'console.log',
        type: 'function',
        line: 2,
        column: 3,
        color: FN_COLOR,
        scope: { name: 'console.log', type: 'function', variables: [] },
      },
    ],
    webAPIs: [
      {
        id: 'timer-2000',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("2000ms")',
        delay: 2000,
        elapsed: 100,
        status: 'running',
      },
    ],
    taskQueue: [],
    microtaskQueue: [],
    console: [
      { id: 'log-1', method: 'log', args: ['"End of script"'], timestamp: 5 },
      { id: 'log-2', method: 'log', args: ['"100ms"'], timestamp: 8 },
    ],
    eventLoop: { phase: 'executing-task', description: 'Executing task' },
    scopes: [{ name: 'anonymous', type: 'function', variables: [] }],
    memoryBlocks: [
      {
        frameId: 'frame-cb1',
        label: 'Local: anonymous',
        type: 'local',
        color: GLOBAL_COLOR,
        entries: [],
      },
      {
        frameId: 'frame-cl2',
        label: 'Local: console.log',
        type: 'local',
        color: FN_COLOR,
        entries: [
          { name: 'args', kind: 'param', valueType: 'primitive', displayValue: '"100ms"' },
        ],
      },
    ],
    heap: [],
  },

  // Step 9 — Heap demo: global scope with object + function refs in heap
  {
    index: 9,
    line: 2,
    column: 3,
    highlightedLine: 2,
    description: 'Heap demo — object and function references stored on the heap',
    code: 'greet(person)',
    callStack: [
      {
        id: 'frame-global',
        name: '<global>',
        type: 'global',
        line: 2,
        column: 3,
        color: GLOBAL_COLOR,
        scope: globalScope,
      },
      {
        id: 'frame-greet',
        name: 'greet',
        type: 'function',
        line: 2,
        column: 3,
        color: FN2_COLOR,
        scope: { name: 'greet', type: 'function', variables: [] },
      },
    ],
    webAPIs: [],
    taskQueue: [],
    microtaskQueue: [],
    console: [
      { id: 'log-1', method: 'log', args: ['"End of script"'], timestamp: 5 },
      { id: 'log-2', method: 'log', args: ['"100ms"'], timestamp: 8 },
    ],
    eventLoop: { phase: 'executing-task', description: 'Executing task' },
    scopes: [globalScope],
    memoryBlocks: [
      globalMemoryWithCallbacks,
      {
        frameId: 'frame-greet',
        label: 'Local: greet',
        type: 'local',
        color: FN2_COLOR,
        entries: [
          {
            name: 'person',
            kind: 'param',
            valueType: 'object',
            displayValue: '[Pointer]',
            heapReferenceId: 'heap-person',
            pointerColor: getPointerColor(0),
          },
          {
            name: 'isActive',
            kind: 'let',
            valueType: 'primitive',
            displayValue: 'true',
          },
          {
            name: 'retries',
            kind: 'let',
            valueType: 'primitive',
            displayValue: '0',
          },
        ],
      },
    ],
    heap: [
      {
        id: 'heap-person',
        type: 'object',
        color: getPointerColor(0),
        label: '{ name: "Joe", age: 23, address: [Pointer] }',
        properties: [
          { key: 'name', displayValue: '"Joe"', valueType: 'primitive' },
          { key: 'age', displayValue: '23', valueType: 'primitive' },
          {
            key: 'address',
            displayValue: '[Pointer]',
            valueType: 'object',
            heapReferenceId: 'heap-address',
            pointerColor: getPointerColor(3),
          },
        ],
      },
      {
        id: 'heap-address',
        type: 'object',
        color: getPointerColor(3),
        label: '{ city: "NY", zip: "10001" }',
        properties: [
          { key: 'city', displayValue: '"NY"', valueType: 'primitive' },
          { key: 'zip', displayValue: '"10001"', valueType: 'primitive' },
        ],
      },
      {
        id: 'heap-fn-greet',
        type: 'function',
        color: getPointerColor(1),
        label: 'function greet(person) { ... }',
        functionSource: 'function greet(person) {\n  console.log("Hello " + person.name);\n}',
      },
    ],
  },

  // Step 10 — 2000ms timer fires, callback executes, console gets "2000ms"
  {
    index: 10,
    line: 2,
    column: 3,
    highlightedLine: 2,
    description: '2000ms timer fires — Event Loop executes callback, console.log("2000ms")',
    code: 'console.log("2000ms")',
    callStack: [
      {
        id: 'frame-cb2',
        name: 'anonymous (setTimeout cb)',
        type: 'function',
        line: 2,
        column: 3,
        color: GLOBAL_COLOR,
        scope: { name: 'anonymous', type: 'function', variables: [] },
      },
      {
        id: 'frame-cl3',
        name: 'console.log',
        type: 'function',
        line: 2,
        column: 3,
        color: FN_COLOR,
        scope: { name: 'console.log', type: 'function', variables: [] },
      },
    ],
    webAPIs: [
      {
        id: 'timer-2000',
        type: 'setTimeout',
        label: 'setTimeout',
        callback: '() => console.log("2000ms")',
        delay: 2000,
        elapsed: 2000,
        status: 'completed',
      },
    ],
    taskQueue: [],
    microtaskQueue: [],
    console: [
      { id: 'log-1', method: 'log', args: ['"End of script"'], timestamp: 5 },
      { id: 'log-2', method: 'log', args: ['"100ms"'], timestamp: 8 },
      { id: 'log-3', method: 'log', args: ['"2000ms"'], timestamp: 10 },
    ],
    eventLoop: { phase: 'executing-task', description: 'Executing task' },
    scopes: [{ name: 'anonymous', type: 'function', variables: [] }],
    memoryBlocks: [
      {
        frameId: 'frame-cb2',
        label: 'Local: anonymous',
        type: 'local',
        color: GLOBAL_COLOR,
        entries: [],
      },
      {
        frameId: 'frame-cl3',
        label: 'Local: console.log',
        type: 'local',
        color: FN_COLOR,
        entries: [
          { name: 'args', kind: 'param', valueType: 'primitive', displayValue: '"2000ms"' },
        ],
      },
    ],
    heap: [],
  },
];
