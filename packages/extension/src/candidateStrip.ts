import * as vscode from "vscode";
import { isSameSymbol, symbolChainAtPosition, type AddResult, type PinStore, type SymbolTarget } from "@punaise/core";
import { fetchSymbols, toNode, workspacePath } from "./pinCommand";
import { escapeHtml } from "./pinRenderer";

export interface StripState {
  /** Shown instead of chips when there is nothing to pin. */
  hint?: string;
  /** Pinnable symbols around the cursor, outermost first. */
  candidates: SymbolTarget[];
}

/** The symbols around the editor's cursor that can be pinned. Never waits for a language server. */
export async function candidatesAt(editor: vscode.TextEditor | undefined): Promise<StripState> {
  if (!editor) return { hint: "Open a file to pin its symbols.", candidates: [] };
  const document = editor.document;
  if (document.isUntitled) return { hint: "Save the file to pin its symbols.", candidates: [] };
  const symbols = await fetchSymbols(document.uri, 0);
  if (!symbols?.length || !symbols.every((s) => "children" in s)) return { hint: "No symbols available for this file yet.", candidates: [] };
  const chain = symbolChainAtPosition((symbols as vscode.DocumentSymbol[]).map(toNode), editor.selection.active);
  if (chain.length === 0) return { hint: "Move the cursor into a function or class to pin it.", candidates: [] };
  const path = workspacePath(document.uri);
  return { candidates: chain.map((symbol) => ({ path, symbol })) };
}

/** Chips for the candidates, outermost first; already pinned ones are marked. */
export function renderStrip(state: StripState, store: PinStore): string {
  if (state.hint) return `<span class="hint">${escapeHtml(state.hint)}</span>`;
  const pins = store.list();
  const chips = state.candidates.map((candidate, index) => {
    const name = escapeHtml(candidate.symbol.name);
    const pinned = pins.some((pin) => isSameSymbol(pin, candidate));
    return `<button class="chip${pinned ? " pinned" : ""}" data-candidate="${index}" title="${pinned ? "Already pinned" : `Pin ${name}`}">${name}</button>`;
  });
  return `<span class="hint">Pin</span>${chips.join('<span class="hint">›</span>')}`;
}

/** Keeps the strip in step with the cursor, about `delayMs` after it stops moving. */
export class CandidateStrip implements vscode.Disposable {
  private state: StripState = { candidates: [] };
  private timer?: ReturnType<typeof setTimeout>;
  private runs = 0;
  private readonly disposables: vscode.Disposable[];

  constructor(
    private readonly store: PinStore,
    private readonly onUpdate: (html: string) => void,
    private readonly delayMs = 200,
  ) {
    this.disposables = [
      vscode.window.onDidChangeTextEditorSelection(() => this.schedule()),
      vscode.window.onDidChangeActiveTextEditor(() => this.schedule()),
    ];
    this.schedule();
  }

  /** Recomputes the candidates now. */
  async update(): Promise<void> {
    const run = ++this.runs;
    const state = await candidatesAt(vscode.window.activeTextEditor);
    if (run !== this.runs) return;
    this.state = state;
    this.onUpdate(this.html());
  }

  html(): string {
    return renderStrip(this.state, this.store);
  }

  /** Pins the candidate whose chip was clicked. */
  pin(index: number): AddResult | undefined {
    const candidate = this.state.candidates[index];
    return candidate && this.store.add(candidate);
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.update(), this.delayMs);
  }

  dispose(): void {
    clearTimeout(this.timer);
    for (const disposable of this.disposables) disposable.dispose();
  }
}
