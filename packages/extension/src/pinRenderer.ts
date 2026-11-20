import * as vscode from "vscode";
import type { ThemedToken } from "shiki/core";
import { findSymbol, findSymbolPath, signatureLineCount, type SymbolNode, type SymbolPin } from "@punaise/core";
import { fetchSymbols, toNode } from "./pinCommand";
import { StyleClasses, type CodeHighlighter } from "./highlighter";

export interface RenderedPins {
  html: string;
  css: string;
}

/** What the view keeps between renders, so updates only redo cards that changed. */
export interface RenderContext {
  highlighter: CodeHighlighter;
  classes: StyleClasses;
  expanded: ReadonlySet<string>;
  /** Pin id → key of what its card currently shows. */
  shown: Map<string, string>;
}

/** Renders every pin as a page body plus token styles. */
export async function renderPins(pins: readonly SymbolPin[], expanded: ReadonlySet<string>, highlighter: CodeHighlighter): Promise<RenderedPins> {
  const context: RenderContext = { highlighter, classes: new StyleClasses(), expanded, shown: new Map() };
  const cards = await renderCards(pins, context);
  return { html: cards.map((card) => card.html).join("\n"), css: context.classes.css() };
}

/**
 * Renders the cards whose source text or resolution changed since they were last shown, and
 * records them in `context.shown`. All file access happens here, in the extension host.
 */
export async function renderCards(pins: readonly SymbolPin[], context: RenderContext): Promise<{ id: string; html: string }[]> {
  const files = new Map<string, Promise<ResolvedFile | undefined>>();
  const cards: { id: string; html: string }[] = [];
  for (const pin of pins) {
    let file = files.get(pin.path);
    if (!file) files.set(pin.path, (file = resolveFile(pin.path)));
    const source = sourceOf(pin, await file);
    if (context.shown.get(pin.id) === source.key) continue;
    context.shown.set(pin.id, source.key);
    cards.push({ id: pin.id, html: await renderCard(pin, source, context) });
  }
  return cards;
}

interface Source {
  key: string;
  document?: vscode.TextDocument;
  /** The symbol's ancestors, outermost first, ending with the symbol. */
  path?: SymbolNode[];
  lines?: string[];
}

function sourceOf(pin: SymbolPin, file: ResolvedFile | undefined): Source {
  const path = file && findSymbolPath(file.symbols, pin.symbol);
  const node = path?.at(-1);
  if (!file || !path || !node) return { key: file ? "not found" : "no file" };
  const { start, end } = node.range;
  const lines = Array.from({ length: end.line - start.line + 1 }, (_, i) => file.document.lineAt(start.line + i).text);
  return { key: lines.join("\n"), document: file.document, path, lines };
}

async function renderCard(pin: SymbolPin, source: Source, context: RenderContext): Promise<string> {
  const id = escapeHtml(pin.id);
  const title = escapeHtml([...pin.symbol.container, pin.symbol.name].join(" › "));
  const link = `<button class="open" data-open="${id}" title="Open in editor" aria-label="Open ${title} in editor">↗</button>`;
  const header = `<span class="name">${title}</span> <span class="kind">${pin.symbol.kind}</span> <span class="path">${escapeHtml(pin.path)}</span>${link}`;
  const { document, path, lines: text } = source;
  const top = path?.[0];
  const node = path?.at(-1);
  if (!document || !top || !node || !text) {
    return `<div class="pin unresolved" data-id="${id}"><div class="header">${header}</div><p class="note">Not found in ${escapeHtml(pin.path)}.</p></div>`;
  }
  // Highlight from the top-level ancestor, which starts in the grammar's initial state.
  const tokens = await context.highlighter.tokenize(document, top.range.start.line, node.range.end.line);
  const lines = tokens?.slice(node.range.start.line - top.range.start.line) ?? text.map((line) => [{ content: line, offset: 0 }]);
  const indent = Math.min(...text.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length));
  const dedented = lines.map((line) => dropPrefix(line, indent));
  const signature = linesToHtml(dedented.slice(0, signatureLineCount(text)), context.classes);
  const body = linesToHtml(dedented, context.classes);
  return `<details class="pin" data-id="${id}"${context.expanded.has(pin.id) ? " open" : ""}>
<summary><div class="header">${header}</div><pre class="code signature">${signature}</pre></summary>
<pre class="code body">${body}</pre>
</details>`;
}

interface ResolvedFile {
  document: vscode.TextDocument;
  symbols: SymbolNode[];
}

/** Opens a pinned file and gets its symbols; undefined when the file is not in the workspace. */
async function resolveFile(path: string): Promise<ResolvedFile | undefined> {
  const uri = await locate(path);
  if (!uri) return undefined;
  const document = await vscode.workspace.openTextDocument(uri);
  const symbols = await fetchSymbols(uri, 5000);
  const hierarchical = symbols?.every((s) => "children" in s) ? (symbols as vscode.DocumentSymbol[]) : [];
  return { document, symbols: hierarchical.map(toNode) };
}

/** Opens the pin's file and finds its symbol. `node` is undefined when the symbol is not found. */
async function resolvePin(pin: SymbolPin): Promise<{ document: vscode.TextDocument; node?: SymbolNode } | undefined> {
  const file = await resolveFile(pin.path);
  return file && { document: file.document, node: findSymbol(file.symbols, pin.symbol) };
}

/** Opens the pin's file in the active editor group at its symbol, or at the top if the symbol is not found. */
export async function openPin(pin: SymbolPin): Promise<"opened" | "fileMissing"> {
  const resolved = await resolvePin(pin);
  if (!resolved) {
    void vscode.window.showWarningMessage(`Punaise: ${pin.path} could not be found in the workspace.`);
    return "fileMissing";
  }
  const { start, end } = resolved.node?.range ?? { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
  const range = new vscode.Range(start.line, start.character, end.line, end.character);
  const editor = await vscode.window.showTextDocument(resolved.document, { viewColumn: vscode.ViewColumn.Active });
  editor.selection = new vscode.Selection(range.start, range.start);
  editor.revealRange(range, vscode.TextEditorRevealType.AtTop);
  return "opened";
}

/** Finds a workspace-relative path in the first workspace folder that has it. */
async function locate(path: string): Promise<vscode.Uri | undefined> {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const uri = vscode.Uri.joinPath(folder.uri, path);
    try {
      await vscode.workspace.fs.stat(uri);
      return uri;
    } catch {
      // not in this folder
    }
  }
  return undefined;
}

/** Removes the first `count` characters of a line, across tokens. */
function dropPrefix(line: ThemedToken[], count: number): ThemedToken[] {
  let remaining = count;
  const result: ThemedToken[] = [];
  for (const token of line) {
    const cut = Math.min(remaining, token.content.length);
    remaining -= cut;
    if (cut < token.content.length) result.push({ ...token, content: token.content.slice(cut) });
  }
  return result;
}

function linesToHtml(lines: ThemedToken[][], classes: StyleClasses): string {
  return lines.map((line) => line.map((t) => `<span class="${classes.classFor(t)}">${escapeHtml(t.content)}</span>`).join("")).join("\n");
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
