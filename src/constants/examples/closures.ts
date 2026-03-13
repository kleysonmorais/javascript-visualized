import type { CodeExample } from "@/types";

export const CLOSURES_EXAMPLES: CodeExample[] = [
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
];
