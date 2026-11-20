import * as vscode from "vscode";
import { symbolAtPosition, type AddResult, type PinStore, type SymbolKind, type SymbolNode } from "@punaise/core";

export type PinOutcome =
  | { kind: "pinned" | "alreadyPinned"; result: AddResult }
  | { kind: "noEditor" | "untitled" | "noSymbols" | "notInSymbol" }
  | { kind: "noProvider" | "flatSymbols"; languageId: string };

/** How long to wait for a language server that is still starting (Pylance took about 5 s in PUN-003). */
const DEFAULT_WAIT_MS = 10_000;

/** Pins the innermost symbol at the cursor of the active editor. */
export async function pinCurrentSymbol(store: PinStore, waitMs = DEFAULT_WAIT_MS): Promise<PinOutcome> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return { kind: "noEditor" };
  const document = editor.document;
  if (document.isUntitled) return { kind: "untitled" };

  const symbols = await fetchSymbols(document.uri, waitMs);
  if (symbols === undefined) return { kind: "noProvider", languageId: document.languageId };
  if (symbols.length === 0) return { kind: "noSymbols" };
  if (!isHierarchical(symbols)) return { kind: "flatSymbols", languageId: document.languageId };

  const symbol = symbolAtPosition(symbols.map(toNode), editor.selection.active);
  if (!symbol) return { kind: "notInSymbol" };

  const path = vscode.workspace.asRelativePath(document.uri, false).replace(/\\/g, "/");
  const result = store.add({ path, symbol });
  return { kind: result.added ? "pinned" : "alreadyPinned", result };
}

type ProviderResult = (vscode.DocumentSymbol | vscode.SymbolInformation)[] | undefined;

/**
 * The provider returns undefined both while a language server is starting and when there is
 * none, so retry for a while before giving up (see docs/spikes/symbol-identity.md).
 */
async function fetchSymbols(uri: vscode.Uri, waitMs: number): Promise<ProviderResult> {
  const query = () => vscode.commands.executeCommand<ProviderResult>("vscode.executeDocumentSymbolProvider", uri);
  const first = await query();
  if (first !== undefined || waitMs <= 0) return first;
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: "Punaise: waiting for the language server" },
    async () => {
      const deadline = Date.now() + waitMs;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const symbols = await query();
        if (symbols !== undefined) return symbols;
      }
      return undefined;
    },
  );
}

function isHierarchical(symbols: (vscode.DocumentSymbol | vscode.SymbolInformation)[]): symbols is vscode.DocumentSymbol[] {
  return symbols.every((symbol) => "children" in symbol);
}

function toNode(symbol: vscode.DocumentSymbol): SymbolNode {
  return { name: symbol.name, kind: toKind(symbol.kind), range: symbol.range, children: symbol.children.map(toNode) };
}

/** `vscode.SymbolKind.EnumMember` becomes `enumMember`. */
export function toKind(kind: vscode.SymbolKind): SymbolKind {
  const name = vscode.SymbolKind[kind];
  return (name.charAt(0).toLowerCase() + name.slice(1)) as SymbolKind;
}

/** Tells the user what happened, specifically, instead of failing silently. */
export function showOutcome(outcome: PinOutcome): void {
  switch (outcome.kind) {
    case "pinned":
      vscode.window.setStatusBarMessage(`Punaise: pinned ${outcome.result.pin.symbol.name}`, 3000);
      return;
    case "alreadyPinned":
      vscode.window.setStatusBarMessage(`Punaise: ${outcome.result.pin.symbol.name} is already pinned`, 3000);
      return;
    case "noEditor":
      void vscode.window.showInformationMessage("Punaise: open a file and put the cursor in a function or class to pin it.");
      return;
    case "untitled":
      void vscode.window.showInformationMessage("Punaise: save the file first. Only symbols in saved files can be pinned.");
      return;
    case "noSymbols":
      void vscode.window.showInformationMessage("Punaise: the language server found no symbols in this file.");
      return;
    case "notInSymbol":
      void vscode.window.showInformationMessage("Punaise: the cursor is not inside a function, class or other symbol. Move it into one and try again.");
      return;
    case "noProvider":
      void vscode.window.showWarningMessage(
        `Punaise: no symbols are available for ${outcome.languageId} files. The language server may still be loading, so try again in a moment. ` +
          `If this keeps happening, install an extension that provides symbols for ${outcome.languageId}.`,
      );
      return;
    case "flatSymbols":
      void vscode.window.showWarningMessage(
        `Punaise: the ${outcome.languageId} language server reports symbols without nesting, which Punaise does not support yet.`,
      );
      return;
  }
}
