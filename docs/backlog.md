# Punaise: Backlog

This is the prioritized, estimated list of work for Punaise. It covers Phase 0 in detail and Phase 1 in outline. Later phases live in [roadmap.md](roadmap.md) until they are ready to be broken down.

Agents working on this repository follow the rules in [AGENTS.md](../AGENTS.md). The short version: **one item at a time, stay inside its description, respect its estimate, and escalate instead of improvising.**

## How to read this backlog

- **Order is priority.** Work top to bottom within a phase. Do not start an item whose dependencies are not `done`.
- **Status:** `todo`, `doing`, `blocked`, `done`. Only one item is `doing` at a time.
- **Ready:** an item is ready to build only if it has a description, acceptance criteria, an estimate and a tier. Items marked *Not ready* must be refined by a human first.
- **Owner:** `agent` items can be built by a coding agent. `human` items need a person (decisions, validation, testing on real work).

### Versions

Each phase has its own minor version of the extension: Phase 0 is `0.1.x`, Phase 1 is `0.2.x`, Phase 2 is `0.3.x`, and so on. The first item of a phase that changes the extension bumps the minor version; fixes within a phase bump the patch version. `packages/core` keeps the same version as the extension.

### Estimates

Estimates are size budgets an agent can check against while working, not hours.

| Size | Scope | Changed lines (excluding tests) | Files touched |
| --- | --- | --- | --- |
| **XS** | One small change, one focused session | up to ~50 | 1–2 |
| **S** | One focused session | up to ~150 | up to 4 |
| **M** | Two or three sessions | up to ~400 | up to 8 |
| **L** | Too big: split before starting | — | — |

**Spikes** are timeboxed experiments. Their deliverable is a short written finding in `docs/spikes/`, not production code. Spike code may be thrown away.

Configuration and boilerplate files (package manifests, tsconfig, lint, bundler and test-runner config, lock files) do not count toward the file budget.

**Escalate at 1.5×:** if an item is about to exceed 1.5 times its line or file budget, stop and escalate (see [AGENTS.md](../AGENTS.md#escalation)).

### Model tiers

Each agent item has a **Tier** saying how capable a model it needs. Tiers name capabilities, not models; [AGENTS.md](../AGENTS.md#model-tiers) maps them to current models, so switching models is a one-line change there.

| Tier | Use for |
| --- | --- |
| **standard** | Well-specified items with clear acceptance criteria and tests to check them |
| **strong** | Items that set conventions or shape the schema, spikes, subtle logic (performance, edge cases), and re-runs of items a standard agent could not finish |

When choosing a tier: if a mistake would be cheap to spot and fix, use `standard`; if it would spread into later items, use `strong`.

## Decisions needed

These came out of the [user journeys](journeys.md) and must be settled by a human before the items that depend on them are refined.

| ID | Decision | Affects | Status |
| --- | --- | --- | --- |
| D-1 | Add pin notes and lead status (open / ruled out / confirmed) as optional pin fields in schema v1? | Schema v1, PUN-016, PUN-018 | open |
| D-2 | Add an optional `"status": "draft"` field on themes, with `validate` warning when a draft is about to merge? | Schema v1, Phase 2 | open |
| D-3 | Should `validate` warn by default and fail only for themes marked as maintained? | Phase 2 CLI | open |
| D-4 | Add a simple "Pin with neighbours" action in Phase 1 or 2, before full Phase 3 suggestions? | Phase 1–2 scope | open |
| D-5 | Guardrail: a note is a short line attached to a pin, and nothing requires one. Adopt as a product principle? | All note features | open |
| D-6 | Must a symbol's `kind` match for a pin to count as resolved, or only name and container chain, with kind as a tie-breaker? Kinds vary by language server and change on refactors such as function → `const` arrow ([symbol identity spike](spikes/symbol-identity.md)). | design.md resolution states, PUN-004, PUN-008 | decided 2026-11-20: name and container chain must match; kind is a tie-breaker |

## Phase 0: Validation prototype

Goal: an in-memory pinboard with live, theme-matched code in the right-hand side bar. Gate: the pinboard is repeatedly useful without themes or AI ([roadmap](roadmap.md#phase-0-validation-prototype)).

### PUN-001 Scaffold the extension

- **Status:** done · **Owner:** agent · **Tier:** strong · **Estimate:** M (re-sized from S, see note) · **Depends on:** —
- **Description:** Create a TypeScript VS Code extension with a strict `tsconfig`, a bundler (esbuild), linting, and a test runner (`@vscode/test-cli` for integration tests, a plain unit-test runner for core code). Use npm workspaces with two packages: `packages/core` (no `vscode` imports) and `packages/extension`. Contribute a view container to the **secondary side bar**, with a `when`-clause fallback to the activity bar for editors without secondary side bar support. The container holds one `WebviewView` that shows "Punaise" and an empty-state message.
- **Acceptance criteria:**
  - `npm install`, `npm run build`, `npm test` and `npm run lint` all succeed from a clean clone.
  - Running the extension in the Extension Development Host shows the Punaise view on the right-hand side.
  - The webview uses a strict Content Security Policy and has no network access.
  - `packages/core` builds and tests without `vscode` installed.
- **Out of scope:** commands, pins, highlighting, CI configuration, publishing.
- **Note:** Re-sized from S to M before starting: a scaffold is mostly config files (~240 lines, 17 files). The fallback switches on VS Code 1.106 via the `punaise.noSecondarySidebar` context key.

### PUN-002 Spike: theme-matched highlighting in a webview

- **Status:** done · **Owner:** agent · **Tier:** strong · **Estimate:** S (timebox: one session) · **Depends on:** PUN-001
- **Description:** Find out whether code in the webview can be highlighted so that it looks like the editor. Try Shiki in the webview, mapping the active VS Code colour theme to a Shiki theme. Check light, dark and high-contrast themes, and how the result reacts to a theme change.
- **Acceptance criteria:**
  - `docs/spikes/highlighting.md` records: the approach, what worked, what did not, bundle-size impact, and a recommendation.
  - Screenshots or a clear description for at least three built-in themes.
- **Out of scope:** production-quality rendering; it is built in PUN-006.
- **Note:** Recommends Shiki in the extension host (not the webview) with the active theme file and VS Code's own grammars. PUN-006 needs approval for `shiki` as a runtime dependency. Spike code is on branch `spike/pun-002-highlighting`.

### PUN-003 Spike: symbol container chains from language servers

- **Status:** done · **Owner:** agent · **Tier:** strong · **Estimate:** S (timebox: one session) · **Depends on:** PUN-001
- **Description:** Check whether `vscode.executeDocumentSymbolProvider` returns enough structure to build the symbol identity in [design.md](design.md#example-theme): name, kind and the chain of enclosing symbols. Test with the TypeScript language service and with Pylance on small sample files containing classes, nested functions, overloads (TypeScript) and decorated functions (Python).
- **Acceptance criteria:**
  - `docs/spikes/symbol-identity.md` records what each language server returns, gaps found, and whether the identity model needs to change.
  - Sample files used for the spike are kept under `test-fixtures/`.
- **Out of scope:** changes to the schema itself. If the model needs to change, escalate.
- **Note:** No schema change needed; the spike proposes resolution rules for overloads, pinnable symbols and readiness, and raises D-6 on kind matching. Fixtures are under `test-fixtures/symbols/`, which is excluded from lint.

### PUN-004 Core pin model

- **Status:** done · **Owner:** agent · **Tier:** strong · **Estimate:** S · **Depends on:** PUN-001, PUN-003
- **Description:** In `packages/core`, define the pin types for symbol pins (path hint, name, kind, container chain, optional fingerprint) and an in-memory pin store (add, remove, list, ordered). Follow the field names in [design.md](design.md#example-theme).
- **Acceptance criteria:**
  - Types and store are covered by unit tests, including ordering and duplicate pins.
  - No `vscode` imports in `packages/core`.
- **Out of scope:** persistence, themes, resolution against live documents.
- **Note:** `kind` uses lowerCamelCase LSP symbol kind names. A duplicate is the same path, name, container and kind (D-6). Ids are generated as kebab-case container and name, with `-2` on collision.

### PUN-005 Command: Pin Current Symbol

- **Status:** done · **Owner:** agent · **Tier:** standard · **Estimate:** M · **Depends on:** PUN-004
- **Description:** Register `Punaise: Pin Current Symbol` with a default keybinding. It finds the smallest document symbol containing the cursor, builds a pin from it, adds it to the store, and reveals the Punaise view. Pinning the same symbol twice does not create a duplicate.
- **Acceptance criteria:**
  - Works in TypeScript and Python files with their language servers installed.
  - If no symbol provider is available, or the language server is still loading, the user gets a clear, specific message rather than silence.
  - If the cursor is not inside a symbol, the user gets a clear message.
  - Integration test covers pinning in a TypeScript fixture.
- **Out of scope:** selection pins, rendering beyond the pin's name (PUN-006).
- **Note:** Default keybinding `Alt+P` (`Cmd+Alt+P` on macOS); `Ctrl+Alt+P` was dropped because Ctrl+Alt acts as AltGr on many Windows layouts. Symbol choice lives in core (`symbolAtPosition`) and skips parameters and locals. Retries up to 10 s while a language server starts. Python with Pylance verified manually with the PUN-003 setup; the automated test covers TypeScript only, as specified.

### PUN-006 Render pins: header, signature and code views

- **Status:** done · **Owner:** agent · **Tier:** standard · **Estimate:** M · **Depends on:** PUN-002, PUN-005
- **Description:** Render each pin in the webview as a collapsible card. The header shows name, kind and relative path. Collapsed, a card shows the signature; expanded, it shows the full code, highlighted using the approach recommended in PUN-002. The extension host sends rendered data to the webview; the webview never reads files.
- **Acceptance criteria:**
  - Five or more pins stay readable in a narrow side bar.
  - Highlighting follows the active colour theme, including after a theme change.
  - Long bodies scroll inside the card rather than stretching the panel.
- **Out of scope:** documentation view, reordering, persistence.
- **Note:** Cards use `<details>`; a small nonce-tagged script reports open/closed cards to the host and keeps the scroll position, because re-rendering would otherwise collapse cards. The webview still has no file access. Signatures come from a line heuristic in core (`signatureLineCount`); symbols are found with core `findSymbol` (name and container, kind and then largest range break ties). Narrow-panel readability checked with screenshots at 280 px.
- **Note:** Approved: set `module` to `Node20` in the extension's tsconfig (`moduleResolution` stays `Node16`) (see [highlighting spike](spikes/highlighting.md#recommendation-for-pun-006)). Adding `shiki` as a runtime dependency still needs approval.

### PUN-007 Navigate from pin to source

- **Status:** done · **Owner:** agent · **Tier:** standard · **Estimate:** XS · **Depends on:** PUN-006
- **Description:** Each card header has a small "open in editor" link. Clicking it opens the file in the editor and reveals the symbol's range. Clicking the rest of the header keeps expanding and collapsing the card.
- **Acceptance criteria:**
  - Clicking the link opens the right file at the right symbol, in the active editor group, without toggling the card.
  - For a pin shown as not found, the link opens the file, or explains that the file is missing.
- **Out of scope:** opening in a split, peek views.
- **Note:** Changed before starting, at the human's request: navigation moved from the header to a separate `↗` link so the header keeps toggling the card. The symbol is re-resolved on click.

### PUN-008 Keep pins live

- **Status:** done · **Owner:** agent · **Tier:** strong · **Estimate:** M · **Depends on:** PUN-006
- **Description:** When a pinned file changes, re-resolve its pins (debounced, around 200 ms) and update the webview. Resolution uses the path hint first, then name, kind and container chain. A pin that cannot be resolved is shown as unresolved, not removed.
- **Acceptance criteria:**
  - Editing a pinned function updates its card without a manual refresh.
  - Renaming a pinned function shows it as unresolved; undoing the rename resolves it again.
  - Typing in a large file does not make the editor sluggish.
- **Out of scope:** the full set of resolution states and repair proposals (Phase 2).
- **Note:** Only cards whose source text or resolution changed are re-highlighted and swapped in place; highlighting starts at the symbol's top-level ancestor, so cost follows the class size, not the file (Shiki takes about 0.1 ms per line). On a 5000-line file an update takes about 100 ms, mostly the language server's symbol request. Highlighting can go stale if code above the symbol inside the same top-level declaration changes how the grammar reads it (rare).

### PUN-022 Pin candidate strip

- **Status:** done · **Owner:** agent · **Tier:** standard · **Estimate:** S · **Depends on:** PUN-005, PUN-006
- **Description:** A single line at the top of the panel shows the symbol under the cursor and its enclosing symbols as chips, for example `SimulationService › run`. Clicking a chip pins that symbol, so pinning needs neither the shortcut nor a context menu. The strip updates about 200 ms after the cursor stops, reusing the symbol lookup from PUN-005 and skipping parameters and locals as described in the [symbol identity spike](spikes/symbol-identity.md#does-the-identity-model-need-to-change). Chips for symbols that are already pinned show as pinned. Chips can be command links, so the webview stays script-free; only the pin command may be enabled as a command URI.
- **Acceptance criteria:**
  - Moving the cursor into a method shows the method and its class as chips; clicking either pins it.
  - An already pinned symbol shows as pinned and does not create a duplicate when clicked.
  - With the cursor outside any symbol, or in a file without a symbol provider, the strip shows a short hint instead of chips.
  - The strip never reorders or changes existing pin cards, and typing in a large file stays responsive.
  - Integration test covers pinning from the strip in a TypeScript fixture.
- **Out of scope:** symbols near the cursor (PUN-023), callers, callees or references, keyboard navigation of chips.
- **Note:** Chips post a message to the host (like the open link) rather than using command URIs, since the webview already has a nonce-tagged script. The strip never waits for a language server; while one is starting it shows a hint and fills in on the next cursor move.

### PUN-009 Remove pins and empty state

- **Status:** done · **Owner:** agent · **Tier:** standard · **Estimate:** XS · **Depends on:** PUN-006, PUN-022
- **Description:** Each card has a remove action. When there are no pins, the panel shows the candidate strip (PUN-022) and a single call to action: put the cursor in a function and click it in the strip, or press the pin shortcut (showing its default keybinding: VS Code does not tell extensions about rebindings). The hint has a "Don't show again" link, remembered across sessions.
- **Acceptance criteria:** Removing the last pin shows the empty state; the empty state shows the default keybinding for the platform; after "Don't show again" the hint stays hidden.
- **Out of scope:** undo for removal.
- **Note:** Changed before starting, with the human: VS Code gives extensions no way to read a rebound keybinding, so the hint shows the manifest default and can be dismissed (stored in `globalState`).

### PUN-010 Phase 0 validation

- **Status:** todo · **Owner:** human · **Tier:** — · **Estimate:** 3 sessions of real work · **Depends on:** PUN-001 to PUN-009, PUN-022
- **Description:** Use the prototype on two real repositories (one TypeScript, one Python, 50k–500k lines) during real investigations. Record findings in `docs/validation/phase-0.md`, answering:
  1. Do pinned symbols stay useful after the initial investigation?
  2. Is the side bar better than split editors and open tabs?
  3. Which view is used most: signature or code?
  4. What friction came up, and what was missing?
  5. Would pasting this set of pins into an agent have helped on the task?
- **Acceptance criteria:** A written go/no-go decision for Phase 1, and an updated Phase 1 section in this backlog.

### PUN-026 CI on GitHub Actions

- **Status:** done · **Owner:** agent · **Tier:** standard · **Estimate:** S · **Depends on:** PUN-001
- **Description:** On every push to `main` and every pull request, run `npm ci`, build, lint, and the unit and integration tests on Linux (integration tests under `xvfb`) and Windows. Keep the packaged `punaise.vsix` from the Linux run as a downloadable artifact.
- **Acceptance criteria:**
  - A push to `main` runs the workflow and it passes on both operating systems.
  - The run's artifacts include `punaise.vsix`.
- **Out of scope:** publishing to the Marketplace or Open VSX (Phase 4), release automation, test caching.

### PUN-027 Alpha pre-release on the Marketplace

- **Status:** done · **Owner:** agent · **Tier:** standard · **Estimate:** S · **Depends on:** PUN-026
- **Description:** Publish the extension under the `ienfald` publisher as a Marketplace pre-release marked Preview, so it can be installed on other machines. A version tag such as `v0.1.0` on `main` triggers a workflow that tests, checks the tag against the manifest version and publishes with `vsce publish --pre-release`, authenticating through GitHub OIDC trusted publishing (no stored token). The Marketplace page says plainly that this is an alpha.
- **Acceptance criteria:**
  - The manifest uses publisher `ienfald`, is marked preview and links to the repository; tests use the new extension ID.
  - Pushing a matching version tag publishes a pre-release; a tag that does not match the manifest version fails before publishing.
- **Out of scope:** Open VSX (Phase 4), stable releases, changelogs, an icon.
- **Needs the human:** configure trusted publishing for this repository and workflow on the publisher page, then push the first tag.
- **Note:** 0.1.0 was published on 2026-11-20 from tag `v0.1.0` through OIDC trusted publishing.

### PUN-023 Pin symbols near the cursor

- *Not ready.* Offer symbols that are textually close to the cursor as one-click pins, next to the candidate strip (PUN-022). Close means position in the file, not the call graph (that is D-4 and Phase 3). To decide: what counts as close (previous and next siblings, symbols visible in the editor, within N lines), how many to show, and whether it is a separate row or part of the strip.

### PUN-021 Clean build output before compiling tests

- *Not ready.* The extension's `tsc` output folder (`packages/extension/out/`) is never cleaned, so compiled tests for deleted files (for example after switching branches) still run and can fail. Found during PUN-002.

## Phase 1: Personal MVP (not ready)

Phase 1 ships as version `0.2.x` (see [versions](#versions)). These items are placeholders with rough estimates and no tier yet. They are refined after the Phase 0 gate, using what PUN-010 finds. Agents must not start them until a human marks them ready.

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
| PUN-024 | Pins in the editor: a pin icon in the gutter next to pinned symbols, plus a way to pin from the code itself | S–M | Extensions cannot handle gutter clicks, so options are the line-number context menu, a CodeLens (noisy; maybe only at the cursor) or a hover action |
| PUN-025 | Usage tips in the empty state and quiet panel moments: rotate short tips (pin from the strip, open link, follow-cursor, export), each dismissible | S | Builds on PUN-009's dismissible hint; keep tips short and never more than one at a time |
