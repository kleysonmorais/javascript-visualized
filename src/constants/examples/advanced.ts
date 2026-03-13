import type { CodeExample } from "@/types";

export const ADVANCED_EXAMPLES: CodeExample[] = [
  {
    id: "blocking-computation",
    title: "Blocking Computation",
    description: "A long-running loop blocks the entire event loop",
    category: "advanced",
    code: `// Blocking Computation
function isPrime(n) {
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function computePrimes(onPrime, startAt = 1) {
  let currNum;
  for (currNum = startAt; true; currNum++) {
    if (isPrime(currNum)) onPrime(currNum);
  }
}

computePrimes(prime => {
  console.log(prime);
});`,
  },
  {
    id: "chunked-setTimeout",
    title: "Chunked with setTimeout",
    description: "Break work into chunks using macrotasks to stay responsive",
    category: "advanced",
    code: `// Chunked with setTimeout
function isPrime(n) {
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function computePrimes(onPrime, startAt = 1) {
  let currNum;
  for (currNum = startAt; currNum % 5 !== 0; currNum++) {
    if (isPrime(currNum)) onPrime(currNum);
  }
  setTimeout(() => {
    computePrimes(onPrime, currNum + 1);
  }, 0);
}

computePrimes(prime => {
  console.log(prime);
});`,
  },
  {
    id: "chunked-promise",
    title: "Chunked with Promise",
    description: "Break work using microtasks — faster but still blocking",
    category: "advanced",
    code: `// Chunked with Promise
function isPrime(n) {
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function computePrimes(onPrime, startAt = 1) {
  let currNum;
  for (currNum = startAt; currNum % 5 !== 0; currNum++) {
    if (isPrime(currNum)) onPrime(currNum);
  }
  Promise.resolve().then(() => {
    computePrimes(onPrime, currNum + 1);
  });
}

computePrimes(prime => {
  console.log(prime);
});`,
  },
];
