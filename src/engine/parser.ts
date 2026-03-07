import * as acorn from "acorn";

export interface ParseError {
  message: string;
  line: number;
  column: number;
}

/**
 * Parse JavaScript source code into an AST using acorn.
 * @param code The JavaScript source code to parse
 * @returns The parsed AST (ESTree format)
 * @throws ParseError with user-friendly message if syntax error occurs
 */
export function parseCode(code: string): acorn.Node {
  try {
    return acorn.parse(code, {
      ecmaVersion: "latest",
      sourceType: "script",
      locations: true, // we need line/column info
    });
  } catch (error) {
    if (error instanceof SyntaxError && "loc" in error) {
      const acornError = error as SyntaxError & {
        loc: { line: number; column: number };
      };
      const parseError: ParseError = {
        message: `Syntax Error: ${acornError.message}`,
        line: acornError.loc.line,
        column: acornError.loc.column,
      };
      throw parseError;
    }
    // Re-throw unknown errors
    throw error;
  }
}
