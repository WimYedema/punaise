import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { defaultKeybinding, supportsSecondarySidebar } from "../src/extension";
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

  test("the empty state shows the default keybinding for the platform", () => {
    const manifest = vscode.extensions.getExtension("punaise.punaise")?.packageJSON;
    assert.equal(defaultKeybinding(manifest, "win32"), "Alt+P");
    assert.equal(defaultKeybinding(manifest, "darwin"), "Cmd+Alt+P");
    const empty = renderPinboardHtml("n", undefined, "", "Alt+P");
    assert.match(empty, /press <kbd>Alt\+P<\/kbd>/);
    assert.match(empty, /data-dismiss="hint">Don't show again/);
  });

  test("a dismissed hint, or any pins, hide the call to action", () => {
    assert.doesNotMatch(renderPinboardHtml("n", undefined, "", undefined), /<kbd>/);
    assert.match(renderPinboardHtml("n", undefined, "", undefined), /No pins yet/);
    assert.doesNotMatch(renderPinboardHtml("n", { html: "<details></details>", css: "" }, "", "Alt+P"), /<kbd>|No pins yet/);
  });

  test("webview HTML has a strict CSP and only nonce-tagged inline script", () => {
    const html = renderPinboardHtml("abc");
    assert.match(html, /default-src 'none'; style-src 'nonce-abc'; script-src 'nonce-abc';/);
    assert.deepEqual(html.match(/<script[^>]*>/gi), ['<script nonce="abc">']);
    assert.doesNotMatch(html, /https?:|src=/i);
    assert.match(html, /Punaise/);
  });
});
