import { describe, expect, it } from "vitest";
import { calculateSolveStatistics, formatTime } from "./solveStatistics";

describe("rolling trimmed solve statistics", () => {
  it("has no best result or average for empty history", () => {
    expect(calculateSolveStatistics([])).toEqual({
      data: [],
      bestSingle: null,
      bestAO5: null,
      bestAO12: null,
      maxFinite: null,
      totalTime: 0,
    });
  });

  it("starts AO5 and AO12 only at their complete chronological windows", () => {
    const times = Object.freeze(Array.from({ length: 13 }, (_, i) => i + 1));
    const stats = calculateSolveStatistics(times);
    expect(stats.data.slice(0, 4).every((row) => row.ao5 === null)).toBe(true);
    expect(stats.data.slice(0, 11).every((row) => row.ao12 === null)).toBe(
      true,
    );
    expect(stats.data[4]).toEqual({ attempt: 5, time: 5, ao5: 3, ao12: null });
    expect(stats.data[11]).toEqual({
      attempt: 12,
      time: 12,
      ao5: 10,
      ao12: 6.5,
    });
    expect(stats.data[12]).toEqual({
      attempt: 13,
      time: 13,
      ao5: 11,
      ao12: 7.5,
    });
    expect(times).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
  });

  it("selects the best completed windows rather than the latest averages", () => {
    const stats = calculateSolveStatistics(
      Array.from({ length: 13 }, (_, i) => (i + 1) * 10),
    );
    expect(stats.bestSingle).toBe(10);
    expect(stats.bestAO5).toBe(30);
    expect(stats.bestAO12).toBe(65);
    expect(stats.data[12].ao5).toBe(110);
    expect(stats.data[12].ao12).toBe(75);
    expect(stats.totalTime).toBe(910);
  });

  it("discards exactly one occurrence of each tied extreme", () => {
    expect(calculateSolveStatistics([10, 10, 10, 20, 20]).bestAO5).toBeCloseTo(
      40 / 3,
    );
    expect(calculateSolveStatistics([10, 10, 10, 10, 10]).bestAO5).toBe(10);
  });

  it("uses full recorded precision and already-adjusted penalty seconds", () => {
    expect(
      calculateSolveStatistics([10.0001, 11.0001, 12.0001, 13.0001, 14.0001])
        .bestAO5,
    ).toBeCloseTo(12.0001, 7);
    // A +2 has already been included in the first attempt's effective result.
    expect(
      calculateSolveStatistics([10 + 2, 11, 12, 13, 14]).bestAO5,
    ).toBeCloseTo(37 / 3);
  });

  it.each([5, 12] as const)(
    "handles one and two DNFs in an AO%d window",
    (size) => {
      const one = calculateSolveStatistics([
        ...Array.from({ length: size - 1 }, (_, i) => i + 1),
        Infinity,
      ]);
      const two = calculateSolveStatistics([
        ...Array.from({ length: size - 2 }, (_, i) => i + 1),
        Infinity,
        Infinity,
      ]);
      const field = size === 5 ? "ao5" : "ao12";
      expect(one.data[size - 1][field]).toBe(size === 5 ? 3 : 6.5);
      expect(two.data[size - 1][field]).toBe(Infinity);
      expect(formatTime(two.data[size - 1][field])).toBe("DNF");
    },
  );

  it("ranks completed finite windows ahead of DNF windows", () => {
    const stats = calculateSolveStatistics([
      Infinity,
      Infinity,
      10,
      11,
      12,
      13,
      14,
      15,
    ]);
    expect(stats.data[4].ao5).toBe(Infinity);
    expect(stats.bestSingle).toBe(10);
    expect(stats.bestAO5).toBe(12);
    expect(stats.maxFinite).toBe(15);
    const allDNF = calculateSolveStatistics([
      Infinity,
      Infinity,
      Infinity,
      Infinity,
      Infinity,
    ]);
    expect(allDNF.bestSingle).toBe(Infinity);
    expect(allDNF.bestAO5).toBe(Infinity);
  });

  it("keeps unavailable, DNF and centisecond-carry displays distinct", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatTime(Infinity)).toBe("DNF");
    expect(formatTime(59.999)).toBe("01:00.00");
    expect(formatTime(119.999)).toBe("02:00.00");
  });
});
