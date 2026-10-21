import { describe, expect, it } from "vitest";
import { cubeFaceColors } from "./cubeGeometry";
import { generateScramble } from "./scramble";
import fixtures from "./fixtures/dailyLogo.json";

const token = (name: string) => `var(--mantine-color-${name})`;
const blue = "blue-6";

it("keeps the solved rear face blue, including its fixed centre", () => {
  expect(cubeFaceColors("", "B")).toEqual(
    Array.from({ length: 3 }, () => Array(3).fill(token(blue))),
  );
});

// Directly looking at B with U above: R is on the viewer's left, L on the right.
it.each([
  [
    "U",
    [
      ["red-6", "red-6", "red-6"],
      [blue, blue, blue],
      [blue, blue, blue],
    ],
  ],
  [
    "D",
    [
      [blue, blue, blue],
      [blue, blue, blue],
      ["orange-5", "orange-5", "orange-5"],
    ],
  ],
  [
    "R",
    [
      ["yellow-4", blue, blue],
      ["yellow-4", blue, blue],
      ["yellow-4", blue, blue],
    ],
  ],
  [
    "L",
    [
      [blue, blue, "gray-2"],
      [blue, blue, "gray-2"],
      [blue, blue, "gray-2"],
    ],
  ],
] as const)(
  "places %s on the correct rear row or column without mirroring",
  (move, rows) => {
    expect(cubeFaceColors(move, "B")).toEqual(
      rows.map((row) => row.map(token)),
    );
  },
);

describe.each(fixtures)(
  "daily rear face for $date",
  ({ seed, scramble, back }) => {
    it("matches the daily sequence and row-major sticker fixture", () => {
      expect(generateScramble(seed)).toBe(scramble);
      expect(cubeFaceColors(scramble, "B")).toEqual(
        back.map((row) => row.map(token)),
      );
    });
  },
);
