import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  SOLVE_STORAGE_KEY,
  loadDailyHistory,
  readLegacyHistory,
  saveDailyHistory,
  SOLVE_LOCK_DATABASE,
  type DailyHistory,
} from "./solveStorage";
const date = "2026-10-15";
const record = (history = [12.34, 23.45]): DailyHistory => ({
  version: 1,
  date,
  history,
  legacyMigration: "imported",
});
const save = (value: DailyHistory) =>
  saveDailyHistory(value, localStorage.getItem(SOLVE_STORAGE_KEY));
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("project-scoped daily solve storage", () => {
  it.each(["before", "after"])(
    "reports the actual localStorage outcome when the lock aborts %s writing",
    async (when) => {
      await save(record());
      const snapshot = localStorage.getItem(SOLVE_STORAGE_KEY);
      const transaction = IDBDatabase.prototype.transaction;
      let active: IDBTransaction;
      vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(
        function (this: IDBDatabase, ...args) {
          active = transaction.apply(this, args);
          if (when === "before") {
            active.abort();
          }
          return active;
        },
      );
      const setItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
        this: Storage,
        key,
        value,
      ) {
        setItem.call(this, key, value);
        if (key === SOLVE_STORAGE_KEY && when === "after") {
          active.abort();
        }
      });
      expect(await save(record([99]))).toBe(when === "after");
      expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(
        when === "after" ? JSON.stringify(record([99])) : snapshot,
      );
    },
  );
  it("serializes overlapping snapshot checks and writes under one shared transaction", async () => {
    const initial = record([]);
    await saveDailyHistory(initial, null);
    const snapshot = localStorage.getItem(SOLVE_STORAGE_KEY);
    const database = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open(SOLVE_LOCK_DATABASE, 1);
      request.onsuccess = () => resolve(request.result);
    });
    const gate = database.transaction("writes", "readwrite");
    let release = false;
    const keepAlive = () => {
      const request = gate.objectStore("writes").get("daily-history");
      request.onsuccess = () => {
        if (!release) {
          keepAlive();
        }
      };
    };
    keepAlive();
    const first = saveDailyHistory(record([0.5]), snapshot);
    const second = saveDailyHistory(record([99]), snapshot);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(snapshot);
    release = true;
    expect(await Promise.all([first, second])).toEqual([true, false]);
    expect(loadDailyHistory(date).record.history).toEqual([0.5]);
    database.close();
  });
  it("does not write when a queued caller is no longer current", async () => {
    expect(await saveDailyHistory(record(), null, () => false)).toBe(false);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBeNull();
  });
  it("preserves existing data when the shared storage lock is unavailable", async () => {
    await save(record());
    const snapshot = localStorage.getItem(SOLVE_STORAGE_KEY);
    vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(await save(record([99]))).toBe(false);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(snapshot);
  });
  it("never relabels or overwrites a newer-day record using an older date", async () => {
    const newer = { ...record([0.5]), date: "2026-10-16" };
    expect(await saveDailyHistory(newer, null)).toBe(true);
    const raw = localStorage.getItem(SOLVE_STORAGE_KEY);
    expect(loadDailyHistory(date).blocked).toBe(true);
    expect(await saveDailyHistory(record([]), raw)).toBe(false);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(raw);
  });
  it("rejects stale history and migration decisions against the persisted snapshot", async () => {
    const initial = { ...record([]), legacyMigration: "unresolved" as const };
    expect(await saveDailyHistory(initial, null)).toBe(true);
    const stale = localStorage.getItem(SOLVE_STORAGE_KEY);
    expect(await saveDailyHistory(record([0.5]), stale)).toBe(true);
    const newer = localStorage.getItem(SOLVE_STORAGE_KEY);
    expect(await saveDailyHistory(record(), stale)).toBe(false);
    expect(
      await saveDailyHistory({ ...initial, legacyMigration: "ignored" }, stale),
    ).toBe(false);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(newer);
  });
  it("reads and writes only the namespaced record, never adopting shared keys automatically", async () => {
    localStorage.setItem("history", "[91,92]");
    localStorage.setItem("today", date);
    localStorage.setItem(
      "lights-out.reaction-lab.v2",
      '{"version":2,"records":[]}',
    );
    const original = { ...localStorage };
    const initial = loadDailyHistory(date);
    expect(initial.record.history).toEqual([]);
    expect(readLegacyHistory(date)?.history).toEqual([91, 92]);
    expect(await save(record())).toBe(true);
    expect(loadDailyHistory(date).record).toEqual(record());
    for (const [key, value] of Object.entries(original)) {
      expect(localStorage.getItem(key)).toBe(value);
    }
  });
  it("does not repeat an accepted import or merge the unchanged original on reload", async () => {
    localStorage.setItem("history", "[12.34,23.45]");
    localStorage.setItem("today", date);
    await save(record());
    const reloaded = loadDailyHistory(date).record;
    expect(reloaded.legacyMigration).toBe("imported");
    expect(reloaded.history).toEqual([12.34, 23.45]);
    await save({ ...reloaded, history: [12.34, 23.45, 34.56] });
    expect(loadDailyHistory(date).record.history).toEqual([
      12.34, 23.45, 34.56,
    ]);
    expect(localStorage.getItem("history")).toBe("[12.34,23.45]");
  });
  it("retains the UTC day reset and migration decision without modifying shared legacy data", async () => {
    localStorage.setItem("history", "[12.34,23.45]");
    localStorage.setItem("today", date);
    await save(record());
    const next = loadDailyHistory("2026-10-16").record;
    expect(next).toEqual({ ...record([]), date: "2026-10-16" });
    expect(await save(next)).toBe(true);
    expect(readLegacyHistory("2026-10-16")).toBeNull();
    expect(localStorage.getItem("today")).toBe(date);
    expect(localStorage.getItem("history")).toBe("[12.34,23.45]");
  });
  it.each(["not-json", "{}", '["12"]', "[null]", "[-1]", "[]"])(
    "does not offer invalid/unusable legacy history %s",
    async (raw) => {
      localStorage.setItem("history", raw);
      localStorage.setItem("today", date);
      expect(readLegacyHistory(date)).toBeNull();
      expect(localStorage.getItem("history")).toBe(raw);
    },
  );
  it.each(["2026-02-30", "2026-10-14", "tomorrow"])(
    "does not import an invalid or other-day legacy date %s",
    async (value) => {
      localStorage.setItem("today", value);
      localStorage.setItem("history", "[12]");
      expect(readLegacyHistory(date)).toBeNull();
      expect(localStorage.getItem("today")).toBe(value);
    },
  );
  it.each([
    "broken",
    '{"version":2}',
    '{"version":1,"date":"2026-10-15","history":[null],"legacyMigration":"imported"}',
  ])("preserves unknown or corrupt owned data %s", async (raw) => {
    localStorage.setItem(SOLVE_STORAGE_KEY, raw);
    expect(loadDailyHistory(date).blocked).toBe(true);
    expect(await save(record())).toBe(false);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(raw);
  });
  it("keeps the previous owned record when a write fails", async () => {
    await save(record());
    const raw = localStorage.getItem(SOLVE_STORAGE_KEY);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(await save(record([99]))).toBe(false);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(raw);
  });
});
