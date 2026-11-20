/** Symbol kinds as language servers report them, in lowerCamelCase (LSP `SymbolKind` names). */
export type SymbolKind =
  | "file" | "module" | "namespace" | "package" | "class" | "method" | "property" | "field"
  | "constructor" | "enum" | "interface" | "function" | "variable" | "constant" | "string"
  | "number" | "boolean" | "array" | "object" | "key" | "null" | "enumMember" | "struct"
  | "event" | "operator" | "typeParameter";

/** How a symbol is found again: by name and enclosing symbols, never by position. */
export interface SymbolIdentity {
  /** The name exactly as the language server reports it, e.g. `run` or `(get) size`. */
  name: string;
  kind: SymbolKind;
  /** Enclosing symbol names, outermost first. Empty for a top-level symbol. */
  container: string[];
  /** Optional hash of the symbol's body, written by the extension. Not part of identity. */
  fingerprint?: string;
}

/** A pin on a symbol. Field names follow the theme format in docs/design.md. */
export interface SymbolPin {
  /** Stable within a set of pins, so diffs stay readable when pins are reordered. */
  id: string;
  type: "symbol";
  /** Workspace-relative path hint, with forward slashes. */
  path: string;
  symbol: SymbolIdentity;
}

/** What is needed to pin a symbol; the store assigns the id. */
export interface SymbolTarget {
  path: string;
  symbol: SymbolIdentity;
}

/**
 * True when two targets point at the same symbol: same path, name, container chain and kind.
 * Kind counts here because it is what separates otherwise identical symbols (decision D-6).
 */
export function isSameSymbol(a: SymbolTarget, b: SymbolTarget): boolean {
  return (
    a.path === b.path &&
    a.symbol.name === b.symbol.name &&
    a.symbol.kind === b.symbol.kind &&
    a.symbol.container.length === b.symbol.container.length &&
    a.symbol.container.every((name, i) => name === b.symbol.container[i])
  );
}
