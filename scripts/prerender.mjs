// Runs after `vite build` and the server build (see "build" in package.json).
// Puts three things into dist/index.html, so a slow connection can paint the page
// early and does not need a second download to start the app:
//   1. the app's first screen, as plain HTML (React replaces it when the app starts)
//   2. the CSS file's text, inside a <style> tag (no extra request that blocks painting)
//   3. the app's JavaScript, inside a <script> tag (the page already carries the app when
//      it arrives; a separate file costs another full round trip)
import { readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
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

// 3. The JavaScript file becomes a <script type="module"> tag at the end of the page
const jsTag = html.match(/<script type="module"[^>]*src="(\/assets\/[^"]+\.js)"[^>]*><\/script>/);
if (!jsTag) throw new Error("prerender: could not find the JavaScript <script> in dist/index.html");
const jsPath = "dist" + jsTag[1];
// A "</script" inside the code would end the tag early, so write it as "<\/script"
const js = readFileSync(jsPath, "utf8").replaceAll("</script", "<\/script");
html = html.replace(jsTag[0], "");
html = html.replace("</body>", () => `<script type="module">${js}</script></body>`);
rmSync(jsPath);
// Only one JavaScript file can go inside the page. Code splitting (for example React.lazy) would break it.
const otherJs = readdirSync("dist/assets").filter((name) => name.endsWith(".js"));
if (otherJs.length > 0) throw new Error(`prerender: more JavaScript files found (${otherJs.join(", ")}). Only one can go inside the page.`);

writeFileSync(htmlPath, html);
rmSync("dist-ssr", { recursive: true, force: true });
console.log("prerender: first screen, CSS and JavaScript are now inside dist/index.html");
