import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PinStore, baseId, isSameSymbol, type SymbolTarget } from "../src/index.js";

function target(name: string, container: string[] = [], overrides: Partial<SymbolTarget["symbol"]> & { path?: string } = {}): SymbolTarget {
  const { path = "src/services/simulation.ts", ...symbol } = overrides;
  return { path, symbol: { name, kind: "method", container, ...symbol } };
}

describe("PinStore", () => {
  test("starts empty", () => {
    assert.deepEqual(new PinStore().list(), []);
  });

  test("keeps pins in the order they were added", () => {
    const store = new PinStore();
    store.add(target("run", ["SimulationService"]));
    store.add(target("simulate", [], { kind: "function", path: "src/api/simulation.py" }));
    store.add(target("SimulationService", [], { kind: "class" }));
    assert.deepEqual(store.list().map((pin) => pin.symbol.name), ["run", "simulate", "SimulationService"]);
  });

  test("builds pins with the design's field names", () => {
    const { pin, added } = new PinStore().add(target("run", ["SimulationService"], { fingerprint: "9c1e4b2a" }));
    assert.equal(added, true);
    assert.deepEqual(pin, {
      id: "simulation-service-run",
      type: "symbol",
      path: "src/services/simulation.ts",
      symbol: { name: "run", kind: "method", container: ["SimulationService"], fingerprint: "9c1e4b2a" },
    });
  });

  test("adding the same symbol twice returns the existing pin", () => {
    const store = new PinStore();
    const first = store.add(target("run", ["SimulationService"]));
    const second = store.add(target("run", ["SimulationService"], { fingerprint: "different" }));
    assert.equal(second.added, false);
    assert.equal(second.pin, first.pin);
    assert.equal(store.list().length, 1);
  });

  test("a duplicate keeps its original position", () => {
    const store = new PinStore();
    store.add(target("a"));
    store.add(target("b"));
    store.add(target("a"));
    assert.deepEqual(store.list().map((pin) => pin.symbol.name), ["a", "b"]);
  });

  test("same name in a different container, path or kind is a different pin", () => {
    const store = new PinStore();
    store.add(target("run", ["SimulationService"]));
    store.add(target("run", ["OtherService"]));
    store.add(target("run", ["SimulationService"], { path: "src/other.ts" }));
    store.add(target("run", ["SimulationService"], { kind: "property" }));
    store.add(target("run", ["Outer", "SimulationService"]));
    assert.equal(store.list().length, 5);
  });

  test("gives colliding ids a numeric suffix", () => {
    const store = new PinStore();
    const ids = [
      store.add(target("run", ["SimulationService"])).pin.id,
      store.add(target("run", ["SimulationService"], { path: "src/other.ts" })).pin.id,
      store.add(target("run", ["SimulationService"], { kind: "property" })).pin.id,
    ];
    assert.deepEqual(ids, ["simulation-service-run", "simulation-service-run-2", "simulation-service-run-3"]);
  });

  test("removes a pin by id and keeps the rest in order", () => {
    const store = new PinStore();
    store.add(target("a"));
    const b = store.add(target("b")).pin;
    store.add(target("c"));
    assert.equal(store.remove(b.id), true);
    assert.deepEqual(store.list().map((pin) => pin.symbol.name), ["a", "c"]);
  });

  test("removing an unknown id returns false", () => {
    const store = new PinStore();
    store.add(target("a"));
    assert.equal(store.remove("nope"), false);
    assert.equal(store.list().length, 1);
  });

  test("a removed symbol can be pinned again, at the end", () => {
    const store = new PinStore();
    const a = store.add(target("a")).pin;
    store.add(target("b"));
    store.remove(a.id);
    assert.equal(store.add(target("a")).added, true);
    assert.deepEqual(store.list().map((pin) => pin.symbol.name), ["b", "a"]);
  });

  test("list returns a copy, and pins do not share the caller's container array", () => {
    const store = new PinStore();
    const t = target("run", ["SimulationService"]);
    store.add(t);
    t.symbol.container.push("Mutated");
    (store.list() as unknown[]).length = 0;
    assert.deepEqual(store.list()[0]?.symbol.container, ["SimulationService"]);
  });
});

describe("baseId", () => {
  test("kebab-cases the container chain and name", () => {
    assert.equal(baseId(target("run", ["SimulationService"])), "simulation-service-run");
    assert.equal(baseId(target("run_async", ["Simulation", "Config"])), "simulation-config-run-async");
  });

  test("handles server-specific names", () => {
    assert.equal(baseId(target("(get) size", ["SimulationService"])), "simulation-service-get-size");
    assert.equal(baseId(target('describe("simulation") callback')), "describe-simulation-callback");
  });

  test("falls back when a name has no letters or digits", () => {
    assert.equal(baseId(target("<>")), "pin");
  });
});

describe("isSameSymbol", () => {
  test("ignores the fingerprint", () => {
    assert.equal(isSameSymbol(target("a", [], { fingerprint: "1" }), target("a", [], { fingerprint: "2" })), true);
  });

  test("compares container chains element by element", () => {
    assert.equal(isSameSymbol(target("a", ["X", "Y"]), target("a", ["X", "Y"])), true);
    assert.equal(isSameSymbol(target("a", ["X", "Y"]), target("a", ["Y", "X"])), false);
    assert.equal(isSameSymbol(target("a", ["X"]), target("a", ["X", "Y"])), false);
  });
});
