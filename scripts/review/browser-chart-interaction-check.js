import { waitForStorage } from "./browser-storage-helpers.js";
import { interceptAnalytics } from "./browser-network-guards.js";

export default async (page) => {
  const root = `${new URL(page.url()).origin}/cubetimer365/`;
  let passed = 0;
  const assert = (value, message) => {
    if (!value) throw new Error(message);
    passed += 1;
  };
  const histories = [
    [],
    [1.48],
    Array.from({ length: 14 }, (_, i) => 2 + (i % 5) / 10),
    Array.from({ length: 119 }, (_, i) => (i < 90 ? 2 : 1) + (i % 7) / 100),
    Array.from({ length: 500 }, (_, i) => 12 + (i % 17) / 10),
  ];
  const load = async (tab, history) => {
    await tab.goto(root);
    await waitForStorage(tab);
    await tab.evaluate((history) => {
      localStorage.setItem(
        "cubetimer365:daily-history:v1",
        JSON.stringify({
          version: 1,
          date: new Date().toISOString().slice(0, 10),
          history,
          legacyMigration: "ignored",
        }),
      );
      localStorage.setItem("chart-interaction-unrelated", "preserved");
    }, history);
    await tab.reload();
    await waitForStorage(tab);
    await tab.evaluate(() => document.fonts.ready);
    await tab.locator(".chart-panel").scrollIntoViewIfNeeded();
  };
  const snapshot = (tab) =>
    tab.evaluate(() => ({
      rows: document.querySelectorAll(".history-table tbody tr").length,
      saved: JSON.parse(localStorage.getItem("cubetimer365:daily-history:v1"))
        .history,
      unrelated: localStorage.getItem("chart-interaction-unrelated"),
      path:
        document.querySelector(".recharts-area-curve")?.getAttribute("d") ||
        null,
      dots: [...document.querySelectorAll(".recharts-area-dot")].filter(
        (dot) => dot.getBoundingClientRect().width > 0,
      ).length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
  const position = (tab, count, attempt) =>
    tab.locator(".chart-plot").evaluate(
      (el, { count, attempt }) => {
        const r = el.getBoundingClientRect();
        return {
          x:
            r.left +
            8 +
            (count === 1 ? 0.5 : (attempt - 1) / (count - 1)) * (r.width - 16),
          y: r.top + r.height / 2,
        };
      },
      { count, attempt },
    );
  const inspect = async (tab, count, attempt) => {
    const tooltip = tab.locator(".recharts-tooltip-wrapper");
    const label = tooltip.getByText(/^Solve \d+$/);
    await label.waitFor({ state: "visible" });
    const selected = Number((await label.textContent()).slice(6));
    const dataWidth = await tab
      .locator(".chart-plot")
      .evaluate((el) => el.clientWidth - 16);
    // Mouse events use integer CSS pixels; several dense samples can share one.
    assert(
      selected >= 1 &&
        selected <= count &&
        Math.abs(selected - attempt) <=
          Math.max(1, Math.ceil((count - 1) / dataWidth)),
      "Inspection selects the nearest sample within pointer pixel precision",
    );
    const cells = await tab
      .locator(".history-table tbody tr")
      .nth(count - selected)
      .locator("td")
      .allTextContents();
    const content = await tooltip.textContent();
    assert(
      content.includes("Time") && content.includes(cells[1]),
      "Tooltip shows the actual selected solve time",
    );
    for (const [index, label] of [
      [2, "AO5"],
      [3, "AO12"],
    ]) {
      assert(
        cells[index] === "—"
          ? !content.includes(label)
          : content.includes(label) && content.includes(cells[index]),
        "Tooltip averages match the selected table row, including incomplete windows",
      );
    }
    const markers = tab.locator(".recharts-active-dot circle");
    const countMarkers = await markers.count();
    assert(
      countMarkers > 0 && countMarkers <= 3,
      "Only the active solve's markers appear",
    );
    const strokes = await markers.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).stroke),
    );
    assert(
      strokes.includes("rgb(243, 245, 246)"),
      "The active Time marker preserves the chosen light color",
    );
    const bounds = await tooltip.boundingBox();
    assert(
      bounds &&
        bounds.x >= 0 &&
        bounds.x + bounds.width <= (await tab.viewportSize()).width,
      "Tooltip stays within the viewport",
    );
  };

  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const history of histories) {
      await load(page, history);
      await page.mouse.move(0, 0);
      const before = await snapshot(page);
      assert(
        before.rows === history.length &&
          JSON.stringify(before.saved) === JSON.stringify(history),
        "All solves remain in the table and storage",
      );
      assert(
        before.dots === 0,
        "Sparse and dense charts have no permanent markers",
      );
      assert(!before.overflow, "Chart interaction does not overflow the page");
      if (history.length === 0) {
        assert(
          await page.getByText("No data yet.", { exact: true }).isVisible(),
          "Empty history retains its empty state",
        );
        continue;
      }
      if (history.length > 1) {
        assert(
          (before.path.match(/[CL]/g) || []).length === history.length - 1,
          "The time curve retains every sample without decimation",
        );
      }
      const attempts =
        history.length === 1
          ? [1]
          : [1, Math.floor(history.length * 0.6), history.length];
      for (const attempt of attempts) {
        const p = await position(page, history.length, attempt);
        await page.mouse.move(p.x, p.y);
        await inspect(page, history.length, attempt);
        const after = await snapshot(page);
        assert(
          after.path === before.path &&
            JSON.stringify(after.saved) === JSON.stringify(history) &&
            after.unrelated === "preserved",
          "Hover does not alter curves, history or other settings",
        );
        await page.mouse.move(0, 0);
        await page.waitForFunction(
          () =>
            document.querySelectorAll(".recharts-active-dot circle").length ===
            0,
        );
        assert(
          !(await page.locator(".recharts-tooltip-wrapper").isVisible()),
          "Hover markers and tooltip disappear when the pointer leaves",
        );
      }
    }
  }

  const browser = page.context().browser();
  for (const width of [320, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    await interceptAnalytics(context);
    try {
      const touch = await context.newPage();
      for (const history of [histories[1], histories[3]]) {
        await load(touch, history);
        const before = await snapshot(touch);
        assert(
          before.dots === 0,
          "Touch charts also start without permanent markers",
        );
        const attempts =
          history.length === 1
            ? [1]
            : [1, Math.floor(history.length * 0.6), history.length];
        for (const attempt of attempts) {
          const p = await position(touch, history.length, attempt);
          await touch.touchscreen.tap(p.x, p.y);
          await inspect(touch, history.length, attempt);
          const after = await snapshot(touch);
          assert(
            after.path === before.path &&
              JSON.stringify(after.saved) === JSON.stringify(history) &&
              after.unrelated === "preserved",
            "Touch inspection preserves every solve and setting",
          );
          await touch.touchscreen.tap(2, 2);
          await touch.waitForFunction(
            () =>
              document.querySelectorAll(".recharts-active-dot circle")
                .length === 0,
          );
          assert(
            !(await touch.locator(".recharts-tooltip-wrapper").isVisible()),
            "Tapping outside dismisses touch inspection",
          );
        }
      }
    } finally {
      await context.close();
    }
  }
  return { passed };
};
