import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { PinStore } from "@punaise/core";
import { openPin, renderPins } from "../src/pinRenderer";
import { CodeHighlighter } from "../src/highlighter";
import { renderPinboardHtml } from "../src/pinboardView";
import { pinCurrentSymbol } from "../src/pinCommand";

const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<");

function pins(): PinStore {
  const store = new PinStore();
  store.add({ path: "sample.ts", symbol: { name: "run", kind: "method", container: ["SimulationService"] } });
  store.add({ path: "sample.ts", symbol: { name: "parse", kind: "function", container: [] } });
  store.add({ path: "sample.ts", symbol: { name: "renamed", kind: "function", container: [] } });
  return store;
}

async function setTheme(id: string): Promise<void> {
  const changed = new Promise<void>((done) => {
    const sub = vscode.window.onDidChangeActiveColorTheme(() => {
      sub.dispose();
      done();
    });
    setTimeout(done, 3000);
  });
  await vscode.workspace.getConfiguration("workbench").update("colorTheme", id, vscode.ConfigurationTarget.Global);
  await changed;
}

suite("Pin cards", () => {
  test("render a header, the signature and the dedented, highlighted code", async () => {
    const { html, css } = await renderPins(pins().list(), new Set(), new CodeHighlighter());
    const run = text(html.split("<details").find((card) => card.includes('data-id="simulation-service-run"')) ?? "");
    assert.match(run, /SimulationService › run method sample\.ts/);
    assert.match(run, /^run\(id: string, attempts = 1\): number \{$/m, "signature and body start dedented");
    assert.match(run, /return this\.store\.get\(id\) \?\? localFunction\(\);/, "full code in the body");
    assert.match(css, /\.t\d+\{color:#[0-9A-Fa-f]{6}/, "token colours from the theme");
  });

  test("an overloaded function shows its implementation", async () => {
    const { html } = await renderPins(pins().list(), new Set(), new CodeHighlighter());
    const parse = text(html.split("<details").find((card) => card.includes('data-id="parse"')) ?? "");
    assert.match(parse, /export function parse\(input: string \| number\): number \| string \{/);
  });

  test("a symbol that cannot be found is shown as not found", async () => {
    const { html } = await renderPins(pins().list(), new Set(), new CodeHighlighter());
    assert.match(html, /class="pin unresolved"[\s\S]*renamed[\s\S]*Not found in sample\.ts/);
  });

  test("expanded cards render open", async () => {
    const { html } = await renderPins(pins().list(), new Set(["parse"]), new CodeHighlighter());
    assert.match(html, /data-id="parse" open>/);
    assert.match(html, /data-id="simulation-service-run">/);
  });

  test("colours follow the active theme after a theme change", async () => {
    const highlighter = new CodeHighlighter();
    await setTheme("Default High Contrast Light");
    const light = (await renderPins(pins().list(), new Set(), highlighter)).css;
    await setTheme("Default High Contrast");
    highlighter.reset();
    const dark = (await renderPins(pins().list(), new Set(), highlighter)).css;
    assert.notEqual(light, dark);
  });

  test("every card header has an open-in-editor link", async () => {
    const { html } = await renderPins(pins().list(), new Set(), new CodeHighlighter());
    assert.equal(html.match(/<button class="open" data-open="[^"]+"/g)?.length, 3);
    assert.equal(html.match(/<button class="remove" data-remove="[^"]+"/g)?.length, 3, "and a remove button");
  });

  test("the link opens the file at the symbol, in the active group", async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    const [run] = pins().list();
    assert.ok(run);
    assert.equal(await openPin(run), "opened");
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor);
    assert.ok(editor.document.fileName.endsWith("sample.ts"));
    assert.equal(editor.viewColumn, vscode.ViewColumn.One);
    assert.match(editor.document.lineAt(editor.selection.active.line).text, /^\s*run\(id: string, attempts = 1\): number \{/);
  });

  test("a pin that is not found opens its file at the top", async () => {
    const renamed = pins().list()[2];
    assert.ok(renamed);
    assert.equal(await openPin(renamed), "opened");
    assert.equal(vscode.window.activeTextEditor?.selection.active.line, 0);
  });

  test("a pin whose file is gone reports it", async () => {
    const store = new PinStore();
    const { pin } = store.add({ path: "deleted.ts", symbol: { name: "x", kind: "function", container: [] } });
    assert.equal(await openPin(pin), "fileMissing");
  });

  test("a pinned Markdown section shows only its heading when collapsed", async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(folder);
    const uri = vscode.Uri.joinPath(folder.uri, "notes.md");
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode("# Notes\n\n## Install\n\nRun the installer.\n\nThen reload.\n"));
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      const position = document.positionAt(document.getText().indexOf("Run the installer"));
      editor.selection = new vscode.Selection(position, position);
      const outcome = await pinCurrentSymbol(new PinStore());
      assert.ok("result" in outcome, `pinned a Markdown section (${outcome.kind})`);
      const { html } = await renderPins([outcome.result.pin], new Set(), new CodeHighlighter());
      const signature = text(html.match(/<pre class="code signature">([\s\S]*?)<\/pre>/)?.[1] ?? "");
      assert.equal(signature, "## Install");
      assert.match(text(html.match(/<pre class="code body">([\s\S]*?)<\/pre>/)?.[1] ?? ""), /Run the installer\.[\s\S]*Then reload\./);
    } finally {
      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      await vscode.workspace.fs.delete(uri);
    }
  });

  test("long bodies scroll inside the card", () => {
    assert.match(renderPinboardHtml("n"), /\.body \{ max-height: 20em; overflow: auto; \}/);
  });
});
