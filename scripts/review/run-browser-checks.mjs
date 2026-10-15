import { setTimeout } from "node:timers/promises";
import { chromium } from "playwright";

const root =
  process.env.CUBETIMER_TEST_URL || "http://127.0.0.1:4173/cubetimer365/";
if (!["127.0.0.1", "localhost"].includes(new URL(root).hostname)) {
  throw new Error("Use an isolated localhost browser");
}
let ready = false;
for (let attempt = 0; attempt < 50; attempt++) {
  try {
    ready = (await fetch(root, { signal: AbortSignal.timeout(1000) })).ok;
  } catch {
    // A separately started Vite preview may still be opening its port.
  }
  if (ready) break;
  await setTimeout(200);
}
if (!ready) throw new Error(`Start the production preview at ${root}`);

const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
});
try {
  for (const name of [
    "browser-check",
    "browser-feedback-check",
    "browser-date-check",
    "browser-statistics-check",
    "browser-analytics-check",
    "browser-mobile-stop-check",
    "browser-material-check",
  ]) {
    const scales = name === "browser-material-check" ? [1, 2, 3] : [1];
    for (const deviceScaleFactor of scales) {
      const context = await browser.newContext({ deviceScaleFactor });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        await page.goto(root);
        const { default: runChecks } = await import(`./${name}.js`);
        const result = await runChecks(page, { deviceScaleFactor });
        console.log(
          `${name} (DPR ${deviceScaleFactor}): ${result.passed} checks passed`,
        );
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
