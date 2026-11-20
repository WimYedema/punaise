import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { supportsSecondarySidebar } from "../src/extension";
import { renderPinboardHtml } from "../src/pinboardView";

suite("Punaise extension", () => {
  test("activates", async () => {
    const extension = vscode.extensions.getExtension("punaise.punaise");
    assert.ok(extension, "extension is installed");
    await extension.activate();
    assert.equal(extension.isActive, true);
  });

  test("the pinboard view can be revealed", async () => {
    await vscode.commands.executeCommand("punaise.pinboard.focus");
  });

  test("detects secondary side bar support by version", () => {
    assert.equal(supportsSecondarySidebar("1.105.2"), false);
    assert.equal(supportsSecondarySidebar("1.106.0"), true);
    assert.equal(supportsSecondarySidebar("2.0.0"), true);
  });

  test("webview HTML has a strict CSP and no scripts", () => {
    const html = renderPinboardHtml("abc");
    assert.match(html, /default-src 'none'; style-src 'nonce-abc';/);
    assert.doesNotMatch(html, /<script/i);
    assert.match(html, /Punaise/);
  });
});
