// Node's built-in TypeScript erasure, with the same relative imports as Vite.
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL && /^\.\.?\//.test(specifier)) {
      const url = new URL(specifier, context.parentURL);
      if (!existsSync(fileURLToPath(url)) && existsSync(fileURLToPath(url) + ".ts")) {
        return nextResolve(specifier + ".ts", context);
      }
    }
    return nextResolve(specifier, context);
  },
});
