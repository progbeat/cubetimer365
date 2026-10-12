import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CubeNet, { CubeStyle } from "./CubeNet";
import original from "./fixtures/originalCube.json";
import { roundedStickerPath } from "./cubeFinish";

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
            expect(sticker).toHaveAttribute("fill-opacity", geometry.opacity);
            if (style === "original") {
              expect(sticker?.tagName).toBe("polygon");
              expect(sticker).toHaveAttribute("points", geometry.points);
            } else {
              expect(sticker?.tagName).toBe("path");
              expect(sticker).toHaveAttribute("data-points", geometry.points);
              expect(sticker?.getAttribute("d")?.match(/Q/g)).toHaveLength(4);
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
