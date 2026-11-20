import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { PRODUCT_NAME, type PinStore } from "@punaise/core";
import { openPin, renderCards, type RenderContext, type RenderedPins } from "./pinRenderer";
import { CodeHighlighter, StyleClasses } from "./highlighter";

/** Renders the pinboard. The webview only displays what the host gives it. */
export class PinboardViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private readonly expanded = new Set<string>();
  private readonly highlighter = new CodeHighlighter();
  private context = this.newContext();
  /** Renders run one at a time, so results never arrive out of order. */
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly store: PinStore) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [] };
    view.webview.onDidReceiveMessage((message: unknown) => this.onMessage(message));
    view.onDidChangeVisibility(() => {
      if (view.visible) void this.refresh();
    });
    view.onDidDispose(() => {
      if (this.view === view) this.view = undefined;
    });
    void this.refresh();
  }

  /** Re-renders the whole view, if it has been opened. */
  refresh(): Promise<void> {
    return this.enqueue(async () => {
      if (!this.view) return;
      this.context = this.newContext();
      const cards = await renderCards(this.store.list(), this.context);
      const content = { html: cards.map((card) => card.html).join("\n"), css: this.context.classes.css() };
      if (this.view) this.view.webview.html = renderPinboardHtml(randomBytes(16).toString("base64"), content);
    });
  }

  /** Updates, in place, the cards of pins in a changed file whose code or resolution changed. */
  fileChanged(path: string): Promise<void> {
    return this.enqueue(async () => {
      if (!this.view?.visible) return; // a hidden view is re-rendered in full when shown again
      const cards = await renderCards(this.store.list().filter((pin) => pin.path === path), this.context);
      if (cards.length > 0 && this.view) await this.view.webview.postMessage({ type: "cards", cards, css: this.context.classes.css() });
    });
  }

  /** Re-renders with the new colour theme. */
  themeChanged(): void {
    this.highlighter.reset();
    void this.refresh();
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

  private newContext(): RenderContext {
    return { highlighter: this.highlighter, classes: new StyleClasses(), expanded: this.expanded, shown: new Map() };
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(task).catch((error: unknown) => console.error("Punaise: rendering failed", error));
    return this.queue;
  }

  /** The webview reports cards being opened or closed, so a re-render keeps them that way. */
  private onMessage(message: unknown): void {
    const m = message as { type?: unknown; id?: unknown; open?: unknown };
    if (typeof m?.id !== "string") return;
    if (m.type === "toggle") {
      if (m.open === true) this.expanded.add(m.id);
      else this.expanded.delete(m.id);
    } else if (m.type === "open") {
      const pin = this.store.list().find((p) => p.id === m.id);
      if (pin) void openPin(pin);
    }
  }
}

/**
 * The script reports open/closed cards and link clicks, keeps the scroll position across
 * re-renders, and swaps in cards the host re-rendered. Listeners are delegated, so swapped-in
 * cards work without rebinding.
 */
const SCRIPT = `
const vscode = acquireVsCodeApi();
window.scrollTo(0, (vscode.getState() || {}).scrollY || 0);
addEventListener("scroll", () => vscode.setState({ scrollY: window.scrollY }));
document.addEventListener("toggle", (event) => {
  const card = event.target;
  if (card instanceof HTMLDetailsElement && card.dataset.id) vscode.postMessage({ type: "toggle", id: card.dataset.id, open: card.open });
}, true);
document.addEventListener("click", (event) => {
  const link = event.target instanceof Element && event.target.closest("button[data-open]");
  if (!link) return;
  event.preventDefault();
  event.stopPropagation();
  vscode.postMessage({ type: "open", id: link.dataset.open });
}, true);
addEventListener("message", (event) => {
  if (event.data?.type !== "cards") return;
  document.getElementById("tokens").textContent = event.data.css;
  for (const card of event.data.cards) {
    const element = document.querySelector('[data-id="' + CSS.escape(card.id) + '"]');
    if (element) element.outerHTML = card.html;
  }
});`;

/** Strict CSP: only nonce-tagged style and script, no other sources, no network. */
export function renderPinboardHtml(nonce: string, content: RenderedPins = { html: "", css: "" }): string {
  const csp = `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';`;
  const body = content.html || "<p>No pins yet.</p>";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style nonce="${nonce}">
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 0 8px; }
    h1 { font-size: 1.1em; font-weight: 600; }
    p { color: var(--vscode-descriptionForeground); }
    .pin { margin: 0 0 6px; border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); border-radius: 4px;
      background: var(--vscode-editor-background); overflow: hidden; }
    summary { cursor: pointer; list-style: none; }
    summary::-webkit-details-marker { display: none; }
    .header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 6px; padding: 4px 6px;
      background: var(--vscode-sideBarSectionHeader-background, transparent); }
    .header::before { content: "▸"; color: var(--vscode-descriptionForeground); }
    details[open] .header::before { content: "▾"; }
    .unresolved .header::before { content: "!"; color: var(--vscode-errorForeground); }
    .name { font-weight: 600; overflow-wrap: anywhere; }
    .kind, .path { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
    .path { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .open { margin-left: auto; padding: 0 2px; border: none; background: none; font: inherit; cursor: pointer;
      color: var(--vscode-textLink-foreground); }
    .open:hover { color: var(--vscode-textLink-activeForeground); }
    .open:focus-visible { outline: 1px solid var(--vscode-focusBorder); }
    .code { margin: 0; padding: 4px 6px; overflow-x: auto; white-space: pre; tab-size: 4; line-height: 1.4;
      font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); color: var(--vscode-editor-foreground); }
    details[open] .signature { display: none; }
    .body { max-height: 20em; overflow: auto; }
    .note { margin: 0; padding: 4px 6px; color: var(--vscode-errorForeground); }
  </style>
  <style nonce="${nonce}" id="tokens">${content.css}</style>
</head>
<body>
  <h1>${PRODUCT_NAME}</h1>
  ${body}
  <script nonce="${nonce}">${SCRIPT}</script>
</body>
</html>`;
}
