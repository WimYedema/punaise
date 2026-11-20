# Punaise

**Keep the code you are reasoning about in view.**

Punaise is a VS Code extension that keeps the code concepts a developer is reasoning about visible together, and makes that same context available to coding agents.

*Punaise* is Dutch and French for pushpin.

> **Status: pre-alpha.** Nothing is usable yet. The plan is in [docs/](docs/).

## The idea

Understanding one feature or bug usually means holding an entry point, a service, a model, a test and a piece of documentation in mind at once. Editors show one location at a time, so you chase definitions, reopen files and lose your train of thought.

Punaise lets you pin the functions, classes and documentation you are working with into a panel beside the editor, where they stay live and readable together:

- **Code-first, not notes-first.** You collect the code itself, shown live. Notes are optional.
- **Themes.** Group pins into themes such as "Authentication flow". Keep them personal, share them with a colleague, or commit them to the repository for review like any other change.
- **Follows you.** When you open code that belongs to a theme, the theme appears.
- **Context for agents.** Hand any theme to your coding agent, through a copy command or a local MCP server, so it starts from the same picture you have.
- **Useful without AI, private by default.** No account, no telemetry, and your code stays on your machine.

## Install

Punaise is available as an **alpha pre-release** on the Marketplace: search for "Punaise" in the Extensions view and install the pre-release, or run:

```sh
code --install-extension ienfald.punaise --pre-release
```

To publish a new version, bump `version` in `packages/extension/package.json` and push a matching tag (`v0.1.1`); the release workflow tests and publishes it.

### From source

To use the current build from this repository:

```sh
npm install
npm run package
code --install-extension packages/extension/punaise.vsix
```

Then reload VS Code. Run the same commands again to update. Pins are kept in memory only until persistence arrives in Phase 1.

## Documentation

- [Vision](docs/vision.md): the problem, principles, product model and positioning
- [User journeys](docs/journeys.md): how Punaise is used, step by step
- [Design](docs/design.md): repository format, technical direction and maintenance
- [Roadmap](docs/roadmap.md): phases, gates, metrics and risks
- [Backlog](docs/backlog.md): prioritized, estimated work items

## Contributing

It is early days. Issues and ideas are welcome. If you use a coding agent, it should follow [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
