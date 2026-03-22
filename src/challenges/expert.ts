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
    solutionCode: `// Macrotask: sits in Task Queue until the Microtask Queue is fully empty
setTimeout(() => console.log("timeout"), 0);

Promise.resolve().then(() => {
  console.log("micro-1");

  // A microtask created INSIDE a microtask also drains before any macrotask
  Promise.resolve().then(() => {
    console.log("micro-2");

    // Same rule applies at every nesting level
    Promise.resolve().then(() => {
      console.log("micro-3");
    });
  });
});`,
    solutionExplanation:
      'Each nested .then() creates a new microtask. The Event Loop keeps draining the Microtask Queue until it is completely empty — even microtasks created by other microtasks — before picking any macrotask.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' ').toLowerCase());
      const microOutputs = outputs.filter((o) => o.includes('micro'));
      const timeoutIdx = outputs.findIndex((o) => o.includes('timeout'));
      if (microOutputs.length < 3)
        return {
          passed: false,
          feedback: `Only ${microOutputs.length} micro outputs. Need 3 nested levels.`,
        };
      if (timeoutIdx === -1)
        return {
          passed: false,
          feedback: 'Need a setTimeout callback in the output.',
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
        feedback: 'Some microtasks ran after the setTimeout callback.',
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
    solutionCode: `// Macrotask: will run last
setTimeout(() => console.log("D"), 0);

// The executor function runs SYNCHRONOUSLY — "A" logs immediately (trap!)
const p = new Promise((resolve) => {
  console.log("A"); // sync, 1st
  resolve();        // marks the promise as settled
});

// Microtask: scheduled after sync block completes
p.then(() => console.log("C")); // 3rd

// Sync: runs immediately after the Promise constructor (2nd)
console.log("B");`,
    solutionExplanation:
      'The Promise executor runs synchronously, so "A" logs immediately. "B" is the next sync statement. "C" is a microtask (.then). "D" is a macrotask (setTimeout). Order: sync (A, B) → micro (C) → macro (D).',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
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
        feedback: `Expected: A, B, C, D. Got: ${outputs.slice(0, 4).join(', ')}`,
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
    solutionCode: `async function taskA() {
  console.log("A1"); // sync on first call
  await Promise.resolve(); // suspends taskA, yields control
  console.log("A2"); // resumes as a microtask
  await Promise.resolve(); // suspends again
  console.log("A3");
}

async function taskB() {
  console.log("B1"); // sync, runs right after A1
  await Promise.resolve(); // suspends taskB
  console.log("B2"); // resumes after A2 (microtasks interleave)
  await Promise.resolve();
  console.log("B3");
}

// Call both WITHOUT awaiting — they start concurrently
taskA();
taskB();`,
    solutionExplanation:
      'Both functions start synchronously: A1, B1. Each await suspends its function. Their continuations interleave in the microtask queue: A2, B2, A3, B3.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
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
        feedback: `Expected: ${expected.join(', ')}. Got: ${outputs.slice(0, 6).join(', ')}`,
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
    solutionCode: `function makeGreeter(greeting) {
  // Each call creates a NEW scope with its own 'greeting'
  return function(name) {
    // Captures the 'greeting' from its own parent scope — not shared
    return greeting + " " + name;
  };
}

// Three separate calls → three independent [[Scope]] objects in the Heap
const hi    = makeGreeter("Hi");
const hello = makeGreeter("Hello");
const hey   = makeGreeter("Hey");

console.log(hi("World"));    // "Hi World"
console.log(hello("World")); // "Hello World"
console.log(hey("World"));   // "Hey World"`,
    solutionExplanation:
      'Each call to makeGreeter creates a new scope with its own "greeting" variable. The three closures are independent — changing one does not affect the others.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
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
          feedback: `Need 3 outputs. Got ${outputs.length}.`,
        };
      return {
        passed: false,
        feedback:
          'The outputs are not all different. Each closure should produce a unique result.',
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
    solutionCode: `// Sync — runs 1st
console.log("sync-1");

// Macrotask 1: when it fires, it creates a new microtask (micro-3)
setTimeout(() => {
  console.log("macro-1"); // 5th
  // micro-3 is created INSIDE a macrotask — drains before macro-2 runs
  Promise.resolve().then(() => console.log("micro-3")); // 6th
}, 0);

// Macrotask 2: runs last, AFTER micro-3 drains
setTimeout(() => console.log("macro-2"), 0); // 7th

// Microtasks: drain before any macrotask
Promise.resolve()
  .then(() => console.log("micro-1")) // 3rd
  .then(() => console.log("micro-2")); // 4th

// Sync — runs 2nd
console.log("sync-2");`,
    solutionExplanation:
      'sync-1, sync-2 run first. Then microtasks: micro-1, micro-2. Then first macrotask: macro-1 — which creates micro-3. Micro-3 drains before macro-2 fires. This is the full Event Loop cycle.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
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
        feedback: `Expected:\n${expected.join(', ')}\nGot:\n${outputs.slice(0, 7).join(', ')}`,
      };
    },
  },
];
