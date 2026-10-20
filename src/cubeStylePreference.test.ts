import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CUBE_STYLE_KEY,
  loadCubeStyle,
  rememberCubeStyle,
} from "./cubeStylePreference";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("cube finish preference", () => {
  it.each(["flat", "neon", "cyber"] as const)(
    "restores saved %s without writing other device data",
    (style) => {
      localStorage.setItem(CUBE_STYLE_KEY, style);
      localStorage.setItem("cubetimer365:daily-history:v1", "keep-solves");
      localStorage.setItem("unrelated-preference", "keep");
      const snapshot = { ...localStorage };
      const write = vi.spyOn(Storage.prototype, "setItem");
      expect(loadCubeStyle("")).toBe(style);
      expect(write).not.toHaveBeenCalled();
      expect({ ...localStorage }).toEqual(snapshot);
    },
  );
  it.each([null, "", "original", "NEON", "unknown", '{"style":"neon"}'])(
    "uses Cyber for missing/invalid saved value %s",
    (value) => {
      if (value !== null) {
        localStorage.setItem(CUBE_STYLE_KEY, value);
      }
      expect(loadCubeStyle("")).toBe("cyber");
      expect(localStorage.getItem(CUBE_STYLE_KEY)).toBe(value);
    },
  );
  it.each(["flat", "neon", "cyber"] as const)(
    "keeps an explicit %s preview URL ahead of the saved preference",
    (style) => {
      localStorage.setItem(CUBE_STYLE_KEY, "neon");
      expect(loadCubeStyle(`?cube=${style}`)).toBe(style);
      expect(localStorage.getItem(CUBE_STYLE_KEY)).toBe("neon");
    },
  );
  it("ignores an unsupported URL value and uses the saved finish", () => {
    localStorage.setItem(CUBE_STYLE_KEY, "flat");
    expect(loadCubeStyle("?cube=unknown")).toBe("flat");
  });
  it("writes only its namespaced preference when the user chooses", () => {
    localStorage.setItem("history", "shared");
    localStorage.setItem("unrelated-preference", "keep");
    const write = vi.spyOn(Storage.prototype, "setItem");
    rememberCubeStyle("neon");
    expect(write).toHaveBeenCalledExactlyOnceWith(CUBE_STYLE_KEY, "neon");
    expect(localStorage.getItem("history")).toBe("shared");
    expect(localStorage.getItem("unrelated-preference")).toBe("keep");
  });
  it("falls back to Cyber when storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked read");
    });
    expect(loadCubeStyle("")).toBe("cyber");
    expect(loadCubeStyle("?cube=flat")).toBe("flat");
  });
  it("does not throw when a preference cannot be saved", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked write");
    });
    expect(() => rememberCubeStyle("neon")).not.toThrow();
  });
});
