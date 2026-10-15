import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  SOLVE_STORAGE_KEY,
  loadDailyHistory,
  readLegacyHistory,
  saveDailyHistory,
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
  it("rejects stale history and migration decisions against the persisted snapshot", () => {
    const initial = { ...record([]), legacyMigration: "unresolved" as const };
    expect(saveDailyHistory(initial, null)).toBe(true);
    const stale = localStorage.getItem(SOLVE_STORAGE_KEY);
    expect(saveDailyHistory(record([0.5]), stale)).toBe(true);
    const newer = localStorage.getItem(SOLVE_STORAGE_KEY);
    expect(saveDailyHistory(record(), stale)).toBe(false);
    expect(
      saveDailyHistory({ ...initial, legacyMigration: "ignored" }, stale),
    ).toBe(false);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(newer);
  });
  it("reads and writes only the namespaced record, never adopting shared keys automatically", () => {
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
    expect(save(record())).toBe(true);
    expect(loadDailyHistory(date).record).toEqual(record());
    for (const [key, value] of Object.entries(original)) {
      expect(localStorage.getItem(key)).toBe(value);
    }
  });
  it("does not repeat an accepted import or merge the unchanged original on reload", () => {
    localStorage.setItem("history", "[12.34,23.45]");
    localStorage.setItem("today", date);
    save(record());
    const reloaded = loadDailyHistory(date).record;
    expect(reloaded.legacyMigration).toBe("imported");
    expect(reloaded.history).toEqual([12.34, 23.45]);
    save({ ...reloaded, history: [12.34, 23.45, 34.56] });
    expect(loadDailyHistory(date).record.history).toEqual([
      12.34, 23.45, 34.56,
    ]);
    expect(localStorage.getItem("history")).toBe("[12.34,23.45]");
  });
  it("retains the UTC day reset and migration decision without modifying shared legacy data", () => {
    localStorage.setItem("history", "[12.34,23.45]");
    localStorage.setItem("today", date);
    save(record());
    const next = loadDailyHistory("2026-10-16").record;
    expect(next).toEqual({ ...record([]), date: "2026-10-16" });
    expect(save(next)).toBe(true);
    expect(readLegacyHistory("2026-10-16")).toBeNull();
    expect(localStorage.getItem("today")).toBe(date);
    expect(localStorage.getItem("history")).toBe("[12.34,23.45]");
  });
  it.each(["not-json", "{}", '["12"]', "[null]", "[-1]", "[]"])(
    "does not offer invalid/unusable legacy history %s",
    (raw) => {
      localStorage.setItem("history", raw);
      localStorage.setItem("today", date);
      expect(readLegacyHistory(date)).toBeNull();
      expect(localStorage.getItem("history")).toBe(raw);
    },
  );
  it.each(["2026-02-30", "2026-10-14", "tomorrow"])(
    "does not import an invalid or other-day legacy date %s",
    (value) => {
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
  ])("preserves unknown or corrupt owned data %s", (raw) => {
    localStorage.setItem(SOLVE_STORAGE_KEY, raw);
    expect(loadDailyHistory(date).blocked).toBe(true);
    expect(save(record())).toBe(false);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(raw);
  });
  it("keeps the previous owned record when a write fails", () => {
    save(record());
    const raw = localStorage.getItem(SOLVE_STORAGE_KEY);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(save(record([99]))).toBe(false);
    expect(localStorage.getItem(SOLVE_STORAGE_KEY)).toBe(raw);
  });
});
