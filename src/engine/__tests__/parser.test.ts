import { parseCode } from '@/engine/parser';

describe('Parser', () => {
  describe('valid code', () => {
    it('parses variable declarations', () => {
      const { ast } = parseCode('const x = 10;');
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Program');
    });

    it('parses function declarations', () => {
      const { ast } = parseCode('function foo() { return 1; }');
      expect(ast).toBeDefined();
    });

    it('parses arrow functions', () => {
      const { ast } = parseCode('const fn = (a, b) => a + b;');
      expect(ast).toBeDefined();
    });

    it('parses object literals', () => {
      const { ast } = parseCode('const obj = { name: "Joe", age: 23 };');
      expect(ast).toBeDefined();
    });

    it('parses array literals', () => {
      const { ast } = parseCode('const arr = [1, 2, 3];');
      expect(ast).toBeDefined();
    });

    it('parses if/else statements', () => {
      const { ast } = parseCode('if (true) { 1; } else { 2; }');
      expect(ast).toBeDefined();
    });

    it('parses for loops', () => {
      const { ast } = parseCode('for (let i = 0; i < 10; i++) { i; }');
      expect(ast).toBeDefined();
    });

    it('parses while loops', () => {
      const { ast } = parseCode('while (true) { break; }');
      expect(ast).toBeDefined();
    });

    it('parses setTimeout calls', () => {
      const { ast } = parseCode('setTimeout(() => {}, 1000);');
      expect(ast).toBeDefined();
    });

    it('parses console.log calls', () => {
      const { ast } = parseCode('console.log("hello");');
      expect(ast).toBeDefined();
    });

    it('parses template literals', () => {
      const { ast } = parseCode('const msg = `hello ${name}`;');
      expect(ast).toBeDefined();
    });

    it('parses multiline code', () => {
      const code = `
        const x = 1;
        const y = 2;
        function add(a, b) {
          return a + b;
        }
        const result = add(x, y);
      `;
      const { ast } = parseCode(code);
      expect(ast).toBeDefined();
    });

    it('detects module source type', () => {
      const { sourceType } = parseCode("import { x } from './mod';");
      expect(sourceType).toBe('module');
    });

    it('detects script source type', () => {
      const { sourceType } = parseCode('const x = 1;');
      expect(sourceType).toBe('script');
    });
  });

  describe('invalid code', () => {
    it('throws on syntax errors with line info', () => {
      expect(() => parseCode('const = ;')).toThrow();
    });

    it('throws on unclosed brackets', () => {
      expect(() => parseCode('function foo() {')).toThrow();
    });

    it('throws on unclosed strings', () => {
      expect(() => parseCode('const x = "hello')).toThrow();
    });

    it('throws on unexpected tokens', () => {
      expect(() => parseCode('const 123 = "bad";')).toThrow();
    });
  });
});
