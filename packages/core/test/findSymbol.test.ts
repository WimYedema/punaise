import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { findSymbol, signatureLineCount, type SymbolKind, type SymbolNode } from "../src/index.js";

function node(name: string, kind: SymbolKind, lines: [number, number], children: SymbolNode[] = []): SymbolNode {
  return { name, kind, range: { start: { line: lines[0], character: 0 }, end: { line: lines[1], character: 1 } }, children };
}

const symbols = [
  node("parse", "function", [15, 15]),
  node("parse", "function", [16, 16]),
  node("parse", "function", [17, 19]),
  node("SimulationService", "class", [31, 63], [
    node("run", "method", [48, 54], [node("localFunction", "function", [50, 52])]),
    node("size", "property", [37, 39]),
  ]),
  node("OtherService", "class", [65, 68], [node("run", "method", [67, 67])]),
];

describe("findSymbol", () => {
  test("matches name and container chain", () => {
    assert.equal(findSymbol(symbols, { name: "run", kind: "method", container: ["OtherService"] })?.range.start.line, 67);
    assert.equal(findSymbol(symbols, { name: "localFunction", kind: "function", container: ["SimulationService", "run"] })?.range.start.line, 50);
  });

  test("resolves overloads to the implementation, the largest range", () => {
    assert.equal(findSymbol(symbols, { name: "parse", kind: "function", container: [] })?.range.start.line, 17);
  });

  test("still resolves when only the kind changed", () => {
    assert.equal(findSymbol(symbols, { name: "parse", kind: "variable", container: [] })?.range.start.line, 17);
  });

  test("prefers a matching kind over a larger range", () => {
    const both = [node("x", "variable", [0, 10]), node("x", "function", [11, 12])];
    assert.equal(findSymbol(both, { name: "x", kind: "function", container: [] })?.kind, "function");
  });

  test("returns undefined when the name or container does not match", () => {
    assert.equal(findSymbol(symbols, { name: "run", kind: "method", container: [] }), undefined);
    assert.equal(findSymbol(symbols, { name: "run", kind: "method", container: ["Missing"] }), undefined);
    assert.equal(findSymbol(symbols, { name: "renamed", kind: "method", container: ["SimulationService"] }), undefined);
  });
});

describe("signatureLineCount", () => {
  test("stops at the line that opens a body", () => {
    assert.equal(signatureLineCount(["export class SimulationService {", "  x = 1;", "}"]), 1);
    assert.equal(signatureLineCount(["def run(self, factor: float = 1.5) -> float:", "    return 1"]), 1);
  });

  test("includes decorators and multi-line parameter lists", () => {
    assert.equal(signatureLineCount(["@dataclass", "class Simulation:", "    id: str"]), 2);
    assert.equal(signatureLineCount(["run(", "  id: string,", "  attempts = 1,", "): number {", "  return 1;", "}"]), 4);
  });

  test("handles single-line declarations", () => {
    assert.equal(signatureLineCount(["export const MAX_RETRIES = 3;"]), 1);
    assert.equal(signatureLineCount(["MAX_RETRIES = 3"]), 1);
    assert.equal(signatureLineCount(["constructor(private readonly store: Store) {}"]), 1);
    assert.equal(signatureLineCount(["export const arrow = (s: string): string => s.trim();"]), 1);
  });

  test("caps the signature length", () => {
    assert.equal(signatureLineCount(Array.from({ length: 20 }, () => "a,"), 8), 8);
  });
});
