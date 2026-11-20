/** Line endings that close a declaration's signature: a body opens, or the statement ends. */
const SIGNATURE_END = /(\{|\{\}|:|;|=>|=>\s*\{)\s*$/;

/**
 * How many of a symbol's source lines make up its signature: decorators and declaration lines up to
 * and including the one that opens the body (`{` or `:`) or ends the statement (`;`). A heuristic
 * that works for TypeScript and Python without a language server; at most `maxLines`.
 */
export function signatureLineCount(lines: readonly string[], maxLines = 8): number {
  const limit = Math.min(lines.length, maxLines);
  for (let i = 0; i < limit; i++) {
    if (SIGNATURE_END.test(lines[i] ?? "")) return i + 1;
  }
  return Math.max(limit, 1);
}
