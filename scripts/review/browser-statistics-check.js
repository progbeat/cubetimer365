import { waitForStorage } from "./browser-storage-helpers.js";
export default async (page) => {
  const origin = new URL(page.url());
  if (!["127.0.0.1", "localhost"].includes(origin.hostname))
    throw new Error("Use an isolated localhost browser");
  const root = `${origin.origin}/cubetimer365/`;
  const checks = [];
  const assert = (value, message) => {
    if (!value) throw new Error(message);
    checks.push(message);
  };
  const times = Array.from({ length: 13 }, (_, i) => (i + 1) * 10);
  const load = async (history) => {
    await page.goto(root);
    await waitForStorage(page);
    await page.evaluate((history) => {
      localStorage.setItem(
        "cubetimer365:daily-history:v1",
        JSON.stringify({
          version: 1,
          date: new Date().toISOString().split("T")[0],
          history: JSON.parse(JSON.stringify(history)),
          legacyMigration: "ignored",
        }),
      );
      localStorage.setItem("cubetimer365:analytics-consent", "denied");
    }, history);
    await page.reload();
    await page.locator(".timer-panel").waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  const best = () => page.locator(".history-best-value").allTextContents();
  const cells = async (attempt) => {
    const row = page.locator(".history-table tbody tr").filter({
      has: page.getByRole("button", {
        name: `Delete solve ${attempt}`,
        exact: true,
      }),
    });
    return (await row.locator("td").allTextContents()).slice(0, 4);
  };
  const same = (actual, expected) =>
    JSON.stringify(actual) === JSON.stringify(expected);
  await load(times);
  assert(
    same(
      (
        await page
          .locator(".history-table thead tr:first-child th")
          .allTextContents()
      ).map((text) => text.trim()),
      ["#", "Time", "AO5", "AO12", "Delete"],
    ),
    "Results table has both rolling average columns",
  );
  assert(
    same(await cells(13), ["13", "02:10.00", "01:50.00", "01:15.00"]),
    "Latest row uses windows ending at that solve",
  );
  assert(
    same(await cells(5), ["5", "00:50.00", "00:30.00", "—"]),
    "AO5 starts at solve five",
  );
  assert(
    same(await cells(12), ["12", "02:00.00", "01:40.00", "01:05.00"]),
    "AO12 starts at solve twelve",
  );
  assert(
    same(await cells(1), ["1", "00:10.00", "—", "—"]),
    "Early rows keep incomplete windows unavailable",
  );
  assert(
    same(await best(), ["00:10.00", "00:30.00", "01:05.00"]),
    "Separate panel retains earlier best averages rather than latest averages",
  );
  assert(
    (await page.locator(".history-footer").textContent()).includes(
      "Total 15:10.00",
    ),
    "Total time stays available in the results footer",
  );
  assert(
    (await page
      .getByText("Rolling averages end at each solve.", { exact: true })
      .count()) === 0,
    "Results footer keeps the total without the explanatory caption",
  );
  await page
    .getByRole("button", { name: "Delete solve 3", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("cubetimer365:daily-history:v1")).history
        .length === 12,
  );
  assert(
    same(await best(), ["00:10.00", "00:36.67", "01:14.00"]),
    "Deleting a middle solve recalculates best windows",
  );
  assert(
    same(await cells(12), ["12", "02:10.00", "01:50.00", "01:14.00"]),
    "Deletion recalculates and renumbers rolling rows",
  );
  await page.reload();
  await page.locator(".history-table").waitFor();
  assert(
    same(await best(), ["00:10.00", "00:36.67", "01:14.00"]),
    "Recalculated best values survive reload",
  );
  await page
    .getByRole("button", { name: "Delete solve 1", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("cubetimer365:daily-history:v1")).history
        .length === 11,
  );
  assert(
    same(await best(), ["00:20.00", "00:50.00", "—"]),
    "Deleting the best single clears the no-longer-complete AO12",
  );
  await load([]);
  assert(
    same(await best(), ["—", "—", "—"]) &&
      (await page.locator(".history-table tbody tr").count()) === 0,
    "Empty history has no stale best values",
  );

  for (const width of [320, 390, 760, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await load(times);
    const measures = await page.evaluate(() => {
      const scroll = document.querySelector(".history-scroll");
      const row = document.querySelector(".history-table tbody tr");
      const numeric = [...row.cells].slice(1, 4).map((cell) => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        const text = range.getBoundingClientRect();
        const box = cell.getBoundingClientRect();
        return {
          fits: text.left >= box.left && text.right <= box.right,
          size: parseFloat(getComputedStyle(cell).fontSize),
        };
      });
      const button = row.querySelector("button").getBoundingClientRect();
      const cards = [
        ...document.querySelectorAll(
          innerWidth <= 760 ? ".stat p" : ".history-best-value",
        ),
      ].map((value) => {
        const range = document.createRange();
        range.selectNodeContents(value);
        return (
          range.getBoundingClientRect().width <=
          value.getBoundingClientRect().width
        );
      });
      return {
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        scroll: scroll.scrollWidth,
        visible: scroll.clientWidth,
        numeric,
        button: { width: button.width, height: button.height },
        cards,
      };
    });
    assert(
      measures.document === measures.viewport,
      `No page overflow at ${width}px`,
    );
    assert(
      measures.scroll <= measures.visible + 1 &&
        measures.numeric.every((cell) => cell.fits && cell.size >= 12),
      `All numeric columns fit and remain readable at ${width}px`,
    );
    assert(
      measures.cards.length === 3 && measures.cards.every(Boolean),
      `Three best values fit their panel at ${width}px`,
    );
    if (width <= 760)
      assert(
        measures.button.width >= 44 && measures.button.height >= 44,
        `Delete keeps a 44px touch target at ${width}px`,
      );
    await page.locator(".history-scroll").evaluate((node) => {
      node.scrollTop = 160;
    });
    await page.waitForTimeout(80);
    assert(
      await page.locator(".history-scroll").evaluate((node) => {
        const header = node.querySelector("th").getBoundingClientRect();
        const box = node.getBoundingClientRect();
        return header.top >= box.top - 1 && header.bottom <= box.bottom;
      }),
      `Table headings remain visible while history scrolls at ${width}px`,
    );
  }
  return { passed: checks.length, checks };
};
