import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { PRODUCT_NAME, type PinStore, type SymbolPin } from "@punaise/core";

/** Renders the pinboard. The webview only displays what the host gives it. */
export class PinboardViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly store: PinStore) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: false, localResourceRoots: [] };
    view.onDidDispose(() => {
      if (this.view === view) this.view = undefined;
    });
    this.refresh();
  }

  /** Re-renders the pins, if the view has been opened. */
  refresh(): void {
    if (this.view) this.view.webview.html = renderPinboardHtml(randomBytes(16).toString("base64"), this.store.list());
  }

  /** Shows the view without taking focus from the editor, opening it first if needed. */
  async reveal(viewId: string): Promise<void> {
    if (this.view) {
      this.view.show(true);
      return;
    }
    await vscode.commands.executeCommand(`${viewId}.focus`);
    await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  }
}

/** Strict CSP: nothing loads except the nonce-tagged inline style. No scripts, no network. */
export function renderPinboardHtml(nonce: string, pins: readonly SymbolPin[] = []): string {
  const csp = `default-src 'none'; style-src 'nonce-${nonce}';`;
  const body = pins.length === 0 ? "<p>No pins yet.</p>" : `<ul>${pins.map(renderPin).join("")}</ul>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style nonce="${nonce}">
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 0 12px; }
    h1 { font-size: 1.1em; font-weight: 600; }
    p, .container { color: var(--vscode-descriptionForeground); }
    ul { list-style: none; padding: 0; }
    li { padding: 2px 0; }
  </style>
</head>
<body>
  <h1>${PRODUCT_NAME}</h1>
  ${body}
</body>
</html>`;
}

function renderPin(pin: SymbolPin): string {
  const container = pin.symbol.container.length ? ` <span class="container">${escapeHtml(pin.symbol.container.join(" › "))}</span>` : "";
  return `<li>${escapeHtml(pin.symbol.name)}${container}</li>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
