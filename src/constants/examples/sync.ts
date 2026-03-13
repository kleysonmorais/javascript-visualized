import type { CodeExample } from "@/types";

export const SYNC_EXAMPLES: CodeExample[] = [
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
    id: "deep-call-stack",
    title: "Deep Call Stack",
    description: "Watch the call stack grow with 10 nested function calls",
    category: "sync",
    code: `function tenth() { }

function ninth() { tenth() }

function eighth() { ninth() }

function seventh() { eighth() }

function sixth() { seventh() }

function fifth() { sixth() }

function fourth() { fifth() }

function third() { fourth() }

function second() { third() }

function first() { second() }

first();`,
  },
];
