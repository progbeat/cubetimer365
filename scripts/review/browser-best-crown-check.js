import { waitForStorage } from "./browser-storage-helpers.js";

export default async (page) => {
  let passed = 0;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    passed += 1;
  };
  await waitForStorage(page);
  await page.evaluate(() =>
    localStorage.setItem(
      "cubetimer365:daily-history:v1",
      JSON.stringify({
        version: 1,
        date: new Date().toISOString().slice(0, 10),
        history: [12.34, 15.67],
        legacyMigration: "ignored",
      }),
    ),
  );
  await page.reload();
  await waitForStorage(page);
  await page.evaluate(() => document.fonts.ready);
  const saved = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const crown = page.getByRole("img", { name: "Today's best", exact: true });
    await crown.evaluate((image) => image.decode());
    assert(
      (await crown.getAttribute("title")) === "Today's best",
      "The icon has the exact native browser title",
    );
    assert(
      (await crown.getAttribute("tabindex")) === null &&
        (await page.locator(".history-best button").count()) === 0,
      "The informational image adds no button or tab stop",
    );
    assert(
      (await page
        .getByRole("rowheader", { name: "Today's best", exact: true })
        .count()) === 1,
      "The summary retains its accessible daily-best name",
    );
    await crown.hover();
    const result = await crown.evaluate((image) => {
      const icon = image.getBoundingClientRect(),
        cell = image.closest("th"),
        box = cell.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(
        document.querySelector("thead tr:first-child th"),
      );
      const heading = range.getBoundingClientRect();
      const ancestors = [];
      for (let el = image.parentElement; el; el = el.parentElement)
        ancestors.push(el);
      const sampleTitle = (x, y) =>
        document
          .elementFromPoint(x, y)
          ?.closest("[title]")
          ?.getAttribute("title") || null;
      const otherCells = [...image.closest("tr").querySelectorAll("td")];
      return {
        tag: image.tagName,
        size: [icon.width, icon.height],
        natural: [image.naturalWidth, image.naturalHeight],
        column: box.width,
        centerOffset: Math.abs(
          (icon.left + icon.right) / 2 - (heading.left + heading.right) / 2,
        ),
        confined:
          icon.left >= box.left &&
          icon.right <= box.right &&
          icon.top >= box.top &&
          icon.bottom <= box.bottom,
        ancestorTitles: ancestors.some((el) => el.hasAttribute("title")),
        summaryTitles: image.closest("tr").querySelectorAll("[title]").length,
        inside: sampleTitle(
          (icon.left + icon.right) / 2,
          (icon.top + icon.bottom) / 2,
        ),
        outside: [
          sampleTitle(box.left + 1, (icon.top + icon.bottom) / 2),
          sampleTitle(box.right - 1, (icon.top + icon.bottom) / 2),
          ...otherCells.map((el) => {
            const b = el.getBoundingClientRect();
            return sampleTitle((b.left + b.right) / 2, (b.top + b.bottom) / 2);
          }),
        ],
      };
    });
    assert(
      result.tag === "IMG" &&
        result.size.every((n) => n === 16) &&
        result.natural.every((n) => n === 16),
      "The native-title target is exactly the 16 px icon",
    );
    assert(
      result.column <= 44.5 && result.confined,
      "The compact icon remains inside the unchanged number column",
    );
    assert(
      result.centerOffset < 1.5,
      "The icon is centered beneath the number-column heading",
    );
    assert(
      !result.ancestorTitles && result.summaryTitles === 1,
      "No row, cell, ancestor or other summary value inherits the icon title",
    );
    assert(
      result.inside === "Today's best" &&
        result.outside.every((title) => title !== "Today's best"),
      "Pointer hit testing limits Today's best to the icon area",
    );
    assert(
      (await page.getByRole("tooltip").count()) === 0 &&
        (await crown.getAttribute("aria-describedby")) === null,
      "Hover creates no custom tooltip, portal or description wiring",
    );
    await page.locator(".timer-surface").focus();
    await page.keyboard.press("Tab");
    assert(
      await page
        .locator("tbody .delete-solve")
        .first()
        .evaluate((el) => el === document.activeElement),
      "Keyboard navigation skips the static crown and reaches the real solve action",
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "The icon and native title cause no horizontal overflow",
    );
  }
  assert(
    (await page.evaluate(() => JSON.stringify({ ...localStorage }))) === saved,
    "Native-title inspection preserves history and settings",
  );
  return { passed };
};
