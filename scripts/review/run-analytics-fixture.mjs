import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { runBrowserChecks } from "./run-browser-checks.mjs";

const vite = fileURLToPath(
  new URL("../../node_modules/vite/bin/vite.js", import.meta.url),
);
const outDir = "output/cloudflare-fixture";
const build = spawn(process.execPath, [vite, "build", "--outDir", outDir], {
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN: "0123456789abcdef0123456789abcdef",
  },
});
await new Promise((resolve, reject) => {
  build.on("error", reject);
  build.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`Fixture build exited ${code}`)),
  );
});
const preview = spawn(
  process.execPath,
  [
    vite,
    "preview",
    "--outDir",
    outDir,
    "--host",
    "127.0.0.1",
    "--port",
    "4174",
    "--strictPort",
  ],
  { stdio: "inherit" },
);
let previewFailed = false;
preview.on("error", () => {
  previewFailed = true;
});
preview.on("exit", () => {
  previewFailed = true;
});
const previousToken = process.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
try {
  const root = "http://127.0.0.1:4174/cubetimer365/";
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (previewFailed) throw new Error("Fixture preview failed to start");
    try {
      ready = (await fetch(root, { signal: AbortSignal.timeout(1000) })).ok;
    } catch {
      /* Preview startup. */
    }
    if (ready) break;
    await setTimeout(200);
  }
  if (!ready) throw new Error("Fixture preview did not become ready");
  // Exercise the normal runner's production-config discovery and option passing.
  process.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN =
    "0123456789abcdef0123456789abcdef";
  await runBrowserChecks({
    root,
    suites: ["browser-date-check", "browser-analytics-check"],
  });
} finally {
  if (previousToken === undefined)
    delete process.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  else process.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN = previousToken;
  preview.kill("SIGTERM");
}
