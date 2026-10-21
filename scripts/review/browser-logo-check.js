import { readFile } from "node:fs/promises";
import { interceptAnalytics } from "./browser-network-guards.js";

const fixtures = JSON.parse(
  await readFile(
    new URL("../../src/fixtures/dailyLogo.json", import.meta.url),
    "utf8",
  ),
);
const colors = (fixture) =>
  fixture.back.flat().map((c) => `var(--mantine-color-${c})`);

export default async (page) => {
  const origin = new URL(page.url());
  if (!["localhost", "127.0.0.1"].includes(origin.hostname)) {
    throw new Error("Use an isolated localhost browser");
  }
  const browser = page.context().browser();
  const root = `${origin.origin}/cubetimer365/`;
  const checks = [];
  const assert = (ok, name) => {
    if (!ok) throw new Error(name);
    checks.push(name);
  };
  const create = async (date) => {
    const context = await browser.newContext({ timezoneId: "Asia/Bangkok" });
    await interceptAnalytics(context);
    await context.addInitScript((date) => {
      const key = "cubetimer365:daily-history:v1";
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            date,
            history: [12.34, 15.67],
            legacyMigration: "ignored",
          }),
        );
      localStorage.setItem("cubetimer365:cube-style:v1", "flat");
      localStorage.setItem("unrelated-logo-fixture", "keep");
    }, date);
    return { context, tab: await context.newPage() };
  };
  const snapshot = async (tab) =>
    tab.locator(".daily-logo").evaluate((svg) => ({
      scramble: svg.getAttribute("data-logo-scramble"),
      colors: Array.from(svg.querySelectorAll("[data-logo-sticker]"), (el) =>
        el.getAttribute("data-logo-color"),
      ),
      square:
        Math.abs(
          svg.getBoundingClientRect().width -
            svg.getBoundingClientRect().height,
        ) < 0.1,
      flattened: Array.from(svg.querySelectorAll("[data-logo-sticker]")).every(
        (el) =>
          Number(el.getAttribute("width")) > Number(el.getAttribute("height")),
      ),
    }));
  const favicon = (tab) =>
    tab.evaluate(async () => {
      const link = document.querySelector("link#daily-favicon");
      const href = link?.getAttribute("href") || "";
      if (!href.startsWith("data:image/svg+xml,"))
        throw new Error("Dynamic SVG favicon is missing");
      const svg = new DOMParser().parseFromString(
        decodeURIComponent(href.slice(href.indexOf(",") + 1)),
        "image/svg+xml",
      );
      const image = new Image();
      image.src = href;
      await image.decode();
      return {
        href,
        colors: Array.from(svg.querySelectorAll("[data-logo-sticker]"), (el) =>
          el.getAttribute("data-logo-color"),
        ),
        decoded: image.naturalWidth === 32 && image.naturalHeight === 32,
        count: document.querySelectorAll("link#daily-favicon").length,
        fallbacks: document.querySelectorAll(
          'link[rel="icon"][type="image/png"],link[rel="icon"][type="image/x-icon"]',
        ).length,
      };
    });
  const storage = (tab) =>
    tab.evaluate(() => JSON.stringify({ ...localStorage }));

  for (const fixture of fixtures) {
    const { context, tab } = await create(fixture.date);
    try {
      await tab.clock.setFixedTime(`${fixture.date}T05:00:00Z`);
      await tab.goto(root);
      await tab.locator(".stats-grid").waitFor();
      const first = await snapshot(tab);
      const icon = await favicon(tab);
      assert(
        JSON.stringify(icon.colors) === JSON.stringify(first.colors),
        `Favicon matches the header matrix on ${fixture.date}`,
      );
      assert(
        icon.decoded,
        `Chromium decodes the SVG data URL on ${fixture.date}`,
      );
      assert(
        icon.count === 1 && icon.fallbacks === 2,
        `One dynamic icon and both static fallbacks remain on ${fixture.date}`,
      );
      if (fixture === fixtures[0]) {
        for (const [type, format] of [
          ["image/png", "png"],
          ["image/x-icon", "ico"],
        ]) {
          const url = await tab
            .locator(`link[rel="icon"][type="${type}"]`)
            .getAttribute("href");
          const response = await context.request.get(new URL(url, root).href);
          const bytes = await response.body();
          const decoded = await tab.evaluate(
            async (url) => {
              const image = new Image();
              image.src = url;
              await image.decode();
              return (
                image.naturalWidth > 0 &&
                image.naturalWidth === image.naturalHeight
              );
            },
            `data:${type};base64,${bytes.toString("base64")}`,
          );
          assert(decoded, `Chromium decodes the static ${format} fallback`);
          assert(
            response.ok() &&
              (format === "png"
                ? bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
                : bytes.readUInt16LE(2) === 1 && bytes.readUInt16LE(4) === 2),
            `Static ${format} fallback is valid and available`,
          );
        }
      }
      const moves = (await tab.locator(".scramble-moves").textContent()).trim();
      assert(
        moves === fixture.scramble,
        `Main scramble matches ${fixture.date}`,
      );
      assert(
        first.scramble === moves,
        `Logo uses the same scramble on ${fixture.date}`,
      );
      assert(
        JSON.stringify(first.colors) === JSON.stringify(colors(fixture)),
        `Rear matrix matches ${fixture.date} without mirroring`,
      );
      assert(
        first.colors[4] === "var(--mantine-color-blue-6)",
        `Rear centre stays blue on ${fixture.date}`,
      );
      assert(first.square, `Complete logo is square on ${fixture.date}`);
      assert(
        first.flattened,
        `Logo stickers stay flattened on ${fixture.date}`,
      );
      const before = await storage(tab);
      await tab.reload();
      await tab.locator(".stats-grid").waitFor();
      assert(
        JSON.stringify(await snapshot(tab)) === JSON.stringify(first),
        `Reload restores ${fixture.date} logo exactly`,
      );
      assert(
        (await storage(tab)) === before,
        `Reload leaves solves and preferences intact on ${fixture.date}`,
      );
      const reloadedIcon = await favicon(tab);
      assert(
        reloadedIcon.href === icon.href && reloadedIcon.count === 1,
        `Reload retains the same daily favicon without duplicates on ${fixture.date}`,
      );
    } finally {
      await context.close();
    }
  }

  const [beforeDay, afterDay] = fixtures;
  for (const mode of ["timeout", "focus", "visibilitychange"]) {
    const { context, tab } = await create(beforeDay.date);
    try {
      await tab.clock.install({ time: "2026-10-20T16:59:58Z" });
      await tab.clock.pauseAt("2026-10-20T16:59:59.900Z");
      await tab.goto(root, { waitUntil: "domcontentloaded" });
      await tab.locator(".stats-grid").waitFor();
      await tab.clock.runFor(20);
      const beforeIcon = await favicon(tab);
      await tab.locator("#daily-favicon").evaluate((el) => {
        window.faviconBeforeDay = el;
      });
      assert(
        (await snapshot(tab)).scramble === beforeDay.scramble,
        `${mode}: starts before Bangkok midnight`,
      );
      const before = await storage(tab);
      if (mode === "timeout") {
        await tab.clock.runFor(200);
      } else {
        // A wall-clock jump does not execute the scheduled date timeout.
        await tab.clock.setSystemTime("2026-10-20T17:00:00.100Z");
        assert(
          (await snapshot(tab)).scramble === beforeDay.scramble,
          `${mode}: suspended timers have not refreshed the logo`,
        );
        await tab.evaluate((mode) => {
          if (mode === "focus") window.dispatchEvent(new Event("focus"));
          else {
            Object.defineProperty(document, "hidden", {
              configurable: true,
              get: () => false,
            });
            document.dispatchEvent(new Event("visibilitychange"));
          }
        }, mode);
        await tab.clock.runFor(20);
      }
      const after = await snapshot(tab);
      const afterIcon = await favicon(tab);
      assert(
        afterIcon.href !== beforeIcon.href &&
          JSON.stringify(afterIcon.colors) === JSON.stringify(after.colors),
        `${mode}: favicon changes with the same rear matrix`,
      );
      assert(
        afterIcon.count === 1 &&
          (await tab
            .locator("#daily-favicon")
            .evaluate((el) => el === window.faviconBeforeDay)),
        `${mode}: date update reuses the existing favicon link`,
      );
      assert(
        after.scramble === afterDay.scramble &&
          (await tab.locator(".scramble-moves").textContent()).trim() ===
            afterDay.scramble,
        `${mode}: logo and main scramble change together`,
      );
      assert(
        JSON.stringify(after.colors) === JSON.stringify(colors(afterDay)),
        `${mode}: new rear matrix is correct`,
      );
      assert(
        (await tab.locator(".app-header time").getAttribute("datetime")) ===
          afterDay.date,
        `${mode}: header uses the new local day`,
      );
      assert(
        (await storage(tab)) === before,
        `${mode}: local midnight preserves the existing UTC history and settings`,
      );
    } finally {
      await context.close();
    }
  }
  return { passed: checks.length };
};
