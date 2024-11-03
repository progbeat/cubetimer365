import React, { useMemo } from 'react';

type CubeState = Record<string, string>;

const adjacentFacesCw: Record<string, string> = {
  U: 'FLBR',
  D: 'FRBL',
  F: 'URDL',
  B: 'ULDR',
  L: 'UFDB',
  R: 'UBDF',
};

const modifierPermutations: Record<string, number[]> = {
  "'": [1, 2, 3, 0],   // Clockwise rotation
  "": [3, 0, 1, 2],  // Counter-clockwise rotation
  "2": [2, 3, 0, 1],  // 180-degree rotation
};

const rotationCycles = (face: string): string[][] => {
  const [a, b, c, d] = adjacentFacesCw[face].split('');
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
    U: 'var(--mantine-color-yellow-4)',
    D: 'var(--mantine-color-gray-2)',
    F: 'var(--mantine-color-green-6)',
    B: 'var(--mantine-color-blue-6)',
    L: 'var(--mantine-color-red-6)',
    R: 'var(--mantine-color-orange-5)',
  }
  Object.entries(adjacentFacesCw).forEach(([face, adjacent]) => {
    for (let i = 0; i < 4; i++) {
      const a = adjacent[i], b = adjacent[(i + 1) % 4];
      cubeState[`${face}${a}`] = cubeState[face];  // Edge stickers
      cubeState[`${face}${a}${b}`] = cubeState[face];  // Corner stickers
    }
  });
  return cubeState;
};

// Apply a sequence of moves to the cube, starting from an optional initial state
const permuteCube = (scramble: string, cube: CubeState = generateInitialState()): CubeState => {
  scramble.split(' ').forEach((move) => {
    const cycles = rotationCycles(move[0]);
    const permutation = modifierPermutations[move.slice(1)];
    console.log(permutation);
    cycles.forEach((cycle) => {
      const permutatedStickers = permutation.map((i) => cube[cycle[i]]);
      for (let i = 0; i < 4; i++) {
        cube[cycle[i]] = permutatedStickers[i];
      }
    });
  });
  return cube;
};

const renderFace = (cube: CubeState, f: string,
                    luX, luY, luZ,
                    ruX, ruY, ruZ,
                    ldX, ldY, ldZ,
                    rdX, rdY, rdZ,
                    opacity = 0.8
                  ) => {
  const [a, b, c, d] = adjacentFacesCw[f].split('');
  const colors = [
    [cube[f + d + a], cube[f + a], cube[f + a + b]],
    [cube[f + d]    , cube[f]    , cube[f + b]    ],
    [cube[f + c + d], cube[f + c], cube[f + b + c]],
  ]
  const project = (i, j) => {
    let alpha = (3 - i) / 3, beta = i / 3;
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
    }
  }
  const u = 0.025;
  const v = 1 - u;
  return (
    <>
      <polygon key='bg' fill='var(--mantine-color-default-border)'
                points={[
                  project(0, 0),
                  project(3, 0),
                  project(3, 3),
                  project(0, 3),
                ].map(({ x, y }) => `${x},${y}`).join(' ')} />
      {colors.flatMap((row, i) => {
        return row.map((color, j) => {
          const points = [
            project(i + u, j + u),
            project(i + v, j + u),
            project(i + v, j + v),
            project(i + u, j + v),
          ]
          return (
            <polygon key={`${f}-${i}-${j}`} fill={color} fillOpacity={opacity}
                     points={points.map(({ x, y }) => `${x},${y}`).join(' ')} />
          );
        })
      })}
    </>
  );
}

const CubeNet: React.FC<{ scramble: string, side: number}> = ({ scramble, side }) => {
  if (!scramble) {
    return null;
  }
  const cube = permuteCube(scramble);
  const facePadding = 0;
  const faceStep = 200;
  const A0 = facePadding - faceStep * 1.5;
  const A1 = A0 + faceStep;
  const A2 = A1 + faceStep;
  const A3 = A2 + faceStep;
  const B0 = faceStep - facePadding - faceStep * 1.5;
  const B1 = B0 + faceStep;
  const B2 = B1 + faceStep;
  const B3 = B2 + faceStep;
  const Z0 = 1;
  const Z1 = 2;
  return (
    <svg width={side*2} height={side*2} viewBox="-150 -150 300 300">
      {renderFace(
        cube, 'L',
        A0, A1, Z1,
        B0, A1, 1,
        A0, B1, Z1,
        B0, B1, 1,
      )}
      {renderFace(
        cube, 'F',
        A1, A1, 1,
        B1, A1, 1,
        A1, B1, 1,
        B1, B1, 1,
        1
      )}
      {renderFace(
        cube, 'R',
        A2, A1, 1,
        B2, A1, Z1,
        A2, B1, 1,
        B2, B1, Z1,
      )}
      {renderFace(
        cube, 'U',
        B1, B0, 1,
        A1, B0, 1,
        B1, A0, Z1,
        A1, A0, Z1,
      )}
      {renderFace(
        cube, 'D',
        A1, A2, 1,
        B1, A2, 1,
        A1, B2, Z1,
        B1, B2, Z1,
      )}
    </svg>
  )
};

export default CubeNet;
