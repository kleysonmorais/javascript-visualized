import type { Challenge } from './types';

export const expertChallenges: Challenge[] = [
  {
    id: 'microtask-starvation',
    title: 'Microtask Starvation',
    titlePtBr: 'Inanição de Microtarefas',
    description:
      'Write code where a .then() callback schedules another .then(), which schedules another — 3 levels deep. All 3 must execute before a setTimeout(fn, 0).',
    descriptionPtBr:
      'Escreva código onde um callback .then() agenda outro .then(), que agenda outro — 3 níveis de profundidade. Os 3 devem executar antes de um setTimeout(fn, 0).',
    level: 'expert',
    concepts: ['microtask-queue', 'promises', 'event-loop', 'task-queue'],
    hint: 'Microtasks created INSIDE microtasks also drain before the Event Loop checks the Task Queue. The queue must be completely empty first.',
    hintPtBr: 'Microtarefas criadas DENTRO de microtarefas também drenam antes do Event Loop verificar a Fila de Tarefas. A fila deve estar completamente vazia primeiro.',
    starterCode: '// 3 nested microtasks, all before setTimeout\n',
    starterCodePtBr: '// 3 microtarefas aninhadas, todas antes do setTimeout\n',
    solutionCode: `// Macrotask: sits in Task Queue until the Microtask Queue is fully empty
setTimeout(() => console.log("timeout"), 0);

Promise.resolve().then(() => {
  console.log("micro-1");

  // A microtask created INSIDE a microtask also drains before any macrotask
  Promise.resolve().then(() => {
    console.log("micro-2");

    // Same rule applies at every nesting level
    Promise.resolve().then(() => {
      console.log("micro-3");
    });
  });
});`,
    solutionCodePtBr: `// Macrotarefa: fica na Fila de Tarefas até a Fila de Microtarefas estar totalmente vazia
setTimeout(() => console.log("timeout"), 0);

Promise.resolve().then(() => {
  console.log("micro-1");

  // Uma microtarefa criada DENTRO de uma microtarefa também drena antes de qualquer macrotarefa
  Promise.resolve().then(() => {
    console.log("micro-2");

    // A mesma regra se aplica em todo nível de aninhamento
    Promise.resolve().then(() => {
      console.log("micro-3");
    });
  });
});`,
    solutionExplanation:
      'Each nested .then() creates a new microtask. The Event Loop keeps draining the Microtask Queue until it is completely empty — even microtasks created by other microtasks — before picking any macrotask.',
    solutionExplanationPtBr:
      'Cada .then() aninhado cria uma nova microtarefa. O Event Loop continua drenando a Fila de Microtarefas até estar completamente vazia — inclusive microtarefas criadas por outras microtarefas — antes de pegar qualquer macrotarefa.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' ').toLowerCase());
      const microOutputs = outputs.filter((o) => o.includes('micro'));
      const timeoutIdx = outputs.findIndex((o) => o.includes('timeout'));
      if (microOutputs.length < 3)
        return {
          passed: false,
          feedback: `Only ${microOutputs.length} micro outputs. Need 3 nested levels.`,
        };
      if (timeoutIdx === -1)
        return {
          passed: false,
          feedback: 'Need a setTimeout callback in the output.',
        };
      const lastMicroIdx = Math.max(
        ...microOutputs.map((m) => outputs.indexOf(m))
      );
      if (lastMicroIdx < timeoutIdx) {
        return {
          passed: true,
          feedback:
            'All 3 nested microtasks drained before the macrotask! Event Loop mastery.',
        };
      }
      return {
        passed: false,
        feedback: 'Some microtasks ran after the setTimeout callback.',
      };
    },
  },
  {
    id: 'promise-constructor-trap',
    title: 'The Promise Constructor Trap',
    titlePtBr: 'A Armadilha do Construtor de Promise',
    description:
      'Output exactly: "A", "B", "C", "D". "A" from inside a Promise constructor, "B" synchronous after the Promise, "C" from .then(), "D" from setTimeout.',
    descriptionPtBr:
      'Exiba exatamente: "A", "B", "C", "D". "A" de dentro do construtor de Promise, "B" síncrono após a Promise, "C" do .then(), "D" do setTimeout.',
    level: 'expert',
    concepts: ['promises', 'event-loop', 'microtask-queue', 'task-queue'],
    hint: 'The Promise executor runs SYNCHRONOUSLY — that is the trap most people miss. new Promise(fn) calls fn immediately.',
    hintPtBr: 'O executor da Promise executa SINCRONAMENTE — essa é a armadilha que a maioria das pessoas perde. new Promise(fn) chama fn imediatamente.',
    starterCode:
      '// Output: A, B, C, D\n// A = inside Promise constructor\n// B = sync after Promise\n// C = .then() callback\n// D = setTimeout callback\n',
    starterCodePtBr:
      '// Saída: A, B, C, D\n// A = dentro do construtor de Promise\n// B = síncrono após a Promise\n// C = callback .then()\n// D = callback setTimeout\n',
    solutionCode: `// Macrotask: will run last
setTimeout(() => console.log("D"), 0);

// The executor function runs SYNCHRONOUSLY — "A" logs immediately (trap!)
const p = new Promise((resolve) => {
  console.log("A"); // sync, 1st
  resolve();        // marks the promise as settled
});

// Microtask: scheduled after sync block completes
p.then(() => console.log("C")); // 3rd

// Sync: runs immediately after the Promise constructor (2nd)
console.log("B");`,
    solutionCodePtBr: `// Macrotarefa: vai executar por último
setTimeout(() => console.log("D"), 0);

// A função executora executa SINCRONAMENTE — "A" registra imediatamente (armadilha!)
const p = new Promise((resolve) => {
  console.log("A"); // síncrono, 1º
  resolve();        // marca a promise como liquidada
});

// Microtarefa: agendada após o bloco síncrono completar
p.then(() => console.log("C")); // 3º

// Síncrono: executa imediatamente após o construtor de Promise (2º)
console.log("B");`,
    solutionExplanation:
      'The Promise executor runs synchronously, so "A" logs immediately. "B" is the next sync statement. "C" is a microtask (.then). "D" is a macrotask (setTimeout). Order: sync (A, B) → micro (C) → macro (D).',
    solutionExplanationPtBr:
      'O executor da Promise executa sincronamente, então "A" registra imediatamente. "B" é a próxima instrução síncrona. "C" é uma microtarefa (.then). "D" é uma macrotarefa (setTimeout). Ordem: síncrono (A, B) → micro (C) → macro (D).',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' ').trim());
      if (
        outputs.length >= 4 &&
        outputs[0] === 'A' &&
        outputs[1] === 'B' &&
        outputs[2] === 'C' &&
        outputs[3] === 'D'
      ) {
        return {
          passed: true,
          feedback: 'A, B, C, D — you understand the Promise constructor trap!',
        };
      }
      return {
        passed: false,
        feedback: `Expected: A, B, C, D. Got: ${outputs.slice(0, 4).join(', ')}`,
      };
    },
  },
  {
    id: 'async-interleave',
    title: 'Async Interleave',
    titlePtBr: 'Intercalação Assíncrona',
    description:
      'Create two async functions that run concurrently. Each logs 3 messages with awaits between them. Output must interleave: "A1", "B1", "A2", "B2", "A3", "B3".',
    descriptionPtBr:
      'Crie duas funções async que executam concorrentemente. Cada uma registra 3 mensagens com awaits entre elas. A saída deve se intercalar: "A1", "B1", "A2", "B2", "A3", "B3".',
    level: 'expert',
    concepts: ['async-await', 'promises', 'microtask-queue', 'event-loop'],
    hint: 'Call both async functions WITHOUT await between them. Each await suspends only its own function. The microtask queue interleaves their continuations.',
    hintPtBr: 'Chame ambas as funções async SEM await entre elas. Cada await suspende apenas sua própria função. A fila de microtarefas intercala suas continuações.',
    starterCode:
      '// Two async functions running concurrently\n// Output: A1, B1, A2, B2, A3, B3\n',
    starterCodePtBr:
      '// Duas funções async executando concorrentemente\n// Saída: A1, B1, A2, B2, A3, B3\n',
    solutionCode: `async function taskA() {
  console.log("A1"); // sync on first call
  await Promise.resolve(); // suspends taskA, yields control
  console.log("A2"); // resumes as a microtask
  await Promise.resolve(); // suspends again
  console.log("A3");
}

async function taskB() {
  console.log("B1"); // sync, runs right after A1
  await Promise.resolve(); // suspends taskB
  console.log("B2"); // resumes after A2 (microtasks interleave)
  await Promise.resolve();
  console.log("B3");
}

// Call both WITHOUT awaiting — they start concurrently
taskA();
taskB();`,
    solutionCodePtBr: `async function tarefaA() {
  console.log("A1"); // síncrono na primeira chamada
  await Promise.resolve(); // suspende tarefaA, cede o controle
  console.log("A2"); // retoma como microtarefa
  await Promise.resolve(); // suspende novamente
  console.log("A3");
}

async function tarefaB() {
  console.log("B1"); // síncrono, executa logo após A1
  await Promise.resolve(); // suspende tarefaB
  console.log("B2"); // retoma após A2 (microtarefas se intercalam)
  await Promise.resolve();
  console.log("B3");
}

// Chame ambas SEM await — elas começam concorrentemente
tarefaA();
tarefaB();`,
    solutionExplanation:
      'Both functions start synchronously: A1, B1. Each await suspends its function. Their continuations interleave in the microtask queue: A2, B2, A3, B3.',
    solutionExplanationPtBr:
      'Ambas as funções começam sincronamente: A1, B1. Cada await suspende sua função. Suas continuações se intercalam na fila de microtarefas: A2, B2, A3, B3.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' ').trim());
      const expected = ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'];
      const match = expected.every((v, i) => outputs[i] === v);
      if (match) {
        return {
          passed: true,
          feedback:
            'Perfect interleaving! You understand concurrent async execution.',
        };
      }
      return {
        passed: false,
        feedback: `Expected: ${expected.join(', ')}. Got: ${outputs.slice(0, 6).join(', ')}`,
      };
    },
  },
  {
    id: 'closure-factory',
    title: 'Closure Factory',
    titlePtBr: 'Fábrica de Closures',
    description:
      'Create a function that returns different closures depending on the argument. Call it 3 times with different values. Each closure must be independent — prove it by logging all 3.',
    descriptionPtBr:
      'Crie uma função que retorna closures diferentes dependendo do argumento. Chame-a 3 vezes com valores diferentes. Cada closure deve ser independente — prove registrando as 3.',
    level: 'expert',
    concepts: ['closures', 'heap', 'local-memory'],
    hint: 'Each call to the factory creates a NEW scope. The returned functions capture their own independent copy of the variable.',
    hintPtBr: 'Cada chamada à fábrica cria um NOVO escopo. As funções retornadas capturam sua própria cópia independente da variável.',
    starterCode:
      '// Create a closure factory\n// Call it 3 times with different args\n// Prove each closure is independent\n',
    starterCodePtBr:
      '// Crie uma fábrica de closures\n// Chame-a 3 vezes com argumentos diferentes\n// Prove que cada closure é independente\n',
    solutionCode: `function makeGreeter(greeting) {
  // Each call creates a NEW scope with its own 'greeting'
  return function(name) {
    // Captures the 'greeting' from its own parent scope — not shared
    return greeting + " " + name;
  };
}

// Three separate calls → three independent [[Scope]] objects in the Heap
const hi    = makeGreeter("Hi");
const hello = makeGreeter("Hello");
const hey   = makeGreeter("Hey");

console.log(hi("World"));    // "Hi World"
console.log(hello("World")); // "Hello World"
console.log(hey("World"));   // "Hey World"`,
    solutionCodePtBr: `function criarCumprimentador(saudacao) {
  // Cada chamada cria um NOVO escopo com sua própria 'saudacao'
  return function(nome) {
    // Captura 'saudacao' do próprio escopo pai — não compartilhada
    return saudacao + " " + nome;
  };
}

// Três chamadas separadas → três objetos [[Scope]] independentes no Heap
const oi    = criarCumprimentador("Oi");
const ola   = criarCumprimentador("Olá");
const eai   = criarCumprimentador("E aí");

console.log(oi("Mundo"));   // "Oi Mundo"
console.log(ola("Mundo"));  // "Olá Mundo"
console.log(eai("Mundo"));  // "E aí Mundo"`,
    solutionExplanation:
      'Each call to makeGreeter creates a new scope with its own "greeting" variable. The three closures are independent — changing one does not affect the others.',
    solutionExplanationPtBr:
      'Cada chamada a criarCumprimentador cria um novo escopo com sua própria variável "saudacao". As três closures são independentes — mudar uma não afeta as outras.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' '));
      const unique = new Set(outputs);
      if (outputs.length >= 3 && unique.size >= 3) {
        return {
          passed: true,
          feedback:
            'Three independent closures — each with its own captured scope!',
        };
      }
      if (outputs.length < 3)
        return {
          passed: false,
          feedback: `Need 3 outputs. Got ${outputs.length}.`,
        };
      return {
        passed: false,
        feedback:
          'The outputs are not all different. Each closure should produce a unique result.',
      };
    },
  },
  {
    id: 'event-loop-orchestra',
    title: 'The Event Loop Orchestra',
    titlePtBr: 'A Orquestra do Event Loop',
    description:
      'Output exactly: "sync-1", "sync-2", "micro-1", "micro-2", "macro-1", "micro-3", "macro-2". You MUST use Promise.resolve, new Promise, and at least 2 setTimeouts.',
    descriptionPtBr:
      'Exiba exatamente: "sync-1", "sync-2", "micro-1", "micro-2", "macro-1", "micro-3", "macro-2". Você DEVE usar Promise.resolve, new Promise e pelo menos 2 setTimeouts.',
    level: 'expert',
    concepts: [
      'event-loop',
      'microtask-queue',
      'task-queue',
      'promises',
      'async-await',
    ],
    hint: '"micro-3" runs BETWEEN "macro-1" and "macro-2". This means the first setTimeout callback must create a new microtask that drains before the second setTimeout fires.',
    hintPtBr: '"micro-3" executa ENTRE "macro-1" e "macro-2". Isso significa que o primeiro callback de setTimeout deve criar uma nova microtarefa que drena antes do segundo setTimeout disparar.',
    starterCode:
      '// The boss fight.\n// Output: sync-1, sync-2, micro-1, micro-2, macro-1, micro-3, macro-2\n',
    starterCodePtBr:
      '// A batalha final.\n// Saída: sync-1, sync-2, micro-1, micro-2, macro-1, micro-3, macro-2\n',
    solutionCode: `// Sync — runs 1st
console.log("sync-1");

// Macrotask 1: when it fires, it creates a new microtask (micro-3)
setTimeout(() => {
  console.log("macro-1"); // 5th
  // micro-3 is created INSIDE a macrotask — drains before macro-2 runs
  Promise.resolve().then(() => console.log("micro-3")); // 6th
}, 0);

// Macrotask 2: runs last, AFTER micro-3 drains
setTimeout(() => console.log("macro-2"), 0); // 7th

// Microtasks: drain before any macrotask
Promise.resolve()
  .then(() => console.log("micro-1")) // 3rd
  .then(() => console.log("micro-2")); // 4th

// Sync — runs 2nd
console.log("sync-2");`,
    solutionCodePtBr: `// Síncrono — executa 1º
console.log("sync-1");

// Macrotarefa 1: quando dispara, cria uma nova microtarefa (micro-3)
setTimeout(() => {
  console.log("macro-1"); // 5º
  // micro-3 é criada DENTRO de uma macrotarefa — drena antes de macro-2 executar
  Promise.resolve().then(() => console.log("micro-3")); // 6º
}, 0);

// Macrotarefa 2: executa por último, APÓS micro-3 drenar
setTimeout(() => console.log("macro-2"), 0); // 7º

// Microtarefas: drenam antes de qualquer macrotarefa
Promise.resolve()
  .then(() => console.log("micro-1")) // 3º
  .then(() => console.log("micro-2")); // 4º

// Síncrono — executa 2º
console.log("sync-2");`,
    solutionExplanation:
      'sync-1, sync-2 run first. Then microtasks: micro-1, micro-2. Then first macrotask: macro-1 — which creates micro-3. Micro-3 drains before macro-2 fires. This is the full Event Loop cycle.',
    solutionExplanationPtBr:
      'sync-1, sync-2 executam primeiro. Depois microtarefas: micro-1, micro-2. Depois a primeira macrotarefa: macro-1 — que cria micro-3. Micro-3 drena antes de macro-2 disparar. Este é o ciclo completo do Event Loop.',
    validate: (steps) => {
      const last = steps[steps.length - 1];
      if (!last)
        return { passed: false, feedback: 'No execution steps generated.' };
      const outputs = last.console.map((e) => e.args.join(' ').trim());
      const expected = [
        'sync-1',
        'sync-2',
        'micro-1',
        'micro-2',
        'macro-1',
        'micro-3',
        'macro-2',
      ];
      const match = expected.every((v, i) => outputs[i] === v);
      if (match) {
        return {
          passed: true,
          feedback: 'FLAWLESS. You have mastered the Event Loop. 🎻🎺🥁',
        };
      }
      return {
        passed: false,
        feedback: `Expected:\n${expected.join(', ')}\nGot:\n${outputs.slice(0, 7).join(', ')}`,
      };
    },
  },
];
