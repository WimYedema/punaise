import type { SymbolIdentity, SymbolKind } from "./pin.js";

export interface Position {
  line: number;
  character: number;
}

/** A document symbol as a language server reports it, without any editor types. */
export interface SymbolNode {
  name: string;
  kind: SymbolKind;
  range: { start: Position; end: Position };
  children: SymbolNode[];
}

const CALLABLE_KINDS: readonly SymbolKind[] = ["function", "method", "constructor"];
const VALUE_KINDS: readonly SymbolKind[] = ["variable", "constant"];

/**
 * The symbol to pin for a cursor position: the innermost symbol containing it, skipping
 * parameters and locals (variables and constants directly inside a function or method).
 * See docs/spikes/symbol-identity.md.
 */
export function symbolAtPosition(symbols: readonly SymbolNode[], position: Position): SymbolIdentity | undefined {
  let found: SymbolIdentity | undefined;
  const chain: SymbolNode[] = [];
  let level = symbols;
  for (;;) {
    const node = smallestContaining(level, position);
    if (!node) return found;
    const parent = chain[chain.length - 1];
    if (isPinnable(node, parent)) {
      found = { name: node.name, kind: node.kind, container: chain.map((n) => n.name) };
    }
    chain.push(node);
    level = node.children;
  }
}

function isPinnable(node: SymbolNode, parent: SymbolNode | undefined): boolean {
  return !(parent && CALLABLE_KINDS.includes(parent.kind) && VALUE_KINDS.includes(node.kind));
}

function smallestContaining(nodes: readonly SymbolNode[], position: Position): SymbolNode | undefined {
  let best: SymbolNode | undefined;
  for (const node of nodes) {
    if (contains(node.range, position) && (!best || isSmaller(node.range, best.range))) best = node;
  }
  return best;
}

function contains(range: SymbolNode["range"], p: Position): boolean {
  return compare(range.start, p) <= 0 && compare(p, range.end) <= 0;
}

function isSmaller(a: SymbolNode["range"], b: SymbolNode["range"]): boolean {
  return compare(a.start, b.start) >= 0 && compare(a.end, b.end) <= 0;
}

function compare(a: Position, b: Position): number {
  return a.line - b.line || a.character - b.character;
}
