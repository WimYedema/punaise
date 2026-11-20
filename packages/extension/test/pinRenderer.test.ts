import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { PinStore } from "@punaise/core";
import { renderPins } from "../src/pinRenderer";
import { CodeHighlighter } from "../src/highlighter";
import { renderPinboardHtml } from "../src/pinboardView";

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

  test("long bodies scroll inside the card", () => {
    assert.match(renderPinboardHtml("n"), /\.body \{ max-height: 20em; overflow: auto; \}/);
  });
});
