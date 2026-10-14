import { describe, expect, it } from "vitest";
import { cubeStickers } from "./cubeGeometry";
import { cubeMaterials } from "./cubeMaterials";
import { projectedRoundedStickerPath } from "./cubeFinish";
import { fillAt, geometry, project, rgbCss, type Face } from "./cubeRenderer";
import original from "./fixtures/originalCube.json";

it("retains the approved Neon centre colors without per-sticker or face tuning", () => {
  const expected = {
    "yellow-4": "rgb(66 56 0)",
    "gray-2": "rgb(56 61 63)",
    "green-6": "rgb(0 57 24)",
    "blue-6": "rgb(0 36 66)",
    "red-6": "rgb(66 0 8)",
    "orange-5": "rgb(66 35 0)",
  };
  for (const [color, value] of Object.entries(expected)) {
    expect(
      rgbCss(
        fillAt(
          0.5,
          0.5,
          `var(--mantine-color-${color})`,
          cubeMaterials.neon.parameters,
        ),
      ),
    ).toBe(value);
  }
  expect(cubeMaterials.neon.parameters).toMatchObject({
    center: 0.26,
    edge: 0.6,
    knee: 0.32,
    power: 1.7,
    contourWhite: 0.45,
    contourWidth: 1.45,
    inset: 0.015,
    glow: 0.85,
    glowRadius: 2.6,
    glowSpread: 0.32,
  });
});

it("preserves the original face-plane paths for all 45 stickers", () => {
  const stickers = geometry(cubeStickers(original.scenes[0].scramble));
  expect(stickers).toHaveLength(45);
  for (const sticker of stickers) {
    expect(sticker.d).toBe(
      projectedRoundedStickerPath(
        (row, column) => project(sticker.face as Face, row, column),
        sticker.row,
        sticker.column,
      ),
    );
  }
});

describe("Flat's uniform fill", () => {
  it.each(["yellow-4", "gray-2", "green-6", "blue-6", "red-6", "orange-5"])(
    "has no directional or square shading for %s",
    (color) => {
      const input = `var(--mantine-color-${color})`;
      const parameters = cubeMaterials.flat.parameters;
      const centre = fillAt(0.5, 0.5, input, parameters);
      for (const [u, v] of [
        [0.03, 0.03],
        [0.2, 0.8],
        [0.97, 0.5],
      ]) {
        expect(fillAt(u, v, input, parameters)).toEqual(centre);
      }
      expect(parameters.glow).toBe(0);
      expect(parameters.surface).toBeNull();
      expect(parameters.glints).toBeNull();
      expect(parameters.noiseActive).toBe(false);
    },
  );
});

it("retains the merged Cyber screen-space interference parameters", () => {
  expect(cubeMaterials.cyber.parameters).toMatchObject({
    noiseActive: true,
    noisePitch: 3.4,
    noiseWidth: 0.6,
    noiseOpacity: 0.18,
    noisePhase: 0.7,
    noiseColor: "#020917",
    glow: 0,
  });
});
