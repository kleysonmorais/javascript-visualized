import type { Challenge } from './types';

export const basicChallenges: Challenge[] = [
  {
    id: 'stack-3-deep',
    title: 'Stack 3 Deep',
    description:
      'Write code that has 3 function frames on the Call Stack at the same time (not counting <global>).',
    level: 'easy',
    concepts: ['call-stack', 'local-memory'],
    hint: 'Think nested function calls — A calls B, B calls C. All three need to be on the stack simultaneously.',
    starterCode:
      '// Write functions that call each other\n// Goal: 3 frames on the Call Stack at once\n',
    solutionCode:
      'function c() { return 1; }\nfunction b() { return c(); }\nfunction a() { return b(); }\na();',
    solutionExplanation:
      'When a() calls b() which calls c(), all three frames are on the Call Stack simultaneously before any of them return.',
    validate: (steps) => {
      const maxDepth = Math.max(...steps.map((s) => s.callStack.length));
      if (maxDepth >= 4) {
        return {
          passed: true,
          feedback: `✅ Nice! You reached ${maxDepth - 1} frames deep.`,
        };
      }
      return {
        passed: false,
        feedback: `❌ Max stack depth was ${maxDepth - 1} frame(s). You need at least 3.`,
        details:
          'Try calling a function from inside another function, and that function from inside yet another.',
      };
    },
  },
  {
    id: 'fill-the-memory',
    title: 'Fill the Memory',
    description:
      'Declare 3 variables: a number, a string, and an object. The object should appear in the Heap.',
    level: 'easy',
    concepts: ['global-memory', 'heap'],
    hint: 'Use const to declare each variable. Objects and arrays go to the Heap — primitives stay in Memory.',
    starterCode: '// Declare a number, a string, and an object\n',
    solutionCode:
      'const age = 25;\nconst name = "Joe";\nconst person = { name: "Joe", age: 25 };',
    solutionExplanation:
      'Numbers and strings are primitives stored inline in Global Memory. Objects are stored in the Heap with a [Pointer] reference in Memory.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: '❌ No execution steps generated.' };

      const globalBlock = last.memoryBlocks.find((b) => b.type === 'global');
      if (!globalBlock)
        return { passed: false, feedback: '❌ No Global Memory found.' };

      const hasNumber = globalBlock.entries.some(
        (e) => e.valueType === 'primitive' && /^\d+/.test(e.displayValue)
      );
      const hasString = globalBlock.entries.some(
        (e) => e.valueType === 'primitive' && e.displayValue.includes('"')
      );
      const hasObject = globalBlock.entries.some(
        (e) => e.valueType === 'object'
      );
      const hasHeap = last.heap.some((h) => h.type === 'object');

      if (hasNumber && hasString && hasObject && hasHeap) {
        return {
          passed: true,
          feedback:
            '✅ Perfect! Number and string in Memory, object in the Heap.',
        };
      }

      const missing = [];
      if (!hasNumber) missing.push('number');
      if (!hasString) missing.push('string');
      if (!hasObject) missing.push('object with [Pointer]');
      if (!hasHeap) missing.push('HeapObject');
      return { passed: false, feedback: `❌ Missing: ${missing.join(', ')}.` };
    },
  },
  {
    id: 'say-hello-three-times',
    title: 'Say Hello Three Times',
    description:
      'Make the console output "Hello" exactly 3 times using a loop.',
    level: 'easy',
    concepts: ['console'],
    hint: 'Use a for loop that runs 3 iterations, each calling console.log("Hello").',
    starterCode: '// Use a loop to print "Hello" 3 times\n',
    solutionCode: 'for (let i = 0; i < 3; i++) {\n  console.log("Hello");\n}',
    solutionExplanation:
      'A simple for loop with 3 iterations. Each iteration logs "Hello" to the console.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: '❌ No execution steps generated.' };

      const helloCount = last.console.filter((e) =>
        e.args.some((a) => a.includes('Hello'))
      ).length;

      if (helloCount === 3) {
        return {
          passed: true,
          feedback: '✅ Hello, Hello, Hello! Exactly 3 times.',
        };
      }
      if (helloCount > 3) {
        return {
          passed: false,
          feedback: `❌ Too many! You logged "Hello" ${helloCount} times. Need exactly 3.`,
        };
      }
      return {
        passed: false,
        feedback: `❌ Only ${helloCount} "Hello"(s). Need exactly 3. Try using a loop.`,
      };
    },
  },
  {
    id: 'the-f-symbol',
    title: 'The ⓕ Symbol',
    description:
      'Declare a function and store it in a variable. You should see ⓕ in Global Memory and the function source in the Heap.',
    level: 'easy',
    concepts: ['global-memory', 'heap'],
    hint: 'Any function declaration or function expression creates a ⓕ entry in memory and a HeapObject with the source code.',
    starterCode: '// Declare a function — look for ⓕ in Memory\n',
    solutionCode: 'function greet(name) {\n  return "Hello " + name;\n}',
    solutionExplanation:
      'Function declarations create a ⓕ symbol in Global Memory pointing to a HeapObject that contains the function source code.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: '❌ No execution steps generated.' };

      const hasFnEntry = last.memoryBlocks.some((b) =>
        b.entries.some((e) => e.valueType === 'function')
      );
      const hasFnHeap = last.heap.some((h) => h.type === 'function');

      if (hasFnEntry && hasFnHeap) {
        return {
          passed: true,
          feedback: '✅ ⓕ found in Memory and function source in the Heap!',
        };
      }
      if (!hasFnEntry)
        return {
          passed: false,
          feedback: '❌ No ⓕ found in Memory. Declare a function.',
        };
      return { passed: false, feedback: '❌ Function not found in the Heap.' };
    },
  },
  {
    id: 'same-color-same-object',
    title: 'Same Color, Same Object',
    description:
      'Create an object and assign it to two different variables. Both should have the same pointer color — proving they reference the same object.',
    level: 'easy',
    concepts: ['global-memory', 'heap'],
    hint: 'When you do const b = a, both variables point to the same HeapObject. Same heapReferenceId = same color.',
    starterCode: '// Create an object and assign it to two variables\n',
    solutionCode: 'const a = { x: 1 };\nconst b = a;',
    solutionExplanation:
      'When you assign b = a, JavaScript copies the reference — not the object. Both variables point to the exact same HeapObject, so they share the same pointer color.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: '❌ No execution steps generated.' };

      const globalBlock = last.memoryBlocks.find((b) => b.type === 'global');
      if (!globalBlock)
        return { passed: false, feedback: '❌ No Global Memory found.' };

      const objectEntries = globalBlock.entries.filter(
        (e) => e.valueType === 'object' && e.heapReferenceId
      );

      if (objectEntries.length < 2) {
        return {
          passed: false,
          feedback: `❌ Need 2 variables pointing to an object. Found ${objectEntries.length}.`,
        };
      }

      const sharedRef = objectEntries.some((e, i) =>
        objectEntries.some(
          (e2, j) => i !== j && e.heapReferenceId === e2.heapReferenceId
        )
      );

      if (sharedRef) {
        return {
          passed: true,
          feedback:
            '✅ Both variables share the same pointer color — same object!',
        };
      }
      return {
        passed: false,
        feedback:
          '❌ The variables point to different objects. Assign one to the other: const b = a.',
      };
    },
  },
];
