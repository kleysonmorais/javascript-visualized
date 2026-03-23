import type { CodeExample } from '@/types';

export const ASYNC_EXAMPLES: CodeExample[] = [
  {
    id: 'settimeout-ordering',
    title: 'setTimeout Ordering',
    description: 'Understand why shorter delays execute first',
    category: 'async',
    code: `// setTimeout Ordering
console.log("Start");

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
    codePtBr: `// Ordem do setTimeout
console.log("Início");

setTimeout(() => {
  console.log("Timeout 2000ms");
}, 2000);

setTimeout(() => {
  console.log("Timeout 100ms");
}, 100);

setTimeout(() => {
  console.log("Timeout 0ms");
}, 0);

console.log("Fim");`,
  },
  {
    id: 'promise-vs-settimeout',
    title: 'Promise vs setTimeout',
    description: 'Microtasks always run before macrotasks — the classic quiz',
    category: 'async',
    code: `// Promise vs setTimeout
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => {
  console.log("3");
}).then(() => {
  console.log("4");
});

console.log("5");`,
    codePtBr: `// Promise vs setTimeout
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => {
  console.log("3");
}).then(() => {
  console.log("4");
});

console.log("5");`,
  },
  {
    id: 'async-await-flow',
    title: 'Async/Await Flow',
    description: 'Watch async functions suspend and resume with fetch',
    category: 'async',
    code: `// Async/Await Flow
console.log("Start");

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
    codePtBr: `// Fluxo Async/Await
console.log("Início");

async function buscarDados() {
  console.log("Buscando...");
  const resposta = await fetch("https://api.example.com/data");
  const dados = await resposta.json();
  console.log("Dados:", dados);
  return dados;
}

buscarDados().then(resultado => {
  console.log("Concluído:", resultado);
});

console.log("Fim");`,
  },
  {
    id: 'event-loop-quiz',
    title: 'Event Loop Quiz',
    description: 'Can you predict the output order? (Try before running!)',
    category: 'async',
    code: `// Event Loop Quiz
console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve().then(() => {
  console.log("C");
  setTimeout(() => console.log("D"), 0);
}).then(() => {
  console.log("E");
});

setTimeout(() => console.log("F"), 0);

console.log("G");`,
    codePtBr: `// Quiz do Event Loop
console.log("A");

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
  {
    id: 'microtask-vs-macrotask',
    title: 'Microtask vs Macrotask',
    description: 'See why Promises execute before setTimeout(0)',
    category: 'async',
    code: `// Microtask vs Macrotask
function logA() { console.log('A') }
function logB() { console.log('B') }
function logC() { console.log('C') }
function logD() { console.log('D') }

logA();
setTimeout(logB, 0);
Promise.resolve().then(logC);
logD();`,
    codePtBr: `// Microtarefa vs Macrotarefa
function logA() { console.log('A') }
function logB() { console.log('B') }
function logC() { console.log('C') }
function logD() { console.log('D') }

logA();
setTimeout(logB, 0);
Promise.resolve().then(logC);
logD();`,
  },
  {
    id: 'timer-race',
    title: 'Timer Race',
    description: 'Timers with different delays — who wins?',
    category: 'async',
    code: `// Timer Race
setTimeout(function a() {}, 1000);

setTimeout(function b() {}, 500);

setTimeout(function c() {}, 0);

function d() {}

d();`,
    codePtBr: `// Corrida de Temporizadores
setTimeout(function a() {}, 1000);

setTimeout(function b() {}, 500);

setTimeout(function c() {}, 0);

function d() {}

d();`,
  },
];
