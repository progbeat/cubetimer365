import React, { useId } from "react";
import { cyberStickerPath, roundedStickerPath } from "./cubeFinish";

export type CubeStyle = "original" | "flat" | "neon" | "cyber";

type CubeState = Record<string, string>;

const adjacentFacesCw: Record<string, string> = {
  U: "FLBR",
  D: "FRBL",
  F: "URDL",
  B: "ULDR",
  L: "UFDB",
  R: "UBDF",
};

const modifierPermutations: Record<string, number[]> = {
  "'": [1, 2, 3, 0], // Clockwise rotation
  "": [3, 0, 1, 2], // Counter-clockwise rotation
  "2": [2, 3, 0, 1], // 180-degree rotation
};

const rotationCycles = (face: string): string[][] => {
  const [a, b, c, d] = adjacentFacesCw[face].split("");
  return [
    [face + a, face + b, face + c, face + d],
    [a + face, b + face, c + face, d + face],
    [face + a + b, face + b + c, face + c + d, face + d + a],
    [a + b + face, b + c + face, c + d + face, d + a + face],
    [b + face + a, c + face + b, d + face + c, a + face + d],
  ];
};

// Generate the initial solved state of the cube
const generateInitialState = (): CubeState => {
  const cubeState: CubeState = {
    U: "var(--mantine-color-yellow-4)",
    D: "var(--mantine-color-gray-2)",
    F: "var(--mantine-color-green-6)",
    B: "var(--mantine-color-blue-6)",
    L: "var(--mantine-color-red-6)",
    R: "var(--mantine-color-orange-5)",
  };
  Object.entries(adjacentFacesCw).forEach(([face, adjacent]) => {
    for (let i = 0; i < 4; i++) {
      const a = adjacent[i],
        b = adjacent[(i + 1) % 4];
      cubeState[`${face}${a}`] = cubeState[face]; // Edge stickers
      cubeState[`${face}${a}${b}`] = cubeState[face]; // Corner stickers
    }
  });
  return cubeState;
};

// Apply a sequence of moves to the cube, starting from an optional initial state
const permuteCube = (
  scramble: string,
  cube: CubeState = generateInitialState(),
): CubeState => {
  scramble.split(" ").forEach((move) => {
    const cycles = rotationCycles(move[0]);
    const permutation = modifierPermutations[move.slice(1)];
    cycles.forEach((cycle) => {
      const permutatedStickers = permutation.map((i) => cube[cycle[i]]);
      for (let i = 0; i < 4; i++) {
        cube[cycle[i]] = permutatedStickers[i];
      }
    });
  });
  return cube;
};

const renderFace = (
  cube: CubeState,
  f: string,
  luX: number,
  luY: number,
  luZ: number,
  ruX: number,
  ruY: number,
  ruZ: number,
  ldX: number,
  ldY: number,
  ldZ: number,
  rdX: number,
  rdY: number,
  rdZ: number,
  opacity: number = 0.8,
  style: CubeStyle = "original",
  id: string = "cube",
) => {
  const [a, b, c, d] = adjacentFacesCw[f].split("");
  const colors = [
    [cube[f + d + a], cube[f + a], cube[f + a + b]],
    [cube[f + d], cube[f], cube[f + b]],
    [cube[f + c + d], cube[f + c], cube[f + b + c]],
  ];
  const project = (i: number, j: number) => {
    let alpha = (3 - i) / 3,
      beta = i / 3;
    const lX = luX * alpha + ldX * beta;
    const lY = luY * alpha + ldY * beta;
    const lZ = luZ * alpha + ldZ * beta;
    const rX = ruX * alpha + rdX * beta;
    const rY = ruY * alpha + rdY * beta;
    const rZ = ruZ * alpha + rdZ * beta;
    alpha = (3 - j) / 3;
    beta = j / 3;
    const z = lZ * alpha + rZ * beta;
    return {
      x: (lX * alpha + rX * beta) / z,
      y: (lY * alpha + rY * beta) / z,
    };
  };
  const u = 0.025;
  const v = 1 - u;
  return (
    <>
      <polygon
        key="bg"
        data-face={f}
        fill="var(--mantine-color-default-border)"
        points={[project(0, 0), project(3, 0), project(3, 3), project(0, 3)]
          .map(({ x, y }) => `${x},${y}`)
          .join(" ")}
      />
      {colors.flatMap((row, i) =>
        row.map((color, j) => {
          const points = [
            project(i + u, j + u),
            project(i + v, j + u),
            project(i + v, j + v),
            project(i + u, j + v),
          ];
          const vertices = points.map(({ x, y }) => `${x},${y}`).join(" ");
          const sticker = `${f}-${i}-${j}`;
          if (style === "original") {
            return (
              <polygon
                key={sticker}
                data-sticker={sticker}
                data-color={color}
                fill={color}
                fillOpacity={opacity}
                points={vertices}
              />
            );
          }
          const path =
            style === "cyber"
              ? cyberStickerPath(points)
              : roundedStickerPath(points);
          return (
            <g key={sticker}>
              <path
                data-sticker={sticker}
                data-points={vertices}
                data-color={color}
                d={path}
                fill={color}
                fillOpacity={style === "cyber" ? 1 : opacity}
                data-source-opacity={opacity}
              />
              {style !== "flat" && <path d={path} fill={`url(#${id}-shade)`} />}
              {style === "cyber" && <path d={path} fill={`url(#${id}-scan)`} />}
            </g>
          );
        }),
      )}
      {style !== "original" && style !== "flat" && (
        <g filter={`url(#${id}-glow)`} className="cube-rims">
          {colors.flatMap((row, i) =>
            row.map((color, j) => {
              const points = [
                project(i + u, j + u),
                project(i + v, j + u),
                project(i + v, j + v),
                project(i + u, j + v),
              ];
              const path =
                style === "cyber"
                  ? cyberStickerPath(points)
                  : roundedStickerPath(points);
              const rim =
                style === "cyber"
                  ? color.replace("--mantine-color-", "--cube-rim-")
                  : color;
              return (
                <g key={`${f}-rim-${i}-${j}`}>
                  {style === "cyber" && (
                    <path
                      d={path}
                      fill="none"
                      stroke={rim}
                      strokeWidth="5"
                      opacity="0.22"
                    />
                  )}
                  <path
                    className="cube-rim-core"
                    d={path}
                    fill="none"
                    stroke={rim}
                  />
                  {style === "cyber" && (
                    <path
                      d={path}
                      fill="none"
                      stroke="#ecffff"
                      strokeWidth="0.55"
                      opacity="0.025"
                    />
                  )}
                </g>
              );
            }),
          )}
        </g>
      )}
    </>
  );
};

const CubeNet: React.FC<{
  scramble: string;
  side: number;
  style?: CubeStyle;
}> = ({ scramble, side, style = "original" }) => {
  const id = useId().replace(/:/g, "");
  if (!scramble) {
    return null;
  }
  const cube = permuteCube(scramble);
  const facePadding = 0;
  const faceStep = 200;
  const A0 = facePadding - faceStep * 1.5;
  const A1 = A0 + faceStep;
  const A2 = A1 + faceStep;
  const B0 = faceStep - facePadding - faceStep * 1.5;
  const B1 = B0 + faceStep;
  const B2 = B1 + faceStep;
  const Z1 = 2;
  return (
    <svg
      className={`cube-net cube-net--${style}`}
      role="img"
      aria-label={`Daily scramble cube, ${style === "original" ? "original" : `rounded ${style}`} finish`}
      width={side * 2}
      height={side * 2}
      viewBox="-150 -150 300 300"
    >
      {style !== "original" && (
        <defs>
          <clipPath id={`${id}-outline`}>
            <polygon points="-50,-150 50,-150 150,-50 150,50 50,150 -50,150 -150,50 -150,-50" />
          </clipPath>
          {style === "cyber" ? (
            <radialGradient id={`${id}-shade`} cx="50%" cy="32%" r="82%">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.0055" />
              <stop offset="0.65" stopColor="#010710" stopOpacity="0.015" />
              <stop offset="1" stopColor="#010710" stopOpacity="0.19" />
            </radialGradient>
          ) : (
            <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0.15" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="0.25" stopColor="#040c12" stopOpacity="0.5" />
              <stop offset="1" stopColor="#040c12" stopOpacity="0.72" />
            </linearGradient>
          )}
          <pattern
            id={`${id}-scan`}
            width="2.7"
            height="2.7"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0.6H2.7"
              stroke="#010b15"
              strokeWidth="0.58"
              opacity="0.13"
            />
          </pattern>
          <filter
            id={`${id}-glow`}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation={style === "neon" ? 1.6 : 1.45} />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g clipPath={style === "original" ? undefined : `url(#${id}-outline)`}>
        {renderFace(
          cube,
          "L",
          A0,
          A1,
          Z1,
          B0,
          A1,
          1,
          A0,
          B1,
          Z1,
          B0,
          B1,
          1,
          0.8,
          style,
          id,
        )}
        {renderFace(
          cube,
          "F",
          A1,
          A1,
          1,
          B1,
          A1,
          1,
          A1,
          B1,
          1,
          B1,
          B1,
          1,
          1,
          style,
          id,
        )}
        {renderFace(
          cube,
          "R",
          A2,
          A1,
          1,
          B2,
          A1,
          Z1,
          A2,
          B1,
          1,
          B2,
          B1,
          Z1,
          0.8,
          style,
          id,
        )}
        {renderFace(
          cube,
          "U",
          B1,
          B0,
          1,
          A1,
          B0,
          1,
          B1,
          A0,
          Z1,
          A1,
          A0,
          Z1,
          0.8,
          style,
          id,
        )}
        {renderFace(
          cube,
          "D",
          A1,
          A2,
          1,
          B1,
          A2,
          1,
          A1,
          B2,
          Z1,
          B1,
          B2,
          Z1,
          0.8,
          style,
          id,
        )}
      </g>
      {style === "cyber" && (
        <g
          className="cube-chassis"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="butt"
        >
          <defs>
            <filter
              id={`${id}-chassis-glow`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="3" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <polygon
            stroke="#030910"
            strokeWidth="7"
            points="-50,-150 50,-150 150,-50 150,50 50,150 -50,150 -150,50 -150,-50"
          />
          <g filter={`url(#${id}-chassis-glow)`} strokeWidth="3.8">
            <path
              stroke="#10ddff"
              d="M22 -150H39 M66 -134L90 -110 M130 -70L148 -52 M150 -42V-12 M150 -5V27 M128 72L107 93 M63 137L53 147 M37 150H10 M-29 150H-44 M-68 132L-91 109 M-133 67L-150 50 M-150 40V15 M-150 -18V-44 M-147 -53L-129 -71 M-108 -92L-86 -114"
            />
            <path
              stroke="#ff24d8"
              d="M-46 -150H-18 M-12 -150H15 M51 -149L61 -139 M96 -104L119 -81 M150 34V45 M148 52L136 64 M102 98L73 127 M47 150H43 M2 150H-20 M-51 149L-64 136 M-99 101L-124 76 M-150 7V-10 M-123 -77L-113 -87 M-80 -120L-56 -144"
            />
          </g>
        </g>
      )}
    </svg>
  );
};

export default CubeNet;
