import postcss, { type AtRule, type ChildNode, type Root } from "postcss";
import type { Plugin } from "vite";
import microfrontend from "../package.json" with { type: "json" };

/*
  CSS scoping for a microfrontend, fully owned by this plugin.
  App code (core, view, entry) and stylesheets know nothing about it.

  1. CSS: every stylesheet (except the host's) is rewritten:
       - `:root` becomes `:scope` (write `:root` for "this app's root")
       - all rules get wrapped in `@scope (.company-mfe-module-todo) { … }`
       - at-rules that aren't allowed inside @scope (@import, @font-face,
         @keyframes, …) stay outside the wrapper, at top level

  2. HTML: the mount element (`<div id="root">`) is wrapped in
     `<div class="company-mfe-module-todo">`. That wrapper is the @scope root.

  Why a wrapper and not a class on #root itself? It works whatever the view
  layer does with its mount element: React renders inside #root, but some
  renderers (Foldkit, Elm) replace it, which would drop a class put on it.
*/

type Options = {
  /** id of the element the app mounts into (see entry.tsx) */
  mountId?: string;
  /** stylesheets that belong to the host page and must stay global */
  exclude?: RegExp;
};

// Package names may contain "@" or "/" (e.g. "@company/todo"), which aren't
// valid in a class name, so normalize to [a-zA-Z0-9_-].
const scopeName = microfrontend.name
  .replace(/[^a-zA-Z0-9_-]+/g, "-")
  .replace(/^-+/, "");

// At-rules that must stay at the top level of a stylesheet.
const TOP_LEVEL_AT_RULES = new Set([
  "charset",
  "import",
  "namespace",
  "font-face",
  "keyframes",
  "property",
  "counter-style",
  "font-feature-values",
  "font-palette-values",
  "page",
]);

const mustStayTopLevel = (node: ChildNode) =>
  node.type === "atrule" &&
  (TOP_LEVEL_AT_RULES.has(node.name.replace(/^-\w+-/, "")) || // -webkit-keyframes
    (node.name === "layer" && !node.nodes)); // `@layer a, b;` statement

const scopeStylesheet = (root: Root) => {
  root.walkRules((rule) => {
    rule.selector = rule.selector.replace(/:root\b/g, ":scope");
  });

  const scope: AtRule = postcss.atRule({
    name: "scope",
    params: `(.${scopeName})`,
  });

  for (const node of [...root.nodes]) {
    if (node.type === "comment" || mustStayTopLevel(node)) continue;
    scope.append(node); // moves the node from root into the @scope block
  }

  root.append(scope);
};

export default ({
  mountId = "root",
  exclude = /host\.css$/,
}: Options = {}): Plugin => ({
  name: "mfe-css-scoping",
  enforce: "pre", // run on the raw CSS, before Vite's CSS pipeline

  async transform(code, id) {
    const file = id.split("?")[0];
    if (!file.endsWith(".css") || exclude.test(file)) return;

    const result = await postcss([
      { postcssPlugin: "mfe-scope", Once: scopeStylesheet },
    ]).process(code, {
      from: file,
      map: { inline: false, annotation: false },
    });

    return { code: result.css, map: result.map.toString() };
  },

  transformIndexHtml(html) {
    const mount = new RegExp(
      `<div\\b[^>]*\\bid=["']${mountId}["'][^>]*>\\s*</div>`,
    );
    if (!mount.test(html)) {
      throw new Error(
        `[mfe-css-scoping] no empty <div id="${mountId}"></div> found in index.html`,
      );
    }
    return html.replace(mount, (div) => `<div class="${scopeName}">${div}</div>`);
  },
});
