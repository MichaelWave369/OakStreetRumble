import { build } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
await build({
  root,
  logLevel: "error",
  build: {
    outDir: "dist-offline",
    emptyOutDir: true,
    assetsInlineLimit: 1024 * 1024,
    cssCodeSplit: false,
  },
});

let html = await readFile(resolve(root, "dist-offline/index.html"), "utf8");

for (const match of [...html.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">/g)]) {
  const href = match[1];
  const css = await readFile(resolve(root, "dist-offline", href.replace(/^\//, "")), "utf8");
  html = html.replace(match[0], "<style>" + css + "</style>");
}

for (const match of [...html.matchAll(/<script type="module" crossorigin src="([^"]+)"><\/script>/g)]) {
  const src = match[1];
  const js = await readFile(resolve(root, "dist-offline", src.replace(/^\//, "")), "utf8");
  html = html.replace(match[0], "<script type=\"module\">" + js + "</script>");
}

await writeFile(resolve(root, "Oak-Street-Rumble.html"), html);
console.log("wrote Oak-Street-Rumble.html", Math.round(html.length / 1024) + "kb");
