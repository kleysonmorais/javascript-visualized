import type { Challenge } from './types';

export const intermediateChallenges: Challenge[] = [
  {
    id: 'delayed-greeting',
    title: 'Delayed Greeting',
    description:
      'Make "Hello" appear in the console AFTER "World". You must use setTimeout.',
    level: 'medium',
    concepts: ['web-apis', 'task-queue', 'event-loop', 'console'],
    hint: 'console.log("World") runs synchronously. setTimeout delays "Hello" — even with 0ms delay, it goes through the async pipeline.',
    starterCode:
      '// Output: "World" then "Hello"\n// You must use setTimeout\n',
    solutionCode: `// setTimeout sends the callback to Web APIs — it won't run yet
setTimeout(() => console.log("Hello"), 100);

// This runs synchronously right now, before the timer fires
console.log("World");`,
    solutionExplanation:
      'setTimeout registers the callback in Web APIs. Synchronous code (console.log "World") runs first. After the timer completes, the callback moves to the Task Queue and executes.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };

      const outputs = last.console.map((e) => e.args.join(' '));
      const worldIdx = outputs.findIndex((o) => o.includes('World'));
      const helloIdx = outputs.findIndex((o) => o.includes('Hello'));
      const usedTimer = steps.some((s) => s.webAPIs.length > 0);

      if (!usedTimer)
        return { passed: false, feedback: 'You must use setTimeout.' };
      if (worldIdx === -1 || helloIdx === -1)
        return {
          passed: false,
          feedback: 'Console must contain both "World" and "Hello".',
        };
      if (worldIdx < helloIdx) {
        return {
          passed: true,
          feedback: '"World" first, "Hello" second — setTimeout worked!',
        };
      }
      return {
        passed: false,
        feedback:
          '"Hello" appeared before "World". The sync code should run first.',
      };
    },
  },
  {
    id: 'queue-it-up',
    title: 'Queue It Up',
    description:
      'Write code that puts exactly 2 callbacks in the Task Queue at the same time.',
    level: 'medium',
    concepts: ['task-queue', 'web-apis', 'event-loop'],
    hint: 'Use two setTimeouts with the same delay. Both callbacks will enter the Task Queue around the same time.',
    starterCode: '// Get 2 callbacks in the Task Queue simultaneously\n',
    solutionCode: `// Both timers have the same delay — they expire together
setTimeout(() => console.log("A"), 100);
setTimeout(() => console.log("B"), 100);

// Sync code runs first; both callbacks wait in Web APIs
console.log("sync");`,
    solutionExplanation:
      'Both timers have the same delay, so both callbacks land in the Task Queue at the same time after synchronous code finishes.',
    validate: (steps) => {
      const maxQueue = Math.max(...steps.map((s) => s.taskQueue.length));
      if (maxQueue >= 2) {
        return {
          passed: true,
          feedback: `${maxQueue} callbacks in the Task Queue at once!`,
        };
      }
      return {
        passed: false,
        feedback: `Max Task Queue size was ${maxQueue}. Need at least 2 simultaneous.`,
      };
    },
  },
  {
    id: 'micro-before-macro',
    title: 'Micro Before Macro',
    description:
      'Make a Promise callback execute BEFORE a setTimeout(fn, 0) callback. Prove it with console.log.',
    level: 'medium',
    concepts: ['microtask-queue', 'task-queue', 'promises', 'event-loop'],
    hint: 'Microtasks (Promise.then) always drain before macrotasks (setTimeout). Both with 0 delay — Promise still wins.',
    starterCode: '// Prove: Promise callback runs before setTimeout callback\n',
    solutionCode: `// Macrotask: goes to Web APIs → Task Queue (lowest priority)
setTimeout(() => console.log("timeout"), 0);

// Microtask: goes to Microtask Queue (higher priority than Task Queue)
Promise.resolve().then(() => console.log("promise"));

// Runs first — synchronous code always goes before any queue
console.log("sync");`,
    solutionExplanation:
      'The Event Loop drains the entire Microtask Queue before picking the next task from the Task Queue. Promise.then is a microtask, setTimeout is a macrotask.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };

      const outputs = last.console.map((e) => e.args.join(' ').toLowerCase());
      const promiseIdx = outputs.findIndex((o) => o.includes('promise'));
      const timeoutIdx = outputs.findIndex((o) => o.includes('timeout'));

      if (promiseIdx === -1)
        return {
          passed: false,
          feedback: 'No "promise" in console output.',
        };
      if (timeoutIdx === -1)
        return {
          passed: false,
          feedback: 'No "timeout" in console output.',
        };
      if (promiseIdx < timeoutIdx) {
        return {
          passed: true,
          feedback: 'Microtask before macrotask — Promise wins!',
        };
      }
      return {
        passed: false,
        feedback: 'setTimeout ran before Promise. Check your code.',
      };
    },
  },
  {
    id: 'scope-survivor',
    title: 'Scope Survivor',
    description:
      'Create a closure — a function that accesses a variable from a scope that no longer exists. Call the returned function and log the value.',
    level: 'medium',
    concepts: ['closures', 'local-memory', 'heap'],
    hint: 'Return a function from inside another function. The inner function captures variables from the outer scope via [[Scope]].',
    starterCode:
      '// Create a closure that survives its parent scope\n// Call it and log the captured value\n',
    solutionCode: `function outer() {
  const secret = "hidden"; // lives in outer's local memory

  // This inner function captures 'secret' via [[Scope]]
  return function() { return secret; };
}

// outer() finishes and its frame is popped — but 'secret' survives in the closure
const fn = outer();

// fn() still has access to 'secret' through [[Scope]] in the Heap
console.log(fn());`,
    solutionExplanation:
      'When outer() returns, its local memory is destroyed. But the returned function captures "secret" in its [[Scope]], so the value survives.',
    validate: (steps) => {
      const hasClosureScope = steps.some((s) =>
        s.heap.some((h) => h.closureScope && h.closureScope.length > 0)
      );
      const last = steps[steps.length - 1];
      const hasOutput = last && last.console.length > 0;

      if (hasClosureScope && hasOutput) {
        return {
          passed: true,
          feedback: 'Closure created! The variable survived beyond its scope.',
        };
      }
      if (!hasClosureScope)
        return {
          passed: false,
          feedback:
            'No [[Scope]] detected. Return a function from inside another function.',
        };
      return {
        passed: false,
        feedback: 'Call the closure function and log the result.',
      };
    },
  },
  {
    id: 'the-suspense',
    title: 'The Suspense',
    description:
      'Write an async function that suspends (shows "suspended" in the Call Stack) and then resumes. Log something before and after the await.',
    level: 'medium',
    concepts: ['async-await', 'call-stack', 'promises'],
    hint: 'Use "await Promise.resolve()" inside an async function. The function suspends at the await, then resumes when the Promise settles.',
    starterCode:
      '// Create an async function that suspends and resumes\n// Log before and after the await\n',
    solutionCode: `async function fn() {
  console.log("before"); // runs synchronously when fn() is called

  // 'await' suspends the function — the frame stays on the Call Stack as "suspended"
  await Promise.resolve();

  // resumes here after the Promise resolves (via the Microtask Queue)
  console.log("after");
}

fn();`,
    solutionExplanation:
      'When the async function hits "await", it suspends — the frame stays in the Call Stack with "suspended" status. After the Promise resolves, it resumes and continues execution.',
    validate: (steps) => {
      const hadSuspended = steps.some((s) =>
        s.callStack.some((f) => f.status === 'suspended')
      );
      const last = steps[steps.length - 1];
      const hasOutput = last && last.console.length >= 2;

      if (hadSuspended && hasOutput) {
        return {
          passed: true,
          feedback: 'Async function suspended and resumed!',
        };
      }
      if (!hadSuspended)
        return {
          passed: false,
          feedback:
            'No suspended frame detected. Use await inside an async function.',
        };
      return {
        passed: false,
        feedback: 'Log something before and after the await.',
      };
    },
  },
];
