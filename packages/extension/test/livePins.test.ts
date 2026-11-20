import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { PinStore, type SymbolPin } from "@punaise/core";
import { renderCards, type RenderContext } from "../src/pinRenderer";
import { CodeHighlighter, StyleClasses } from "../src/highlighter";
import { PinnedFileWatcher } from "../src/pinnedFileWatcher";

const LIVE = `export class Service {
  run(id: string): number {
    return id.length;
  }

  other(): void {}
}

export function unpinned(): number {
  return 1;
}
`;

const LARGE =
  Array.from({ length: 5000 }, (_, i) => `export const value${i} = ${i};`).join("\n") +
  `\nexport class Large {\n  pinned(): number {\n    return 1;\n  }\n}\n`;

function folder(): vscode.Uri {
  const root = vscode.workspace.workspaceFolders?.[0];
  assert.ok(root);
  return root.uri;
}

const uriOf = (name: string) => vscode.Uri.joinPath(folder(), name);

async function document(name: string): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument(uriOf(name));
}

/** Replaces the first occurrence of `from` in an open document, without saving. */
async function replace(name: string, from: string, to: string): Promise<void> {
  const doc = await document(name);
  const offset = doc.getText().indexOf(from);
  assert.notEqual(offset, -1, `${name} contains ${from}`);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(doc.uri, new vscode.Range(doc.positionAt(offset), doc.positionAt(offset + from.length)), to);
  assert.ok(await vscode.workspace.applyEdit(edit));
}

const context = (): RenderContext => ({ highlighter: new CodeHighlighter(), classes: new StyleClasses(), expanded: new Set(), shown: new Map() });
const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&gt;/g, ">");

suite("Live pins", () => {
  let pins: SymbolPin[];

  suiteSetup(async () => {
    await vscode.workspace.fs.writeFile(uriOf("live.ts"), new TextEncoder().encode(LIVE));
    await vscode.workspace.fs.writeFile(uriOf("large.ts"), new TextEncoder().encode(LARGE));
    const store = new PinStore();
    store.add({ path: "live.ts", symbol: { name: "run", kind: "method", container: ["Service"] } });
    store.add({ path: "live.ts", symbol: { name: "other", kind: "method", container: ["Service"] } });
    pins = [...store.list()];
  });

  suiteTeardown(async () => {
    for (const name of ["live.ts", "large.ts", "plain.txt"]) {
      await vscode.window.showTextDocument(await document(name));
      await vscode.commands.executeCommand("workbench.action.files.revert");
    }
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await vscode.workspace.fs.delete(uriOf("live.ts"));
    await vscode.workspace.fs.delete(uriOf("large.ts"));
  });

  test("editing a pinned function re-renders only its card", async () => {
    const ctx = context();
    assert.equal((await renderCards(pins, ctx)).length, 2);
    assert.equal((await renderCards(pins, ctx)).length, 0, "nothing changed, nothing re-rendered");
    await replace("live.ts", "return id.length;", "return id.length + 1;");
    const cards = await renderCards(pins, ctx);
    assert.deepEqual(cards.map((card) => card.id), ["service-run"]);
    assert.match(text(cards[0]?.html ?? ""), /return id\.length \+ 1;/);
  });

  test("editing outside pinned symbols re-renders nothing", async () => {
    const ctx = context();
    await renderCards(pins, ctx);
    await replace("live.ts", "return 1;", "return 2;");
    assert.deepEqual(await renderCards(pins, ctx), []);
  });

  test("renaming shows the pin as not found; undo resolves it again", async () => {
    const ctx = context();
    await renderCards(pins, ctx);
    await vscode.window.showTextDocument(await document("live.ts"));
    await replace("live.ts", "run(id: string)", "runRenamed(id: string)");
    const renamed = await renderCards(pins, ctx);
    assert.match(renamed[0]?.html ?? "", /class="pin unresolved" data-id="service-run"/);
    await vscode.commands.executeCommand("undo");
    const restored = await renderCards(pins, ctx);
    assert.match(restored[0]?.html ?? "", /<details class="pin" data-id="service-run"/);
  });

  test("the watcher reports a pinned file once typing pauses, and ignores other files", async () => {
    const changed: string[] = [];
    const watcher = new PinnedFileWatcher((path) => path === "live.ts", (path) => changed.push(path), 100);
    try {
      await replace("live.ts", "other(): void {}", "other(): void { }");
      await replace("live.ts", "other(): void { }", "other(): void {  }");
      await replace("plain.txt", "Plain text", "Plain text, edited");
      await new Promise((resolve) => setTimeout(resolve, 400));
      assert.deepEqual(changed, ["live.ts"]);
    } finally {
      watcher.dispose();
    }
  });

  test("a pinned method at the end of a 5000-line file updates quickly", async () => {
    const store = new PinStore();
    store.add({ path: "large.ts", symbol: { name: "pinned", kind: "method", container: ["Large"] } });
    const ctx = context();
    await renderCards(store.list(), ctx); // warm up the language server
    await replace("large.ts", "export const value10 = 10;", "export const value10 = 11;");
    let start = performance.now();
    assert.deepEqual(await renderCards(store.list(), ctx), [], "an edit elsewhere in the file re-renders nothing");
    const unchangedMs = performance.now() - start;
    await replace("large.ts", "    return 1;\n  }\n}", "    return 2;\n  }\n}");
    start = performance.now();
    assert.equal((await renderCards(store.list(), ctx)).length, 1);
    const changedMs = performance.now() - start;
    console.log(`      large file: unchanged card ${unchangedMs.toFixed(0)} ms, changed card ${changedMs.toFixed(0)} ms`);
    assert.ok(changedMs < 1000, `update took ${changedMs} ms`);
  });
});
