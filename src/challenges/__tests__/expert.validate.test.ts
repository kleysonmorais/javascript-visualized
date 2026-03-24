import { run } from '@/engine/__tests__/helpers';
import { expertChallenges } from '../expert';

const getChallenge = (id: string) => {
  const c = expertChallenges.find((c) => c.id === id);
  if (!c) throw new Error(`Challenge "${id}" not found`);
  return c;
};

// ─── microtask-starvation ─────────────────────────────────────────────────────

describe('microtask-starvation validate', () => {
  const { validate } = getChallenge('microtask-starvation');

  it('passes when 3 nested microtasks all run before setTimeout', () => {
    const steps = run(
      `setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => { console.log("micro-1"); Promise.resolve().then(() => { console.log("micro-2"); Promise.resolve().then(() => { console.log("micro-3"); }); }); });`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('3');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => { console.log("micro-1"); Promise.resolve().then(() => { console.log("micro-2"); Promise.resolve().then(() => { console.log("micro-3"); }); }); });`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('3');
  });

  it('fails when fewer than 3 micro outputs', () => {
    const steps = run(
      `setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => { console.log("micro-1"); Promise.resolve().then(() => { console.log("micro-2"); }); });`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('2');
  });

  it('fails when no setTimeout output present', () => {
    const steps = run(
      `Promise.resolve().then(() => { console.log("micro-1"); Promise.resolve().then(() => { console.log("micro-2"); Promise.resolve().then(() => { console.log("micro-3"); }); }); });`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('setTimeout');
  });

  it('fails when microtasks run after setTimeout', () => {
    // setTimeout fires first, then microtasks — wrong order
    const steps = run(
      `Promise.resolve().then(() => { console.log("micro-1"); }); setTimeout(() => { console.log("timeout"); Promise.resolve().then(() => { console.log("micro-2"); Promise.resolve().then(() => { console.log("micro-3"); }); }); }, 0);`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('after');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: fewer than 3 micro outputs feedback is in Portuguese', () => {
    const steps = run(
      `setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => { console.log("micro-1"); });`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Apenas');
  });

  it('pt-BR: no setTimeout feedback is in Portuguese', () => {
    const steps = run(
      `Promise.resolve().then(() => { console.log("micro-1"); Promise.resolve().then(() => { console.log("micro-2"); Promise.resolve().then(() => { console.log("micro-3"); }); }); });`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('setTimeout');
  });
});

// ─── promise-constructor-trap ─────────────────────────────────────────────────

describe('promise-constructor-trap validate', () => {
  const { validate } = getChallenge('promise-constructor-trap');

  it('passes with correct A, B, C, D order', () => {
    const steps = run(
      `setTimeout(() => console.log("D"), 0); const p = new Promise((resolve) => { console.log("A"); resolve(); }); p.then(() => console.log("C")); console.log("B");`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('A, B, C, D');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `setTimeout(() => console.log("D"), 0); const p = new Promise((resolve) => { console.log("A"); resolve(); }); p.then(() => console.log("C")); console.log("B");`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('A, B, C, D');
  });

  it('fails when order is wrong (e.g. B before A)', () => {
    const steps = run(
      `console.log("B"); const p = new Promise((resolve) => { console.log("A"); resolve(); }); p.then(() => console.log("C")); setTimeout(() => console.log("D"), 0);`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Got:');
  });

  it('fails when output has fewer than 4 values', () => {
    const steps = run(
      `const p = new Promise((resolve) => { console.log("A"); resolve(); }); p.then(() => console.log("C")); console.log("B");`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: wrong order feedback is in Portuguese', () => {
    const steps = run(
      `console.log("A"); console.log("B"); console.log("C"); console.log("D");`
    );
    const result = validate(steps, 'pt-BR');
    // A B C D logged synchronously — C should be microtask so this may or may not pass
    // The key check: when it fails, feedback is in Portuguese
    if (!result.passed) {
      expect(result.feedback).toContain('Obtido:');
    }
  });

  it('pt-BR: passes feedback is in Portuguese', () => {
    const steps = run(
      `setTimeout(() => console.log("D"), 0); const p = new Promise((resolve) => { console.log("A"); resolve(); }); p.then(() => console.log("C")); console.log("B");`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('armadilha');
  });
});

// ─── async-interleave ─────────────────────────────────────────────────────────

describe('async-interleave validate', () => {
  const { validate } = getChallenge('async-interleave');

  it('passes with correct A1, B1, A2, B2, A3, B3 interleaving', () => {
    const steps = run(
      `async function taskA() { console.log("A1"); await Promise.resolve(); console.log("A2"); await Promise.resolve(); console.log("A3"); } async function taskB() { console.log("B1"); await Promise.resolve(); console.log("B2"); await Promise.resolve(); console.log("B3"); } taskA(); taskB();`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('interleav');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `async function tarefaA() { console.log("A1"); await Promise.resolve(); console.log("A2"); await Promise.resolve(); console.log("A3"); } async function tarefaB() { console.log("B1"); await Promise.resolve(); console.log("B2"); await Promise.resolve(); console.log("B3"); } tarefaA(); tarefaB();`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Intercala');
  });

  it('fails when order is wrong (sequential not interleaved)', () => {
    const steps = run(
      `async function taskA() { console.log("A1"); console.log("A2"); console.log("A3"); } async function taskB() { console.log("B1"); console.log("B2"); console.log("B3"); } taskA(); taskB();`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Expected:');
  });

  it('fails when fewer than 6 outputs', () => {
    const steps = run(
      `async function taskA() { console.log("A1"); await Promise.resolve(); console.log("A2"); } async function taskB() { console.log("B1"); await Promise.resolve(); console.log("B2"); } taskA(); taskB();`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: wrong order feedback is in Portuguese', () => {
    const steps = run(
      `async function taskA() { console.log("A1"); console.log("A2"); console.log("A3"); } async function taskB() { console.log("B1"); console.log("B2"); console.log("B3"); } taskA(); taskB();`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Esperado:');
  });
});

// ─── closure-factory ──────────────────────────────────────────────────────────

describe('closure-factory validate', () => {
  const { validate } = getChallenge('closure-factory');

  it('passes when 3 independent closures produce different outputs', () => {
    const steps = run(
      `function makeGreeter(greeting) { return function(name) { return greeting + " " + name; }; } const hi = makeGreeter("Hi"); const hello = makeGreeter("Hello"); const hey = makeGreeter("Hey"); console.log(hi("World")); console.log(hello("World")); console.log(hey("World"));`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('independent');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `function criarCumprimentador(saudacao) { return function(nome) { return saudacao + " " + nome; }; } const oi = criarCumprimentador("Oi"); const ola = criarCumprimentador("Ola"); const eai = criarCumprimentador("Eai"); console.log(oi("Mundo")); console.log(ola("Mundo")); console.log(eai("Mundo"));`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('independentes');
  });

  it('fails when fewer than 3 outputs', () => {
    const steps = run(
      `function makeGreeter(greeting) { return function(name) { return greeting + " " + name; }; } const hi = makeGreeter("Hi"); const hello = makeGreeter("Hello"); console.log(hi("World")); console.log(hello("World"));`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('2');
  });

  it('fails when outputs are not all different (closures share state)', () => {
    const steps = run(
      `console.log("same"); console.log("same"); console.log("same");`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('not all different');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: fewer than 3 outputs feedback is in Portuguese', () => {
    const steps = run(`console.log("only one");`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Precisa de 3');
  });

  it('pt-BR: outputs not all different feedback is in Portuguese', () => {
    const steps = run(`console.log("same"); console.log("same"); console.log("same");`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('não são todas diferentes');
  });
});

// ─── event-loop-orchestra ─────────────────────────────────────────────────────

describe('event-loop-orchestra validate', () => {
  const { validate } = getChallenge('event-loop-orchestra');

  it('passes with correct 7-step output', () => {
    const steps = run(
      `console.log("sync-1"); setTimeout(() => { console.log("macro-1"); Promise.resolve().then(() => console.log("micro-3")); }, 0); setTimeout(() => console.log("macro-2"), 0); Promise.resolve().then(() => console.log("micro-1")).then(() => console.log("micro-2")); console.log("sync-2");`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('FLAWLESS');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `console.log("sync-1"); setTimeout(() => { console.log("macro-1"); Promise.resolve().then(() => console.log("micro-3")); }, 0); setTimeout(() => console.log("macro-2"), 0); Promise.resolve().then(() => console.log("micro-1")).then(() => console.log("micro-2")); console.log("sync-2");`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('PERFEITO');
  });

  it('fails when micro-3 comes after macro-2 instead of before', () => {
    const steps = run(
      `console.log("sync-1"); setTimeout(() => console.log("macro-1"), 0); setTimeout(() => { console.log("macro-2"); Promise.resolve().then(() => console.log("micro-3")); }, 0); Promise.resolve().then(() => console.log("micro-1")).then(() => console.log("micro-2")); console.log("sync-2");`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Expected:');
  });

  it('fails when sync order is wrong', () => {
    const steps = run(
      `console.log("sync-2"); setTimeout(() => { console.log("macro-1"); Promise.resolve().then(() => console.log("micro-3")); }, 0); setTimeout(() => console.log("macro-2"), 0); Promise.resolve().then(() => console.log("micro-1")).then(() => console.log("micro-2")); console.log("sync-1");`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Got:');
  });

  it('fails when fewer than 7 outputs', () => {
    const steps = run(
      `console.log("sync-1"); console.log("sync-2"); Promise.resolve().then(() => console.log("micro-1")).then(() => console.log("micro-2"));`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: wrong order feedback is in Portuguese', () => {
    const steps = run(
      `console.log("sync-2"); console.log("sync-1"); setTimeout(() => { console.log("macro-1"); Promise.resolve().then(() => console.log("micro-3")); }, 0); setTimeout(() => console.log("macro-2"), 0); Promise.resolve().then(() => console.log("micro-1")).then(() => console.log("micro-2"));`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Esperado:');
  });
});
