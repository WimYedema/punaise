import * as vscode from "vscode";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHighlighterCore, type HighlighterCore, type LanguageRegistration, type ThemedToken, type ThemeRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

/**
 * Highlights code with the active VS Code colour theme and VS Code's own grammars, in the
 * extension host (see docs/spikes/highlighting.md). Output uses classes, so the webview CSP
 * needs no inline styles.
 */
export class CodeHighlighter {
  private shiki?: Promise<HighlighterCore>;
  private themeName?: string;
  private readonly langs = new Map<string, string | undefined>();

  /** Forget the loaded theme, e.g. after a theme change. */
  reset(): void {
    this.themeName = undefined;
  }

  /**
   * Tokens per line for lines `start` to `end` of a document, or undefined when the language or
   * theme is unknown. Tokenizing starts in the grammar's initial state, so `start` should be the
   * start of a top-level declaration. Cost grows with the range, not the file (about 0.1 ms per line).
   */
  async tokenize(document: vscode.TextDocument, start: number, end: number): Promise<ThemedToken[][] | undefined> {
    const shiki = await (this.shiki ??= createHighlighterCore({ themes: [], langs: [], engine: createJavaScriptRegexEngine() }));
    const theme = this.themeName ?? (this.themeName = await loadActiveTheme(shiki));
    const lang = await this.loadLanguage(shiki, document.languageId);
    if (!theme || !lang) return undefined;
    const text = document.getText(new vscode.Range(start, 0, end, document.lineAt(end).text.length));
    return shiki.codeToTokens(text, { lang, theme }).tokens;
  }

  private async loadLanguage(shiki: HighlighterCore, languageId: string): Promise<string | undefined> {
    if (this.langs.has(languageId)) return this.langs.get(languageId);
    let name: string | undefined;
    try {
      const grammar = findGrammar(languageId);
      if (grammar) {
        name = `vscode-${languageId}`;
        await shiki.loadLanguage({ ...grammar, name } as LanguageRegistration);
      }
    } catch {
      name = undefined;
    }
    this.langs.set(languageId, name);
    return name;
  }
}

/** Assigns one CSS class per distinct colour and font style. */
export class StyleClasses {
  private readonly classes = new Map<string, string>();

  classFor(token: ThemedToken): string {
    const key = `${token.color ?? ""}|${token.fontStyle ?? 0}`;
    let name = this.classes.get(key);
    if (!name) this.classes.set(key, (name = `t${this.classes.size}`));
    return name;
  }

  css(): string {
    return [...this.classes]
      .map(([key, name]) => {
        const [color, style] = key.split("|");
        const flags = Number(style);
        const rules = [color ? `color:${color}` : "", flags & 1 ? "font-style:italic" : "", flags & 2 ? "font-weight:bold" : "", flags & 4 ? "text-decoration:underline" : ""];
        return `.${name}{${rules.filter(Boolean).join(";")}}`;
      })
      .join("\n");
  }
}

/** The active theme's id, honouring OS auto-detection. */
function activeThemeId(): string | undefined {
  const workbench = vscode.workspace.getConfiguration("workbench");
  if (vscode.workspace.getConfiguration("window").get<boolean>("autoDetectColorScheme")) {
    const kind = vscode.window.activeColorTheme.kind;
    if (kind === vscode.ColorThemeKind.Light) return workbench.get("preferredLightColorTheme");
    if (kind === vscode.ColorThemeKind.Dark) return workbench.get("preferredDarkColorTheme");
  }
  return workbench.get("colorTheme");
}

async function loadActiveTheme(shiki: HighlighterCore): Promise<string | undefined> {
  const id = activeThemeId();
  if (!id) return undefined;
  for (const extension of vscode.extensions.all) {
    const themes: { id?: string; label?: string; path: string; uiTheme: string }[] = extension.packageJSON?.contributes?.themes ?? [];
    const theme = themes.find((t) => (t.id ?? t.label) === id || t.label === id);
    if (!theme) continue;
    try {
      const vs = readTheme(join(extension.extensionPath, theme.path));
      const custom = vscode.workspace.getConfiguration("editor").get<{ textMateRules?: unknown[] }>("tokenColorCustomizations")?.textMateRules ?? [];
      const name = `vscode:${id}`;
      const registration: ThemeRegistration = {
        name,
        type: theme.uiTheme === "vs" || theme.uiTheme === "hc-light" ? "light" : "dark",
        colors: vs.colors,
        fg: vs.colors["editor.foreground"],
        bg: vs.colors["editor.background"],
        tokenColors: [...vs.tokenColors, ...custom] as ThemeRegistration["tokenColors"],
      };
      await shiki.loadTheme(registration);
      return name;
    } catch {
      return undefined; // e.g. a theme whose token colours live in a .tmTheme file
    }
  }
  return undefined;
}

interface VsTheme {
  colors: Record<string, string>;
  tokenColors: unknown[];
}

/** Reads a VS Code theme file, following `include` the way the workbench merges themes. */
function readTheme(path: string): VsTheme {
  const theme = readJsonc(path);
  const base: VsTheme = theme.include ? readTheme(resolve(dirname(path), theme.include)) : { colors: {}, tokenColors: [] };
  const own = typeof theme.tokenColors === "string" ? readJsonc(resolve(dirname(path), theme.tokenColors)).settings : (theme.tokenColors ?? []);
  return { colors: { ...base.colors, ...theme.colors }, tokenColors: [...base.tokenColors, ...own] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- theme files are untyped JSON
function readJsonc(path: string): any {
  const text = readFileSync(path, "utf8")
    .replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_match, str: string | undefined) => str ?? "")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(text);
}

function findGrammar(languageId: string): object | undefined {
  for (const extension of vscode.extensions.all) {
    const grammars: { language?: string; path: string }[] = extension.packageJSON?.contributes?.grammars ?? [];
    const grammar = grammars.find((g) => g.language === languageId);
    if (grammar) return JSON.parse(readFileSync(join(extension.extensionPath, grammar.path), "utf8"));
  }
  return undefined;
}
