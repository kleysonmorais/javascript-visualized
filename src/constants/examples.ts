import type { CodeExample } from "@/types";

export const CODE_EXAMPLES: CodeExample[] = [
  {
    id: "variables-memory",
    title: "Variables & Memory",
    description:
      "See how primitives, objects, and functions are stored in memory",
    category: "sync",
    code: `const myName = "Joe";
const age = 23;
const person = { name: "Joe", age: 23 };
const person2 = person;
function greet(name) {
  return "Hello " + name;
}
const message = greet(myName);
console.log(message);`,
  },
  {
    id: "reference-vs-value",
    title: "Reference vs Value",
    description:
      "Two variables pointing to the same object — same color, same reference",
    category: "sync",
    code: `const original = { x: 1, y: 2 };
const copy = original;
copy.x = 99;
console.log("original.x:", original.x);
console.log("copy.x:", copy.x);
console.log("Same object?", original === copy);`,
  },
  {
    id: "function-scope",
    title: "Function Calls & Scope",
    description: "Watch local memory appear and disappear with the call stack",
    category: "sync",
    code: `function multiply(a, b) {
  const result = a * b;
  return result;
}

function square(n) {
  return multiply(n, n);
}

const x = 5;
const answer = square(x);
console.log(answer);`,
  },
  {
    id: "closures",
    title: "Closures",
    description: "Variables survive beyond their scope through [[Scope]]",
    category: "closures",
    code: `function createCounter() {
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
    id: "settimeout-ordering",
    title: "setTimeout Ordering",
    description: "Understand why shorter delays execute first",
    category: "async",
    code: `console.log("Start");

setTimeout(() => {
  console.log("Timeout 2000ms");
}, 2000);

setTimeout(() => {
  console.log("Timeout 100ms");
}, 100);

setTimeout(() => {
  console.log("Timeout 0ms");
}, 0);

console.log("End");`,
  },
  {
    id: "promise-vs-settimeout",
    title: "Promise vs setTimeout",
    description: "Microtasks always run before macrotasks — the classic quiz",
    category: "async",
    code: `console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => {
  console.log("3");
}).then(() => {
  console.log("4");
});

console.log("5");`,
  },
  {
    id: "async-await-flow",
    title: "Async/Await Flow",
    description: "Watch async functions suspend and resume with fetch",
    category: "async",
    code: `console.log("Start");

async function fetchData() {
  console.log("Fetching...");
  const response = await fetch("https://api.example.com/data");
  const data = await response.json();
  console.log("Data:", data);
  return data;
}

fetchData().then(result => {
  console.log("Complete:", result);
});

console.log("End");`,
  },
  {
    id: "event-loop-quiz",
    title: "Event Loop Quiz",
    description: "Can you predict the output order? (Try before running!)",
    category: "async",
    code: `console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve().then(() => {
  console.log("C");
  setTimeout(() => console.log("D"), 0);
}).then(() => {
  console.log("E");
});

setTimeout(() => console.log("F"), 0);

console.log("G");`,
  },
];
