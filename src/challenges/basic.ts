import type { Challenge } from './types';

export const basicChallenges: Challenge[] = [
  {
    id: 'stack-3-deep',
    title: 'Stack 3 Deep',
    titlePtBr: 'Pilha 3 Níveis',
    description:
      'Write code that has 3 function frames on the Call Stack at the same time (not counting <global>).',
    descriptionPtBr:
      'Escreva código que tenha 3 frames de função na Pilha de Chamadas ao mesmo tempo (sem contar o <global>).',
    level: 'easy',
    concepts: ['call-stack', 'local-memory'],
    hint: 'Think nested function calls — A calls B, B calls C. All three need to be on the stack simultaneously.',
    hintPtBr:
      'Pense em chamadas de função aninhadas — A chama B, B chama C. Os três precisam estar na pilha ao mesmo tempo.',
    starterCode:
      '// Write functions that call each other\n// Goal: 3 frames on the Call Stack at once\n',
    starterCodePtBr:
      '// Escreva funções que chamam umas às outras\n// Objetivo: 3 frames na Pilha de Chamadas ao mesmo tempo\n',
    solutionCode: `// Step 3: c() is the deepest — it just returns a value
function c() { return 1; }

// Step 2: b() calls c(), putting both on the stack
function b() { return c(); }

// Step 1: a() calls b(), which calls c() — 3 frames deep!
function a() { return b(); }

// Trigger the chain
a();`,
    solutionCodePtBr: `// Passo 3: c() é o mais fundo — apenas retorna um valor
function c() { return 1; }

// Passo 2: b() chama c(), colocando ambos na pilha
function b() { return c(); }

// Passo 1: a() chama b(), que chama c() — 3 níveis de profundidade!
function a() { return b(); }

// Inicia a cadeia
a();`,
    solutionExplanation:
      'When a() calls b() which calls c(), all three frames are on the Call Stack simultaneously before any of them return.',
    solutionExplanationPtBr:
      'Quando a() chama b() que chama c(), os três frames estão na Pilha de Chamadas simultaneamente antes de qualquer um deles retornar.',
    validate: (steps, lang) => {
      const pt = lang === 'pt-BR';
      const maxDepth = Math.max(...steps.map((s) => s.callStack.length));
      if (maxDepth >= 4) {
        return {
          passed: true,
          feedback: pt
            ? `Ótimo! Você atingiu ${maxDepth - 1} frames de profundidade.`
            : `Nice! You reached ${maxDepth - 1} frames deep.`,
        };
      }
      return {
        passed: false,
        feedback: pt
          ? `Profundidade máxima foi ${maxDepth - 1} frame(s). Você precisa de pelo menos 3.`
          : `Max stack depth was ${maxDepth - 1} frame(s). You need at least 3.`,
        details: pt
          ? 'Tente chamar uma função de dentro de outra função, e essa de dentro de outra ainda.'
          : 'Try calling a function from inside another function, and that function from inside yet another.',
      };
    },
  },
  {
    id: 'fill-the-memory',
    title: 'Fill the Memory',
    titlePtBr: 'Preencha a Memória',
    description:
      'Declare 3 variables: a number, a string, and an object. The object should appear in the Heap.',
    descriptionPtBr:
      'Declare 3 variáveis: um número, uma string e um objeto. O objeto deve aparecer no Heap.',
    level: 'easy',
    concepts: ['global-memory', 'heap'],
    hint: 'Use const to declare each variable. Objects and arrays go to the Heap — primitives stay in Memory.',
    hintPtBr:
      'Use const para declarar cada variável. Objetos e arrays vão para o Heap — primitivos ficam na Memória.',
    starterCode: '// Declare a number, a string, and an object\n',
    starterCodePtBr: '// Declare um número, uma string e um objeto\n',
    solutionCode: `// Primitive: stored directly in Global Memory
const age = 25;

// Primitive: strings are also stored inline in Memory
const name = "Joe";

// Object: stored in the Heap, Memory holds a [Pointer] to it
const person = { name: "Joe", age: 25 };`,
    solutionCodePtBr: `// Primitivo: armazenado diretamente na Memória Global
const idade = 25;

// Primitivo: strings também são armazenadas inline na Memória
const nome = "Joe";

// Objeto: armazenado no Heap, Memória guarda um [Ponteiro] para ele
const pessoa = { nome: "Joe", idade: 25 };`,
    solutionExplanation:
      'Numbers and strings are primitives stored inline in Global Memory. Objects are stored in the Heap with a [Pointer] reference in Memory.',
    solutionExplanationPtBr:
      'Números e strings são primitivos armazenados inline na Memória Global. Objetos são armazenados no Heap com uma referência [Ponteiro] na Memória.',
    validate: (steps, lang) => {
      const pt = lang === 'pt-BR';
      const last = steps[steps.length - 1];
      if (!last)
        return {
          passed: false,
          feedback: pt
            ? 'Nenhum passo de execução gerado.'
            : 'No execution steps generated.',
        };

      const globalBlock = last.memoryBlocks.find((b) => b.type === 'global');
      if (!globalBlock)
        return {
          passed: false,
          feedback: pt ? 'Memória Global não encontrada.' : 'No Global Memory found.',
        };

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
          feedback: pt
            ? 'Perfeito! Número e string na Memória, objeto no Heap.'
            : 'Perfect! Number and string in Memory, object in the Heap.',
        };
      }

      const missing = pt
        ? [
            !hasNumber && 'número',
            !hasString && 'string',
            !hasObject && 'objeto com [Ponteiro]',
            !hasHeap && 'HeapObject',
          ].filter(Boolean)
        : [
            !hasNumber && 'number',
            !hasString && 'string',
            !hasObject && 'object with [Pointer]',
            !hasHeap && 'HeapObject',
          ].filter(Boolean);
      return {
        passed: false,
        feedback: pt
          ? `Faltando: ${missing.join(', ')}.`
          : `Missing: ${missing.join(', ')}.`,
      };
    },
  },
  {
    id: 'say-hello-three-times',
    title: 'Say Hello Three Times',
    titlePtBr: 'Diga Olá Três Vezes',
    description:
      'Make the console output "Hello" exactly 3 times using a loop.',
    descriptionPtBr:
      'Faça o console exibir "Olá" exatamente 3 vezes usando um laço.',
    level: 'easy',
    concepts: ['console'],
    hint: 'Use a for loop that runs 3 iterations, each calling console.log("Hello").',
    hintPtBr:
      'Use um laço for com 3 iterações, cada uma chamando console.log("Olá").',
    starterCode: '// Use a loop to print "Hello" 3 times\n',
    starterCodePtBr: '// Use um laço para imprimir "Olá" 3 vezes\n',
    solutionCode: `// i starts at 0, increments each loop, stops before 3 → runs exactly 3 times
for (let i = 0; i < 3; i++) {
  // Each iteration logs "Hello" to the console output panel
  console.log("Hello");
}`,
    solutionCodePtBr: `// i começa em 0, incrementa a cada laço, para antes de 3 → executa exatamente 3 vezes
for (let i = 0; i < 3; i++) {
  // Cada iteração registra "Olá" no painel de console
  console.log("Olá");
}`,
    solutionExplanation:
      'A simple for loop with 3 iterations. Each iteration logs "Hello" to the console.',
    solutionExplanationPtBr:
      'Um simples laço for com 3 iterações. Cada iteração registra "Olá" no console.',
    validate: (steps, lang) => {
      const pt = lang === 'pt-BR';
      const last = steps[steps.length - 1];
      if (!last)
        return {
          passed: false,
          feedback: pt
            ? 'Nenhum passo de execução gerado.'
            : 'No execution steps generated.',
        };

      const helloCount = last.console.filter((e) =>
        e.args.some((a) => a.includes('Hello') || a.includes('Olá'))
      ).length;

      if (helloCount === 3) {
        return {
          passed: true,
          feedback: pt
            ? 'Olá, Olá, Olá! Exatamente 3 vezes.'
            : 'Hello, Hello, Hello! Exactly 3 times.',
        };
      }
      if (helloCount > 3) {
        return {
          passed: false,
          feedback: pt
            ? `Demais! Você registrou "Olá" ${helloCount} vezes. Precisa de exatamente 3.`
            : `Too many! You logged "Hello" ${helloCount} times. Need exactly 3.`,
        };
      }
      return {
        passed: false,
        feedback: pt
          ? `Apenas ${helloCount} "Olá"(s). Precisa de exatamente 3. Tente usar um laço.`
          : `Only ${helloCount} "Hello"(s). Need exactly 3. Try using a loop.`,
      };
    },
  },
  {
    id: 'the-f-symbol',
    title: 'The ⓕ Symbol',
    titlePtBr: 'O Símbolo ⓕ',
    description:
      'Declare a function and store it in a variable. You should see ⓕ in Global Memory and the function source in the Heap.',
    descriptionPtBr:
      'Declare uma função e armazene-a em uma variável. Você deve ver ⓕ na Memória Global e o código-fonte da função no Heap.',
    level: 'easy',
    concepts: ['global-memory', 'heap'],
    hint: 'Any function declaration or function expression creates a ⓕ entry in memory and a HeapObject with the source code.',
    hintPtBr:
      'Qualquer declaração de função ou expressão de função cria uma entrada ⓕ na memória e um HeapObject com o código-fonte.',
    starterCode: '// Declare a function — look for ⓕ in Memory\n',
    starterCodePtBr: '// Declare uma função — procure por ⓕ na Memória\n',
    solutionCode: `// Declaring a function creates a ⓕ entry in Global Memory...
function greet(name) {
  // ...and stores the full source code as a HeapObject in the Heap
  return "Hello " + name;
}`,
    solutionCodePtBr: `// Declarar uma função cria uma entrada ⓕ na Memória Global...
function cumprimentar(nome) {
  // ...e armazena o código-fonte completo como HeapObject no Heap
  return "Olá " + nome;
}`,
    solutionExplanation:
      'Function declarations create a ⓕ symbol in Global Memory pointing to a HeapObject that contains the function source code.',
    solutionExplanationPtBr:
      'Declarações de função criam um símbolo ⓕ na Memória Global apontando para um HeapObject que contém o código-fonte da função.',
    validate: (steps, lang) => {
      const pt = lang === 'pt-BR';
      const last = steps[steps.length - 1];
      if (!last)
        return {
          passed: false,
          feedback: pt
            ? 'Nenhum passo de execução gerado.'
            : 'No execution steps generated.',
        };

      const hasFnEntry = last.memoryBlocks.some((b) =>
        b.entries.some((e) => e.valueType === 'function')
      );
      const hasFnHeap = last.heap.some((h) => h.type === 'function');

      if (hasFnEntry && hasFnHeap) {
        return {
          passed: true,
          feedback: pt
            ? 'ⓕ encontrado na Memória e código-fonte da função no Heap!'
            : 'ⓕ found in Memory and function source in the Heap!',
        };
      }
      if (!hasFnEntry)
        return {
          passed: false,
          feedback: pt
            ? 'Nenhum ⓕ encontrado na Memória. Declare uma função.'
            : 'No ⓕ found in Memory. Declare a function.',
        };
      return {
        passed: false,
        feedback: pt
          ? 'Função não encontrada no Heap.'
          : 'Function not found in the Heap.',
      };
    },
  },
  {
    id: 'same-color-same-object',
    title: 'Same Color, Same Object',
    titlePtBr: 'Mesma Cor, Mesmo Objeto',
    description:
      'Create an object and assign it to two different variables. Both should have the same pointer color — proving they reference the same object.',
    descriptionPtBr:
      'Crie um objeto e atribua-o a duas variáveis diferentes. Ambas devem ter a mesma cor de ponteiro — provando que referenciam o mesmo objeto.',
    level: 'easy',
    concepts: ['global-memory', 'heap'],
    hint: 'When you do const b = a, both variables point to the same HeapObject. Same heapReferenceId = same color.',
    hintPtBr:
      'Quando você faz const b = a, ambas as variáveis apontam para o mesmo HeapObject. Mesmo heapReferenceId = mesma cor.',
    starterCode: '// Create an object and assign it to two variables\n',
    starterCodePtBr: '// Crie um objeto e atribua-o a duas variáveis\n',
    solutionCode: `// Creates an object in the Heap; 'a' holds a [Pointer] to it
const a = { x: 1 };

// Copies the pointer — not the object. 'b' points to the same HeapObject as 'a'
const b = a;`,
    solutionCodePtBr: `// Cria um objeto no Heap; 'a' guarda um [Ponteiro] para ele
const a = { x: 1 };

// Copia o ponteiro — não o objeto. 'b' aponta para o mesmo HeapObject que 'a'
const b = a;`,
    solutionExplanation:
      'When you assign b = a, JavaScript copies the reference — not the object. Both variables point to the exact same HeapObject, so they share the same pointer color.',
    solutionExplanationPtBr:
      'Quando você atribui b = a, o JavaScript copia a referência — não o objeto. Ambas as variáveis apontam para o mesmo HeapObject, por isso compartilham a mesma cor de ponteiro.',
    validate: (steps, lang) => {
      const pt = lang === 'pt-BR';
      const last = steps[steps.length - 1];
      if (!last)
        return {
          passed: false,
          feedback: pt
            ? 'Nenhum passo de execução gerado.'
            : 'No execution steps generated.',
        };

      const globalBlock = last.memoryBlocks.find((b) => b.type === 'global');
      if (!globalBlock)
        return {
          passed: false,
          feedback: pt ? 'Memória Global não encontrada.' : 'No Global Memory found.',
        };

      const objectEntries = globalBlock.entries.filter(
        (e) => e.valueType === 'object' && e.heapReferenceId
      );

      if (objectEntries.length < 2) {
        return {
          passed: false,
          feedback: pt
            ? `Precisa de 2 variáveis apontando para um objeto. Encontrado ${objectEntries.length}.`
            : `Need 2 variables pointing to an object. Found ${objectEntries.length}.`,
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
          feedback: pt
            ? 'Ambas as variáveis compartilham a mesma cor de ponteiro — mesmo objeto!'
            : 'Both variables share the same pointer color — same object!',
        };
      }
      return {
        passed: false,
        feedback: pt
          ? 'As variáveis apontam para objetos diferentes. Atribua uma à outra: const b = a.'
          : 'The variables point to different objects. Assign one to the other: const b = a.',
      };
    },
  },
];
