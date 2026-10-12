import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CubeNet, { CubeStyle } from "./CubeNet";
import original from "./fixtures/originalCube.json";
import { projectedSticker, roundedStickerPath } from "./cubeFinish";

afterEach(cleanup);
const styles: CubeStyle[] = ["original", "flat", "neon", "cyber"];

describe.each(styles)(
  "preserved original %s cube projection and sticker assignment",
  (style) => {
    it.each(original.scenes)(
      "matches the original source for $scramble",
      ({ scramble, colors }) => {
        const { container } = render(
          <CubeNet scramble={scramble} side={85} style={style} />,
        );
        expect(container.querySelector("svg")).toHaveAttribute(
          "viewBox",
          "-150 -150 300 300",
        );
        expect(container.querySelectorAll("[data-face]")).toHaveLength(5);
        expect(container.querySelectorAll("[data-sticker]")).toHaveLength(45);
        original.geometry.forEach((geometry, index) => {
          if (index % 10 === 0) {
            expect(
              container.querySelector(`[data-face="${geometry.id}"]`),
            ).toHaveAttribute("points", geometry.points);
          } else {
            const sticker = container.querySelector(
              `[data-sticker="${geometry.id}"]`,
            );
            expect(sticker).toHaveAttribute("data-color", colors[index]);
            expect(sticker).toHaveAttribute("fill", colors[index]);
            expect(sticker).toHaveAttribute(
              "fill-opacity",
              style === "cyber" ? "1" : geometry.opacity,
            );
            if (style === "cyber") {
              expect(sticker).toHaveAttribute(
                "data-source-opacity",
                geometry.opacity,
              );
            }
            if (style === "original") {
              expect(sticker?.tagName).toBe("polygon");
              expect(sticker).toHaveAttribute("points", geometry.points);
            } else {
              expect(sticker?.tagName).toBe("path");
              expect(sticker).toHaveAttribute("data-points", geometry.points);
              expect(
                sticker
                  ?.getAttribute("d")
                  ?.match(style === "cyber" ? /L/g : /Q/g),
              ).toHaveLength(style === "cyber" ? 35 : 4);
            }
          }
        });
        if (style === "original") {
          expect(container.querySelector("defs")).not.toBeInTheDocument();
        } else {
          expect(container.querySelector("clipPath polygon")).toHaveAttribute(
            "points",
            "-50,-150 50,-150 150,-50 150,50 50,150 -50,150 -150,50 -150,-50",
          );
        }
      },
    );
  },
);

it("keeps Cyber rounded paths inside the original sticker cells", () => {
  const { container } = render(
    <CubeNet scramble={original.scenes[0].scramble} side={85} style="cyber" />,
  );
  container.querySelectorAll("[data-sticker]").forEach((sticker) => {
    const cell = sticker
      .getAttribute("data-points")!
      .split(" ")
      .map((pair) => pair.split(",").map(Number));
    const values = sticker
      .getAttribute("d")!
      .match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)!
      .map(Number);
    for (let index = 0; index < values.length; index += 2) {
      const [x, y] = values.slice(index, index + 2);
      const signs = cell.map(([ax, ay], edge) => {
        const [bx, by] = cell[(edge + 1) % 4];
        return (bx - ax) * (y - ay) - (by - ay) * (x - ax);
      });
      expect(
        signs.every((value) => value >= -1e-7) ||
          signs.every((value) => value <= 1e-7),
      ).toBe(true);
    }
  });
});

it("does not blur Cyber stickers or paint a dashed external contour", () => {
  const { container } = render(
    <CubeNet scramble={original.scenes[0].scramble} side={62} style="cyber" />,
  );
  expect(container.querySelector("[filter]")).not.toBeInTheDocument();
  expect(container.querySelector("feGaussianBlur")).not.toBeInTheDocument();
  expect(container.querySelector(".cube-chassis")).not.toBeInTheDocument();
  expect(container.querySelector("[stroke-dasharray]")).not.toBeInTheDocument();
});
it("projects each corner from its rounded face coordinates", () => {
  const project = (row: number, column: number) => ({
    x: column / (1 + column * 0.35),
    y: row / (1 + column * 0.35),
  });
  const screen = projectedSticker(project, 0, 0);
  const coordinates = screen.outer
    .match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)!
    .map(Number);
  expect(coordinates[0]).toBeCloseTo(
    project(screen.top, screen.right - screen.radius).x,
    12,
  );
  expect(coordinates[1]).toBeCloseTo(
    project(screen.top, screen.right - screen.radius).y,
    12,
  );
  const midpoint = project(
    screen.top + screen.radius - screen.radius / Math.sqrt(2),
    screen.right - screen.radius + screen.radius / Math.sqrt(2),
  );
  expect(coordinates[8]).toBeCloseTo(midpoint.x, 12);
  expect(coordinates[9]).toBeCloseTo(midpoint.y, 12);
});

it("limits texture frequency at native phone size", () => {
  const screen = projectedSticker(
    (row, column) => ({ x: column * 10, y: row * 33 }),
    0,
    0,
    124 / 300,
  );
  expect(screen.bandCount).toBe(0);
  expect(screen.radius).toBeGreaterThan(0.14);
  const front = projectedSticker(
    (row, column) => ({ x: column * 33, y: row * 33 }),
    0,
    0,
    124 / 300,
  );
  expect(front.bandCount).toBeGreaterThan(0);
  expect(front.bandCount).toBeLessThanOrEqual(6);
});

it("keeps effect ids unique when multiple comparison cubes render together", () => {
  const { container } = render(
    <>
      {styles.map((style) => (
        <CubeNet
          key={style}
          style={style}
          side={85}
          scramble={original.scenes[0].scramble}
        />
      ))}
    </>,
  );
  const ids = Array.from(container.querySelectorAll("[id]")).map(
    (element) => element.id,
  );
  expect(new Set(ids).size).toBe(ids.length);
});
it("rounds within the original quadrilateral instead of cutting the outer silhouette", () => {
  expect(
    roundedStickerPath([
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
    ]),
  ).toBe(
    "M1.3,0Q0,0 0,1.3 L0,8.7Q0,10 1.3,10 L8.7,10Q10,10 10,8.7 L10,1.3Q10,0 8.7,0 Z",
  );
});
