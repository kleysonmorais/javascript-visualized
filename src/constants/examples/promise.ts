import type { CodeExample } from "@/types";

export const PROMISE_EXAMPLES: CodeExample[] = [
  {
    id: "promise-basics",
    title: "Promise Basics",
    description:
      "Create a Promise, resolve it, and handle the value with .then()",
    category: "promise",
    code: `// Promise Basics
const p = new Promise((resolve) => {
  resolve(42);
});

p.then((value) => {
  console.log("resolved:", value);
});

console.log("sync done");`,
  },
  {
    id: "promise-chain",
    title: "Promise Chaining",
    description: "Transform values through a chain of .then() microtasks",
    category: "promise",
    code: `// Promise Chaining
Promise.resolve(1)
  .then((v) => v + 1)
  .then((v) => v * 3)
  .then((v) => {
    console.log("result:", v);
  });

console.log("chain started");`,
  },
  {
    id: "promise-reject-catch",
    title: "Promise Reject & Catch",
    description: "Reject a Promise and recover with .catch()",
    category: "promise",
    code: `// Promise Reject & Catch
Promise.reject("something went wrong")
  .catch((reason) => {
    console.log("caught:", reason);
    return "recovered";
  })
  .then((value) => {
    console.log("after catch:", value);
  });

console.log("sync");`,
  },
  {
    id: "promise-all",
    title: "Promise.all",
    description:
      "Run multiple Promises concurrently and collect all results",
    category: "promise",
    code: `// Promise.all
const p1 = Promise.resolve(10);
const p2 = Promise.resolve(20);
const p3 = Promise.resolve(30);

Promise.all([p1, p2, p3]).then((values) => {
  console.log("sum:", values[0] + values[1] + values[2]);
});

console.log("waiting for all");`,
  },
];
