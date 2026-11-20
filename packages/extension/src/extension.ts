import * as vscode from "vscode";
import { PinStore } from "@punaise/core";
import { PinboardViewProvider } from "./pinboardView";
import { pinCurrentSymbol, showOutcome } from "./pinCommand";

/** Secondary side bar view containers arrived in VS Code 1.106. */
export function supportsSecondarySidebar(version: string): boolean {
  const [major = 0, minor = 0] = version.split(".").map(Number);
  return major > 1 || (major === 1 && minor >= 106);
}

export function activate(context: vscode.ExtensionContext): void {
  const secondary = supportsSecondarySidebar(vscode.version);
  if (!secondary) {
    void vscode.commands.executeCommand("setContext", "punaise.noSecondarySidebar", true);
  }
  const store = new PinStore();
  const provider = new PinboardViewProvider(store);
  for (const viewId of ["punaise.pinboard", "punaise.pinboardFallback"]) {
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewId, provider));
  }
  context.subscriptions.push(
    vscode.commands.registerCommand("punaise.pinCurrentSymbol", async () => {
      const outcome = await pinCurrentSymbol(store);
      showOutcome(outcome);
      if (outcome.kind === "pinned" || outcome.kind === "alreadyPinned") {
        provider.refresh();
        await provider.reveal(secondary ? "punaise.pinboard" : "punaise.pinboardFallback");
      }
      return outcome;
    }),
  );
}

export function deactivate(): void {}
