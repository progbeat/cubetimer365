import { waitForStorage } from "./browser-storage-helpers.js";

export default async (page) => {
  const root = `${new URL(page.url()).origin}/cubetimer365/`;
  if (!["127.0.0.1", "localhost"].includes(new URL(root).hostname))
    throw new Error("Use an isolated localhost browser");
  const key = "cubetimer365:cube-style:v1";
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const others = () =>
    page.evaluate(() => ({
      owned: localStorage.getItem("cubetimer365:daily-history:v1"),
      history: localStorage.getItem("history"),
      today: localStorage.getItem("today"),
      preference: localStorage.getItem("unrelated-preference"),
    }));
  const finish = (tab = page) =>
    tab.locator(".cube-style-trigger svg").getAttribute("aria-label");
  const choose = async (name) => {
    await page.getByRole("button", { name: "Choose cube finish" }).click();
    await page.getByRole("button", { name: `${name} · Round` }).click();
  };
  await waitForStorage(page);
  assert(
    (await finish()).includes("rounded neon"),
    "Fresh storage starts with Neon",
  );
  assert(
    (await page.evaluate((key) => localStorage.getItem(key), key)) === null,
    "The default does not create a stored preference",
  );
  await page.reload();
  await waitForStorage(page);
  assert(
    (await finish()).includes("rounded neon"),
    "Reload without a saved choice keeps Neon",
  );
  await page.evaluate(() => {
    localStorage.setItem(
      "cubetimer365:daily-history:v1",
      JSON.stringify({
        version: 1,
        date: new Date().toISOString().slice(0, 10),
        history: [12.34, 15.67],
        legacyMigration: "ignored",
      }),
    );
    localStorage.setItem("history", "shared-value");
    localStorage.setItem("today", "shared-date");
    localStorage.setItem("unrelated-preference", "keep");
  });
  await page.reload();
  await waitForStorage(page);
  const original = await others();
  await page.context().addInitScript((key) => {
    window.initialCubeFinishes = [];
    new MutationObserver(() => {
      const label = document
        .querySelector(".cube-style-trigger svg")
        ?.getAttribute("aria-label");
      if (label && !window.initialCubeFinishes.includes(label))
        window.initialCubeFinishes.push(label);
    }).observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label"],
    });
    const blocked = new URLSearchParams(location.search).get(
      "fixture-style-storage",
    );
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (name) {
      if (name === key && blocked === "read")
        throw new Error("blocked preference read");
      return get.call(this, name);
    };
    Storage.prototype.setItem = function (name, value) {
      if (name === key && blocked === "write")
        throw new Error("blocked preference write");
      return set.call(this, name, value);
    };
  }, key);
  for (const style of ["neon", "flat", "cyber"]) {
    await choose(style[0].toUpperCase() + style.slice(1));
    assert(
      (await page.evaluate((key) => localStorage.getItem(key), key)) === style,
      `${style}: a user choice is saved`,
    );
    await page.reload();
    await waitForStorage(page);
    assert(
      (await finish()).includes(`rounded ${style}`),
      `${style}: reload restores the finish`,
    );
    assert(
      await page.evaluate(
        (style) =>
          window.initialCubeFinishes.every((label) =>
            label.includes(`rounded ${style}`),
          ),
        style,
      ),
      `${style}: the first rendered cube never uses a different default`,
    );
    const tab = await page.context().newPage();
    try {
      await tab.goto(root);
      await waitForStorage(tab);
      assert(
        (await finish(tab)).includes(`rounded ${style}`),
        `${style}: a newly opened tab restores the finish`,
      );
    } finally {
      await tab.close();
    }
    assert(
      JSON.stringify(await others()) === JSON.stringify(original),
      `${style}: solves and unrelated keys are unchanged`,
    );
  }
  for (const value of [null, "", "unknown", "original", "NEON"]) {
    await page.evaluate(
      ({ key, value }) => {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      },
      { key, value },
    );
    await page.reload();
    await waitForStorage(page);
    assert(
      (await finish()).includes("rounded neon"),
      `${String(value)}: missing or invalid saved data uses Neon`,
    );
    assert(
      (await page.evaluate((key) => localStorage.getItem(key), key)) === value,
      `${String(value)}: loading does not overwrite the raw preference`,
    );
  }
  await page.evaluate((key) => localStorage.setItem(key, "neon"), key);
  await page.goto(`${root}?cube=flat`);
  await waitForStorage(page);
  assert(
    (await finish()).includes("rounded flat"),
    "An explicit cube URL remains an override",
  );
  assert(
    (await page.evaluate((key) => localStorage.getItem(key), key)) === "neon",
    "Opening an explicit URL leaves the stored choice alone",
  );
  await page.evaluate((key) => localStorage.setItem(key, "cyber"), key);
  await page.goto(`${root}?fixture-style-storage=read`);
  await waitForStorage(page);
  assert(
    (await finish()).includes("rounded neon"),
    "A blocked preference read falls back without breaking the app",
  );
  await page.evaluate((key) => localStorage.setItem(key, "neon"), key);
  await page.goto(`${root}?fixture-style-storage=write`);
  await waitForStorage(page);
  await choose("Flat");
  assert(
    (await finish()).includes("rounded flat"),
    "A blocked write still applies the choice in memory",
  );
  assert(
    (await page.evaluate((key) => localStorage.getItem(key), key)) === "neon",
    "A blocked write preserves the previous stored choice",
  );
  await page.reload();
  await waitForStorage(page);
  assert(
    (await finish()).includes("rounded neon"),
    "Reload after a blocked write restores the last saved choice",
  );
  assert(
    JSON.stringify(await others()) === JSON.stringify(original),
    "Fallback and failure paths leave all other device data unchanged",
  );
  return { passed: checks.length };
};
