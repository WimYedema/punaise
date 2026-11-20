import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { PRODUCT_NAME } from "@punaise/core";

/** Renders the pinboard. The webview only displays what the host gives it. */
export class PinboardViewProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(view: vscode.WebviewView): void {
    view.webview.options = { enableScripts: false, localResourceRoots: [] };
    view.webview.html = renderPinboardHtml(randomBytes(16).toString("base64"));
  }
}

/** Strict CSP: nothing loads except the nonce-tagged inline style. No scripts, no network. */
export function renderPinboardHtml(nonce: string): string {
  const csp = `default-src 'none'; style-src 'nonce-${nonce}';`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style nonce="${nonce}">
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 0 12px; }
    h1 { font-size: 1.1em; font-weight: 600; }
    p { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h1>${PRODUCT_NAME}</h1>
  <p>No pins yet.</p>
</body>
</html>`;
}
