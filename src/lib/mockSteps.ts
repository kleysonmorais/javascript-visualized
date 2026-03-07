import type { ExecutionStep } from '@/types';

const globalScope = {
  name: 'Global',
  type: 'global' as const,
  variables: [],
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
        scope: globalScope,
      },
    ],
    webAPIs: [],
    taskQueue: [],
    microtaskQueue: [],
    console: [],
    eventLoop: { phase: 'executing-task', description: 'Running script' },
    scopes: [globalScope],
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
        scope: globalScope,
      },
      {
        id: 'frame-st1',
        name: 'setTimeout',
        type: 'function',
        line: 1,
        column: 1,
        scope: { name: 'setTimeout', type: 'function', variables: [] },
      },
    ],
    webAPIs: [],
    taskQueue: [],
    microtaskQueue: [],
    console: [],
    eventLoop: { phase: 'executing-task', description: 'Running script' },
    scopes: [globalScope],
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
        scope: globalScope,
      },
      {
        id: 'frame-st2',
        name: 'setTimeout',
        type: 'function',
        line: 5,
        column: 1,
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
        scope: globalScope,
      },
      {
        id: 'frame-cl1',
        name: 'console.log',
        type: 'function',
        line: 9,
        column: 1,
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
        scope: { name: 'anonymous', type: 'function', variables: [] },
      },
      {
        id: 'frame-cl2',
        name: 'console.log',
        type: 'function',
        line: 2,
        column: 3,
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
  },

  // Step 9 — 2000ms timer fires, callback executes, console gets "2000ms"
  {
    index: 9,
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
        scope: { name: 'anonymous', type: 'function', variables: [] },
      },
      {
        id: 'frame-cl3',
        name: 'console.log',
        type: 'function',
        line: 2,
        column: 3,
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
      { id: 'log-3', method: 'log', args: ['"2000ms"'], timestamp: 9 },
    ],
    eventLoop: { phase: 'executing-task', description: 'Executing task' },
    scopes: [{ name: 'anonymous', type: 'function', variables: [] }],
  },
];
