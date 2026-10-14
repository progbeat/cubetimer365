import { project, type Face, type StickerInput } from "./cubeRenderer";

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

export function cubeStickers(scramble: string): StickerInput[] {
  const cube = permuteCube(scramble);
  return (["L", "F", "R", "U", "D"] as Face[]).flatMap((face) => {
    const [a, b, c, d] = adjacentFacesCw[face].split("");
    const colors = [
      [cube[face + d + a], cube[face + a], cube[face + a + b]],
      [cube[face + d], cube[face], cube[face + b]],
      [cube[face + c + d], cube[face + c], cube[face + b + c]],
    ];
    return colors.flatMap((row, i) =>
      row.map((color, j) => ({
        id: `${face}-${i}-${j}`,
        color,
        sourceOpacity: face === "F" ? 1 : 0.8,
        points: [
          project(face, i + 0.025, j + 0.025),
          project(face, i + 0.975, j + 0.025),
          project(face, i + 0.975, j + 0.975),
          project(face, i + 0.025, j + 0.975),
        ]
          .map(({ x, y }) => `${x},${y}`)
          .join(" "),
      })),
    );
  });
}
export const cubeFaces = (["L", "F", "R", "U", "D"] as Face[]).map((face) => ({
  id: face,
  points: [
    project(face, 0, 0),
    project(face, 3, 0),
    project(face, 3, 3),
    project(face, 0, 3),
  ]
    .map(({ x, y }) => `${x},${y}`)
    .join(" "),
}));
