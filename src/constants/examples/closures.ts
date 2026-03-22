import type { CodeExample } from '@/types';

export const CLOSURES_EXAMPLES: CodeExample[] = [
  {
    id: 'closures',
    title: 'Closures',
    description: 'Variables survive beyond their scope through [[Scope]]',
    category: 'closures',
    code: `// Closures
function createCounter() {
  let count = 0;
  return function increment() {
    count++;
    return count;
  };
}

const counter = createCounter();
console.log(counter());
console.log(counter());
console.log(counter());`,
  },
  {
    id: 'closures-loop-trap',
    title: 'Loop Closure Trap',
    description:
      'var shares one binding; let creates a fresh scope each iteration',
    category: 'closures',
    code: `// Loop Closure Trap
// With var: all closures share the SAME 'i' binding
const funcsVar = [];
for (var i = 0; i < 3; i++) {
  funcsVar.push(function() { return i; });
}
// All print 3 — the loop is done, i === 3
console.log(funcsVar[0]()); // 3
console.log(funcsVar[1]()); // 3

// With let: each iteration gets its OWN block scope
const funcsLet = [];
for (let j = 0; j < 3; j++) {
  funcsLet.push(function() { return j; });
}
// Each closure captured its own j
console.log(funcsLet[0]()); // 0
console.log(funcsLet[1]()); // 1`,
  },
  {
    id: 'closures-memoize',
    title: 'Memoization via Closure',
    description: 'A closure over a cache object remembers previous results',
    category: 'closures',
    code: `// Memoization via Closure
function memoize(fn) {
  const cache = {};
  return function(n) {
    if (cache[n] !== undefined) {
      console.log("cached: " + n);
      return cache[n];
    }
    const result = fn(n);
    cache[n] = result;
    return result;
  };
}

function square(x) { return x * x; }

const memoSquare = memoize(square);
console.log(memoSquare(4));  // 16  (computed)
console.log(memoSquare(4));  // cached: 4 → 16
console.log(memoSquare(5));  // 25  (computed)`,
  },
];
