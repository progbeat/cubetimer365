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
    if (record.date > date) {
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
let lockDatabase: Promise<IDBDatabase> | null = null;
export const SOLVE_LOCK_DATABASE = "cubetimer365:storage-locks:v1";
function openLockDatabase() {
  if (!lockDatabase) {
    const pending = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(SOLVE_LOCK_DATABASE, 1);
      let failed = false;
      request.onupgradeneeded = () =>
        request.result.createObjectStore("writes");
      request.onerror = () => {
        failed = true;
        reject(request.error);
      };
      request.onblocked = () => {
        failed = true;
        reject(new Error("Storage lock is blocked"));
      };
      request.onsuccess = () => {
        const db = request.result;
        if (failed) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          lockDatabase = null;
        };
        resolve(db);
      };
    });
    lockDatabase = pending;
    void pending.catch(() => {
      if (lockDatabase === pending) {
        lockDatabase = null;
      }
    });
  }
  return lockDatabase;
}
async function withStorageLock(commit: () => boolean): Promise<boolean> {
  const db = await openLockDatabase();
  return new Promise<boolean>((resolve) => {
    // Overlapping readwrite transactions for this store are serialized across tabs.
    const transaction = db.transaction("writes", "readwrite");
    let saved = false;
    const request = transaction.objectStore("writes").put(0, "daily-history");
    request.onsuccess = () => {
      saved = commit();
    };
    transaction.oncomplete = () => resolve(saved);
    transaction.onabort = () => resolve(false);
  });
}
export async function saveDailyHistory(
  record: DailyHistory,
  expectedRaw: string | null,
  canCommit: () => boolean = () => true,
): Promise<boolean> {
  try {
    return await withStorageLock(() => {
      try {
        if (!canCommit()) {
          return false;
        }
        if (!validRecord(record)) {
          return false;
        }
        // Unknown/corrupt owned data remains intact for recovery instead of being replaced.
        const raw = localStorage.getItem(SOLVE_STORAGE_KEY);
        if (raw !== expectedRaw) {
          return false;
        }
        if (raw !== null) {
          const current: unknown = JSON.parse(raw);
          if (!validRecord(current) || current.date > record.date) {
            return false;
          }
        }
        localStorage.setItem(SOLVE_STORAGE_KEY, JSON.stringify(record));
        return true;
      } catch {
        return false;
      }
    });
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
