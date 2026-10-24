import { interceptAnalytics } from "./browser-network-guards.js";
import { waitForStorage } from "./browser-storage-helpers.js";

export async function checkStickyHeader(page) {
  let passed = 0;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    passed += 1;
  };
  const positions = [
    0, 1, 16, 27, 38, 39, 40, 55, 56, 57, 78, 79, 94, 95, 96, 399, 400, 700,
  ];
  for (const position of positions) {
    await page.locator(".history-scroll").evaluate((el, value) => {
      el.scrollTop = value;
    }, position);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const geometry = await page.locator(".history-scroll").evaluate((el) => {
      const box = el.getBoundingClientRect();
      const head = el.querySelector("thead").getBoundingClientRect();
      const columns = el.querySelector("thead tr").getBoundingClientRect();
      const best = el.querySelector(".history-best").getBoundingClientRect();
      return {
        top: box.top,
        headTop: head.top,
        gap: best.top - columns.bottom,
        clip: {
          x: head.left,
          y: columns.bottom - 2,
          width: head.width,
          height: 4,
        },
      };
    });
    assert(
      Math.abs(geometry.top - geometry.headTop) < 0.6,
      "The complete header block remains pinned to the history scroll area",
    );
    assert(
      Math.abs(geometry.gap) < 0.02,
      "Column headings and Best are geometrically contiguous",
    );
    const pixels = await page.screenshot({ clip: geometry.clip });
    // Fractional device pixels may change border antialiasing, so inspect
    // this text-free dark band for bright glyphs rather than PNG byte identity.
    const brightest = await page.evaluate(async (encoded) => {
      const bytes = Uint8Array.from(atob(encoded), (char) =>
        char.charCodeAt(0),
      );
      const image = await createImageBitmap(
        new Blob([bytes], { type: "image/png" }),
      );
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
      image.close();
      let maximum = 0;
      for (let i = 0; i < rgba.length; i += 4)
        maximum = Math.max(maximum, rgba[i], rgba[i + 1], rgba[i + 2]);
      return maximum;
    }, pixels.toString("base64"));
    assert(
      brightest <= 90,
      `Opaque heading/Best seam does not reveal glyphs at scrollTop ${position}`,
    );
  }
  return { passed };
}

export default async (page) => {
  const root = page.url();
  let passed = 0;
  for (const [width, dpr, zoom] of [
    [1440, 1, 1],
    [1152, 1.25, 1],
    [1024, 1.5, 1],
    [1440, 2, 1],
    [390, 1, 1],
    [390, 1.25, 1],
    [320, 2, 1],
    [320, 3, 1],
    [1440, 2, 1.25],
  ]) {
    const context = await page
      .context()
      .browser()
      .newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr });
    try {
      await interceptAnalytics(context);
      await context.addInitScript(() =>
        localStorage.setItem(
          "cubetimer365:daily-history:v1",
          JSON.stringify({
            version: 1,
            date: new Date().toISOString().slice(0, 10),
            history: Array.from({ length: 100 }, (_, i) => 12.34 + (i % 7)),
            legacyMigration: "ignored",
          }),
        ),
      );
      const tab = await context.newPage();
      await tab.goto(root);
      await waitForStorage(tab);
      await tab.evaluate(() => document.fonts.ready);
      if (zoom !== 1)
        await tab.evaluate((scale) => {
          document.documentElement.style.zoom = String(scale);
        }, zoom);
      await tab.evaluate(() => window.scrollTo(0, 0));
      passed += (await checkStickyHeader(tab)).passed;
    } finally {
      await context.close();
    }
  }
  return { passed };
};
