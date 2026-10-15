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
  const settled = async (tab = page) => {
    await tab
      .getByText("Saving…", { exact: true })
      .waitFor({ state: "hidden" });
  };
  const holdWrites = () =>
    page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("cubetimer365:storage-locks:v1", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const gate = db.transaction("writes", "readwrite");
      let released = false;
      window.releaseStorageGate = () => {
        released = true;
      };
      const keepAlive = () => {
        const request = gate.objectStore("writes").get("daily-history");
        request.onsuccess = () => {
          if (!released) keepAlive();
        };
      };
      gate.oncomplete = () => db.close();
      keepAlive();
    });
  const observeWrites = (tab) =>
    tab.evaluate(() => {
      window.queuedStorageWrites = 0;
      const transaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        const result = transaction.apply(this, args);
        if (
          this.name === "cubetimer365:storage-locks:v1" &&
          args[1] === "readwrite"
        )
          window.queuedStorageWrites += 1;
        return result;
      };
    });
  const holdAcknowledgement = (tab) =>
    tab.evaluate(() => {
      const complete = Object.getOwnPropertyDescriptor(
        IDBTransaction.prototype,
        "oncomplete",
      );
      Object.defineProperty(IDBTransaction.prototype, "oncomplete", {
        configurable: true,
        get: complete.get,
        set(callback) {
          complete.set.call(this, function (event) {
            if (
              this.db.name === "cubetimer365:storage-locks:v1" &&
              !window.releaseStorageAcknowledgement
            ) {
              window.releaseStorageAcknowledgement = () =>
                callback.call(this, event);
            } else callback.call(this, event);
          });
        },
      });
    });
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
    await page.locator(".history-panel").waitFor();
    await settled();
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
    await settled();
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
  await settled();
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
  await settled();
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
    await settled();
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
  // Keep a real readwrite transaction active until BOTH tabs have queued writes.
  for (const first of ["solve", "import"]) {
    snapshot = await seed();
    tab = await otherTab(true);
    try {
      await tab
        .getByRole("button", { name: "Review previous browser results" })
        .click();
      const before = await page.evaluate(
        (key) => localStorage.getItem(key),
        key,
      );
      await holdWrites();
      for (const writer of [page, tab]) {
        await observeWrites(writer);
      }
      const solve = async () => {
        await page.bringToFront();
        await page.keyboard.down("Space");
        await page.waitForTimeout(330);
        await page.keyboard.up("Space");
        await page.waitForTimeout(250);
        await page.keyboard.press("Space");
        await page.waitForFunction(() => window.queuedStorageWrites > 0);
      };
      const importResults = async () => {
        await tab
          .getByRole("button", { name: "Import into CubeTimer365" })
          .click();
        await tab.waitForFunction(() => window.queuedStorageWrites > 0);
      };
      if (first === "solve") {
        await solve();
        await importResults();
      } else {
        await importResults();
        await solve();
      }
      assert(
        (await page.evaluate((key) => localStorage.getItem(key), key)) ===
          before &&
          (await page.getByText("Saving…", { exact: true }).isVisible()) &&
          (await tab.getByText("Saving…", { exact: true }).isVisible()),
        `${first} first: both real tabs wait for the shared transaction before committing`,
      );
      await page.evaluate(() => window.releaseStorageGate());
      await settled();
      await settled(tab);
      const persisted = await read();
      if (first === "solve") {
        await tab.getByText("1 solve", { exact: true }).waitFor();
        assert(
          persisted.history.length === 1 && persisted.history[0] < 5,
          "Overlapping import cannot replace the solve transaction that committed first",
        );
      } else {
        assert(
          JSON.stringify(persisted.history) === "[12.34,23.45]" &&
            persisted.legacyMigration === "imported",
          "Overlapping solve cannot replace the import transaction that committed first",
        );
        await page
          .getByRole("alert")
          .filter({ hasText: "Browser storage" })
          .waitFor();
        assert(
          await page.getByText("1 solve", { exact: true }).isVisible(),
          "The losing solve remains visible in its original tab with a persistence warning",
        );
      }
      assert(
        JSON.stringify(await original()) === JSON.stringify(snapshot),
        `${first} first: deliberately overlapping writers preserve all original shared data`,
      );
    } finally {
      await page.evaluate(() => window.releaseStorageGate?.());
      await tab.close();
    }
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
  // A separate tab's wall clock advances while its scheduled refresh stays paused.
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          date: "2026-10-12",
          history: [12],
          legacyMigration: "ignored",
        }),
      ),
    key,
  );
  const delayed = await page.context().newPage();
  try {
    await delayed.clock.install({ time: "2026-10-12T23:59:00Z" });
    await delayed.goto(root);
    await delayed.getByText("1 solve", { exact: true }).waitFor();
    await delayed.clock.pauseAt("2026-10-12T23:59:10Z");
    await delayed.clock.setSystemTime("2026-10-13T00:00:01Z");
    const newer = JSON.stringify({
      version: 1,
      date: "2026-10-13",
      history: [0.5],
      legacyMigration: "ignored",
    });
    await page.evaluate(({ key, newer }) => localStorage.setItem(key, newer), {
      key,
      newer,
    });
    await delayed
      .getByRole("cell", { name: "00:00.50", exact: true })
      .waitFor();
    assert(
      (await page.evaluate((key) => localStorage.getItem(key), key)) === newer,
      "A delayed background tab adopts new-day solves without relabeling or clearing them",
    );
    await delayed.clock.runFor(60_000);
    assert(
      (await page.evaluate((key) => localStorage.getItem(key), key)) ===
        newer &&
        (await delayed
          .getByRole("cell", { name: "00:00.50", exact: true })
          .isVisible()),
      "The later midnight refresh preserves already-adopted current-day results",
    );
  } finally {
    await delayed.close();
  }
  // Hold the real save acknowledgement after the write, then refresh the UTC day.
  // Playwright's clock belongs to the context, including the paused tab above.
  await page.clock.resume();
  for (const choice of ["imported", "ignored"]) {
    await page.clock.setFixedTime("2026-10-12T23:59:50Z");
    snapshot = await seed();
    await holdAcknowledgement(page);
    await review().click();
    await page
      .getByRole("button", {
        name:
          choice === "imported" ? "Import into CubeTimer365" : "Keep separate",
      })
      .click();
    await page.waitForFunction(
      () => typeof window.releaseStorageAcknowledgement === "function",
    );
    assert(
      (await read()).date === "2026-10-12" &&
        (await read()).legacyMigration === choice,
      `${choice}: real persistence completes before the delayed acknowledgement`,
    );
    await page.clock.setFixedTime("2026-10-13T00:00:01Z");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForFunction(
      () =>
        document.querySelector(".app-header time")?.getAttribute("datetime") ===
        "2026-10-13",
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.evaluate(() => window.releaseStorageAcknowledgement());
    await page.waitForFunction(
      ({ key, choice }) => {
        const record = JSON.parse(localStorage.getItem(key) || "null");
        return (
          record?.date === "2026-10-13" &&
          record.history.length === 0 &&
          record.legacyMigration === choice
        );
      },
      { key, choice },
    );
    await settled();
    assert(
      (await page.getByText("No solves yet.", { exact: true }).isVisible()) &&
        (await page
          .getByText("Saved on this device", { exact: true })
          .isVisible()),
      `${choice}: a late acknowledgement preserves the new day and finishes saving`,
    );
    await page.reload();
    await page.locator(".history-panel").waitFor();
    assert(
      (await review().count()) === 0 &&
        JSON.stringify(await original()) === JSON.stringify(snapshot),
      `${choice}: the migration decision survives reload without altering shared originals`,
    );
  }
  // Both tabs reset while the mutex is held; identical pending records must synchronize.
  await page.clock.setFixedTime("2026-10-12T23:59:50Z");
  snapshot = await seed({ owned: [12] });
  tab = await page.context().newPage();
  try {
    await tab.goto(root);
    await tab.getByText("1 solve", { exact: true }).waitFor();
    const before = await page.evaluate((key) => localStorage.getItem(key), key);
    await holdWrites();
    await observeWrites(page);
    await observeWrites(tab);
    await page.clock.setFixedTime("2026-10-13T00:00:01Z");
    for (const writer of [page, tab]) {
      await writer.evaluate(() => window.dispatchEvent(new Event("focus")));
      await writer.waitForFunction(() => window.queuedStorageWrites > 0);
    }
    assert(
      (await page.evaluate((key) => localStorage.getItem(key), key)) === before,
      "Both tabs queue their midnight resets before either can write",
    );
    await page.evaluate(() => window.releaseStorageGate());
    for (const writer of [page, tab])
      await writer.getByText("Saved on this device", { exact: true }).waitFor();
    assert(
      (await read()).date === "2026-10-13" &&
        (await read()).history.length === 0 &&
        (await page
          .getByRole("alert")
          .filter({ hasText: "Browser storage" })
          .count()) === 0 &&
        (await tab
          .getByRole("alert")
          .filter({ hasText: "Browser storage" })
          .count()) === 0,
      "Identical simultaneous resets synchronize without disabling persistence",
    );
    for (const [index, writer] of [page, tab].entries()) {
      await writer.bringToFront();
      await writer.keyboard.down("Space");
      await writer.waitForTimeout(330);
      await writer.keyboard.up("Space");
      await writer.waitForTimeout(250);
      await writer.keyboard.press("Space");
      await writer.getByText("Saved on this device", { exact: true }).waitFor();
      const count = index + 1;
      await (writer === page ? tab : page)
        .getByText(`${count} ${count === 1 ? "solve" : "solves"}`, {
          exact: true,
        })
        .waitFor();
      assert(
        (await read()).history.length === count,
        `Rollover writer ${count} still persists subsequent solves and synchronizes its peer`,
      );
    }
    assert(
      JSON.stringify(await original()) === JSON.stringify(snapshot),
      "Simultaneous midnight resets and later solves preserve shared originals",
    );
  } finally {
    await page.evaluate(() => window.releaseStorageGate?.());
    await tab.close();
  }
  await seed({ owned: [12] });
  await page.evaluate((key) => {
    const transaction = IDBDatabase.prototype.transaction;
    let active;
    IDBDatabase.prototype.transaction = function (...args) {
      const result = transaction.apply(this, args);
      if (this.name === "cubetimer365:storage-locks:v1") active = result;
      return result;
    };
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      setItem.call(this, name, value);
      if (name === key && active) {
        active.abort();
        active = null;
      }
    };
  }, key);
  await page
    .getByRole("button", { name: "Delete solve 1", exact: true })
    .click();
  await page.getByText("Saved on this device", { exact: true }).waitFor();
  assert(
    (await read()).history.length === 0 &&
      (await page
        .getByRole("alert")
        .filter({ hasText: "Browser storage" })
        .count()) === 0,
    "A real transaction abort after localStorage deletion acknowledges the completed write",
  );
  await page.reload();
  await page.locator(".history-panel").waitFor();
  assert(
    (await read()).history.length === 0,
    "The deletion confirmed before a mutex-marker abort survives reload",
  );
  snapshot = await seed({ owned: [12] });
  tab = await page.context().newPage();
  try {
    await tab.goto(root);
    await tab.getByText("1 solve", { exact: true }).waitFor();
    await holdAcknowledgement(page);
    await page.evaluate((key) => {
      window.observedStorageNotifications = 0;
      window.addEventListener("storage", (event) => {
        if (event.key === key) window.observedStorageNotifications += 1;
      });
    }, key);
    const solveIn = async (writer) => {
      await writer.bringToFront();
      await writer.keyboard.down("Space");
      await writer.waitForTimeout(330);
      await writer.keyboard.up("Space");
      await writer.waitForTimeout(250);
      await writer.keyboard.press("Space");
    };
    await solveIn(page);
    await page.waitForFunction(
      () => typeof window.releaseStorageAcknowledgement === "function",
    );
    await tab.getByText("2 solves", { exact: true }).waitFor();
    await solveIn(tab);
    await tab.getByText("Saved on this device", { exact: true }).waitFor();
    await page.waitForFunction(() => window.observedStorageNotifications > 0);
    assert(
      (await read()).history.length === 3 &&
        (await page.getByText("Saving…", { exact: true }).isVisible()) &&
        (await page
          .getByRole("alert")
          .filter({ hasText: "Browser storage" })
          .count()) === 0,
      "A different newer solve notification waits for the original successful save acknowledgement",
    );
    await page.evaluate(() => window.releaseStorageAcknowledgement());
    await page.getByText("3 solves", { exact: true }).waitFor();
    await page.getByText("Saved on this device", { exact: true }).waitFor();
    assert(
      (await page
        .getByRole("alert")
        .filter({ hasText: "Browser storage" })
        .count()) === 0,
      "After acknowledgement the original tab adopts the newer saved record without a false conflict",
    );
    await solveIn(page);
    await page.getByText("Saved on this device", { exact: true }).waitFor();
    await tab.getByText("4 solves", { exact: true }).waitFor();
    assert(
      (await read()).history.length === 4,
      "The acknowledged tab keeps saving subsequent solves after adopting its peer's update",
    );
    assert(
      JSON.stringify(await original()) === JSON.stringify(snapshot),
      "Delayed normal-save acknowledgement preserves every shared original",
    );
  } finally {
    await page.evaluate(() => window.releaseStorageAcknowledgement?.());
    await tab.close();
  }
  await page.clock.setFixedTime("2026-10-12T23:59:50Z");
  snapshot = await seed({ owned: [12] });
  tab = await page.context().newPage();
  try {
    await tab.goto(root);
    await tab.getByText("1 solve", { exact: true }).waitFor();
    // Delay this tab before it acquires a transaction; the peer must commit first.
    await page.evaluate(() => {
      const success = Object.getOwnPropertyDescriptor(
        IDBRequest.prototype,
        "onsuccess",
      );
      Object.defineProperty(IDBRequest.prototype, "onsuccess", {
        configurable: true,
        get: success.get,
        set(callback) {
          success.set.call(this, function (event) {
            if (
              this instanceof IDBOpenDBRequest &&
              this.result.name === "cubetimer365:storage-locks:v1" &&
              !window.releaseStorageOpen
            ) {
              window.releaseStorageOpen = () => callback.call(this, event);
            } else callback.call(this, event);
          });
        },
      });
    });
    await page.clock.setFixedTime("2026-10-13T00:00:01Z");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForFunction(
      () => typeof window.releaseStorageOpen === "function",
    );
    await tab.evaluate(() => window.dispatchEvent(new Event("focus")));
    await tab.getByText("Saved on this device", { exact: true }).waitFor();
    await tab.bringToFront();
    await tab.keyboard.down("Space");
    await tab.waitForTimeout(330);
    await tab.keyboard.up("Space");
    await tab.waitForTimeout(250);
    await tab.keyboard.press("Space");
    await tab.getByText("Saved on this device", { exact: true }).waitFor();
    assert(
      (await read()).history.length === 1 &&
        (await page.getByText("No solves yet.", { exact: true }).isVisible()) &&
        (await page.getByText("Saving…", { exact: true }).isVisible()),
      "A local automatic reset runs before the peer's first new-day solve commits",
    );
    await page.evaluate(() => window.releaseStorageOpen());
    await page.getByText("1 solve", { exact: true }).waitFor();
    await page.getByText("Saved on this device", { exact: true }).waitFor();
    assert(
      (await page
        .getByRole("alert")
        .filter({ hasText: "Browser storage" })
        .count()) === 0,
      "A stale automatic reset adopts the peer's nonempty day without a false user-edit conflict",
    );
    await page.bringToFront();
    await page.keyboard.down("Space");
    await page.waitForTimeout(330);
    await page.keyboard.up("Space");
    await page.waitForTimeout(250);
    await page.keyboard.press("Space");
    await page.getByText("Saved on this device", { exact: true }).waitFor();
    await tab.getByText("2 solves", { exact: true }).waitFor();
    assert(
      (await read()).history.length === 2,
      "The reset-only tab continues saving solves after adopting its peer's first result",
    );
    assert(
      JSON.stringify(await original()) === JSON.stringify(snapshot),
      "Reset-versus-first-solve reconciliation preserves all original shared keys",
    );
  } finally {
    await page.evaluate(() => window.releaseStorageOpen?.());
    await tab.close();
  }
  return { passed: checks.length, checks };
};
