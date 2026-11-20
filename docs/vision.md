# Punaise: Product vision

*Punaise* is Dutch and French for pushpin. This document explains what Punaise is, who it is for and why it is shaped this way. See also [user journeys](journeys.md), [design](design.md), [roadmap](roadmap.md) and the [backlog](backlog.md).

## Executive summary

Punaise is a VS Code extension that keeps the code concepts a developer is reasoning about visible together, and makes that same curated context available to coding agents.

Developers reason about several related locations at once, but editors show one location at a time. They chase definitions, reopen files and rebuild call paths, losing the context of the task. Coding agents have the mirror-image problem: they rediscover repository context on every task, and the developer has little control over what they select.

Punaise lets developers pin functions, classes, selections, documentation sections, examples and notes into a side panel. Pins are grouped into **themes** such as "Authentication flow" or "Adding a new model". Themes start personal and can be published to the repository as small, reviewable JSON files.

The extension surfaces relevant themes for the symbol under the cursor. The same themes are exported as explicit, inspectable context to any agent the developer already uses, through a copy command and a local MCP server.

The product is not a bookmark manager and not an AI chat panel. It is a human-curated, machine-assisted context layer over a codebase, readable by both people and agents.

> **Vision:** Keep the code you are reasoning about in view, understand unfamiliar systems faster, and turn individual exploration into maintained team knowledge that people and agents both use.

## Problem statement

Understanding one concept in a medium or large codebase means holding many locations in mind at once, and neither editors nor agents preserve that working set.

A single concept typically spans API or UI entry points, service and orchestration logic, domain models and types, persistence, configuration and validation, tests and examples, and architecture or operational documentation. These rarely fit into one tab. Developers fall back on open tabs, bookmarks, search results, split editors, notes and memory.

That produces six recurring problems:

1. **Navigation overhead.** Developers repeatedly jump between the same definitions and call sites.
2. **Loss of working context.** Following a reference displaces the code that motivated it.
3. **Repeated rediscovery.** The same developer, or a teammate, later rebuilds the same mental map.
4. **Documentation drift.** Conventional docs duplicate source code and go stale.
5. **Uncontrolled agent context.** Agents rediscover context on each task, and the developer cannot easily see or steer what they pick.
6. **Difficult onboarding.** Experienced engineers' knowledge is not presented where and when a newcomer needs it.

The shift toward agent-driven exploration makes problem 5 more important over time. It may make problem 1 less important. The product should be positioned so that both trends help it.

## Product principles

Eight principles govern scope decisions.

1. **Useful without AI.** Pinning, themes, symbol resolution, cursor-following and deterministic suggestions work with no AI service. AI improves discovery and explanation but is never required.
2. **Store intent, derive the rest.** The repository stores small semantic references saying which concepts belong together. Code, signatures, references and explanations are resolved when displayed, never copied into theme files.
3. **Human-curated, machine-assisted.** Tools and agents may suggest pins, themes and repairs. Developers decide what becomes durable knowledge, and every suggestion explains why it was made.
4. **Progressive adoption.** Value starts at install: pin the current symbol with one command, no configuration and no theme required. Personal themes can be published later.
5. **Context, not another editor.** The side panel is a compact, read-only view. Editing stays in the native editor with its language services, diagnostics, undo and formatting.
6. **Quiet by default.** Automatic changes are debounced, explainable, easy to freeze and configurable. The panel never rearranges itself while the developer is reading it.
7. **Open and portable knowledge.** Shared themes use a documented, versioned JSON format in Git, inspectable without the extension.
8. **Agent-readable by design.** Any theme can be handed to a coding agent as explicit context, and any agent can write a valid theme file for human review. The format, not the extension, is the long-term asset.

## Product model

Five concepts make up the product: pins, views, themes, the contextual lens, and the identity rules that keep pins attached to code.

### Pin

A pin is a persistent semantic reference to a code concept or information source. Initial pin types:

- Symbol: function, method, class, interface, type, variable, module
- Source selection
- Markdown heading or section
- File or file outline
- Test or example
- URL or external documentation reference
- Developer-authored note

### Views

One pin supports several derived views. Source-backed content is always visually distinct from generated content.

- **Signature:** compact declaration (the default for narrow panels)
- **Code:** live source for the symbol or selection
- **Documentation:** docstring, comments, linked Markdown or curated note
- **Usage:** references, call sites, tests and examples (lazy, Phase 3)
- **Change:** relevant Git diff or recent history (later)
- **Explain:** optional AI explanation (Phase 5)

### Theme

A theme is a named, ordered collection of pins representing a concept, task, investigation, feature or learning path. Examples: "Authentication flow", "Simulation execution", "Database transaction boundaries", "Why this query runs twice".

- **Personal:** stored in VS Code workspace state, exportable as JSON
- **Repository-shared:** stored under `.punaise/themes/`, reviewed in pull requests

### Contextual lens

The selected theme, or context assembled from several themes, forms a lens over the codebase. The lens decides which pins appear for the current symbol and in what order. When nothing matches, the panel falls back to the active personal theme rather than going empty.

### Symbol identity

A symbol pin identifies a symbol by meaning, not by line number. Identity has four parts:

1. **Path hint:** the file where the symbol was last found
2. **Name:** the symbol's own name
3. **Kind and container chain:** for example a `method` inside class `SimulationService`, inside module `services.simulation`
4. **Signature fingerprint (optional):** a short hash of the normalized declaration, used to tell overloads apart and to rank repair candidates

Resolution tries the path hint first, then searches by name, kind and container. The fingerprint breaks ties. Failure is reported, never silently guessed (see [resolution states](design.md#detect-rather-than-prevent-staleness)).

### Relationships (deferred)

Explicit relationships between pins (calls, persists, tested by) are deferred to schema v2. Static relationships come from language services at display time. Human-authored relationships return once a feature consumes them, such as a theme graph view.

## Competitive landscape and positioning

Punaise wins where a developer needs a non-linear, symbol-anchored working set that follows the cursor and doubles as agent context; no single alternative covers all four.

| Alternative | What it does well | Where Punaise differs |
| --- | --- | --- |
| Open tabs and split editors | Zero setup, full editing | Tabs are not grouped by concept, do not survive context switches, and cannot be shared |
| Bookmark extensions | Fast jump-to-location | Bookmarks are line positions with no live views, no themes and no relevance to the cursor |
| CodeTour (Microsoft) | Repository-stored JSON walkthroughs reviewed in PRs | Tours are linear, step-by-step narratives anchored to lines; themes are non-linear sets anchored to symbols and surface automatically |
| Swimm | Prose docs coupled to code, kept in sync, team features | Swimm documents code; Punaise puts the related code itself (entry points, services, types, tests and docs) side by side as one live picture, and is a workspace for detective work while you are still figuring things out |
| CodeContext+ (Manuel Gil, Open VSX) | Notes linked to files and lines, with in-editor indicators; free and open source | Notes-first rather than code-first; no live code views or cursor-driven relevance; its view sits under the Explorer |
| Code Context Notes | Notes stored in a .code-notes/ folder that follow code through moves and refactors | Annotates single locations; does not assemble related code into one picture or follow the cursor. Still maintained but not very active (version 0.5.1) |
| Casefile (Atom; git-casefile for VS Code) | Bookmark sets for deep-dives, shared through the Git repository; closest prior art | Bookmarks without live views, symbol identity, cursor relevance or agent export |
| Code search and code intelligence tools | Finding anything across large codebases | Search answers one question at a time; themes preserve the answer as a reusable set |
| Coding agents and their rule files (`CLAUDE.md`, `AGENTS.md`, Cursor rules) | Explaining code and doing tasks on request | Rule files are free-form prose; themes are structured, resolvable references that agents can consume and people can review |

### Positioning

The closest active tools (CodeContext+, Code Context Notes) are **notes-first**: the developer writes notes and links them to places in the code. Punaise is **code-first**: the developer collects the code itself, and it is shown live. Notes are optional extras on pins, never the main thing anyone has to write.

- **Against CodeTour:** "A tour tells a story once. A theme stays open beside you and appears when you reach the code it covers."
- **Against Swimm:** "Swimm explains code once someone understands it. Punaise is where you work it out, with all the related code in view at once."
- **Against code-note tools:** "Don't write about the code. Collect it, and see it together."
- **Against agents alone:** "Your agent is only as good as the context it finds. Themes give it the context your team already curated."

Open question: competitors' current features and pricing should be re-checked before the public beta README is written.

## Target users

The first users are experienced developers in unfamiliar codebases who also use coding agents; teams come later, once shared themes prove useful.

### Primary initial users

- Experienced developers working in unfamiliar or legacy codebases
- Software architects and technical leads
- Developers investigating cross-cutting features or defects
- Developers onboarding onto medium or large repositories
- Heavy users of coding agents who want explicit control over repository context

### Initial repository profile

- Roughly 50,000 to 500,000 lines of code
- Multiple architectural layers
- Existing Markdown documentation
- TypeScript or Python
- Git-based collaboration, including monorepos and multi-root workspaces

### Later team users

- Engineering teams maintaining onboarding and architecture guidance
- Platform teams documenting cross-cutting concerns
- Open-source maintainers guiding contributors
- Organizations wanting reviewable, testable knowledge artifacts and governed agent context

## Agent and AI integration strategy

Punaise serves agents in three tiers, and the first two cost nothing to run because they use the agent the developer already has.

### Tier 1: Themes as agent context (Phase 2, no AI)

- **Copy Theme as Context.** Produces Markdown with each pin's live code, signature or docs resolved, plus a size estimate in characters. The developer sees exactly what will be pasted.
- **Local MCP server.** A read-only stdio server, bundled with the extension or run from the CLI. Initial tools:
  - `list_themes`: names and descriptions of available themes
  - `get_theme`: a theme's pins rendered in a chosen view
  - `themes_for_symbol`: themes relevant to a given file and symbol
  - `resolve_pin`: live content and resolution state of one pin
- **CLI export.** `punaise export <theme>` for scripts, CI and agents without MCP support.

### Tier 2: Agents author themes (Phase 2–3, no AI integration)

- `.punaise/README.md` and `schema.json` are written so that an agent can draft a valid theme on request, for example "create a theme for how authentication works".
- `punaise validate` checks that every pin resolves and reports ambiguous or missing pins.
- Agent-drafted themes are reviewed in a pull request like any other change. No special trust is given to them.

### Tier 3: Built-in AI features (Phase 5, bring your own provider)

- Suggest pins, explain a pin in a theme's context, propose repairs for unresolved pins, draft a usage guide.
- Provider-agnostic, using the developer's own key or provider. Punaise does not bundle inference.
- Every request previews the exact context and needs explicit approval before any theme file changes.

### Why this order

Tiers 1 and 2 test the agent-context hypothesis with no inference cost and no privacy exposure. Tier 3 is built only if users show they want convenience beyond what their existing agent provides.

### Privacy guarantees

- The MCP server speaks over local stdio only and opens no network port.
- Nothing leaves the machine unless the developer's own agent sends it.
- Exported context is shown to the developer in full before it is used.

## Vision statement and taglines

> **Punaise turns scattered source code, documentation and architectural knowledge into live, contextual views that follow developers through the codebase and give their agents the same context. It helps individuals understand systems faster and helps teams keep that understanding as small, reviewable, version-controlled themes.**

### Product narrative

A developer asks how simulation execution works. They pin the endpoint, service method, model and architecture section into a personal theme instead of leaving a trail of tabs. Later they ask their coding agent to add a retry policy and hand it the theme. The agent starts from the right four places instead of guessing.

The theme is published to the repository and reviewed like code. A new teammate opens one of its functions, and Punaise surfaces the theme beside the editor. Their agent sees the same theme through the MCP server. When a refactor breaks a pin, `validate` flags it in CI and the fix lands in the same pull request.

### Taglines

- **Keep the code you are reasoning about in view.** (most accurate)
- **Stop chasing code through twenty files.** (most memorable)
- **Curated context for you and your agents.** (new; leads with the agent angle)
- **A persistent working set for understanding large codebases.**
- **Turn code exploration into shared engineering knowledge.**
