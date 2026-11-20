import * as vscode from "vscode";
import type { ThemedToken } from "shiki/core";
import { findSymbol, signatureLineCount, type SymbolNode, type SymbolPin } from "@punaise/core";
import { fetchSymbols, toNode } from "./pinCommand";
import { StyleClasses, type CodeHighlighter } from "./highlighter";

export interface RenderedPins {
  html: string;
  css: string;
}

/** Renders pins as collapsible cards. All file access happens here, in the extension host. */
export async function renderPins(pins: readonly SymbolPin[], expanded: ReadonlySet<string>, highlighter: CodeHighlighter): Promise<RenderedPins> {
  const classes = new StyleClasses();
  const cards: string[] = [];
  for (const pin of pins) cards.push(await renderCard(pin, expanded.has(pin.id), highlighter, classes));
  return { html: cards.join("\n"), css: classes.css() };
}

async function renderCard(pin: SymbolPin, open: boolean, highlighter: CodeHighlighter, classes: StyleClasses): Promise<string> {
  const title = escapeHtml([...pin.symbol.container, pin.symbol.name].join(" › "));
  const link = `<button class="open" data-open="${escapeHtml(pin.id)}" title="Open in editor" aria-label="Open ${title} in editor">↗</button>`;
  const header = `<span class="name">${title}</span> <span class="kind">${pin.symbol.kind}</span> <span class="path">${escapeHtml(pin.path)}</span>${link}`;
  const code = await loadCode(pin, highlighter);
  if (!code) {
    return `<div class="pin unresolved"><div class="header">${header}</div><p class="note">Not found in ${escapeHtml(pin.path)}.</p></div>`;
  }
  const signature = linesToHtml(code.lines.slice(0, code.signatureLines), classes);
  const body = linesToHtml(code.lines, classes);
  return `<details class="pin" data-id="${escapeHtml(pin.id)}"${open ? " open" : ""}>
<summary><div class="header">${header}</div><pre class="code signature">${signature}</pre></summary>
<pre class="code body">${body}</pre>
</details>`;
}

interface Code {
  lines: ThemedToken[][];
  signatureLines: number;
}

/** The pinned symbol's lines, highlighted in the context of the whole file and dedented. */
async function loadCode(pin: SymbolPin, highlighter: CodeHighlighter): Promise<Code | undefined> {
  const resolved = await resolvePin(pin);
  if (!resolved?.node) return undefined;
  const { document, node } = resolved;

  const { start, end } = node.range;
  const text = Array.from({ length: end.line - start.line + 1 }, (_, i) => document.lineAt(start.line + i).text);
  const tokens = (await highlighter.tokenize(document))?.slice(start.line, end.line + 1) ?? text.map((line) => [{ content: line, offset: 0 }]);
  const indent = Math.min(...text.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length));
  return { lines: tokens.map((line) => dropPrefix(line, indent)), signatureLines: signatureLineCount(text) };
}

/** Opens the pin's file and finds its symbol. `node` is undefined when the symbol is not found. */
async function resolvePin(pin: SymbolPin): Promise<{ document: vscode.TextDocument; node?: SymbolNode } | undefined> {
  const uri = await locate(pin.path);
  if (!uri) return undefined;
  const document = await vscode.workspace.openTextDocument(uri);
  const symbols = await fetchSymbols(uri, 5000);
  const hierarchical = symbols?.every((s) => "children" in s) ? (symbols as vscode.DocumentSymbol[]) : undefined;
  return { document, node: hierarchical && findSymbol(hierarchical.map(toNode), pin.symbol) };
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
