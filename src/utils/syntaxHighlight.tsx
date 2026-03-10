import { THEME } from "@/constants/theme";

const JS_KEYWORDS = new Set([
  "async", "await", "function", "return", "const", "let", "var", "new",
  "this", "class", "extends", "super", "if", "else", "for", "while",
  "of", "in", "typeof", "instanceof", "true", "false", "null", "undefined",
  "try", "catch", "finally", "throw", "yield", "import", "export", "default",
  "switch", "case", "break", "continue", "delete", "void",
]);

type Token = {
  type: "keyword" | "string" | "number" | "comment" | "plain";
  text: string;
};

function tokenizeJS(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    // Single-line comment
    if (src[i] === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      const text = end === -1 ? src.slice(i) : src.slice(i, end);
      tokens.push({ type: "comment", text });
      i += text.length;
      continue;
    }
    // Multi-line comment
    if (src[i] === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const text = end === -1 ? src.slice(i) : src.slice(i, end + 2);
      tokens.push({ type: "comment", text });
      i += text.length;
      continue;
    }
    // Template literal
    if (src[i] === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== "`") {
        if (src[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", text: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // String
    if (src[i] === '"' || src[i] === "'") {
      const q = src[i];
      let j = i + 1;
      while (j < src.length && src[j] !== q) {
        if (src[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", text: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // Number
    if (/\d/.test(src[i]) || (src[i] === "." && /\d/.test(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && /[\d._eExXa-fA-Fn]/.test(src[j])) j++;
      tokens.push({ type: "number", text: src.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier / keyword
    if (/[a-zA-Z_$]/.test(src[i])) {
      let j = i;
      while (j < src.length && /[\w$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      tokens.push({ type: JS_KEYWORDS.has(word) ? "keyword" : "plain", text: word });
      i = j;
      continue;
    }
    // Plain character
    tokens.push({ type: "plain", text: src[i] });
    i++;
  }

  return tokens;
}

export function SyntaxHighlightedSource({ src }: { src: string }) {
  const tokens = tokenizeJS(src);
  return (
    <pre
      style={{
        margin: 0,
        fontFamily: THEME.fonts.code,
        fontSize: 10,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        lineHeight: 1.6,
      }}
    >
      {tokens.map((tok, idx) => {
        let color: string;
        switch (tok.type) {
          case "keyword": color = THEME.colors.syntax.keyword; break;
          case "string":  color = THEME.colors.syntax.string;  break;
          case "number":  color = THEME.colors.syntax.number;  break;
          case "comment": color = THEME.colors.text.muted;     break;
          default:        color = THEME.colors.text.primary;   break;
        }
        return (
          <span key={idx} style={{ color }}>
            {tok.text}
          </span>
        );
      })}
    </pre>
  );
}
