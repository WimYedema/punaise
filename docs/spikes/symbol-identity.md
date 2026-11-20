# Spike: symbol container chains from language servers

PUN-003 · November 2026 · VS Code 1.147 test host · TypeScript (built-in) · Pylance 2026.4.1 with Python extension 2026.10.0

## Question

Does `vscode.executeDocumentSymbolProvider` return enough structure to build the symbol identity in [design.md](../design.md#example-theme): `name`, `kind` and the `container` chain of enclosing symbols?

## Answer

Yes, for both servers. Both return a hierarchical `DocumentSymbol` tree, so the container chain is the path from the root to the symbol, and names are stable plain strings. The model holds, but it needs three **resolution rules** (no schema change):

1. **Duplicates are normal.** TypeScript returns every overload signature as its own symbol with the same name, kind and container. Resolution must pick one deterministically (the implementation), not report "ambiguous".
2. **`kind` depends on the language server,** not on the concept: an arrow function in a `const` is a `variable`, a Python `@property` is a `method`, an upper-case Python module variable is a `constant`. Kind is reliable for re-finding a symbol in the same language, but should not be the deciding factor on its own (see decision D-6 in the backlog).
3. **Not every symbol is pinnable.** Pylance lists parameters and locals as `variable` children of functions, so "smallest symbol containing the cursor" lands on a parameter unless those are filtered out.

## Method

Fixtures: [test-fixtures/symbols/sample.ts](../../test-fixtures/symbols/sample.ts) and [test-fixtures/symbols/sample.py](../../test-fixtures/symbols/sample.py). They cover classes, nested and local functions, overloads, accessors, namespaces, object-literal methods, callbacks, anonymous default exports (TypeScript); and decorators, `@property` getter and setter pairs, `@overload`, `@staticmethod`/`@classmethod`, nested classes and `if TYPE_CHECKING` branches (Python).

A throwaway test runner opened the fixtures folder in a VS Code test host, called `vscode.executeDocumentSymbolProvider` for each file every 500 ms until it returned symbols (90 s limit), and dumped the tree. It ran twice: with built-in extensions only, and with Pylance and the Python extension installed. The dump function is in the appendix.

## What each server returns

Both return `DocumentSymbol[]` (hierarchical), never the flat `SymbolInformation[]`. `detail` was empty for every symbol. Ranges cover the whole declaration; `selectionRange` is the name.

### TypeScript (built-in language service)

```text
MAX_RETRIES                     variable
topLevel                        function
  nestedHelper                  function
    innerArrow                  variable      const arrow function
arrowFunction                   variable      const arrow function
parse                           function      overload signature, line 16
parse                           function      overload signature, line 17
parse                           function      implementation, lines 18-20
Store                           interface
  get                           method
  size                          property
Mode                            enum
  Fast, Safe                    variable      enum members
SimulationService               class
  constructor                   constructor
  cache, instances              property
  create                        method        static: no distinction
  run                           method        overload signature, line 47
  run                           method        overload signature, line 48
  run                           method        implementation, lines 49-55
    localFunction               function
    localHelper                 variable
  runAsync                      method        async: no distinction
  (get) size                    property      accessor kind is in the name
  (set) size                    property
  store                         property      constructor parameter property
OtherService                    class
  run                           method
Utils                           module        namespace
  format                        function
  Inner                         module
    deep                        variable
handlers                        variable
  onStart, onStop               method        object literal members
default                         function      anonymous default export
describe                        function      `declare function`
describe("simulation") callback function      synthesized name
  setupInsideCallback           function
```

- **Overloads** appear once per signature, all with the same name, kind and container. The implementation is the last one and has the largest range.
- **Accessors** carry the accessor kind in the name: `(get) size` and `(set) size`.
- **Callbacks** get a synthesized name from the call, such as `describe("simulation") callback`, and act as containers for what is inside them. The name changes if the call's first argument changes.
- **Arrow functions** in variables are `variable`, but object-literal arrows are `method`.
- **Enum members** are reported as `variable`.
- **Order:** top-level symbols come in source order, but class members do not (constructor first, then alphabetical). Sort by range to show source order.
- Function-like locals (`localFunction`, the `localHelper` arrow) appear. The fixture has no plain local such as `const x = 1`, so whether those appear was not tested.

### Python (Pylance)

```text
MAX_RETRIES                     constant      upper-case name
logged                          function
  func                          variable      parameter
  wrapper                       function      decorated with @functools.wraps
    args, kwargs                variable      parameters
top_level                       function
  a                             variable      parameter
  nested_helper                 function
    x                           variable      parameter
    deeply_nested               function
  inner_lambda                  variable
decorated                       function      range starts at the decorator line
  a                             variable
parse                           function      implementation only; @overload stubs omitted
  value                         variable
Simulation                      class         range starts at @dataclass
  id, retries                   variable      dataclass fields
  Config                        class         nested class
    timeout                     variable
    describe                    method
  run                           method
    factor                      variable      parameter
    local_step                  function
  run_async                     method
  label                         method        @property: only the setter is listed
    value                       variable
  create                        method        @staticmethod: no distinction
    id                          variable
  from_config                   method        @classmethod: no distinction
  decorated_method              method
OtherService                    class
  run                           method
conditional                     function      only the TYPE_CHECKING branch is listed
```

- **Parameters and locals** are listed as `variable` children (but never `self` or `cls`).
- **Overloads:** only the implementation is listed.
- **`@property` getter and setter** collapse into one `method` symbol whose range is the setter's. The getter has no symbol of its own.
- **`if TYPE_CHECKING` / `else`:** only the `TYPE_CHECKING` definition is listed, because Pylance treats the `else` branch as unreachable.
- **Decorators** are inside the symbol's range and do not change its name or kind.

### Readiness and missing providers

| Situation | Result | Time |
| --- | --- | --- |
| TypeScript, first open | `undefined`, then symbols | about 1.3–1.5 s |
| Python with Pylance, first open | `undefined` × 5, then symbols | about 4.6 s |
| Python with no language extension | `undefined` for the full 90 s | — |

While a server is starting, and when no provider exists at all, the command returns `undefined`, not an empty array. The two cases cannot be told apart from the result alone.

## Gaps found

1. **Duplicate identities.** TypeScript overloads give several symbols with identical name, kind and container (and identical container chains for everything nested in them). The design's "Ambiguous" state would fire on every overloaded function.
2. **Kinds differ across servers and constructs.** Same concept, different kinds: arrow function `variable` vs function `function`; Python `@property` is a `method`, TypeScript accessors are `property`; module-level constants are `variable` in TypeScript and `constant` in Python.
3. **Lost symbols in Python.** The `@property` getter, `@overload` stubs and the `else` branch of `TYPE_CHECKING` have no symbol. A pin can only target what is listed, so pinning the getter pins the property as a whole. This is acceptable, but a pin's range must come from the listed symbol, not from the cursor.
4. **Server-specific names.** `(get) size` and `describe("simulation") callback` are TypeScript-server strings. A CLI using a lightweight parser has to reproduce them, or such pins will not resolve outside the editor.
5. **Parameters as symbols.** With Pylance, the innermost symbol at the cursor is often a parameter.
6. **No "not ready" signal.** `undefined` means either "still starting" or "no provider".
7. **Untested:** servers that return flat `SymbolInformation` (container is a single `containerName` string, so the chain must be rebuilt from range nesting), and other languages.

## Does the identity model need to change?

Not the schema. `path`, `name`, `kind`, `container` and the optional `fingerprint` are enough. What needs writing down are resolution rules, to be applied in PUN-004, PUN-005 and PUN-008:

- **Overloads:** when several symbols share name, kind and container, prefer the one with the largest range (the implementation). Only call it ambiguous when the candidates are not nested signatures of one function, for example two `conditional` definitions in different branches.
- **Pinnable symbols:** when picking the symbol under the cursor, skip `variable` and `constant` symbols whose parent is a function or method (parameters and locals). Keep them when they are top level or class members, so `const` arrow functions and class fields stay pinnable.
- **Names are stored verbatim** as the language server reports them, including `(get) ` prefixes and synthesized callback names. Normalising would make the getter and setter collide.
- **Kind matching:** see D-6. My recommendation is to require an exact match on name and container chain, and use kind as a tie-breaker rather than a hard requirement, so that a refactor from `function` to `const` arrow keeps the pin resolved.
- **Readiness:** treat `undefined` as "not ready yet" and retry for a few seconds (TypeScript about 1.5 s, Pylance about 5 s here), then report "no symbol provider for this language, or it is still loading".

Because the kind rule changes the meaning of "Resolved" in [design.md](../design.md#detect-rather-than-prevent-staleness), it is raised as decision D-6 rather than decided here.

## Appendix: dump function

Run in a VS Code test host with `--extensions-dir` pointing at a folder containing the extensions under test.

```js
const vscode = require("vscode");

function plain(sym) {
  return {
    name: sym.name,
    detail: sym.detail,
    kind: vscode.SymbolKind[sym.kind],
    range: `${sym.range.start.line + 1}-${sym.range.end.line + 1}`,
    children: (sym.children ?? []).map(plain),
  };
}

async function dump(uri) {
  for (const t0 = Date.now(); Date.now() - t0 < 90000; ) {
    const symbols = await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", uri);
    if (symbols?.length) return symbols.map(plain);
    await new Promise((r) => setTimeout(r, 500));
  }
  return undefined;
}
```
