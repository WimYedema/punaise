import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { symbolAtPosition, symbolChainAtPosition, type SymbolKind, type SymbolNode } from "../src/index.js";

function node(name: string, kind: SymbolKind, from: [number, number], to: [number, number], children: SymbolNode[] = []): SymbolNode {
  return { name, kind, range: { start: { line: from[0], character: from[1] }, end: { line: to[0], character: to[1] } }, children };
}

const at = (line: number, character = 4) => ({ line, character });

// Shapes taken from the PUN-003 fixtures.
const typescript = [
  node("MAX_RETRIES", "variable", [2, 0], [2, 29]),
  node("topLevel", "function", [4, 0], [10, 1], [
    node("nestedHelper", "function", [5, 2], [8, 3], [node("innerArrow", "variable", [6, 10], [6, 44])]),
  ]),
  node("SimulationService", "class", [31, 0], [63, 1], [
    node("run", "method", [46, 2], [46, 22]),
    node("run", "method", [47, 2], [47, 44]),
    node("run", "method", [48, 2], [54, 3], [
      node("localHelper", "variable", [49, 10], [49, 36]),
      node("localFunction", "function", [50, 4], [52, 5]),
    ]),
  ]),
  node("handlers", "variable", [79, 0], [84, 2], [node("onStart", "method", [80, 2], [82, 3])]),
];

const python = [
  node("Simulation", "class", [41, 0], [81, 0], [
    node("id", "variable", [45, 4], [45, 11]),
    node("run", "method", [54, 4], [58, 26], [
      node("factor", "variable", [54, 18], [54, 24]),
      node("local_step", "function", [55, 8], [56, 25]),
    ]),
  ]),
];

describe("symbolAtPosition", () => {
  test("returns the innermost symbol with its container chain", () => {
    assert.deepEqual(symbolAtPosition(typescript, at(51)), { name: "localFunction", kind: "function", container: ["SimulationService", "run"] });
    assert.deepEqual(symbolAtPosition(typescript, at(53)), { name: "run", kind: "method", container: ["SimulationService"] });
    assert.deepEqual(symbolAtPosition(typescript, at(81)), { name: "onStart", kind: "method", container: ["handlers"] });
  });

  test("returns top-level symbols with an empty container", () => {
    assert.deepEqual(symbolAtPosition(typescript, at(2)), { name: "MAX_RETRIES", kind: "variable", container: [] });
  });

  test("skips locals inside functions in favour of the function", () => {
    assert.deepEqual(symbolAtPosition(typescript, at(6, 20)), { name: "nestedHelper", kind: "function", container: ["topLevel"] });
    assert.deepEqual(symbolAtPosition(typescript, at(49, 20)), { name: "run", kind: "method", container: ["SimulationService"] });
  });

  test("skips parameters in favour of the function", () => {
    assert.deepEqual(symbolAtPosition(python, at(54, 20)), { name: "run", kind: "method", container: ["Simulation"] });
  });

  test("keeps variables that are class members", () => {
    assert.deepEqual(symbolAtPosition(python, at(45, 6)), { name: "id", kind: "variable", container: ["Simulation"] });
  });

  test("an overload signature has the same identity as its implementation", () => {
    assert.deepEqual(symbolAtPosition(typescript, at(46)), symbolAtPosition(typescript, at(53)));
  });

  test("symbolChainAtPosition lists every pinnable enclosing symbol, outermost first", () => {
    assert.deepEqual(symbolChainAtPosition(typescript, at(51)).map((s) => [s.name, s.container]), [
      ["SimulationService", []],
      ["run", ["SimulationService"]],
      ["localFunction", ["SimulationService", "run"]],
    ]);
    assert.deepEqual(symbolChainAtPosition(python, at(54, 20)).map((s) => s.name), ["Simulation", "run"], "parameter skipped");
    assert.deepEqual(symbolChainAtPosition(typescript, at(20)), []);
  });

  test("returns undefined outside any symbol", () => {
    assert.equal(symbolAtPosition(typescript, at(20)), undefined);
    assert.equal(symbolAtPosition([], at(0)), undefined);
  });

  test("range ends are inclusive", () => {
    assert.equal(symbolAtPosition(typescript, { line: 10, character: 1 })?.name, "topLevel");
    assert.equal(symbolAtPosition(typescript, { line: 10, character: 2 }), undefined);
  });

  test("prefers the smaller of two overlapping siblings", () => {
    const overlapping = [node("outer", "function", [0, 0], [10, 0]), node("inner", "function", [2, 0], [4, 0])];
    assert.equal(symbolAtPosition(overlapping, at(3))?.name, "inner");
  });
});
