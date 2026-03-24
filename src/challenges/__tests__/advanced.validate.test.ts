import { run } from '@/engine/__tests__/helpers';
import { advancedChallenges } from '../advanced';

const getChallenge = (id: string) => {
  const c = advancedChallenges.find((c) => c.id === id);
  if (!c) throw new Error(`Challenge "${id}" not found`);
  return c;
};

// ─── predict-the-order ────────────────────────────────────────────────────────

describe('predict-the-order validate', () => {
  const { validate } = getChallenge('predict-the-order');

  it('passes with correct 1, 2, 3, 4 order using setTimeout + Promise', () => {
    const steps = run(
      `console.log("1"); Promise.resolve().then(() => { console.log("3"); setTimeout(() => console.log("4"), 0); }); console.log("2");`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('1, 2, 3, 4');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `console.log("1"); Promise.resolve().then(() => { console.log("3"); setTimeout(() => console.log("4"), 0); }); console.log("2");`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('1, 2, 3, 4');
  });

  it('fails when setTimeout is not used', () => {
    const steps = run(
      `console.log("1"); Promise.resolve().then(() => console.log("3")); console.log("2");`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('setTimeout');
  });

  it('fails when Promise.resolve is not used', () => {
    const steps = run(
      `console.log("1"); console.log("2"); setTimeout(() => console.log("3"), 0); setTimeout(() => console.log("4"), 0);`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Promise.resolve');
  });

  it('fails when order is wrong', () => {
    const steps = run(
      `console.log("2"); Promise.resolve().then(() => console.log("1")); setTimeout(() => console.log("4"), 0); console.log("3");`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Got:');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: wrong order feedback is in Portuguese', () => {
    const steps = run(
      `console.log("4"); Promise.resolve().then(() => console.log("3")); setTimeout(() => console.log("2"), 0); console.log("1");`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Obtido:');
  });
});

// ─── microtask-chain-reaction ─────────────────────────────────────────────────

describe('microtask-chain-reaction validate', () => {
  const { validate } = getChallenge('microtask-chain-reaction');

  it('passes when 3 .then() callbacks run before setTimeout', () => {
    const steps = run(
      `setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => console.log("then-1")).then(() => console.log("then-2")).then(() => console.log("then-3"));`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('3');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => console.log("then-1")).then(() => console.log("then-2")).then(() => console.log("then-3"));`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('3');
  });

  it('fails when fewer than 3 .then() outputs', () => {
    const steps = run(
      `setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => console.log("then-1")).then(() => console.log("then-2"));`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('2');
  });

  it('fails when no setTimeout output present', () => {
    const steps = run(
      `Promise.resolve().then(() => console.log("then-1")).then(() => console.log("then-2")).then(() => console.log("then-3"));`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('setTimeout');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: fewer than 3 .then() feedback is in Portuguese', () => {
    const steps = run(
      `setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => console.log("then-1"));`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Apenas');
  });

  it('pt-BR: no setTimeout output feedback is in Portuguese', () => {
    const steps = run(
      `Promise.resolve().then(() => console.log("then-1")).then(() => console.log("then-2")).then(() => console.log("then-3"));`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('setTimeout');
  });
});

// ─── the-counter ──────────────────────────────────────────────────────────────

describe('the-counter validate', () => {
  const { validate } = getChallenge('the-counter');

  it('passes with a closure counter logging 1 through 5', () => {
    const steps = run(
      `function createCounter() { let count = 0; return function() { count++; return count; }; } const counter = createCounter(); console.log(counter()); console.log(counter()); console.log(counter()); console.log(counter()); console.log(counter());`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('1, 2, 3, 4, 5');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `function criarContador() { let contagem = 0; return function() { contagem++; return contagem; }; } const contador = criarContador(); console.log(contador()); console.log(contador()); console.log(contador()); console.log(contador()); console.log(contador());`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('1, 2, 3, 4, 5');
  });

  it('fails when output is fewer than 5 values', () => {
    const steps = run(
      `function createCounter() { let count = 0; return function() { count++; return count; }; } const counter = createCounter(); console.log(counter()); console.log(counter()); console.log(counter());`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Expected: 1, 2, 3, 4, 5');
  });

  it('fails when values are not incrementing (all same)', () => {
    const steps = run(`for (let i = 0; i < 5; i++) { console.log(1); }`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
  });

  it('fails with wrong sequence (e.g. starts at 0)', () => {
    const steps = run(
      `function createCounter() { let count = -1; return function() { count++; return count; }; } const counter = createCounter(); console.log(counter()); console.log(counter()); console.log(counter()); console.log(counter()); console.log(counter());`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Got:');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: wrong output feedback is in Portuguese', () => {
    const steps = run(
      `console.log(1); console.log(1); console.log(1); console.log(1); console.log(1);`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Obtido:');
  });
});

// ─── generator-fibonacci ──────────────────────────────────────────────────────

describe('generator-fibonacci validate', () => {
  const { validate } = getChallenge('generator-fibonacci');

  it('passes with correct Fibonacci sequence 1, 1, 2, 3, 5 (yield inside for loop)', () => {
    const steps = run(
      `function* fibonacci() { let prev = 0, curr = 1; for (let i = 0; i < 5; i++) { yield curr; const next = prev + curr; prev = curr; curr = next; } } for (const n of fibonacci()) { console.log(n); }`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('1, 1, 2, 3, 5');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `function* fibonacci() { let ant = 0, atual = 1; for (let i = 0; i < 5; i++) { yield atual; const prox = ant + atual; ant = atual; atual = prox; } } for (const n of fibonacci()) { console.log(n); }`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('1, 1, 2, 3, 5');
  });

  it('fails when sequence is wrong (e.g. 2, 3, 5, 8, 13)', () => {
    const steps = run(
      `function* fib() { yield 2; yield 3; yield 5; yield 8; yield 13; } const g = fib(); console.log(g.next().value); console.log(g.next().value); console.log(g.next().value); console.log(g.next().value); console.log(g.next().value);`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Expected: 1, 1, 2, 3, 5');
  });

  it('fails when fewer than 5 values are logged', () => {
    const steps = run(
      `function* fib() { for (let i = 0; i < 3; i++) { yield i + 1; } } for (const n of fib()) { console.log(n); }`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: wrong sequence feedback is in Portuguese', () => {
    const steps = run(
      `console.log(1); console.log(2); console.log(3); console.log(4); console.log(5);`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Obtido:');
  });
});

// ─── the-full-journey ─────────────────────────────────────────────────────────

describe('the-full-journey validate', () => {
  const { validate } = getChallenge('the-full-journey');

  it('passes when value travels through all components', () => {
    const steps = run(
      `const message = "traveling"; setTimeout(function deliver() { const received = message; console.log(received); }, 100);`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Full journey');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(
      `const mensagem = "viajando"; setTimeout(function entregar() { const recebido = mensagem; console.log(recebido); }, 100);`
    );
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Jornada completa');
  });

  it('fails when Web APIs (setTimeout) is not used', () => {
    const steps = run(
      `const x = 1; function fn() { const y = x; console.log(y); } fn();`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Web APIs');
  });

  it('fails when Task Queue is never populated', () => {
    // Promise uses microtask queue, not task queue
    const steps = run(
      `const x = "hi"; Promise.resolve().then(function fn() { const y = x; console.log(y); });`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Task Queue');
  });

  it('fails when console has no output', () => {
    const steps = run(
      `const message = "hi"; setTimeout(function deliver() { const received = message; }, 100);`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Console');
  });

  it('passes with an arrow function callback (engine creates local memory for it)', () => {
    // Arrow functions executed via setTimeout do produce a local memory block
    const steps = run(
      `const message = "hi"; setTimeout(() => console.log(message), 100);`
    );
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
  });

  it('pt-BR: missing stops feedback is in Portuguese', () => {
    const steps = run(`const x = 1;`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Paradas faltando');
  });
});
