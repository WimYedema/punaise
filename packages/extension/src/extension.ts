import * as vscode from "vscode";
import { PinboardViewProvider } from "./pinboardView";

/** Secondary side bar view containers arrived in VS Code 1.106. */
export function supportsSecondarySidebar(version: string): boolean {
  const [major = 0, minor = 0] = version.split(".").map(Number);
  return major > 1 || (major === 1 && minor >= 106);
}

export function activate(context: vscode.ExtensionContext): void {
  if (!supportsSecondarySidebar(vscode.version)) {
    void vscode.commands.executeCommand("setContext", "punaise.noSecondarySidebar", true);
  }
  const provider = new PinboardViewProvider();
  for (const viewId of ["punaise.pinboard", "punaise.pinboardFallback"]) {
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewId, provider));
  }
}

export function deactivate(): void {}
