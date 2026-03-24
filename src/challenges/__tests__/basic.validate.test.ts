import { run } from '@/engine/__tests__/helpers';
import { basicChallenges } from '../basic';

const getChallenge = (id: string) => {
  const c = basicChallenges.find((c) => c.id === id);
  if (!c) throw new Error(`Challenge "${id}" not found`);
  return c;
};

// ─── stack-3-deep ─────────────────────────────────────────────────────────────

describe('stack-3-deep validate', () => {
  const { validate } = getChallenge('stack-3-deep');

  it('passes with 3 nested function calls', () => {
    const steps = run(`function c() { return 1; } function b() { return c(); } function a() { return b(); } a();`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('3');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(`function c() { return 1; } function b() { return c(); } function a() { return b(); } a();`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('3');
  });

  it('passes when 4+ frames deep (still >= 3)', () => {
    const steps = run(`function d() { return 1; } function c() { return d(); } function b() { return c(); } function a() { return b(); } a();`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('4');
  });

  it('fails with only 1 level of nesting', () => {
    const steps = run(`function a() { return 1; } a();`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('1 frame(s)');
  });

  it('fails with 2 levels of nesting', () => {
    const steps = run(`function b() { return 1; } function a() { return b(); } a();`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('2 frame(s)');
  });

  it('fails with no function calls (only global frame)', () => {
    const steps = run(`const x = 1;`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('frame(s)');
  });

  it('pt-BR: feedback mentions frames in Portuguese', () => {
    const steps = run(`function a() { return 1; } a();`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('frame(s)');
  });

  it('failed result includes details hint', () => {
    const steps = run(`function a() { return 1; } a();`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.details).toBeDefined();
  });
});

// ─── fill-the-memory ─────────────────────────────────────────────────────────

describe('fill-the-memory validate', () => {
  const { validate } = getChallenge('fill-the-memory');

  it('passes with a number, string, and object', () => {
    const steps = run(`const age = 25; const name = "Joe"; const person = { name: "Joe", age: 25 };`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Heap');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(`const idade = 25; const nome = "Joe"; const pessoa = { nome: "Joe", idade: 25 };`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('Heap');
  });

  it('fails when object is missing', () => {
    const steps = run(`const age = 25; const name = "Joe";`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('object');
  });

  it('fails when number is missing', () => {
    const steps = run(`const name = "Joe"; const person = { x: 1 };`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('number');
  });

  it('fails when string is missing', () => {
    const steps = run(`const age = 25; const person = { x: 1 };`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('string');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: missing items feedback is in Portuguese', () => {
    const steps = run(`const age = 25; const name = "Joe";`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('objeto');
  });
});

// ─── say-hello-three-times ───────────────────────────────────────────────────

describe('say-hello-three-times validate', () => {
  const { validate } = getChallenge('say-hello-three-times');

  it('passes with exactly 3 Hello logs', () => {
    const steps = run(`for (let i = 0; i < 3; i++) { console.log("Hello"); }`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('3');
  });

  it('passes with pt-BR locale using Olá', () => {
    const steps = run(`for (let i = 0; i < 3; i++) { console.log("Olá"); }`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('3');
  });

  it('fails when logged only 2 times', () => {
    const steps = run(`console.log("Hello"); console.log("Hello");`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('2');
  });

  it('fails when logged more than 3 times', () => {
    const steps = run(`for (let i = 0; i < 5; i++) { console.log("Hello"); }`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('5');
    expect(result.feedback).toContain('Too many');
  });

  it('fails when logged 0 times', () => {
    const steps = run(`const x = 1;`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('0');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: too many logs feedback is in Portuguese', () => {
    const steps = run(`for (let i = 0; i < 5; i++) { console.log("Olá"); }`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Demais');
  });

  it('pt-BR: too few logs feedback is in Portuguese', () => {
    const steps = run(`console.log("Olá");`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Apenas');
  });
});

// ─── the-f-symbol ─────────────────────────────────────────────────────────────

describe('the-f-symbol validate', () => {
  const { validate } = getChallenge('the-f-symbol');

  it('passes with a function declaration', () => {
    const steps = run(`function greet(name) { return "Hello " + name; }`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('ⓕ');
  });

  it('passes with a function expression assigned to a variable', () => {
    const steps = run(`const greet = function(name) { return "Hello " + name; };`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
  });

  it('passes with an arrow function', () => {
    const steps = run(`const add = (a, b) => a + b;`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
  });

  it('passes with pt-BR locale', () => {
    const steps = run(`function cumprimentar(nome) { return "Olá " + nome; }`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('ⓕ');
  });

  it('fails when no function is declared', () => {
    const steps = run(`const x = 42;`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('ⓕ');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: no function feedback is in Portuguese', () => {
    const steps = run(`const x = 42;`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('ⓕ');
  });
});

// ─── same-color-same-object ───────────────────────────────────────────────────

describe('same-color-same-object validate', () => {
  const { validate } = getChallenge('same-color-same-object');

  it('passes when two variables reference the same object', () => {
    const steps = run(`const a = { x: 1 }; const b = a;`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('same');
  });

  it('passes with pt-BR locale', () => {
    const steps = run(`const a = { x: 1 }; const b = a;`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(true);
    expect(result.feedback).toContain('mesmo');
  });

  it('passes with 3 variables all pointing to the same object', () => {
    const steps = run(`const a = { x: 1 }; const b = a; const c = a;`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(true);
  });

  it('fails when only one object variable exists', () => {
    const steps = run(`const a = { x: 1 };`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Found 1');
  });

  it('fails when two variables point to different objects', () => {
    const steps = run(`const a = { x: 1 }; const b = { x: 1 };`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('different objects');
  });

  it('fails with no object variables', () => {
    const steps = run(`const x = 1; const y = "hello";`);
    const result = validate(steps, 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('Found 0');
  });

  it('fails with empty steps', () => {
    const result = validate([], 'en');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('No execution steps');
  });

  it('pt-BR: different objects feedback is in Portuguese', () => {
    const steps = run(`const a = { x: 1 }; const b = { x: 1 };`);
    const result = validate(steps, 'pt-BR');
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain('diferentes');
  });
});
