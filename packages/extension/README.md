# Punaise

> **Alpha pre-release.** Expect rough edges and breaking changes. Pins are kept in memory only and are lost when VS Code closes.

Keep the code you are reasoning about in view. Pin the functions, classes and methods you are working with into a panel beside the editor, where they stay live and highlighted in your colour theme.

## Using it

The Punaise panel opens in the secondary side bar on the right (in the activity bar on VS Code before 1.106).

- **Pin** the symbol under the cursor with `Alt+P` (`Cmd+Alt+P` on macOS), or click it, or one of its enclosing symbols, in the strip at the top of the panel.
- **Read** a pin's signature on its card; click the card to expand the full code.
- **Open** the source with `↗`, and **remove** a pin with `×`.
- Cards **update as you edit**. A renamed symbol shows as "Not found" until it is back.

Works with any language whose extension provides document symbols. Tested with TypeScript and with Python through Pylance.

## Privacy

No network access and no telemetry. Your code never leaves your machine.

## Feedback

Ideas and bugs are welcome at [github.com/WimYedema/punaise/issues](https://github.com/WimYedema/punaise/issues).
