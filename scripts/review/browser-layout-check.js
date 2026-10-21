import { waitForStorage } from "./browser-storage-helpers.js";

export default async (page) => {
  const checks = [];
  const assert = (value, message) => {
    if (!value) throw new Error(message);
    checks.push(message);
  };
  const load = async (count) => {
    await waitForStorage(page);
    await page.evaluate((count) => {
      localStorage.setItem(
        "cubetimer365:daily-history:v1",
        JSON.stringify({
          version: 1,
          date: new Date().toISOString().slice(0, 10),
          history: Array.from({ length: count }, (_, i) => 12.34 + (i % 7)),
          legacyMigration: "ignored",
        }),
      );
      localStorage.setItem("layout-unrelated-fixture", "preserve");
    }, count);
    await page.reload();
    await waitForStorage(page);
    await page.evaluate(() => document.fonts.ready);
  };
  const measure = () =>
    page.evaluate(() => {
      const box = (selector) => {
        const el = document.querySelector(selector);
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height,
          min: parseFloat(style.minHeight),
          padding: parseFloat(style.paddingBottom),
        };
      };
      return {
        viewport: innerHeight,
        scroll: document.documentElement.scrollHeight,
        horizontal: document.documentElement.scrollWidth > innerWidth,
        app: box(".app-layout"),
        chart: box(".chart-panel"),
        plot: box(".chart-plot"),
        rendered: box(".mantine-LineChart-root, .empty-chart"),
        history: box(".history-panel"),
        timer: box(".timer-panel"),
      };
    });
  await page.setViewportSize({ width: 1440, height: 900 });
  const heights = [];
  for (const count of [0, 100]) {
    await load(count);
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...localStorage }),
    );
    const minimum = (await measure()).app.min;
    for (const height of [1200, 900, minimum, minimum - 1, 768]) {
      await page.setViewportSize({ width: 1440, height });
      await page.waitForTimeout(100);
      const m = await measure();
      assert(!m.horizontal, "Desktop has no horizontal overflow");
      assert(m.plot.height >= 180, "Short windows retain a readable chart");
      assert(
        Math.abs(m.rendered.height - m.plot.height) < 1,
        "Rendered chart fills its plot in empty and populated states",
      );
      assert(
        Math.abs(m.chart.bottom + m.app.padding - m.app.bottom) < 1,
        "Chart respects the outer bottom inset",
      );
      assert(
        height >= minimum ? m.scroll === height : m.scroll > height,
        "Desktop fills sufficient windows and scrolls below its minimum",
      );
      if (height === 900) heights.push(m.chart.height);
    }
    assert(
      (await page
        .getByRole("region", { name: "Solve times", exact: true })
        .count()) === 1,
      "Chart retains its accessible name",
    );
    assert(
      (await page.getByText("Solve number →", { exact: true }).count()) === 0,
      "Redundant solve-number caption is absent",
    );
    assert(
      (await page.evaluate(() => JSON.stringify({ ...localStorage }))) ===
        stored,
      "Resizing leaves history and unrelated storage unchanged",
    );
  }
  assert(
    heights[0] === heights[1],
    "Empty and populated charts use the same space",
  );

  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...localStorage }),
    );
    const m = await measure();
    assert(!m.horizontal, "Table does not cause horizontal page overflow");
    if (width < 760) {
      assert(
        m.history.top > m.timer.bottom && m.chart.top > m.history.bottom,
        "Mobile panels remain stacked",
      );
      assert(
        m.scroll > m.viewport,
        "Mobile retains natural vertical scrolling",
      );
    }
    const headers = await page
      .locator(".history-table th")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).textAlign));
    assert(
      headers[0] === "right" &&
        headers.slice(1, 4).every((a) => a === "center"),
      "Table headings follow the alignment of their data",
    );
    const rightEdges = [];
    for (const number of [100, 99, 10, 9, 1]) {
      const row = page.locator(".history-table tbody tr").nth(100 - number);
      const cells = await row.evaluate((tr) =>
        Array.from(tr.cells)
          .slice(0, 4)
          .map((td) => {
            const rect = td.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(td);
            const text = range.getBoundingClientRect();
            return {
              align: getComputedStyle(td).textAlign,
              text: td.textContent,
              textRight: text.right,
              inset: text.left - rect.left,
              centerError: Math.abs(
                (text.left + text.right - rect.left - rect.right) / 2,
              ),
            };
          }),
      );
      assert(
        cells[0].text === String(number) &&
          cells[0].align === "right" &&
          cells[0].inset >= 10,
        "One-, two- and three-digit indices keep their inset and right alignment",
      );
      assert(
        cells.slice(1).every((c) => c.align === "center" && c.centerError < 1),
        "Times and unavailable averages are centered",
      );
      if (number === 1)
        assert(
          cells[2].text === "—" && cells[3].text === "—",
          "Incomplete averages retain their dashes",
        );
      rightEdges.push(cells[0].textRight);
    }
    assert(
      Math.max(...rightEdges) - Math.min(...rightEdges) < 1,
      "All solve indices share one right edge",
    );
    assert(
      await page
        .locator(".history-table tbody tr")
        .first()
        .evaluate((el) => el.classList.contains("latest-solve")),
      "Latest solve remains highlighted",
    );
    assert(
      (await page.evaluate(() => JSON.stringify({ ...localStorage }))) ===
        stored,
      "Table inspection does not change stored solves",
    );
  }
  return { passed: checks.length };
};
