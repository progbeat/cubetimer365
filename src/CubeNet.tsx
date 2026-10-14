import React, { useEffect, useId, useRef, useState } from "react";
import {
  projectedSticker,
  projectedRoundedStickerPath,
  roundedStickerPath,
} from "./cubeFinish";

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

function RimGlint({
  id,
  from,
  to,
  color,
  width,
  opacity,
}: {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width: number;
  opacity: number;
}) {
  return (
    <>
      <defs>
        <linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
        >
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.2" stopColor={color} />
          <stop offset="0.7" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        data-rim-glint=""
        d={`M${from.x},${from.y} L${to.x},${to.y}`}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={width}
        strokeLinecap="round"
        opacity={opacity}
      />
    </>
  );
}

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
  pixelsPerUnit: number = 1,
  screenInterference: boolean = false,
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
          const screen =
            style === "cyber"
              ? projectedSticker(project, i, j, pixelsPerUnit)
              : null;
          const path = screen
            ? screen.outer
            : style === "neon"
              ? projectedRoundedStickerPath(project, i, j)
              : roundedStickerPath(points);
          const cellId = `${id}-${sticker}`;
          const variation = ((f.charCodeAt(0) + i * 7 + j * 13) % 11) / 10;
          const rim = color.replace("--mantine-color-", "--cube-rim-");
          const lightA = project(i + 0.12 + variation * 0.1, j + 0.1);
          const lightB = project(i + 0.95, j + 0.75 + variation * 0.2);

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
              {style === "neon" && <path d={path} fill={`url(#${id}-shade)`} />}
              {screen && (
                <>
                  <defs>
                    <linearGradient
                      id={`${cellId}-shade`}
                      gradientUnits="userSpaceOnUse"
                      x1={lightA.x}
                      y1={lightA.y}
                      x2={lightB.x}
                      y2={lightB.y}
                    >
                      <stop
                        offset="0"
                        stopColor="#eafaff"
                        stopOpacity={0.006 + variation * 0.006}
                      />
                      <stop
                        offset=".45"
                        stopColor="#010611"
                        stopOpacity=".014"
                      />
                      <stop
                        offset="1"
                        stopColor="#010611"
                        stopOpacity={0.09 + variation * 0.035}
                      />
                    </linearGradient>
                    <clipPath id={`${cellId}-plate`}>
                      <path d={screen.outer} />
                    </clipPath>
                    <clipPath id={`${cellId}-rim`}>
                      <path d={screen.ring} clipRule="evenodd" />
                    </clipPath>
                    <linearGradient
                      id={`${cellId}-light`}
                      gradientUnits="userSpaceOnUse"
                      x1={lightA.x}
                      y1={lightA.y}
                      x2={lightB.x}
                      y2={lightB.y}
                    >
                      <stop
                        offset="0"
                        stopColor={rim}
                        stopOpacity={1 - variation * 0.025}
                      />
                      <stop
                        offset={0.22 + variation * 0.09}
                        stopColor={rim}
                        stopOpacity={0.78 + variation * 0.17}
                      />
                      <stop
                        offset={0.5 + variation * 0.08}
                        stopColor={rim}
                        stopOpacity={0.45 + variation * 0.1}
                      />
                      <stop
                        offset="1"
                        stopColor={rim}
                        stopOpacity={0.8 + variation * 0.14}
                      />
                    </linearGradient>
                  </defs>
                  <g clipPath={`url(#${cellId}-plate)`}>
                    <path d={path} fill={`url(#${cellId}-shade)`} />
                    {!screenInterference && (
                      <path
                        data-scanlines={sticker}
                        data-band-count={screen.bandCount}
                        d={screen.bands}
                        fill="#020917"
                        opacity={0.12 + variation * 0.035}
                      />
                    )}
                    <path
                      d={screen.bevel}
                      fill={rim}
                      fillRule="evenodd"
                      opacity={0.08 + variation * 0.025}
                    />
                    <path
                      d={screen.ring}
                      fill={`url(#${cellId}-light)`}
                      fillRule="evenodd"
                    />
                    <g clipPath={`url(#${cellId}-rim)`}>
                      {variation > 0.35 && (
                        <RimGlint
                          id={`${cellId}-top-glint`}
                          from={project(screen.top + 0.01, screen.left + 0.06)}
                          to={project(
                            screen.top + 0.01,
                            screen.left + 0.31 + variation * 0.13,
                          )}
                          color="#e7ffff"
                          width={1.1}
                          opacity={0.32 + variation * 0.22}
                        />
                      )}
                      <RimGlint
                        id={`${cellId}-side-glint`}
                        from={project(screen.top + 0.12, screen.right - 0.005)}
                        to={project(
                          screen.top + 0.31 + variation * 0.19,
                          screen.right - 0.005,
                        )}
                        color={rim}
                        width={1}
                        opacity={0.38 + variation * 0.22}
                      />
                    </g>
                  </g>
                </>
              )}
            </g>
          );
        }),
      )}
      {style === "neon" && (
        <g filter={`url(#${id}-glow)`} className="cube-rims">
          {colors.flatMap((row, i) =>
            row.map((color, j) => (
              <path
                key={`${f}-rim-${i}-${j}`}
                d={projectedRoundedStickerPath(project, i, j)}
                fill="none"
                stroke={color}
              />
            )),
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
  screenInterference?: boolean;
}> = ({ scramble, side, style = "original", screenInterference = true }) => {
  const id = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [renderedWidth, setRenderedWidth] = useState(side * 2);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return undefined;
    }
    const observer = new window.ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width || 0);
      if (width > 0) {
        setRenderedWidth((previous) => (previous === width ? previous : width));
      }
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const pixelsPerUnit = renderedWidth / 300;
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
      ref={svgRef}
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
          {style === "cyber" && screenInterference && (
            <pattern
              id={`${id}-screen-interference`}
              patternUnits="userSpaceOnUse"
              x="-150"
              y="-150"
              width="300"
              height={3.4 / pixelsPerUnit}
            >
              <rect
                y={0.7 / pixelsPerUnit}
                width="300"
                height={0.6 / pixelsPerUnit}
                fill="#020917"
                opacity="0.18"
              />
            </pattern>
          )}
          {style === "neon" && (
            <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0.15" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="0.25" stopColor="#040c12" stopOpacity="0.5" />
              <stop offset="1" stopColor="#040c12" stopOpacity="0.72" />
            </linearGradient>
          )}
          {style === "neon" && (
            <filter
              id={`${id}-glow`}
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="1.6" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
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
          pixelsPerUnit,
          screenInterference,
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
          pixelsPerUnit,
          screenInterference,
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
          pixelsPerUnit,
          screenInterference,
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
          pixelsPerUnit,
          screenInterference,
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
          pixelsPerUnit,
          screenInterference,
        )}
      </g>
      {style === "cyber" && screenInterference && (
        <g data-screen-interference="" clipPath={`url(#${id}-outline)`}>
          <rect
            x="-150"
            y="-150"
            width="300"
            height="300"
            fill={`url(#${id}-screen-interference)`}
          />
        </g>
      )}
    </svg>
  );
};

export default CubeNet;
