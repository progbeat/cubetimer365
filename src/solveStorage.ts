export const SOLVE_STORAGE_KEY = "cubetimer365:daily-history:v1";
export type LegacyMigration = "unresolved" | "imported" | "ignored";
export interface DailyHistory {
  version: 1;
  date: string;
  history: number[];
  legacyMigration: LegacyMigration;
}
export interface LegacyHistory {
  date: string;
  history: number[];
}
const validDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const validHistory = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.every(
    (time) => typeof time === "number" && Number.isFinite(time) && time >= 0,
  );
const validRecord = (value: unknown): value is DailyHistory => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<DailyHistory>;
  return (
    record.version === 1 &&
    validDate(record.date) &&
    validHistory(record.history) &&
    ["unresolved", "imported", "ignored"].includes(record.legacyMigration || "")
  );
};
export function loadDailyHistory(date: string): {
  record: DailyHistory;
  blocked: boolean;
  raw: string | null;
} {
  const empty: DailyHistory = {
    version: 1,
    date,
    history: [],
    legacyMigration: "unresolved",
  };
  try {
    const raw = localStorage.getItem(SOLVE_STORAGE_KEY);
    if (raw === null) {
      return { record: empty, blocked: false, raw };
    }
    const record: unknown = JSON.parse(raw);
    if (!validRecord(record)) {
      return { record: empty, blocked: true, raw };
    }
    return {
      record: record.date === date ? record : { ...record, date, history: [] },
      blocked: false,
      raw,
    };
  } catch {
    return { record: empty, blocked: true, raw: null };
  }
}
export function saveDailyHistory(
  record: DailyHistory,
  expectedRaw: string | null,
): boolean {
  try {
    if (!validRecord(record)) {
      return false;
    }
    // Unknown/corrupt owned data remains intact for recovery instead of being replaced.
    const raw = localStorage.getItem(SOLVE_STORAGE_KEY);
    if (raw !== expectedRaw) {
      return false;
    }
    if (raw !== null && !validRecord(JSON.parse(raw))) {
      return false;
    }
    localStorage.setItem(SOLVE_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
export function readLegacyHistory(date: string): LegacyHistory | null {
  try {
    const savedDate = localStorage.getItem("today");
    const history: unknown = JSON.parse(
      localStorage.getItem("history") || "null",
    );
    // Shape/date validation is not ownership proof. Import still requires the user's choice.
    return savedDate === date &&
      validDate(savedDate) &&
      validHistory(history) &&
      history.length > 0
      ? { date: savedDate, history }
      : null;
  } catch {
    return null;
  }
}
