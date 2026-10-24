import { interceptAnalytics } from "./browser-network-guards.js";
import { waitForStorage } from "./browser-storage-helpers.js";

export default async (page) => {
  const root = page.url();
  let passed = 0;
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
    passed += 1;
  };
  const pixels = (tab, png) =>
    tab.evaluate(async (encoded) => {
      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const image = await createImageBitmap(
        new Blob([bytes], { type: "image/png" }),
      );
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const data = [
        ...ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      ];
      image.close();
      let spread = 0;
      for (let i = 0; i < data.length; i += 4)
        spread = Math.max(
          spread,
          Math.max(...data.slice(i, i + 3)) - Math.min(...data.slice(i, i + 3)),
        );
      return { data, spread };
    }, png.toString("base64"));
  for (const width of [1440, 320])
    for (const style of ["neon", "flat", "cyber"]) {
      const context = await page
        .context()
        .browser()
        .newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
      try {
        await interceptAnalytics(context);
        await context.addInitScript(
          ({ style }) => {
            localStorage.setItem("cubetimer365:cube-style:v1", style);
            localStorage.setItem(
              "cubetimer365:daily-history:v1",
              JSON.stringify({
                version: 1,
                date: new Date().toISOString().slice(0, 10),
                history: [12.34],
                legacyMigration: "ignored",
              }),
            );
            window.cubeDecodeReleases = [];
            window.holdCubeDecode = true;
            const decode = HTMLImageElement.prototype.decode;
            HTMLImageElement.prototype.decode = async function () {
              await decode.call(this);
              if (
                this.src.startsWith("data:image/png") &&
                window.holdCubeDecode
              )
                await new Promise((resolve) =>
                  window.cubeDecodeReleases.push(resolve),
                );
            };
            window.cubeFirstPaintSamples = [];
            const sample = () => {
              const svg = document.querySelector(".cube-display .cube-net");
              if (svg)
                window.cubeFirstPaintSamples.push({
                  state: svg.getAttribute("data-material-state"),
                  fallback: getComputedStyle(
                    svg.querySelector("[data-cube-fallback]"),
                  ).opacity,
                  style: svg.getAttribute("class"),
                });
              if (performance.now() < 10000) requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
          },
          { style },
        );
        const tab = await context.newPage();
        await tab.goto(root);
        await waitForStorage(tab);
        await tab.evaluate(() => document.fonts.ready);
        await tab.waitForFunction(() => window.cubeDecodeReleases.length > 0);
        const cube = tab.locator(".cube-display .cube-net").first();
        assert(
          (await cube.getAttribute("aria-busy")) === "true",
          "Only the cube reports material preparation",
        );
        const pending = await pixels(tab, await cube.screenshot());
        assert(
          pending.spread <= 40,
          "Rendered pending cube area contains neutral loading marks, no wrong colored material",
        );
        assert(
          (await cube.getAttribute("class")) === `cube-net cube-net--${style}`,
          "Saved finish is selected before its first paint",
        );
        const saved = await tab.evaluate(() =>
          JSON.stringify({ ...localStorage }),
        );
        await tab.locator(".timer-surface").focus();
        await tab.keyboard.down("Space");
        await tab.waitForTimeout(350);
        await tab.keyboard.up("Space");
        assert(
          await tab
            .locator(".timer-panel")
            .evaluate((el) => el.classList.contains("running")),
          "Timer remains usable while cube image decoding is pending",
        );
        await tab.keyboard.press("Escape");
        await tab.evaluate(() => {
          window.holdCubeDecode = false;
          window.cubeDecodeReleases.forEach((release) => release());
        });
        await cube.locator("image").waitFor();
        await tab.waitForFunction(
          () =>
            document
              .querySelector(".cube-display .cube-net")
              .getAttribute("data-material-ready") === "true",
        );
        const first = await pixels(tab, await cube.screenshot());
        await tab.waitForTimeout(100);
        const settled = await pixels(tab, await cube.screenshot());
        assert(
          first.spread > 70 &&
            JSON.stringify(first.data) === JSON.stringify(settled.data),
          "First revealed finish pixels already match its settled appearance",
        );
        assert(
          await tab.evaluate(() =>
            window.cubeFirstPaintSamples.every(
              (s) =>
                s.fallback === "0" &&
                s.style.endsWith(
                  `--${localStorage.getItem("cubetimer365:cube-style:v1")}`,
                ),
            ),
          ),
          "No rendered frame exposes the simplified fallback during normal loading",
        );
        assert(
          (await tab.evaluate(() => JSON.stringify({ ...localStorage }))) ===
            saved,
          "Loading and cancelled timing preserve saved data and finish",
        );
      } finally {
        await context.close();
      }
    }
  for (const failure of ["decode", "canvas"]) {
    const context = await page.context().browser().newContext();
    try {
      await interceptAnalytics(context);
      await context.addInitScript((failure) => {
        localStorage.setItem("cubetimer365:cube-style:v1", "neon");
        if (failure === "canvas")
          Object.defineProperty(window, "CanvasRenderingContext2D", {
            value: undefined,
          });
        else {
          const decode = HTMLImageElement.prototype.decode;
          HTMLImageElement.prototype.decode = function () {
            return this.src.startsWith("data:image/png")
              ? Promise.reject(new Error("fixture decode failure"))
              : decode.call(this);
          };
        }
      }, failure);
      const tab = await context.newPage();
      await tab.goto(root);
      await waitForStorage(tab);
      const cube = tab
        .locator('.cube-display .cube-net[data-material-state="fallback"]')
        .first();
      await cube.waitFor();
      assert(
        (await cube.locator("[data-cube-fallback]").getAttribute("opacity")) ===
          "1",
        "Real graphics failure reveals the projected fallback",
      );
      assert(
        (await cube.getAttribute("aria-busy")) === null &&
          (await cube.locator("[data-cube-loading]").count()) === 0,
        "Failure cannot leave an indefinite loading state",
      );
      assert(
        (await cube.getAttribute("aria-label")).includes("simplified preview"),
        "Accessible fallback is identified clearly",
      );
    } finally {
      await context.close();
    }
  }
  return { passed };
};
