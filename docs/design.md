# Punaise: Design

Repository format, technical direction and maintenance strategy. The product reasoning behind these choices is in [vision.md](vision.md).

## Repository format and schema v1

Schema v1 is deliberately small: themes, ordered pins and structured symbol identity, with no relationships and no derived content.

### Layout

```text
.punaise/
  README.md        # human- and agent-readable guide to the format
  schema.json      # JSON Schema for v1
  themes/
    simulation-execution.json
    authentication.json
    adding-a-model.json
```

The `README.md` explains the format in plain language. It is the file an agent reads before drafting a theme.

### Example theme

```json
{
  "$schema": "../schema.json",
  "version": 1,
  "id": "simulation-execution",
  "name": "Simulation execution",
  "description": "How a simulation moves from an API request to a persisted result.",
  "pins": [
    {
      "id": "simulate-endpoint",
      "type": "symbol",
      "path": "src/api/simulation.py",
      "symbol": { "name": "simulate", "kind": "function", "container": [] },
      "preferredView": "signature"
    },
    {
      "id": "simulation-service-run",
      "type": "symbol",
      "path": "src/services/simulation.py",
      "symbol": {
        "name": "run",
        "kind": "method",
        "container": ["SimulationService"],
        "fingerprint": "9c1e4b2a"
      },
      "preferredView": "code"
    },
    {
      "id": "architecture-doc",
      "type": "markdown",
      "path": "docs/architecture.md",
      "heading": { "text": "Simulation pipeline", "level": 2 }
    },
    {
      "id": "retry-note",
      "type": "note",
      "text": "Retries happen in the queue worker, not in the service."
    }
  ]
}
```

### Format rules

- `version` is required from the first file. Readers ignore unknown fields, so additive changes stay within v1.
- Breaking changes bump `version` and ship with a migration command.
- `symbol.container` lists enclosing symbols from outermost to innermost. An empty array means top level.
- `fingerprint` is optional. The extension writes it; hand-written or agent-written files may omit it.
- Pin `id`s are stable within a theme so that diffs stay readable when pins are reordered.
- Pin order in the array is the canonical display order.
- One theme per file, to limit merge conflicts.

## Technical direction

The extension host owns all privileged work; the webview only renders, and a small shared core powers the extension, the CLI and the MCP server.

### Architecture

- **Core library (TypeScript):** schema, validation, theme loading, serialization and export. Has no dependency on VS Code, so the CLI and MCP server reuse it.
- **Extension host:** commands, editor and cursor tracking, symbol and reference resolution through language providers, file watching, context ranking, and messaging with the sidebar.
- **Sidebar (`WebviewView`):** compact code, Markdown rendering, collapsible pins, drag-and-drop ordering and contextual actions. No file access.
- **CLI and MCP server:** thin wrappers over the core library. Without an editor they resolve symbols through a lightweight parser, and they report when resolution is approximate.

### Code rendering

Webviews receive the editor's UI colours as CSS variables, but not its syntax token colours. Theme-matched highlighting therefore needs a highlighter such as Shiki plus a mapping from the active colour theme. This is budgeted in Phase 0, because readability in a narrow panel decides whether the panel beats a split editor.

### Panel placement

Punaise opens in the right-hand secondary side bar by default, next to the code rather than under the Explorer. A view stacked under the Explorer is too small and too far from where the developer is reading.

- Contribute a view container to the secondary side bar, with a `when`-clause fallback to the activity bar for VS Code versions and forks that lack support. Agent extensions such as Codex and Claude Code already use this pattern.
- The right side bar is also where agent chats live. That suits the agent-context story, but view containers there show as tabs, so Punaise and an agent chat may compete for one slot. Test whether users stack both views in one container, and document how.
- Offer **Open as Editor** as a second mode: the same webview in an editor group, for wide code or a long investigation.
- Remember the user's chosen placement and make reveal and focus commands work wherever the view lives.

### Language integration

Use VS Code's provider commands for document symbols, definitions, references, implementations, type definitions, call hierarchy and hover. Feature-detect each capability and degrade gracefully when a language server lacks it.

### Persistence

- Personal themes: `workspaceState`, plus export/import to JSON
- Repository themes: `.punaise/themes/*.json`
- Preferences: VS Code configuration and `globalState`
- Multi-root workspaces: each root keeps its own `.punaise/` folder; themes are labelled by root

### Performance budgets

- Cursor updates debounced at 150–250 ms; exact theme matching under 50 ms after the debounce
- Document-symbol results cached and invalidated on change
- Expensive views resolved only when expanded
- Reference and call-hierarchy queries capped at 500 ms and cancelled when the cursor moves
- No whole-repository indexing in the MVP

### Distribution

Publish to both the VS Code Marketplace and Open VSX from the same CI pipeline, from the first public build.

### Privacy and security

- No source code is transmitted by default, and there is no telemetry
- Any future telemetry is opt-in, minimal and documented
- The MCP server is local, read-only and opens no network port
- AI features (Phase 5) need explicit opt-in and show the exact payload

## Maintenance strategy

Punaise must not create a new documentation burden: it stores minimal intent, detects staleness instead of preventing it, and attaches repair to normal development.

### Keep persistent data minimal

Store symbol identity, path hints, theme intent and ordering. Never persist generated code, signatures, references or explanations as authoritative content.

### Detect rather than prevent staleness

Every pin resolves to exactly one state:

| State | Meaning | Shown as |
| --- | --- | --- |
| Resolved | Found at the path hint with matching name, kind and container | Normal pin |
| Moved | Found elsewhere by name, kind and container | Pin with a "moved" badge and a one-click path update |
| Renamed candidate | Not found, but a likely match exists (fingerprint, Git history) | Warning with a proposed replacement |
| Ambiguous | Several matches and no fingerprint to decide | Warning listing the candidates |
| Missing | No plausible match | Error, kept in the theme until removed |
| Missing heading | Markdown heading no longer exists | Error with nearest-heading suggestion |
| Unsupported | Language server lacks the capability | Muted pin with an explanation |

### Integrate with normal development

Maintenance happens during browsing, theme use, pull-request review, refactoring and `punaise validate` in CI. Periodic manual doc reviews are not the primary mechanism.

### Different expectations per theme

- Personal investigation themes: no maintenance guarantee
- Shared themes: should resolve and stay useful
- Maintained onboarding or architecture themes: validated in CI

### Prefer recommendations over automatic changes

Automatic repair can silently corrupt intent. Proposed replacements show confidence, evidence and a diff before any shared file changes. The same rule applies to agent-proposed edits.
