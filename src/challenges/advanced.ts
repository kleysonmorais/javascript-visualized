import type { Challenge } from './types';

export const advancedChallenges: Challenge[] = [
  {
    id: 'predict-the-order',
    title: 'Predict the Order',
    description: 'Make the console output exactly: "1", "2", "3", "4" — in that order. You MUST use both setTimeout AND Promise.resolve.',
    level: 'advanced',
    concepts: ['event-loop', 'microtask-queue', 'task-queue', 'promises'],
    hint: 'Sync code runs first, then microtasks (Promise), then macrotasks (setTimeout). Plan which number goes where.',
    starterCode: '// Output: 1, 2, 3, 4 (in order)\n// Must use setTimeout AND Promise.resolve\n',
    solutionCode: 'console.log("1");\nPromise.resolve().then(() => {\n  console.log("3");\n  setTimeout(() => console.log("4"), 0);\n});\nconsole.log("2");',
    solutionExplanation: '"1" and "2" are sync. "3" is a microtask that runs next. Inside "3", we schedule "4" as a macrotask that runs last.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last) return { passed: false, feedback: '❌ No execution steps generated.' };
      const outputs = last.console.map(e => e.args.join(' ').trim());
      const hasTimeout = steps.some(s => s.webAPIs.some(a => a.type === 'setTimeout'));
      const hasMicrotask = steps.some(s => s.microtaskQueue.length > 0);
      if (!hasTimeout) return { passed: false, feedback: '❌ You must use setTimeout.' };
      if (!hasMicrotask) return { passed: false, feedback: '❌ You must use Promise.resolve.' };
      if (outputs.length >= 4 && outputs[0].includes('1') && outputs[1].includes('2') && outputs[2].includes('3') && outputs[3].includes('4')) {
        return { passed: true, feedback: '✅ 1, 2, 3, 4 — perfect order!' };
      }
      return { passed: false, feedback: `❌ Got: ${outputs.join(', ')}. Expected: 1, 2, 3, 4.` };
    },
  },
  {
    id: 'microtask-chain-reaction',
    title: 'Microtask Chain Reaction',
    description: 'Create a chain of 3 .then() callbacks, each logging its position. All 3 must execute before any setTimeout callback.',
    level: 'advanced',
    concepts: ['microtask-queue', 'promises', 'event-loop', 'task-queue'],
    hint: 'Chain Promise.resolve().then().then().then(). All chained microtasks drain before the Event Loop picks a macrotask.',
    starterCode: '// Chain 3 .then() callbacks\n// All must run before setTimeout\n',
    solutionCode: 'setTimeout(() => console.log("timeout"), 0);\nPromise.resolve()\n  .then(() => console.log("then-1"))\n  .then(() => console.log("then-2"))\n  .then(() => console.log("then-3"));',
    solutionExplanation: 'Each .then() schedules a microtask. The Event Loop drains ALL microtasks before picking the next macrotask. So then-1, then-2, then-3 all execute before the setTimeout callback.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last) return { passed: false, feedback: '❌ No execution steps generated.' };
      const outputs = last.console.map(e => e.args.join(' ').toLowerCase());
      const thenOutputs = outputs.filter(o => o.includes('then'));
      const timeoutIdx = outputs.findIndex(o => o.includes('timeout'));
      if (thenOutputs.length < 3) return { passed: false, feedback: `❌ Only ${thenOutputs.length} .then() outputs. Need 3.` };
      if (timeoutIdx === -1) return { passed: false, feedback: '❌ No setTimeout callback output found.' };
      const lastThenIdx = outputs.lastIndexOf(thenOutputs[thenOutputs.length - 1]);
      if (lastThenIdx < timeoutIdx) {
        return { passed: true, feedback: '✅ All 3 microtasks ran before the macrotask!' };
      }
      return { passed: false, feedback: '❌ Some .then() callbacks ran after setTimeout.' };
    },
  },
  {
    id: 'the-counter',
    title: 'The Counter',
    description: 'Create a counter using closures that starts at 0 and increments each time you call it. Call it 5 times and log each result.',
    level: 'advanced',
    concepts: ['closures', 'heap', 'local-memory'],
    hint: 'Create a function that returns another function. The inner function increments a variable captured from the outer scope.',
    starterCode: '// Create a closure-based counter\n// Call it 5 times, logging each value\n',
    solutionCode: 'function createCounter() {\n  let count = 0;\n  return function() {\n    count++;\n    return count;\n  };\n}\nconst counter = createCounter();\nconsole.log(counter());\nconsole.log(counter());\nconsole.log(counter());\nconsole.log(counter());\nconsole.log(counter());',
    solutionExplanation: 'Each call to counter() increments the closed-over "count" variable. The [[Scope]] in the Heap shows count updating: 1, 2, 3, 4, 5.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last) return { passed: false, feedback: '❌ No execution steps generated.' };
      const outputs = last.console.map(e => e.args.join(' ').trim());
      if (outputs.length >= 5 && outputs[0].includes('1') && outputs[1].includes('2') && outputs[2].includes('3') && outputs[3].includes('4') && outputs[4].includes('5')) {
        return { passed: true, feedback: '✅ 1, 2, 3, 4, 5 — counter works with closures!' };
      }
      return { passed: false, feedback: `❌ Expected: 1, 2, 3, 4, 5. Got: ${outputs.slice(0, 5).join(', ')}` };
    },
  },
  {
    id: 'generator-fibonacci',
    title: 'Generator Fibonacci',
    description: 'Write a generator that yields the first 5 Fibonacci numbers (1, 1, 2, 3, 5). Use for...of to iterate and log each value.',
    level: 'advanced',
    concepts: ['generators', 'heap', 'local-memory'],
    hint: 'Use function* with yield. Track two variables (prev and curr) and swap them each iteration.',
    starterCode: '// Write a Fibonacci generator\n// Yield the first 5 numbers: 1, 1, 2, 3, 5\n',
    solutionCode: 'function* fibonacci() {\n  let prev = 0, curr = 1;\n  for (let i = 0; i < 5; i++) {\n    yield curr;\n    const next = prev + curr;\n    prev = curr;\n    curr = next;\n  }\n}\nfor (const n of fibonacci()) {\n  console.log(n);\n}',
    solutionExplanation: 'The generator yields each Fibonacci number and suspends. for...of calls .next() repeatedly, resuming the generator each time. Local memory persists across yields.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last) return { passed: false, feedback: '❌ No execution steps generated.' };
      const outputs = last.console.map(e => e.args.join(' ').trim());
      const expected = ['1', '1', '2', '3', '5'];
      const match = expected.every((v, i) => outputs[i] && outputs[i].includes(v));
      if (match) {
        return { passed: true, feedback: '✅ 1, 1, 2, 3, 5 — Fibonacci with generators!' };
      }
      return { passed: false, feedback: `❌ Expected: 1, 1, 2, 3, 5. Got: ${outputs.slice(0, 5).join(', ')}` };
    },
  },
  {
    id: 'the-full-journey',
    title: 'The Full Journey',
    description: 'Write code where a value travels through: Global Memory → Web APIs → Task Queue → Call Stack → Local Memory → Console. Use setTimeout.',
    level: 'advanced',
    concepts: ['global-memory', 'web-apis', 'task-queue', 'event-loop', 'call-stack', 'local-memory', 'console'],
    hint: 'Store a value globally, pass it into a setTimeout callback, and inside the callback store it locally and log it.',
    starterCode: '// Make a value travel through ALL components\n// Global Memory → Web APIs → Task Queue → Call Stack → Local Memory → Console\n',
    solutionCode: 'const message = "traveling";\nsetTimeout(function deliver() {\n  const received = message;\n  console.log(received);\n}, 100);',
    solutionExplanation: '"message" starts in Global Memory. setTimeout registers in Web APIs. When timer completes, callback goes to Task Queue. Event Loop moves it to Call Stack. Inside the callback, "received" is in Local Memory. Finally, console.log outputs it.',
    validate: (steps) => {
      const hadGlobalVar = steps.some(s => s.memoryBlocks.some(b => b.type === 'global' && b.entries.length > 0));
      const hadWebAPI = steps.some(s => s.webAPIs.length > 0);
      const hadTaskQueue = steps.some(s => s.taskQueue.length > 0);
      const hadLocalMemory = steps.some(s => s.memoryBlocks.some(b => b.type === 'local'));
      const last = steps[steps.length - 1];
      const hadConsole = last && last.console.length > 0;

      const allPassed = hadGlobalVar && hadWebAPI && hadTaskQueue && hadLocalMemory && hadConsole;
      if (allPassed) {
        return { passed: true, feedback: '✅ Full journey complete! The value traveled through every component.' };
      }
      const missing = [];
      if (!hadGlobalVar) missing.push('Global Memory');
      if (!hadWebAPI) missing.push('Web APIs');
      if (!hadTaskQueue) missing.push('Task Queue');
      if (!hadLocalMemory) missing.push('Local Memory');
      if (!hadConsole) missing.push('Console');
      return { passed: false, feedback: `❌ Missing stops: ${missing.join(', ')}.` };
    },
  },
];
