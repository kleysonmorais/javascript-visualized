import type { Challenge } from './types';

export const advancedChallenges: Challenge[] = [
  {
    id: 'predict-the-order',
    title: 'Predict the Order',
    titlePtBr: 'Preveja a Ordem',
    description:
      'Make the console output exactly: "1", "2", "3", "4" — in that order. You MUST use both setTimeout AND Promise.resolve.',
    descriptionPtBr:
      'Faça o console exibir exatamente: "1", "2", "3", "4" — nessa ordem. Você DEVE usar setTimeout E Promise.resolve.',
    level: 'hard',
    concepts: ['event-loop', 'microtask-queue', 'task-queue', 'promises'],
    hint: 'Sync code runs first, then microtasks (Promise), then macrotasks (setTimeout). Plan which number goes where.',
    hintPtBr:
      'Código síncrono executa primeiro, depois microtarefas (Promise), depois macrotarefas (setTimeout). Planeje qual número vai onde.',
    starterCode:
      '// Output: 1, 2, 3, 4 (in order)\n// Must use setTimeout AND Promise.resolve\n',
    starterCodePtBr:
      '// Saída: 1, 2, 3, 4 (em ordem)\n// Deve usar setTimeout E Promise.resolve\n',
    solutionCode: `// Sync — runs immediately (1st)
console.log("1");

// Microtask — scheduled after sync, runs before any macrotask
Promise.resolve().then(() => {
  console.log("3"); // 3rd: microtask runs after sync block

  // Macrotask scheduled FROM INSIDE the microtask — runs last
  setTimeout(() => console.log("4"), 0);
});

// Sync — runs immediately after "1" (2nd)
console.log("2");`,
    solutionCodePtBr: `// Síncrono — executa imediatamente (1º)
console.log("1");

// Microtarefa — agendada após o síncrono, executa antes de qualquer macrotarefa
Promise.resolve().then(() => {
  console.log("3"); // 3º: microtarefa executa após o bloco síncrono

  // Macrotarefa agendada DE DENTRO da microtarefa — executa por último
  setTimeout(() => console.log("4"), 0);
});

// Síncrono — executa imediatamente após "1" (2º)
console.log("2");`,
    solutionExplanation:
      '"1" and "2" are sync. "3" is a microtask that runs next. Inside "3", we schedule "4" as a macrotask that runs last.',
    solutionExplanationPtBr:
      '"1" e "2" são síncronos. "3" é uma microtarefa que executa em seguida. Dentro de "3", agendamos "4" como macrotarefa que executa por último.',
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
      const outputs = last.console.map((e) => e.args.join(' ').trim());
      const hasTimeout = steps.some((s) =>
        s.webAPIs.some((a) => a.type === 'setTimeout')
      );
      const hasMicrotask = steps.some((s) => s.microtaskQueue.length > 0);
      if (!hasTimeout)
        return {
          passed: false,
          feedback: pt ? 'Você deve usar setTimeout.' : 'You must use setTimeout.',
        };
      if (!hasMicrotask)
        return {
          passed: false,
          feedback: pt
            ? 'Você deve usar Promise.resolve.'
            : 'You must use Promise.resolve.',
        };
      if (
        outputs.length >= 4 &&
        outputs[0].includes('1') &&
        outputs[1].includes('2') &&
        outputs[2].includes('3') &&
        outputs[3].includes('4')
      ) {
        return {
          passed: true,
          feedback: pt ? '1, 2, 3, 4 — ordem perfeita!' : '1, 2, 3, 4 — perfect order!',
        };
      }
      return {
        passed: false,
        feedback: pt
          ? `Obtido: ${outputs.join(', ')}. Esperado: 1, 2, 3, 4.`
          : `Got: ${outputs.join(', ')}. Expected: 1, 2, 3, 4.`,
      };
    },
  },
  {
    id: 'microtask-chain-reaction',
    title: 'Microtask Chain Reaction',
    titlePtBr: 'Reação em Cadeia de Microtarefas',
    description:
      'Create a chain of 3 .then() callbacks, each logging its position. All 3 must execute before any setTimeout callback.',
    descriptionPtBr:
      'Crie uma cadeia de 3 callbacks .then(), cada um registrando sua posição. Os 3 devem executar antes de qualquer callback de setTimeout.',
    level: 'hard',
    concepts: ['microtask-queue', 'promises', 'event-loop', 'task-queue'],
    hint: 'Chain Promise.resolve().then().then().then(). All chained microtasks drain before the Event Loop picks a macrotask.',
    hintPtBr:
      'Encadeie Promise.resolve().then().then().then(). Todas as microtarefas encadeadas drenam antes do Event Loop pegar uma macrotarefa.',
    starterCode:
      '// Chain 3 .then() callbacks\n// All must run before setTimeout\n',
    starterCodePtBr:
      '// Encadeie 3 callbacks .then()\n// Todos devem executar antes do setTimeout\n',
    solutionCode: `// Macrotask: waits in Task Queue until ALL microtasks have drained
setTimeout(() => console.log("timeout"), 0);

// Each .then() creates a new microtask, chained one after another
Promise.resolve()
  .then(() => console.log("then-1")) // microtask 1
  .then(() => console.log("then-2")) // microtask 2
  .then(() => console.log("then-3")); // microtask 3 — all run before "timeout"`,
    solutionCodePtBr: `// Macrotarefa: aguarda na Fila de Tarefas até TODAS as microtarefas drenarem
setTimeout(() => console.log("timeout"), 0);

// Cada .then() cria uma nova microtarefa, encadeada uma após a outra
Promise.resolve()
  .then(() => console.log("then-1")) // microtarefa 1
  .then(() => console.log("then-2")) // microtarefa 2
  .then(() => console.log("then-3")); // microtarefa 3 — todas executam antes de "timeout"`,
    solutionExplanation:
      'Each .then() schedules a microtask. The Event Loop drains ALL microtasks before picking the next macrotask. So then-1, then-2, then-3 all execute before the setTimeout callback.',
    solutionExplanationPtBr:
      'Cada .then() agenda uma microtarefa. O Event Loop drena TODAS as microtarefas antes de pegar a próxima macrotarefa. Então then-1, then-2, then-3 executam antes do callback de setTimeout.',
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
      const outputs = last.console.map((e) => e.args.join(' ').toLowerCase());
      const thenOutputs = outputs.filter((o) => o.includes('then'));
      const timeoutIdx = outputs.findIndex((o) => o.includes('timeout'));
      if (thenOutputs.length < 3)
        return {
          passed: false,
          feedback: pt
            ? `Apenas ${thenOutputs.length} saídas de .then(). Precisa de 3.`
            : `Only ${thenOutputs.length} .then() outputs. Need 3.`,
        };
      if (timeoutIdx === -1)
        return {
          passed: false,
          feedback: pt
            ? 'Nenhuma saída do callback de setTimeout encontrada.'
            : 'No setTimeout callback output found.',
        };
      const lastThenIdx = outputs.lastIndexOf(
        thenOutputs[thenOutputs.length - 1]
      );
      if (lastThenIdx < timeoutIdx) {
        return {
          passed: true,
          feedback: pt
            ? 'Todas as 3 microtarefas executaram antes da macrotarefa!'
            : 'All 3 microtasks ran before the macrotask!',
        };
      }
      return {
        passed: false,
        feedback: pt
          ? 'Alguns callbacks .then() executaram após o setTimeout.'
          : 'Some .then() callbacks ran after setTimeout.',
      };
    },
  },
  {
    id: 'the-counter',
    title: 'The Counter',
    titlePtBr: 'O Contador',
    description:
      'Create a counter using closures that starts at 0 and increments each time you call it. Call it 5 times and log each result.',
    descriptionPtBr:
      'Crie um contador usando closures que começa em 0 e incrementa cada vez que você o chama. Chame-o 5 vezes e registre cada resultado.',
    level: 'hard',
    concepts: ['closures', 'heap', 'local-memory'],
    hint: 'Create a function that returns another function. The inner function increments a variable captured from the outer scope.',
    hintPtBr:
      'Crie uma função que retorna outra função. A função interna incrementa uma variável capturada do escopo externo.',
    starterCode:
      '// Create a closure-based counter\n// Call it 5 times, logging each value\n',
    starterCodePtBr:
      '// Crie um contador baseado em closure\n// Chame-o 5 vezes, registrando cada valor\n',
    solutionCode: `function createCounter() {
  let count = 0; // captured in [[Scope]] — persists across calls

  return function() {
    count++; // mutates the closed-over variable in the Heap
    return count;
  };
}

// Each call to counter() increments the SAME 'count' in the Heap
const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
console.log(counter()); // 4
console.log(counter()); // 5`,
    solutionCodePtBr: `function criarContador() {
  let contagem = 0; // capturado no [[Scope]] — persiste entre as chamadas

  return function() {
    contagem++; // muta a variável capturada no Heap
    return contagem;
  };
}

// Cada chamada a contador() incrementa a MESMA 'contagem' no Heap
const contador = criarContador();
console.log(contador()); // 1
console.log(contador()); // 2
console.log(contador()); // 3
console.log(contador()); // 4
console.log(contador()); // 5`,
    solutionExplanation:
      'Each call to counter() increments the closed-over "count" variable. The [[Scope]] in the Heap shows count updating: 1, 2, 3, 4, 5.',
    solutionExplanationPtBr:
      'Cada chamada a contador() incrementa a variável "contagem" capturada. O [[Scope]] no Heap mostra a contagem atualizando: 1, 2, 3, 4, 5.',
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
      const outputs = last.console.map((e) => e.args.join(' ').trim());
      if (
        outputs.length >= 5 &&
        outputs[0].includes('1') &&
        outputs[1].includes('2') &&
        outputs[2].includes('3') &&
        outputs[3].includes('4') &&
        outputs[4].includes('5')
      ) {
        return {
          passed: true,
          feedback: pt
            ? '1, 2, 3, 4, 5 — contador funciona com closures!'
            : '1, 2, 3, 4, 5 — counter works with closures!',
        };
      }
      return {
        passed: false,
        feedback: pt
          ? `Esperado: 1, 2, 3, 4, 5. Obtido: ${outputs.slice(0, 5).join(', ')}`
          : `Expected: 1, 2, 3, 4, 5. Got: ${outputs.slice(0, 5).join(', ')}`,
      };
    },
  },
  {
    id: 'generator-fibonacci',
    title: 'Generator Fibonacci',
    titlePtBr: 'Generator Fibonacci',
    description:
      'Write a generator that yields the first 5 Fibonacci numbers (1, 1, 2, 3, 5). Use for...of to iterate and log each value.',
    descriptionPtBr:
      'Escreva um generator que produz os primeiros 5 números de Fibonacci (1, 1, 2, 3, 5). Use for...of para iterar e registrar cada valor.',
    level: 'hard',
    concepts: ['generators', 'heap', 'local-memory'],
    hint: 'Use function* with yield. Track two variables (prev and curr) and swap them each iteration.',
    hintPtBr:
      'Use function* com yield. Rastreie duas variáveis (ant e atual) e troque-as a cada iteração.',
    starterCode:
      '// Write a Fibonacci generator\n// Yield the first 5 numbers: 1, 1, 2, 3, 5\n',
    starterCodePtBr:
      '// Escreva um generator de Fibonacci\n// Produza os primeiros 5 números: 1, 1, 2, 3, 5\n',
    solutionCode: `function* fibonacci() {
  let prev = 0, curr = 1; // local memory persists between yields

  for (let i = 0; i < 5; i++) {
    yield curr; // suspends here, hands value to the caller

    // resumes from this line on the next .next() call
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
}

// for...of calls .next() each iteration, resuming the generator
for (const n of fibonacci()) {
  console.log(n); // 1, 1, 2, 3, 5
}`,
    solutionCodePtBr: `function* fibonacci() {
  let ant = 0, atual = 1; // memória local persiste entre os yields

  for (let i = 0; i < 5; i++) {
    yield atual; // suspende aqui, passa o valor ao chamador

    // retoma a partir desta linha na próxima chamada .next()
    const prox = ant + atual;
    ant = atual;
    atual = prox;
  }
}

// for...of chama .next() a cada iteração, retomando o generator
for (const n of fibonacci()) {
  console.log(n); // 1, 1, 2, 3, 5
}`,
    solutionExplanation:
      'The generator yields each Fibonacci number and suspends. for...of calls .next() repeatedly, resuming the generator each time. Local memory persists across yields.',
    solutionExplanationPtBr:
      'O generator produz cada número de Fibonacci e suspende. for...of chama .next() repetidamente, retomando o generator a cada vez. A memória local persiste entre os yields.',
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
      const outputs = last.console.map((e) => e.args.join(' ').trim());
      const expected = ['1', '1', '2', '3', '5'];
      const match = expected.every(
        (v, i) => outputs[i] && outputs[i].includes(v)
      );
      if (match) {
        return {
          passed: true,
          feedback: pt
            ? '1, 1, 2, 3, 5 — Fibonacci com generators!'
            : '1, 1, 2, 3, 5 — Fibonacci with generators!',
        };
      }
      return {
        passed: false,
        feedback: pt
          ? `Esperado: 1, 1, 2, 3, 5. Obtido: ${outputs.slice(0, 5).join(', ')}`
          : `Expected: 1, 1, 2, 3, 5. Got: ${outputs.slice(0, 5).join(', ')}`,
      };
    },
  },
  {
    id: 'the-full-journey',
    title: 'The Full Journey',
    titlePtBr: 'A Jornada Completa',
    description:
      'Write code where a value travels through: Global Memory → Web APIs → Task Queue → Call Stack → Local Memory → Console. Use setTimeout.',
    descriptionPtBr:
      'Escreva código onde um valor percorre: Memória Global → Web APIs → Fila de Tarefas → Pilha de Chamadas → Memória Local → Console. Use setTimeout.',
    level: 'hard',
    concepts: [
      'global-memory',
      'web-apis',
      'task-queue',
      'event-loop',
      'call-stack',
      'local-memory',
      'console',
    ],
    hint: 'Store a value globally, pass it into a setTimeout callback, and inside the callback store it locally and log it.',
    hintPtBr:
      'Armazene um valor globalmente, passe-o para um callback de setTimeout e, dentro do callback, armazene-o localmente e registre-o.',
    starterCode:
      '// Make a value travel through ALL components\n// Global Memory → Web APIs → Task Queue → Call Stack → Local Memory → Console\n',
    starterCodePtBr:
      '// Faça um valor percorrer TODOS os componentes\n// Memória Global → Web APIs → Fila de Tarefas → Pilha de Chamadas → Memória Local → Console\n',
    solutionCode: `// Stop 1: Global Memory — 'message' is stored here
const message = "traveling";

// Stop 2: Web APIs — setTimeout registers the callback and starts the timer
setTimeout(function deliver() {
  // Stop 4: Call Stack — deliver() is pushed as a new frame
  // Stop 5: Local Memory — 'received' lives in deliver's local scope
  const received = message; // reads from Global Memory via scope chain

  // Stop 6: Console — the value is printed
  console.log(received);
}, 100);
// Stop 3: Task Queue — when the timer fires, deliver() waits here`,
    solutionCodePtBr: `// Parada 1: Memória Global — 'mensagem' é armazenada aqui
const mensagem = "viajando";

// Parada 2: Web APIs — setTimeout registra o callback e inicia o timer
setTimeout(function entregar() {
  // Parada 4: Pilha de Chamadas — entregar() é empilhada como novo frame
  // Parada 5: Memória Local — 'recebido' vive no escopo local de entregar
  const recebido = mensagem; // lê da Memória Global via cadeia de escopo

  // Parada 6: Console — o valor é impresso
  console.log(recebido);
}, 100);
// Parada 3: Fila de Tarefas — quando o timer dispara, entregar() espera aqui`,
    solutionExplanation:
      '"message" starts in Global Memory. setTimeout registers in Web APIs. When timer completes, callback goes to Task Queue. Event Loop moves it to Call Stack. Inside the callback, "received" is in Local Memory. Finally, console.log outputs it.',
    solutionExplanationPtBr:
      '"mensagem" começa na Memória Global. setTimeout registra nas Web APIs. Quando o timer completa, o callback vai para a Fila de Tarefas. O Event Loop move para a Pilha de Chamadas. Dentro do callback, "recebido" está na Memória Local. Por fim, console.log o exibe.',
    validate: (steps, lang) => {
      const pt = lang === 'pt-BR';
      const hadGlobalVar = steps.some((s) =>
        s.memoryBlocks.some((b) => b.type === 'global' && b.entries.length > 0)
      );
      const hadWebAPI = steps.some((s) => s.webAPIs.length > 0);
      const hadTaskQueue = steps.some((s) => s.taskQueue.length > 0);
      const hadLocalMemory = steps.some((s) =>
        s.memoryBlocks.some((b) => b.type === 'local')
      );
      const last = steps[steps.length - 1];
      const hadConsole = last && last.console.length > 0;

      const allPassed =
        hadGlobalVar &&
        hadWebAPI &&
        hadTaskQueue &&
        hadLocalMemory &&
        hadConsole;
      if (allPassed) {
        return {
          passed: true,
          feedback: pt
            ? 'Jornada completa! O valor percorreu todos os componentes.'
            : 'Full journey complete! The value traveled through every component.',
        };
      }
      const missing = pt
        ? [
            !hadGlobalVar && 'Memória Global',
            !hadWebAPI && 'Web APIs',
            !hadTaskQueue && 'Fila de Tarefas',
            !hadLocalMemory && 'Memória Local',
            !hadConsole && 'Console',
          ].filter(Boolean)
        : [
            !hadGlobalVar && 'Global Memory',
            !hadWebAPI && 'Web APIs',
            !hadTaskQueue && 'Task Queue',
            !hadLocalMemory && 'Local Memory',
            !hadConsole && 'Console',
          ].filter(Boolean);
      return {
        passed: false,
        feedback: pt
          ? `Paradas faltando: ${missing.join(', ')}.`
          : `Missing stops: ${missing.join(', ')}.`,
      };
    },
  },
];
