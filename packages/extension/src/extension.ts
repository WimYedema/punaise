import * as vscode from "vscode";
import { PinStore } from "@punaise/core";
import { PinboardViewProvider } from "./pinboardView";
import { pinCurrentSymbol, showOutcome, type PinOutcome } from "./pinCommand";
import { CandidateStrip } from "./candidateStrip";
import { PinnedFileWatcher } from "./pinnedFileWatcher";

/** Secondary side bar view containers arrived in VS Code 1.106. */
export function supportsSecondarySidebar(version: string): boolean {
  const [major = 0, minor = 0] = version.split(".").map(Number);
  return major > 1 || (major === 1 && minor >= 106);
}

interface Manifest {
  contributes?: { keybindings?: { command: string; key?: string; mac?: string }[] };
}

/** The pin command's default keybinding, e.g. "Alt+P". VS Code does not tell extensions about rebindings. */
export function defaultKeybinding(manifest: Manifest, platform: string): string | undefined {
  const binding = manifest.contributes?.keybindings?.find((k) => k.command === "punaise.pinCurrentSymbol");
  const key = platform === "darwin" ? (binding?.mac ?? binding?.key) : binding?.key;
  return key?.split("+").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("+");
}

export function activate(context: vscode.ExtensionContext): void {
  const secondary = supportsSecondarySidebar(vscode.version);
  if (!secondary) {
    void vscode.commands.executeCommand("setContext", "punaise.noSecondarySidebar", true);
  }
  const store = new PinStore();
  const provider = new PinboardViewProvider(store, {
    onPinCandidate: (index) => {
      const result = strip.pin(index);
      if (result) void afterPin({ kind: result.added ? "pinned" : "alreadyPinned", result });
    },
    onRemoved: () => provider.setStrip(strip.html()),
    keybinding: defaultKeybinding(context.extension.packageJSON, process.platform),
    state: context.globalState,
  });
  const strip = new CandidateStrip(store, (html) => provider.setStrip(html));
  const afterPin = async (outcome: PinOutcome) => {
    showOutcome(outcome);
    if (outcome.kind !== "pinned" && outcome.kind !== "alreadyPinned") return;
    provider.setStrip(strip.html());
    await provider.refresh();
    await provider.reveal(secondary ? "punaise.pinboard" : "punaise.pinboardFallback");
  };
  for (const viewId of ["punaise.pinboard", "punaise.pinboardFallback"]) {
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewId, provider));
  }
  context.subscriptions.push(
    strip,
    vscode.commands.registerCommand("punaise.pinCurrentSymbol", async () => {
      const outcome = await pinCurrentSymbol(store);
      await afterPin(outcome);
      return outcome;
    }),
    new PinnedFileWatcher(
      (path) => store.list().some((pin) => pin.path === path),
      (path) => void provider.fileChanged(path),
    ),
    vscode.window.onDidChangeActiveColorTheme(() => provider.themeChanged()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("editor.tokenColorCustomizations")) provider.themeChanged();
    }),
  );
}

export function deactivate(): void {}
