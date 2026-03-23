import type { CodeExample } from '@/types';

export const ADVANCED_EXAMPLES: CodeExample[] = [
  {
    id: 'blocking-computation',
    title: 'Blocking Computation',
    description: 'A long-running loop blocks the entire event loop',
    category: 'advanced',
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
    codePtBr: `// Computação Bloqueante
function ehPrimo(n) {
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function calcularPrimos(aoPrimo, iniciarEm = 1) {
  let numAtual;
  for (numAtual = iniciarEm; true; numAtual++) {
    if (ehPrimo(numAtual)) aoPrimo(numAtual);
  }
}

calcularPrimos(primo => {
  console.log(primo);
});`,
  },
  {
    id: 'chunked-setTimeout',
    title: 'Chunked with setTimeout',
    description: 'Break work into chunks using macrotasks to stay responsive',
    category: 'advanced',
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
    codePtBr: `// Dividido com setTimeout
function ehPrimo(n) {
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function calcularPrimos(aoPrimo, iniciarEm = 1) {
  let numAtual;
  for (numAtual = iniciarEm; numAtual % 5 !== 0; numAtual++) {
    if (ehPrimo(numAtual)) aoPrimo(numAtual);
  }
  setTimeout(() => {
    calcularPrimos(aoPrimo, numAtual + 1);
  }, 0);
}

calcularPrimos(primo => {
  console.log(primo);
});`,
  },
  {
    id: 'chunked-promise',
    title: 'Chunked with Promise',
    description: 'Break work using microtasks — faster but still blocking',
    category: 'advanced',
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
    codePtBr: `// Dividido com Promise
function ehPrimo(n) {
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function calcularPrimos(aoPrimo, iniciarEm = 1) {
  let numAtual;
  for (numAtual = iniciarEm; numAtual % 5 !== 0; numAtual++) {
    if (ehPrimo(numAtual)) aoPrimo(numAtual);
  }
  Promise.resolve().then(() => {
    calcularPrimos(aoPrimo, numAtual + 1);
  });
}

calcularPrimos(primo => {
  console.log(primo);
});`,
  },
];
