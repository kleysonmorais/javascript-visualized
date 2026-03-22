import type { Challenge } from './types';

export const expertChallenges: Challenge[] = [
  {
    id: 'microtask-starvation',
    title: 'Microtask Starvation',
    description:
      'Write code where a .then() callback schedules another .then(), which schedules another — 3 levels deep. All 3 must execute before a setTimeout(fn, 0).',
    level: 'expert',
    concepts: ['microtask-queue', 'promises', 'event-loop', 'task-queue'],
    hint: 'Microtasks created INSIDE microtasks also drain before the Event Loop checks the Task Queue. The queue must be completely empty first.',
    starterCode: '// 3 nested microtasks, all before setTimeout\n',
    solutionCode:
      'setTimeout(() => console.log("timeout"), 0);\nPromise.resolve().then(() => {\n  console.log("micro-1");\n  Promise.resolve().then(() => {\n    console.log("micro-2");\n    Promise.resolve().then(() => {\n      console.log("micro-3");\n    });\n  });\n});',
    solutionExplanation:
      'Each nested .then() creates a new microtask. The Event Loop keeps draining the Microtask Queue until it is completely empty — even microtasks created by other microtasks — before picking any macrotask.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: '❌ No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' ').toLowerCase());
      const microOutputs = outputs.filter((o) => o.includes('micro'));
      const timeoutIdx = outputs.findIndex((o) => o.includes('timeout'));
      if (microOutputs.length < 3)
        return {
          passed: false,
          feedback: `❌ Only ${microOutputs.length} micro outputs. Need 3 nested levels.`,
        };
      if (timeoutIdx === -1)
        return {
          passed: false,
          feedback: '❌ Need a setTimeout callback in the output.',
        };
      const lastMicroIdx = Math.max(
        ...microOutputs.map((m) => outputs.indexOf(m))
      );
      if (lastMicroIdx < timeoutIdx) {
        return {
          passed: true,
          feedback:
            'All 3 nested microtasks drained before the macrotask! Event Loop mastery.',
        };
      }
      return {
        passed: false,
        feedback: '❌ Some microtasks ran after the setTimeout callback.',
      };
    },
  },
  {
    id: 'promise-constructor-trap',
    title: 'The Promise Constructor Trap',
    description:
      'Output exactly: "A", "B", "C", "D". "A" from inside a Promise constructor, "B" synchronous after the Promise, "C" from .then(), "D" from setTimeout.',
    level: 'expert',
    concepts: ['promises', 'event-loop', 'microtask-queue', 'task-queue'],
    hint: 'The Promise executor runs SYNCHRONOUSLY — that is the trap most people miss. new Promise(fn) calls fn immediately.',
    starterCode:
      '// Output: A, B, C, D\n// A = inside Promise constructor\n// B = sync after Promise\n// C = .then() callback\n// D = setTimeout callback\n',
    solutionCode:
      'setTimeout(() => console.log("D"), 0);\nconst p = new Promise((resolve) => {\n  console.log("A");\n  resolve();\n});\np.then(() => console.log("C"));\nconsole.log("B");',
    solutionExplanation:
      'The Promise executor runs synchronously, so "A" logs immediately. "B" is the next sync statement. "C" is a microtask (.then). "D" is a macrotask (setTimeout). Order: sync (A, B) → micro (C) → macro (D).',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: '❌ No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' ').trim());
      if (
        outputs.length >= 4 &&
        outputs[0] === 'A' &&
        outputs[1] === 'B' &&
        outputs[2] === 'C' &&
        outputs[3] === 'D'
      ) {
        return {
          passed: true,
          feedback: 'A, B, C, D — you understand the Promise constructor trap!',
        };
      }
      return {
        passed: false,
        feedback: `❌ Expected: A, B, C, D. Got: ${outputs.slice(0, 4).join(', ')}`,
      };
    },
  },
  {
    id: 'async-interleave',
    title: 'Async Interleave',
    description:
      'Create two async functions that run concurrently. Each logs 3 messages with awaits between them. Output must interleave: "A1", "B1", "A2", "B2", "A3", "B3".',
    level: 'expert',
    concepts: ['async-await', 'promises', 'microtask-queue', 'event-loop'],
    hint: 'Call both async functions WITHOUT await between them. Each await suspends only its own function. The microtask queue interleaves their continuations.',
    starterCode:
      '// Two async functions running concurrently\n// Output: A1, B1, A2, B2, A3, B3\n',
    solutionCode:
      'async function taskA() {\n  console.log("A1");\n  await Promise.resolve();\n  console.log("A2");\n  await Promise.resolve();\n  console.log("A3");\n}\nasync function taskB() {\n  console.log("B1");\n  await Promise.resolve();\n  console.log("B2");\n  await Promise.resolve();\n  console.log("B3");\n}\ntaskA();\ntaskB();',
    solutionExplanation:
      'Both functions start synchronously: A1, B1. Each await suspends its function. Their continuations interleave in the microtask queue: A2, B2, A3, B3.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: '❌ No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' ').trim());
      const expected = ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'];
      const match = expected.every((v, i) => outputs[i] === v);
      if (match) {
        return {
          passed: true,
          feedback:
            'Perfect interleaving! You understand concurrent async execution.',
        };
      }
      return {
        passed: false,
        feedback: `❌ Expected: ${expected.join(', ')}. Got: ${outputs.slice(0, 6).join(', ')}`,
      };
    },
  },
  {
    id: 'closure-factory',
    title: 'Closure Factory',
    description:
      'Create a function that returns different closures depending on the argument. Call it 3 times with different values. Each closure must be independent — prove it by logging all 3.',
    level: 'expert',
    concepts: ['closures', 'heap', 'local-memory'],
    hint: 'Each call to the factory creates a NEW scope. The returned functions capture their own independent copy of the variable.',
    starterCode:
      '// Create a closure factory\n// Call it 3 times with different args\n// Prove each closure is independent\n',
    solutionCode:
      'function makeGreeter(greeting) {\n  return function(name) {\n    return greeting + " " + name;\n  };\n}\nconst hi = makeGreeter("Hi");\nconst hello = makeGreeter("Hello");\nconst hey = makeGreeter("Hey");\nconsole.log(hi("World"));\nconsole.log(hello("World"));\nconsole.log(hey("World"));',
    solutionExplanation:
      'Each call to makeGreeter creates a new scope with its own "greeting" variable. The three closures are independent — changing one does not affect the others.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: '❌ No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' '));
      const unique = new Set(outputs);
      if (outputs.length >= 3 && unique.size >= 3) {
        return {
          passed: true,
          feedback:
            'Three independent closures — each with its own captured scope!',
        };
      }
      if (outputs.length < 3)
        return {
          passed: false,
          feedback: `❌ Need 3 outputs. Got ${outputs.length}.`,
        };
      return {
        passed: false,
        feedback:
          '❌ The outputs are not all different. Each closure should produce a unique result.',
      };
    },
  },
  {
    id: 'event-loop-orchestra',
    title: 'The Event Loop Orchestra',
    description:
      'Output exactly: "sync-1", "sync-2", "micro-1", "micro-2", "macro-1", "micro-3", "macro-2". You MUST use Promise.resolve, new Promise, and at least 2 setTimeouts.',
    level: 'expert',
    concepts: [
      'event-loop',
      'microtask-queue',
      'task-queue',
      'promises',
      'async-await',
    ],
    hint: '"micro-3" runs BETWEEN "macro-1" and "macro-2". This means the first setTimeout callback must create a new microtask that drains before the second setTimeout fires.',
    starterCode:
      '// The boss fight.\n// Output: sync-1, sync-2, micro-1, micro-2, macro-1, micro-3, macro-2\n',
    solutionCode:
      'console.log("sync-1");\nsetTimeout(() => {\n  console.log("macro-1");\n  Promise.resolve().then(() => console.log("micro-3"));\n}, 0);\nsetTimeout(() => console.log("macro-2"), 0);\nPromise.resolve().then(() => console.log("micro-1")).then(() => console.log("micro-2"));\nconsole.log("sync-2");',
    solutionExplanation:
      'sync-1, sync-2 run first. Then microtasks: micro-1, micro-2. Then first macrotask: macro-1 — which creates micro-3. Micro-3 drains before macro-2 fires. This is the full Event Loop cycle.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: '❌ No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' ').trim());
      const expected = [
        'sync-1',
        'sync-2',
        'micro-1',
        'micro-2',
        'macro-1',
        'micro-3',
        'macro-2',
      ];
      const match = expected.every((v, i) => outputs[i] === v);
      if (match) {
        return {
          passed: true,
          feedback: 'FLAWLESS. You have mastered the Event Loop. 🎻🎺🥁',
        };
      }
      return {
        passed: false,
        feedback: `❌ Expected:\n${expected.join(', ')}\nGot:\n${outputs.slice(0, 7).join(', ')}`,
      };
    },
  },
];
