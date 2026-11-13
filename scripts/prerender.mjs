// Runs after `vite build` and the server build (see "build" in package.json).
// Puts two things into dist/index.html, so a slow connection can paint the page
// before any JavaScript has arrived:
//   1. the app's first screen, as plain HTML (React replaces it when the app starts)
//   2. the CSS file's text, inside a <style> tag (no extra request that blocks painting)
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const htmlPath = "dist/index.html";
let html = readFileSync(htmlPath, "utf8");

// 1. The first screen goes between the two markers in index.html, in place of the loading screen
const { renderFirstScreen } = await import(pathToFileURL("dist-ssr/prerender-entry.js").href);
const start = "<!--first-screen-start-->";
const end = "<!--first-screen-end-->";
const from = html.indexOf(start);
const to = html.indexOf(end);
if (from === -1 || to === -1) throw new Error("prerender: the first-screen markers are missing from index.html");
html = html.slice(0, from) + renderFirstScreen() + html.slice(to + end.length);

// 2. The CSS file becomes a <style> tag
const cssLink = html.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/);
if (!cssLink) throw new Error("prerender: could not find the CSS <link> in dist/index.html");
const cssPath = "dist" + cssLink[1];
html = html.replace(cssLink[0], () => `<style>${readFileSync(cssPath, "utf8")}</style>`);
rmSync(cssPath);

writeFileSync(htmlPath, html);
rmSync("dist-ssr", { recursive: true, force: true });
console.log("prerender: first screen and CSS are now inside dist/index.html");
