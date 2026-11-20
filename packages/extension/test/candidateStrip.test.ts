import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { PinStore } from "@punaise/core";
import { CandidateStrip, candidatesAt, renderStrip, type StripState } from "../src/candidateStrip";

/** Opens a fixture with the cursor at `text`, waiting until its language server answers. */
async function cursorAt(file: string, text: string, waitForSymbols = true): Promise<vscode.TextEditor> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(folder.uri, file));
  const editor = await vscode.window.showTextDocument(document);
  const position = document.positionAt(document.getText().indexOf(text));
  editor.selection = new vscode.Selection(position, position);
  for (let i = 0; waitForSymbols && i < 40 && !(await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", document.uri)); i++) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return editor;
}

const chips = (html: string) => [...html.matchAll(/<button class="chip( pinned)?" data-candidate="\d+"[^>]*>([^<]*)</g)].map((m) => `${m[2]}${m[1] ? " (pinned)" : ""}`);

suite("Pin candidate strip", () => {
  test("shows the symbol under the cursor and its enclosing symbols", async () => {
    const state = await candidatesAt(await cursorAt("sample.ts", "return localHelper()"));
    assert.deepEqual(chips(renderStrip(state, new PinStore())), ["SimulationService", "run", "localFunction"]);
  });

  test("clicking a chip pins it; a pinned chip is marked and does not pin twice", async () => {
    const store = new PinStore();
    const updates: string[] = [];
    const strip = new CandidateStrip(store, (html) => updates.push(html), 10);
    try {
      await cursorAt("sample.ts", "return this.store.get(id)");
      await strip.update();
      assert.deepEqual(chips(strip.html()), ["SimulationService", "run"]);
      assert.equal(strip.pin(1)?.added, true);
      assert.deepEqual(store.list().map((pin) => pin.symbol.name), ["run"]);
      assert.deepEqual(chips(strip.html()), ["SimulationService", "run (pinned)"]);
      assert.equal(strip.pin(1)?.added, false);
      assert.equal(store.list().length, 1);
    } finally {
      strip.dispose();
    }
  });

  test("follows the cursor once it stops moving", async () => {
    const updates: string[] = [];
    const strip = new CandidateStrip(new PinStore(), (html) => updates.push(html), 50);
    try {
      const editor = await cursorAt("sample.ts", "return n.toFixed(2)");
      const position = editor.document.positionAt(editor.document.getText().indexOf("return localHelper()"));
      editor.selection = new vscode.Selection(position, position);
      await new Promise((resolve) => setTimeout(resolve, 400));
      assert.deepEqual(chips(updates.at(-1) ?? ""), ["SimulationService", "run", "localFunction"]);
    } finally {
      strip.dispose();
    }
  });

  test("shows a hint instead of chips when there is nothing to pin", async () => {
    const hint = (state: StripState) => renderStrip(state, new PinStore());
    assert.match(hint(await candidatesAt(await cursorAt("sample.ts", "PUN-003 fixture"))), /Move the cursor into a function or class/);
    assert.match(hint(await candidatesAt(await cursorAt("plain.txt", "Plain text", false))), /No symbols available/);
    assert.match(hint(await candidatesAt(undefined)), /Open a file/);
  });
});
