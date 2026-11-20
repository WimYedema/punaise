# Punaise: Backlog

This is the prioritized, estimated list of work for Punaise. It covers Phase 0 in detail and Phase 1 in outline. Later phases live in [roadmap.md](roadmap.md) until they are ready to be broken down.

Agents working on this repository follow the rules in [AGENTS.md](../AGENTS.md). The short version: **one item at a time, stay inside its description, respect its estimate, and escalate instead of improvising.**

## How to read this backlog

- **Order is priority.** Work top to bottom within a phase. Do not start an item whose dependencies are not `done`.
- **Status:** `todo`, `doing`, `blocked`, `done`. Only one item is `doing` at a time.
- **Ready:** an item is ready to build only if it has a description, acceptance criteria and an estimate. Items marked *Not ready* must be refined by a human first.
- **Owner:** `agent` items can be built by a coding agent. `human` items need a person (decisions, validation, testing on real work).

### Estimates

Estimates are size budgets an agent can check against while working, not hours.

| Size | Scope | Changed lines (excluding tests) | Files touched |
| --- | --- | --- | --- |
| **XS** | One small change, one focused session | up to ~50 | 1–2 |
| **S** | One focused session | up to ~150 | up to 4 |
| **M** | Two or three sessions | up to ~400 | up to 8 |
| **L** | Too big: split before starting | — | — |

**Spikes** are timeboxed experiments. Their deliverable is a short written finding in `docs/spikes/`, not production code. Spike code may be thrown away.

**Escalate at 1.5×:** if an item is about to exceed 1.5 times its line or file budget, stop and escalate (see [AGENTS.md](../AGENTS.md#escalation)).

## Decisions needed

These came out of the [user journeys](journeys.md) and must be settled by a human before the items that depend on them are refined.

| ID | Decision | Affects | Status |
| --- | --- | --- | --- |
| D-1 | Add pin notes and lead status (open / ruled out / confirmed) as optional pin fields in schema v1? | Schema v1, PUN-016, PUN-018 | open |
| D-2 | Add an optional `"status": "draft"` field on themes, with `validate` warning when a draft is about to merge? | Schema v1, Phase 2 | open |
| D-3 | Should `validate` warn by default and fail only for themes marked as maintained? | Phase 2 CLI | open |
| D-4 | Add a simple "Pin with neighbours" action in Phase 1 or 2, before full Phase 3 suggestions? | Phase 1–2 scope | open |
| D-5 | Guardrail: a note is a short line attached to a pin, and nothing requires one. Adopt as a product principle? | All note features | open |

## Phase 0: Validation prototype

Goal: an in-memory pinboard with live, theme-matched code in the right-hand side bar. Gate: the pinboard is repeatedly useful without themes or AI ([roadmap](roadmap.md#phase-0-validation-prototype)).

### PUN-001 Scaffold the extension

- **Status:** todo · **Owner:** agent · **Estimate:** S · **Depends on:** —
- **Description:** Create a TypeScript VS Code extension with a strict `tsconfig`, a bundler (esbuild), linting, and a test runner (`@vscode/test-cli` for integration tests, a plain unit-test runner for core code). Use npm workspaces with two packages: `packages/core` (no `vscode` imports) and `packages/extension`. Contribute a view container to the **secondary side bar**, with a `when`-clause fallback to the activity bar for editors without secondary side bar support. The container holds one `WebviewView` that shows "Punaise" and an empty-state message.
- **Acceptance criteria:**
  - `npm install`, `npm run build`, `npm test` and `npm run lint` all succeed from a clean clone.
  - Running the extension in the Extension Development Host shows the Punaise view on the right-hand side.
  - The webview uses a strict Content Security Policy and has no network access.
  - `packages/core` builds and tests without `vscode` installed.
- **Out of scope:** commands, pins, highlighting, CI configuration, publishing.

### PUN-002 Spike: theme-matched highlighting in a webview

- **Status:** todo · **Owner:** agent · **Estimate:** S (timebox: one session) · **Depends on:** PUN-001
- **Description:** Find out whether code in the webview can be highlighted so that it looks like the editor. Try Shiki in the webview, mapping the active VS Code colour theme to a Shiki theme. Check light, dark and high-contrast themes, and how the result reacts to a theme change.
- **Acceptance criteria:**
  - `docs/spikes/highlighting.md` records: the approach, what worked, what did not, bundle-size impact, and a recommendation.
  - Screenshots or a clear description for at least three built-in themes.
- **Out of scope:** production-quality rendering; it is built in PUN-006.

### PUN-003 Spike: symbol container chains from language servers

- **Status:** todo · **Owner:** agent · **Estimate:** S (timebox: one session) · **Depends on:** PUN-001
- **Description:** Check whether `vscode.executeDocumentSymbolProvider` returns enough structure to build the symbol identity in [design.md](design.md#example-theme): name, kind and the chain of enclosing symbols. Test with the TypeScript language service and with Pylance on small sample files containing classes, nested functions, overloads (TypeScript) and decorated functions (Python).
- **Acceptance criteria:**
  - `docs/spikes/symbol-identity.md` records what each language server returns, gaps found, and whether the identity model needs to change.
  - Sample files used for the spike are kept under `test-fixtures/`.
- **Out of scope:** changes to the schema itself. If the model needs to change, escalate.

### PUN-004 Core pin model

- **Status:** todo · **Owner:** agent · **Estimate:** S · **Depends on:** PUN-001, PUN-003
- **Description:** In `packages/core`, define the pin types for symbol pins (path hint, name, kind, container chain, optional fingerprint) and an in-memory pin store (add, remove, list, ordered). Follow the field names in [design.md](design.md#example-theme).
- **Acceptance criteria:**
  - Types and store are covered by unit tests, including ordering and duplicate pins.
  - No `vscode` imports in `packages/core`.
- **Out of scope:** persistence, themes, resolution against live documents.

### PUN-005 Command: Pin Current Symbol

- **Status:** todo · **Owner:** agent · **Estimate:** M · **Depends on:** PUN-004
- **Description:** Register `Punaise: Pin Current Symbol` with a default keybinding. It finds the smallest document symbol containing the cursor, builds a pin from it, adds it to the store, and reveals the Punaise view. Pinning the same symbol twice does not create a duplicate.
- **Acceptance criteria:**
  - Works in TypeScript and Python files with their language servers installed.
  - If no symbol provider is available, or the language server is still loading, the user gets a clear, specific message rather than silence.
  - If the cursor is not inside a symbol, the user gets a clear message.
  - Integration test covers pinning in a TypeScript fixture.
- **Out of scope:** selection pins, rendering beyond the pin's name (PUN-006).

### PUN-006 Render pins: header, signature and code views

- **Status:** todo · **Owner:** agent · **Estimate:** M · **Depends on:** PUN-002, PUN-005
- **Description:** Render each pin in the webview as a collapsible card. The header shows name, kind and relative path. Collapsed, a card shows the signature; expanded, it shows the full code, highlighted using the approach recommended in PUN-002. The extension host sends rendered data to the webview; the webview never reads files.
- **Acceptance criteria:**
  - Five or more pins stay readable in a narrow side bar.
  - Highlighting follows the active colour theme, including after a theme change.
  - Long bodies scroll inside the card rather than stretching the panel.
- **Out of scope:** documentation view, reordering, persistence.

### PUN-007 Navigate from pin to source

- **Status:** todo · **Owner:** agent · **Estimate:** XS · **Depends on:** PUN-006
- **Description:** Clicking a pin's header opens the file in the editor and reveals the symbol's range.
- **Acceptance criteria:** Clicking a header opens the right file at the right symbol, in the active editor group.
- **Out of scope:** opening in a split, peek views.

### PUN-008 Keep pins live

- **Status:** todo · **Owner:** agent · **Estimate:** M · **Depends on:** PUN-006
- **Description:** When a pinned file changes, re-resolve its pins (debounced, around 200 ms) and update the webview. Resolution uses the path hint first, then name, kind and container chain. A pin that cannot be resolved is shown as unresolved, not removed.
- **Acceptance criteria:**
  - Editing a pinned function updates its card without a manual refresh.
  - Renaming a pinned function shows it as unresolved; undoing the rename resolves it again.
  - Typing in a large file does not make the editor sluggish.
- **Out of scope:** the full set of resolution states and repair proposals (Phase 2).

### PUN-009 Remove pins and empty state

- **Status:** todo · **Owner:** agent · **Estimate:** XS · **Depends on:** PUN-006
- **Description:** Each card has a remove action. When there are no pins, the panel shows a single call to action: put the cursor in a function and press the pin shortcut (showing the actual keybinding).
- **Acceptance criteria:** Removing the last pin shows the empty state; the empty state shows the real keybinding.
- **Out of scope:** undo for removal.

### PUN-010 Phase 0 validation

- **Status:** todo · **Owner:** human · **Estimate:** 3 sessions of real work · **Depends on:** PUN-001 to PUN-009
- **Description:** Use the prototype on two real repositories (one TypeScript, one Python, 50k–500k lines) during real investigations. Record findings in `docs/validation/phase-0.md`, answering:
  1. Do pinned symbols stay useful after the initial investigation?
  2. Is the side bar better than split editors and open tabs?
  3. Which view is used most: signature or code?
  4. What friction came up, and what was missing?
  5. Would pasting this set of pins into an agent have helped on the task?
- **Acceptance criteria:** A written go/no-go decision for Phase 1, and an updated Phase 1 section in this backlog.

## Phase 1: Personal MVP (not ready)

These items are placeholders with rough estimates. They are refined after the Phase 0 gate, using what PUN-010 finds. Agents must not start them until a human marks them ready.

| ID | Item | Rough size | Notes |
| --- | --- | --- | --- |
| PUN-011 | Persist pins in `workspaceState`, plus JSON export and import | M | Export also covers sharing by clipboard (Journey 4) |
| PUN-012 | Personal themes: create, rename, delete, select; automatic scratch theme | M | |
| PUN-013 | Reorder pins by drag and drop | S | |
| PUN-014 | Follow-cursor modes (fixed, follow, manual, freeze) with a no-match fallback | L | Split before starting |
| PUN-015 | Recent trail: last ~20 visited symbols, pinnable after the fact | M | From Journey 3 |
| PUN-016 | Pin notes: one short line per pin | S | Depends on D-1, D-5 |
| PUN-017 | Local usage stats, including follow-cursor hit rate | S | No telemetry; visible only to the user |
| PUN-018 | Lead status on pins (open, ruled out, confirmed) | S | Depends on D-1 |
| PUN-019 | Selection pins and documentation view | M | |
| PUN-020 | Recruit two or three external testers | human | Start during Phase 0; recruiting takes longer than building |
