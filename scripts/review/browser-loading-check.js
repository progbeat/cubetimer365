import { setTimeout } from "node:timers/promises";

export default async (page) => {
  const root = page.url();
  const checks = [];
  const assert = (value, message) => {
    if (!value) throw new Error(message);
    checks.push(message);
  };
  const observe = () => {
    window.loadingSamples = [];
    const start = performance.now();
    const sample = () => {
      const timer = document.querySelector(".timer-digits");
      const brand = document.querySelector(".brand");
      const scramble = document.querySelector(".scramble-moves");
      if (timer && brand && scramble) {
        const textBox = (el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const rect = range.getBoundingClientRect();
          return [rect.x, rect.y, rect.width, rect.height];
        };
        window.loadingSamples.push({
          timer: textBox(timer),
          brand: textBox(brand),
          scramble: textBox(scramble),
          ready: Array.from(document.fonts).every((f) => f.status === "loaded"),
          overflow: document.documentElement.scrollWidth > innerWidth,
        });
      }
      if (performance.now() - start < 10000) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  };
  const stable = (samples) => {
    const first = samples[0];
    assert(
      samples.length > 1,
      "Loading is sampled over multiple rendered frames",
    );
    assert(
      samples.every((s) => !s.overflow),
      "Loading fallback fits the viewport",
    );
    for (const key of ["timer", "brand", "scramble"]) {
      assert(
        samples.every(
          (s) => JSON.stringify(s[key]) === JSON.stringify(first[key]),
        ),
        `${key} keeps its text metrics from the first render`,
      );
    }
  };
  for (const width of [1440, 320]) {
    const context = await page
      .context()
      .browser()
      .newContext({ viewport: { width, height: 900 } });
    try {
      await context.addInitScript(observe);
      const tab = await context.newPage();
      const cdp = await context.newCDPSession(tab);
      await cdp.send("Network.enable");
      // CDP blocking retains HTTP caching for the warm-navigation check.
      await cdp.send("Network.setBlockedURLs", {
        urls: [
          "*cloudflareinsights.com*",
          "*google-analytics.com*",
          "*googletagmanager.com*",
        ],
      });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: 187500,
        uploadThroughput: 93750,
      });
      await cdp.send("Network.clearBrowserCache");
      for (const mode of ["cold", "warm"]) {
        await tab.goto(root, { waitUntil: "networkidle" });
        await tab.evaluate(() => document.fonts.ready);
        await tab.waitForTimeout(150);
        const samples = await tab.evaluate(() => window.loadingSamples);
        stable(samples);
        assert(
          samples[0].ready,
          `${mode} load has the intended fonts at the first render`,
        );
        const preloads = await tab
          .locator('link[rel="preload"][as="font"]')
          .evaluateAll((els) => els.map((el) => el.href));
        const fonts = await tab.evaluate(() =>
          performance
            .getEntriesByType("resource")
            .filter((e) => e.name.includes("/fonts/"))
            .map((e) => e.name),
        );
        assert(
          preloads.length === 3 &&
            fonts.length === 3 &&
            new Set(fonts).size === fonts.length,
          "Critical fonts are discovered early without duplicate transfers",
        );
        assert(
          fonts.every((url) => new URL(url).origin === new URL(root).origin),
          "Font loading uses local assets",
        );
      }
    } finally {
      await context.close();
    }
    for (const mode of ["delayed", "failed"]) {
      const context = await page
        .context()
        .browser()
        .newContext({ viewport: { width, height: 900 } });
      try {
        await context.addInitScript(observe);
        await context.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (url.origin !== new URL(root).origin) return route.abort();
          if (url.pathname.includes("/fonts/")) {
            if (mode === "failed") return route.abort();
            await setTimeout(2000);
          }
          return route.continue();
        });
        const tab = await context.newPage();
        await tab.goto(root, { waitUntil: "networkidle" });
        await tab.evaluate(() => document.fonts.ready);
        await tab.waitForTimeout(150);
        const samples = await tab.evaluate(() => window.loadingSamples);
        stable(samples);
        await tab.keyboard.down("Space");
        await tab.waitForTimeout(350);
        await tab.keyboard.up("Space");
        await tab.waitForTimeout(300);
        await tab.keyboard.press("Space");
        await tab.locator(".latest-solve").waitFor();
        assert(
          (await tab.locator(".history-table tbody tr").count()) === 1,
          `${mode} fonts leave the timer usable`,
        );
        await tab.getByRole("button", { name: "About", exact: true }).click();
        await tab.getByRole("dialog", { name: "About CubeTimer365" }).waitFor();
        await tab.keyboard.press("Escape");
        await tab.waitForFunction(() =>
          document.activeElement?.matches(".timer-surface"),
        );
        assert(
          await tab
            .locator(".timer-surface")
            .evaluate((el) => el === document.activeElement),
          `${mode} fonts retain dialog and keyboard access`,
        );
      } finally {
        await context.close();
      }
    }
  }
  return { passed: checks.length };
};
