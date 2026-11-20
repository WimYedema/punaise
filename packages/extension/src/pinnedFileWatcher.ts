import * as vscode from "vscode";
import { workspacePath } from "./pinCommand";

/**
 * Reports changes to pinned files, from editor edits and from disk, once typing pauses:
 * `onChange` runs `delayMs` after the last change to a file. Unpinned files cost one lookup.
 */
export class PinnedFileWatcher implements vscode.Disposable {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly disposables: vscode.Disposable[];

  constructor(
    private readonly isPinned: (path: string) => boolean,
    private readonly onChange: (path: string) => void,
    private readonly delayMs = 200,
  ) {
    const files = vscode.workspace.createFileSystemWatcher("**/*");
    this.disposables = [
      files,
      files.onDidChange((uri) => this.touched(uri)),
      files.onDidCreate((uri) => this.touched(uri)),
      files.onDidDelete((uri) => this.touched(uri)),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length > 0) this.touched(event.document.uri);
      }),
    ];
  }

  private touched(uri: vscode.Uri): void {
    if (uri.scheme !== "file") return;
    const path = workspacePath(uri);
    if (!this.isPinned(path)) return;
    clearTimeout(this.timers.get(path));
    this.timers.set(
      path,
      setTimeout(() => {
        this.timers.delete(path);
        this.onChange(path);
      }, this.delayMs),
    );
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    for (const disposable of this.disposables) disposable.dispose();
  }
}
