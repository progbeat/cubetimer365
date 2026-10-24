import { waitForStorage } from "./browser-storage-helpers.js";

export default async (page) => {
  const checks = [];
  const assert = (pass, message) => {
    if (!pass) throw new Error(message);
    checks.push(message);
  };
  const root = page.url();
  const load = async (history) => {
    await page.goto(root);
    await waitForStorage(page);
    await page.evaluate((history) => {
      localStorage.setItem(
        "cubetimer365:daily-history:v1",
        JSON.stringify({
          version: 1,
          date: new Date().toISOString().slice(0, 10),
          history,
          legacyMigration: "ignored",
        }),
      );
      localStorage.setItem("best-summary-unrelated", "preserve");
    }, history);
    await page.reload();
    await waitForStorage(page);
    await page.evaluate(() => document.fonts.ready);
  };
  const values = () => page.locator(".history-best-value").allTextContents();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  await page.setViewportSize({ width: 1440, height: 900 });
  const times = Array.from({ length: 13 }, (_, i) => (i + 1) * 10);
  for (const [history, expected, total] of [
    [[], ["—", "—", "—"], "00:00.00"],
    [[10, 20, 30, 40], ["00:10.00", "—", "—"], "01:40.00"],
    [[10, 20, 30, 40, 50], ["00:10.00", "00:30.00", "—"], "02:30.00"],
    [times, ["00:10.00", "00:30.00", "01:05.00"], "15:10.00"],
  ]) {
    await load(history);
    assert(
      same(await values(), expected),
      "Summary uses independent daily bests and incomplete averages",
    );
    assert(
      (await page.locator(".history-table tbody tr").count()) ===
        history.length,
      "Best is outside the recorded solve rows",
    );
    assert(
      (await page.locator(".count").textContent()).trim() ===
        `${history.length} ${history.length === 1 ? "solve" : "solves"}`,
      "Best does not add a solve to the count",
    );
    assert(
      (await page.locator(".history-footer").textContent()).includes(
        `Total ${total}`,
      ),
      "Best does not contribute to the total",
    );
    assert(
      (await page.locator(".history-best button").count()) === 0,
      "Summary has no delete action",
    );
  }
  assert(
    same(
      (
        await page
          .locator(".history-table tbody tr")
          .first()
          .locator("td")
          .allTextContents()
      ).slice(1, 4),
      ["02:10.00", "01:50.00", "01:15.00"],
    ),
    "Latest solve differs from the independent best row",
  );
  await page
    .getByRole("button", { name: "Delete solve 3", exact: true })
    .click();
  await waitForStorage(page);
  assert(
    same(await values(), ["00:10.00", "00:36.67", "01:14.00"]),
    "Deleting a middle solve recomputes best windows",
  );
  await page
    .getByRole("button", { name: "Delete solve 1", exact: true })
    .click();
  await waitForStorage(page);
  assert(
    same(await values(), ["00:20.00", "00:50.00", "—"]),
    "Deleting the best single updates the summary and clears incomplete AO12",
  );
  await page.reload();
  await waitForStorage(page);
  assert(
    same(await values(), ["00:20.00", "00:50.00", "—"]),
    "Recomputed bests survive reload",
  );

  await load(Array.from({ length: 100 }, (_, i) => 12.34 + (i % 7)));
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const m = await page.evaluate(() => {
      const box = (selector) => {
        const el = document.querySelector(selector),
          r = el.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          display: getComputedStyle(el).display,
        };
      };
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        scramble: box(".scramble-panel"),
        timer: box(".timer-panel"),
        stats: box(".stats-grid"),
        history: box(".history-panel"),
        chart: box(".chart-panel"),
        index: box(".history-table th"),
      };
    });
    assert(!m.overflow, `No page overflow at ${width}px`);
    assert(
      m.index.width <= 44.5,
      `Number column remains compact at ${width}px`,
    );
    if (width > 760) {
      assert(
        m.stats.display === "none" &&
          (await page.locator(".history-best").isVisible()),
        "Desktop replaces redundant cards with the Best row",
      );
      assert(
        m.history.y === m.scramble.y &&
          m.history.bottom === m.chart.bottom &&
          m.chart.right < m.history.x &&
          m.chart.right === m.timer.right,
        "History spans the right side; chart sits beneath the timer on the left",
      );
      await page.locator(".history-scroll").evaluate((el) => {
        el.scrollTop = 400;
      });
      const sticky = await page.locator(".history-scroll").evaluate((el) => {
        const top = el.getBoundingClientRect().top,
          thead = el.querySelector("thead").getBoundingClientRect(),
          columns = el.querySelector("thead tr").getBoundingClientRect(),
          best = el.querySelector(".history-best").getBoundingClientRect();
        return (
          Math.abs(thead.top - top) < 1 &&
          Math.abs(best.top - columns.bottom) < 1
        );
      });
      assert(
        sticky,
        "Column headings and Best stay together when history scrolls",
      );
    } else {
      assert(
        m.stats.display === "grid" &&
          !(await page.locator(".history-best").isVisible()),
        "Mobile retains the existing best cards without a duplicate row",
      );
      assert(
        m.scramble.y < m.timer.y &&
          m.timer.y < m.stats.y &&
          m.stats.y < m.history.y &&
          m.history.y < m.chart.y,
        "Mobile panel order is unchanged",
      );
    }
  }
  assert(
    (await page.evaluate(() => JSON.stringify({ ...localStorage }))) === stored,
    "Scrolling and resizing preserve history and unrelated settings",
  );
  return { passed: checks.length };
};
