import { run, lastStep, consoleOutput, getMemoryEntry } from './helpers';

describe('Interpreter — Advanced Features', () => {
  // ─── Destructuring ────────────────────────────────────

  describe('object destructuring', () => {
    it('destructures object properties', () => {
      const output = consoleOutput(`
        const obj = { name: "Joe", age: 23 };
        const { name, age } = obj;
        console.log(name, age);
      `);
      expect(output[0]).toContain('Joe');
    });

    it('each destructured variable appears in memory', () => {
      const step = lastStep(`
        const { a, b } = { a: 1, b: 2 };
      `);
      expect(getMemoryEntry(step, 'a')).toBeDefined();
      expect(getMemoryEntry(step, 'b')).toBeDefined();
    });

    it('destructuring with default values', () => {
      const output = consoleOutput(`
        const { x = 10, y = 20 } = { x: 5 };
        console.log(x, y);
      `);
      expect(output[0]).toContain('5');
      expect(output[0]).toContain('20');
    });

    it('destructuring with rename', () => {
      const output = consoleOutput(`
        const { name: firstName } = { name: "Joe" };
        console.log(firstName);
      `);
      expect(output).toContain('Joe');
    });

    it('nested destructuring', () => {
      const output = consoleOutput(`
        const { address: { city } } = { address: { city: "NYC" } };
        console.log(city);
      `);
      expect(output).toContain('NYC');
    });

    it('destructured entries have isDestructured flag', () => {
      const step = lastStep(`
        const { a, b } = { a: 1, b: 2 };
      `);
      const entryA = getMemoryEntry(step, 'a');
      const entryB = getMemoryEntry(step, 'b');
      expect(entryA?.isDestructured).toBe(true);
      expect(entryB?.isDestructured).toBe(true);
    });

    it('object rest element', () => {
      const output = consoleOutput(`
        const { a, ...rest } = { a: 1, b: 2, c: 3 };
        console.log(a);
        console.log(rest.b, rest.c);
      `);
      expect(output[0]).toContain('1');
      expect(output[1]).toContain('2');
      expect(output[1]).toContain('3');
    });
  });

  describe('array destructuring', () => {
    it('destructures array elements', () => {
      const output = consoleOutput(`
        const [a, b, c] = [1, 2, 3];
        console.log(a, b, c);
      `);
      expect(output[0]).toContain('1');
    });

    it('skips elements with holes', () => {
      const output = consoleOutput(`
        const [a, , c] = [1, 2, 3];
        console.log(a, c);
      `);
      expect(output[0]).toContain('1');
      expect(output[0]).toContain('3');
    });

    it('rest element collects remaining', () => {
      const output = consoleOutput(`
        const [first, ...rest] = [1, 2, 3, 4];
        console.log(first);
        console.log(rest.length);
      `);
      expect(output[0]).toContain('1');
      expect(output[1]).toContain('3');
    });

    it('array destructuring with default values', () => {
      const output = consoleOutput(`
        const [a, b = 10] = [5];
        console.log(a, b);
      `);
      expect(output[0]).toContain('5');
      expect(output[0]).toContain('10');
    });
  });

  describe('destructuring in function params', () => {
    it('object destructuring in parameters', () => {
      const output = consoleOutput(`
        function greet({ name }) {
          console.log("Hello " + name);
        }
        greet({ name: "World" });
      `);
      expect(output).toContain('Hello World');
    });

    it('array destructuring in parameters', () => {
      const output = consoleOutput(`
        function first([a]) { return a; }
        console.log(first([10, 20]));
      `);
      expect(output).toContain('10');
    });
  });

  // ─── Spread operator ─────────────────────────────────

  describe('spread operator', () => {
    it('spread in array literal', () => {
      const output = consoleOutput(`
        const a = [1, 2];
        const b = [...a, 3, 4];
        console.log(b.length);
      `);
      expect(output).toContain('4');
    });

    it('spread in object literal', () => {
      const output = consoleOutput(`
        const base = { x: 1 };
        const extended = { ...base, y: 2 };
        console.log(extended.x, extended.y);
      `);
      expect(output[0]).toContain('1');
    });

    it('spread in function call', () => {
      const output = consoleOutput(`
        function sum(a, b, c) { return a + b + c; }
        const nums = [1, 2, 3];
        console.log(sum(...nums));
      `);
      expect(output).toContain('6');
    });

    it('multiple spreads in array', () => {
      const output = consoleOutput(`
        const a = [1, 2];
        const b = [3, 4];
        const c = [...a, ...b];
        console.log(c.length);
      `);
      expect(output).toContain('4');
    });
  });

  // ─── Template literals ────────────────────────────────

  describe('template literals', () => {
    it('evaluates template literal with expressions', () => {
      const output = consoleOutput(`
        const name = "World";
        console.log(\`Hello \${name}\`);
      `);
      expect(output).toContain('Hello World');
    });

    it('template literal with arithmetic', () => {
      const output = consoleOutput(`
        console.log(\`Result: \${2 + 3}\`);
      `);
      expect(output).toContain('Result: 5');
    });

    it('template literal with multiple expressions', () => {
      const output = consoleOutput(`
        const a = 1;
        const b = 2;
        console.log(\`\${a} + \${b} = \${a + b}\`);
      `);
      expect(output).toContain('1 + 2 = 3');
    });
  });

  // ─── Modules (simulated) ──────────────────────────────

  describe('modules (simulated)', () => {
    it('export const declaration does not crash', () => {
      const steps = run('export const PI = 3.14;');
      expect(steps.length).toBeGreaterThan(0);
    });

    it('export function declaration does not crash', () => {
      const steps = run('export function add(a, b) { return a + b; }');
      expect(steps.length).toBeGreaterThan(0);
    });

    it('import declaration does not crash', () => {
      const steps = run('import { add } from "./math";');
      expect(steps.length).toBeGreaterThan(0);
    });

    it('import default does not crash', () => {
      const steps = run('import Calculator from "./calculator";');
      expect(steps.length).toBeGreaterThan(0);
    });

    it('export default expression does not crash', () => {
      const steps = run('export default 42;');
      expect(steps.length).toBeGreaterThan(0);
    });

    it('module scope uses Module Scope label', () => {
      const step = lastStep('export const x = 1;');
      const moduleBlock = step.memoryBlocks.find(
        (b) => b.label === 'Module Scope'
      );
      expect(moduleBlock).toBeDefined();
    });

    it('exported variable has isExported flag', () => {
      const step = lastStep('export const PI = 3.14;');
      const entry = getMemoryEntry(step, 'PI');
      expect(entry?.isExported).toBe(true);
    });

    it('import creates placeholder entry', () => {
      const step = lastStep('import { add } from "./math";');
      const entry = getMemoryEntry(step, 'add');
      expect(entry).toBeDefined();
      expect(entry?.displayValue).toBe('"[imported]"');
    });
  });

  // ─── Combined features ────────────────────────────────

  describe('combined features', () => {
    it('destructuring with spread in same statement', () => {
      const output = consoleOutput(`
        const arr = [1, 2, 3, 4, 5];
        const [first, second, ...rest] = arr;
        console.log(first, second, rest.length);
      `);
      expect(output[0]).toContain('1');
      expect(output[0]).toContain('2');
      expect(output[0]).toContain('3');
    });

    it('template literals with destructured values', () => {
      const output = consoleOutput(`
        const { name, age } = { name: "Alice", age: 30 };
        console.log(\`\${name} is \${age} years old\`);
      `);
      expect(output).toContain('Alice is 30 years old');
    });

    it('spread object with nested properties', () => {
      const output = consoleOutput(`
        const base = { a: 1, b: { c: 2 } };
        const extended = { ...base, d: 3 };
        console.log(extended.a, extended.d);
      `);
      expect(output[0]).toContain('1');
      expect(output[0]).toContain('3');
    });
  });
});
