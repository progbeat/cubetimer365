import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import runChecks from "./browser-analytics-check.js";

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
let browser;
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
  browser = await chromium.launch();
  const page = await browser.newPage();
  // runChecks installs all vendor stubs before its first navigation.
  const result = await runChecks(page, { root, configured: true });
  console.log(`Configured Cloudflare fixture: ${result.passed} checks passed`);
} finally {
  await browser?.close();
  preview.kill("SIGTERM");
}
