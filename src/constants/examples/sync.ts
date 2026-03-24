import type { CodeExample } from '@/types';

export const SYNC_EXAMPLES: CodeExample[] = [
  {
    id: 'variables-memory',
    title: 'Variables & Memory',
    description:
      'See how primitives, objects, and functions are stored in memory',
    category: 'sync',
    code: `// Variables & Memory
const myName = "Joe";
const age = 23;
const person = { name: "Joe", age: 23 };
const person2 = person;
function greet(name) {
  return "Hello " + name;
}
const message = greet(myName);
console.log(message);`,
    codePtBr: `// Variáveis e Memória
const meuNome = "Joe";
const idade = 23;
const pessoa = { name: "Joe", age: 23 };
const pessoa2 = pessoa;
function cumprimentar(nome) {
  return "Olá " + nome;
}
const mensagem = cumprimentar(meuNome);
console.log(mensagem);`,
  },
  {
    id: 'reference-vs-value',
    title: 'Reference vs Value',
    description:
      'Two variables pointing to the same object — same color, same reference',
    category: 'sync',
    code: `// Reference vs Value
const original = { x: 1, y: 2 };
const copy = original;
copy.x = 99;
console.log("original.x:", original.x);
console.log("copy.x:", copy.x);
console.log("Same object?", original === copy);`,
    codePtBr: `// Referência vs Valor
const original = { x: 1, y: 2 };
const copia = original;
copia.x = 99;
console.log("original.x:", original.x);
console.log("copia.x:", copia.x);
console.log("Mesmo objeto?", original === copia);`,
  },
  {
    id: 'function-scope',
    title: 'Function Calls & Scope',
    description: 'Watch local memory appear and disappear with the call stack',
    category: 'sync',
    code: `// Function Calls & Scope
function multiply(a, b) {
  const result = a * b;
  return result;
}

function square(n) {
  return multiply(n, n);
}

const x = 5;
const answer = square(x);
console.log(answer);`,
    codePtBr: `// Chamadas de Função e Escopo
function multiplicar(a, b) {
  const resultado = a * b;
  return resultado;
}

function quadrado(n) {
  return multiplicar(n, n);
}

const x = 5;
const resposta = quadrado(x);
console.log(resposta);`,
  },
  {
    id: 'deep-call-stack',
    title: 'Deep Call Stack',
    description: 'Watch the call stack grow with 10 nested function calls',
    category: 'sync',
    code: `// Deep Call Stack
function tenth() { }

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
    codePtBr: `// Pilha de Chamadas Profunda
function decima() { }

function nona() { decima() }

function oitava() { nona() }

function setima() { oitava() }

function sexta() { setima() }

function quinta() { sexta() }

function quarta() { quinta() }

function terceira() { quarta() }

function segunda() { terceira() }

function primeira() { segunda() }

primeira();`,
  },
];
