import * as acorn from "acorn";

export interface ParseError {
  message: string;
  line: number;
  column: number;
}

export type SourceType = "script" | "module";

/**
 * Detect if code contains import/export statements (module syntax).
 */
export function detectSourceType(code: string): SourceType {
  // Simple heuristic: check for import/export keywords at start of lines
  const modulePatterns = [
    /^\s*import\s+/m,
    /^\s*export\s+/m,
    /^\s*import\s*{/m,
    /^\s*export\s*{/m,
    /^\s*export\s+default\s+/m,
  ];
  return modulePatterns.some((p) => p.test(code)) ? "module" : "script";
}

/**
 * Parse JavaScript source code into an AST using acorn.
 * @param code The JavaScript source code to parse
 * @param sourceType Optional source type ('script' or 'module'). Auto-detected if not provided.
 * @returns The parsed AST (ESTree format) and the detected/used source type
 * @throws ParseError with user-friendly message if syntax error occurs
 */
export function parseCode(
  code: string,
  sourceType?: SourceType,
): { ast: acorn.Node; sourceType: SourceType } {
  const detectedType = sourceType ?? detectSourceType(code);

  try {
    const ast = acorn.parse(code, {
      ecmaVersion: "latest",
      sourceType: detectedType,
      locations: true, // we need line/column info
    });
    return { ast, sourceType: detectedType };
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
