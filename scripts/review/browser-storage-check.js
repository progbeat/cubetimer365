export default async (page) => {
  const root = `${new URL(page.url()).origin}/cubetimer365/`;
  if (!["127.0.0.1", "localhost"].includes(new URL(root).hostname))
    throw new Error("Use an isolated localhost browser");
  const key = "cubetimer365:daily-history:v1";
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const read = () =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) || "null"),
      key,
    );
  const original = () =>
    page.evaluate(() => ({
      history: localStorage.getItem("history"),
      today: localStorage.getItem("today"),
      other: localStorage.getItem("lights-out.reaction-lab.v2"),
    }));
  const review = () =>
    page.getByRole("button", { name: "Review previous browser results" });
  const seed = async ({
    history = "[12.34,23.45]",
    stale = false,
    owned = null,
  } = {}) => {
    await page.goto(root);
    await page.evaluate(
      ({ key, history, stale, owned }) => {
        const date = new Date();
        if (stale) date.setUTCDate(date.getUTCDate() - 1);
        localStorage.setItem("today", date.toISOString().slice(0, 10));
        localStorage.setItem("history", history);
        localStorage.setItem(
          "lights-out.reaction-lab.v2",
          '{"version":2,"records":[{"scoreMs":123}]}',
        );
        if (owned === null) localStorage.removeItem(key);
        else
          localStorage.setItem(
            key,
            typeof owned === "string"
              ? owned
              : JSON.stringify({
                  version: 1,
                  date: date.toISOString().slice(0, 10),
                  history: owned,
                  legacyMigration: "unresolved",
                }),
          );
      },
      { key, history, stale, owned },
    );
    const snapshot = await original();
    await page.reload();
    await page.locator(".history-panel").waitFor();
    return snapshot;
  };
  let snapshot = await seed();
  assert(
    (await read()).history.length === 0 && (await review().count()) === 1,
    "Shared history is offered for review, never silently adopted",
  );
  await review().click();
  await page
    .getByRole("dialog", { name: "Import previous results?" })
    .waitFor();
  assert(
    (await page.getByText(/do not identify the app/).isVisible()) &&
      (await page.getByText(/00:12.34, 00:23.45/).isVisible()),
    "Preview shows the candidate values and ownership ambiguity",
  );
  await page.getByRole("button", { name: "Import into CubeTimer365" }).click();
  await page.waitForFunction(
    (key) => JSON.parse(localStorage.getItem(key)).history.length === 2,
    key,
  );
  assert(
    (await read()).legacyMigration === "imported",
    "Accepted migration stores its decision with the solve data",
  );
  assert(
    JSON.stringify(await original()) === JSON.stringify(snapshot),
    "Import leaves shared keys and Lights Out data byte-for-byte untouched",
  );
  await page
    .getByRole("button", { name: "Delete solve 1", exact: true })
    .click();
  await page.reload();
  await page.locator(".history-panel").waitFor();
  assert(
    JSON.stringify((await read()).history) === "[23.45]" &&
      (await review().count()) === 0,
    "Reload never repeats import or resurrects a deleted solve",
  );
  snapshot = await seed();
  await review().click();
  await page.getByRole("button", { name: "Keep separate" }).click();
  await page.reload();
  await page.locator(".history-panel").waitFor();
  assert(
    (await read()).legacyMigration === "ignored" &&
      (await review().count()) === 0,
    "Keeping data separate persists without repeat prompts",
  );
  assert(
    JSON.stringify(await original()) === JSON.stringify(snapshot),
    "Declining import preserves every original shared value",
  );
  for (const history of [
    "broken",
    '{"records":[12]}',
    '["12"]',
    "[null]",
    "[-1]",
  ]) {
    snapshot = await seed({ history });
    assert(
      (await review().count()) === 0 && (await read()).history.length === 0,
      `${history}: invalid or unrelated data is not offered as solves`,
    );
    assert(
      JSON.stringify(await original()) === JSON.stringify(snapshot),
      `${history}: invalid/shared original remains untouched`,
    );
  }
  snapshot = await seed({ owned: [42] });
  assert(
    JSON.stringify((await read()).history) === "[42]" &&
      (await review().count()) === 0,
    "Existing owned results take precedence over a shared candidate",
  );
  assert(
    JSON.stringify(await original()) === JSON.stringify(snapshot),
    "Existing owned data never causes writes to shared keys",
  );
  snapshot = await seed({ stale: true, owned: [42] });
  assert(
    (await read()).history.length === 0 &&
      (await read()).date === new Date().toISOString().slice(0, 10),
    "The existing UTC daily boundary resets only the owned record",
  );
  assert(
    JSON.stringify(await original()) === JSON.stringify(snapshot),
    "Day rollover preserves legacy date, history and other app data",
  );
  snapshot = await seed({ owned: "broken" });
  await page
    .getByRole("alert")
    .filter({ hasText: "Browser storage" })
    .waitFor();
  assert(
    (await page.evaluate((key) => localStorage.getItem(key), key)) === "broken",
    "Corrupt owned data is retained for recovery",
  );
  assert(
    JSON.stringify(await original()) === JSON.stringify(snapshot),
    "Recovery mode leaves other applications' keys alone",
  );
  // Simulate a tab that missed storage notifications while its import modal was open.
  const otherTab = async (blockEvents) => {
    const tab = await page.context().newPage();
    if (blockEvents)
      await tab.addInitScript((key) => {
        window.addEventListener(
          "storage",
          (event) => {
            if (event.key === key) event.stopImmediatePropagation();
          },
          true,
        );
      }, key);
    await tab.goto(root);
    await tab
      .getByRole("button", { name: "Review previous browser results" })
      .waitFor();
    return tab;
  };
  snapshot = await seed();
  let tab = await otherTab(true);
  try {
    await tab
      .getByRole("button", { name: "Review previous browser results" })
      .click();
    await page.bringToFront();
    await page.keyboard.down("Space");
    await page.waitForTimeout(330);
    await page.keyboard.up("Space");
    await page.waitForTimeout(250);
    await page.keyboard.press("Space");
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key)).history.length === 1,
      key,
    );
    const newer = await page.evaluate((key) => localStorage.getItem(key), key);
    await tab.getByRole("button", { name: "Import into CubeTimer365" }).click();
    await tab.getByText("1 solve", { exact: true }).waitFor();
    assert(
      (await page.evaluate((key) => localStorage.getItem(key), key)) === newer,
      "A stale import cannot overwrite a solve saved by another tab",
    );
    assert(
      JSON.stringify(await original()) === JSON.stringify(snapshot),
      "Rejecting a stale import preserves the original shared keys",
    );
  } finally {
    await tab.close();
  }
  await seed();
  tab = await otherTab(true);
  try {
    await tab
      .getByRole("button", { name: "Review previous browser results" })
      .click();
    await review().click();
    await page
      .getByRole("button", { name: "Import into CubeTimer365" })
      .click();
    const newer = await page.evaluate((key) => localStorage.getItem(key), key);
    await tab.getByRole("button", { name: "Keep separate" }).click();
    await tab.getByText("2 solves", { exact: true }).waitFor();
    assert(
      (await page.evaluate((key) => localStorage.getItem(key), key)) === newer,
      "A stale refusal cannot replace a completed import decision",
    );
  } finally {
    await tab.close();
  }
  await seed();
  tab = await otherTab(false);
  try {
    await review().click();
    await page
      .getByRole("button", { name: "Import into CubeTimer365" })
      .click();
    await tab.getByText("2 solves", { exact: true }).waitFor();
    assert(
      (await tab
        .getByRole("button", { name: "Review previous browser results" })
        .count()) === 0,
      "Storage notifications synchronize completed migration into another tab",
    );
  } finally {
    await tab.close();
  }
  return { passed: checks.length, checks };
};
