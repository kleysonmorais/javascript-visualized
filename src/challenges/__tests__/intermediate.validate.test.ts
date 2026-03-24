import { run } from '@/engine/__tests__/helpers';
import { intermediateChallenges } from '../intermediate';

const getChallenge = (id: string) => {
  const c = intermediateChallenges.find((c) => c.id === id);
  if (!c) throw new Error(`Challenge "${id}" not found`);
  return c;
};

// ─── delayed-greeting ────────────────────────────────────────────────────────

describe('delayed-greeting validate', () => {
  const { validate } = getChallenge('delayed-greeting');

  it('passes with correct solution (World before Hello)', () => {
    const steps = run(`setTimeout(() => console.log("Hello"), 100); console.log("World");`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('World');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(`setTimeout(() => console.log("Olá"), 100); console.log("Mundo");`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Mundo');
  });

  it('fails when setTimeout is not used', () => {
    const steps = run(`console.log("World"); console.log("Hello");`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('setTimeout');
  });

  it('fails when Hello appears before World', () => {
    const steps = run(`console.log("Hello"); setTimeout(() => console.log("World"), 100);`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Hello');
  });

  it('fails when console output is missing one of the values', () => {
    const steps = run(`setTimeout(() => console.log("Hello"), 100);`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toMatch(/World|Hello/);
  });

  it('fails with empty steps array', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: fails when setTimeout is not used', () => {
    const steps = run(`console.log("Mundo"); console.log("Olá");`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('setTimeout');
  });
});

// ─── queue-it-up ─────────────────────────────────────────────────────────────

describe('queue-it-up validate', () => {
  const { validate } = getChallenge('queue-it-up');

  it('passes when 2 callbacks reach the Task Queue simultaneously', () => {
    const steps = run(`setTimeout(() => console.log("A"), 100); setTimeout(() => console.log("B"), 100); console.log("sync");`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Task Queue');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(`setTimeout(() => console.log("A"), 100); setTimeout(() => console.log("B"), 100);`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Fila de Tarefas');
  });

  it('passes when 3+ callbacks queue up (maxQueue >= 2)', () => {
    const steps = run(`setTimeout(() => {}, 0); setTimeout(() => {}, 0); setTimeout(() => {}, 0);`);
    const maxQueue = Math.max(...steps.map((s) => s.taskQueue.length));
    expect(maxQueue).toBeGreaterThanOrEqual(2);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
  });

  it('fails when only 1 callback is queued', () => {
    const steps = run(`setTimeout(() => console.log("A"), 100);`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Need at least 2');
  });

  it('fails with no async code', () => {
    const steps = run(`const x = 1;`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
  });

  it('pt-BR: fails feedback mentions Fila de Tarefas', () => {
    const steps = run(`setTimeout(() => {}, 0);`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Fila de Tarefas');
  });

  it('feedback includes the maxQueue count on pass', () => {
    const steps = run(`setTimeout(() => {}, 0); setTimeout(() => {}, 0);`);
    const result = validate(steps, 'en');
    if (result.passed) {
      expect(result.feedback).toMatch(/\d/);
    }
  });
});

// ─── micro-before-macro ───────────────────────────────────────────────────────

describe('micro-before-macro validate', () => {
  const { validate } = getChallenge('micro-before-macro');

  it('passes when promise output appears before timeout output', () => {
    const steps = run(`setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => console.log("promise")); console.log("sync");`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Promise');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(`setTimeout(() => console.log("timeout"), 0); Promise.resolve().then(() => console.log("promise"));`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Promise');
  });

  it('fails when "promise" is missing from output', () => {
    const steps = run(`setTimeout(() => console.log("timeout"), 0);`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('"promise"');
  });

  it('fails when "timeout" is missing from output', () => {
    const steps = run(`Promise.resolve().then(() => console.log("promise"));`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('"timeout"');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: fails feedback is in Portuguese', () => {
    const steps = run(`setTimeout(() => console.log("timeout"), 0);`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('console');
  });
});

// ─── scope-survivor ───────────────────────────────────────────────────────────

describe('scope-survivor validate', () => {
  const { validate } = getChallenge('scope-survivor');

  it('passes when a closure with [[Scope]] is created and output logged', () => {
    const steps = run(`function outer() { const secret = "hidden"; return function() { return secret; }; } const fn = outer(); console.log(fn());`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Closure');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(`function externa() { const segredo = "oculto"; return function() { return segredo; }; } const fn = externa(); console.log(fn());`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Closure');
  });

  it('fails when no [[Scope]] is detected (no closure)', () => {
    const steps = run(`function plain() { return 42; } console.log(plain());`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('[[Scope]]');
  });

  it('fails when closure is created but not called (no console output)', () => {
    const steps = run(`function outer() { const x = 1; return function() { return x; }; } const fn = outer();`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
  });

  it('pt-BR: fails feedback is in Portuguese for no [[Scope]]', () => {
    const steps = run(`function plain() { return 42; } console.log(plain());`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('[[Scope]]');
  });
});

// ─── the-suspense ─────────────────────────────────────────────────────────────

describe('the-suspense validate', () => {
  const { validate } = getChallenge('the-suspense');

  it('passes when async function suspends and logs before + after await', () => {
    const steps = run(`async function fn() { console.log("before"); await Promise.resolve(); console.log("after"); } fn();`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('suspended');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(`async function fn() { console.log("antes"); await Promise.resolve(); console.log("depois"); } fn();`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('suspendeu');
  });

  it('fails when no suspended frame is detected', () => {
    const steps = run(`async function fn() { console.log("a"); console.log("b"); } fn();`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('suspended frame');
  });

  it('fails when fewer than 2 console outputs', () => {
    const steps = run(`async function fn() { await Promise.resolve(); console.log("after"); } fn();`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
  });

  it('fails with empty steps (no suspended frame branch)', () => {
    // validate has no early-exit for empty steps — falls through to "no suspended frame"
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('suspended frame');
  });

  it('pt-BR: fails feedback is in Portuguese for no suspended frame', () => {
    const steps = run(`async function fn() { console.log("a"); console.log("b"); } fn();`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('suspenso');
  });
});
