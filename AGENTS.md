# Instructions for coding agents

Punaise is a VS Code extension that keeps the code concepts a developer is reasoning about visible together, and makes that context available to coding agents. Read [docs/vision.md](docs/vision.md) for the why and [docs/design.md](docs/design.md) for the technical direction before making structural decisions.

## How work is chosen

All work comes from [docs/backlog.md](docs/backlog.md).

1. Work on **one backlog item at a time**: the one the human names, or else the highest-priority `todo` item whose dependencies are `done` and that is marked ready.
2. Read the item's description, acceptance criteria, out-of-scope notes and estimate before writing code.
3. Set its status to `doing` when you start and `done` when every acceptance criterion is met.
4. Do not start items marked *Not ready* or owned by `human`.

## Stay inside the item

- Build what the description says, and nothing else. Do not add features, options, refactors or "while I'm here" improvements.
- If you notice something worth doing outside the item, add it as a short new entry at the end of the relevant phase in the backlog, marked *Not ready*, and carry on.
- Out-of-scope notes are binding.

## Respect the estimate

Each item has a size budget (see [estimates](docs/backlog.md#estimates)): changed lines excluding tests, and files touched.

- Check your diff size as you work (for example with `git diff --stat`).
- If you expect to exceed **1.5×** the budget, stop before you do and escalate.
- Spikes are timeboxed: when the timebox is used up, write down what you found and stop.

## Escalation

Stop and escalate to the human instead of deciding yourself when:

- The item will exceed 1.5× its estimate.
- The description is ambiguous, contradicts the docs, or an acceptance criterion cannot be met as written.
- You need a new runtime dependency, or want to change a dev dependency's major version.
- The change would alter the theme file format, schema, command names, settings or anything else users or repositories depend on.
- You would need to touch files clearly outside the item's scope.
- The work would add network access, telemetry, or send source code anywhere.
- Tests or tooling fail for reasons unrelated to the item.
- You have tried the same approach twice without success.

An escalation is a short message containing:

1. **What** you were doing (item ID and step).
2. **Why** you stopped (which rule above).
3. **Options**, each with its cost against the estimate.
4. **Your recommendation.**

Then wait. Do not continue on a guess.

## Definition of done

- Every acceptance criterion is met.
- `npm run build`, `npm test` and `npm run lint` pass.
- New behaviour has tests where practical: unit tests for `packages/core`, integration tests for extension behaviour.
- The backlog item's status is updated, with a one-line note if anything differed from the plan.
- One commit per item, with a message starting with the item ID, for example `PUN-005: Pin Current Symbol command`.

## Ground rules from the design

- `packages/core` never imports `vscode`. The CLI and MCP server will reuse it.
- The webview only renders. File access, symbol resolution and anything privileged stay in the extension host.
- Theme files store intent, not content: never persist code, signatures or explanations as authoritative data.
- No network access, no telemetry, and no source code leaves the machine.
- TypeScript in strict mode. Prefer small, readable functions over clever abstractions.
