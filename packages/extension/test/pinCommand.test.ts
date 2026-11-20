import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { PinStore } from "@punaise/core";
import { pinCurrentSymbol, toKind, type PinOutcome } from "../src/pinCommand";

function fixture(name: string): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, "tests run with test-fixtures/symbols as the workspace");
  return vscode.Uri.joinPath(folder.uri, name);
}

/** Opens a fixture and puts the cursor at the first occurrence of `text`. */
async function placeCursor(file: string, text: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument(fixture(file));
  const editor = await vscode.window.showTextDocument(document);
  const offset = document.getText().indexOf(text);
  assert.notEqual(offset, -1, `fixture contains ${text}`);
  const position = document.positionAt(offset);
  editor.selection = new vscode.Selection(position, position);
}

const pin = () => vscode.commands.executeCommand<PinOutcome>("punaise.pinCurrentSymbol");

suite("Pin Current Symbol", () => {
  test("pins the method at the cursor in a TypeScript file", async () => {
    await placeCursor("sample.ts", "return this.store.get(id)");
    const outcome = await pin();
    assert.equal(outcome.kind, "pinned");
    assert.ok("result" in outcome);
    assert.deepEqual(outcome.result.pin, {
      id: "simulation-service-run",
      type: "symbol",
      path: "sample.ts",
      symbol: { name: "run", kind: "method", container: ["SimulationService"] },
    });
  });

  test("pinning the same symbol again does not create a duplicate", async () => {
    await placeCursor("sample.ts", "const localHelper");
    const outcome = await pin();
    assert.equal(outcome.kind, "alreadyPinned");
  });

  test("pins a nested function with its full container chain", async () => {
    await placeCursor("sample.ts", "return localHelper()");
    const outcome = await pin();
    assert.ok("result" in outcome && outcome.kind === "pinned");
    assert.deepEqual(outcome.result.pin.symbol, { name: "localFunction", kind: "function", container: ["SimulationService", "run"] });
  });

  test("reports when the cursor is not inside a symbol", async () => {
    await placeCursor("sample.ts", "PUN-003 fixture");
    assert.equal((await pin()).kind, "notInSymbol");
  });

  test("reports when no symbol provider answers", async () => {
    await placeCursor("plain.txt", "Plain text");
    const outcome = await pinCurrentSymbol(new PinStore(), 500);
    assert.deepEqual(outcome, { kind: "noProvider", languageId: "plaintext" });
  });

  test("reports an untitled file", async () => {
    const document = await vscode.workspace.openTextDocument({ language: "typescript", content: "function f() {}" });
    await vscode.window.showTextDocument(document);
    assert.equal((await pinCurrentSymbol(new PinStore(), 0)).kind, "untitled");
  });

  test("maps editor symbol kinds to lowerCamelCase", () => {
    assert.equal(toKind(vscode.SymbolKind.Method), "method");
    assert.equal(toKind(vscode.SymbolKind.EnumMember), "enumMember");
    assert.equal(toKind(vscode.SymbolKind.TypeParameter), "typeParameter");
  });
});
