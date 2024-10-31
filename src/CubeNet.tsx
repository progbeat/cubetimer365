import React, { useEffect, useState } from 'react';

const stickerColors = ['white', 'red', 'green', 'yellow', 'orange', 'blue'];

type Move = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
type Modifier = '' | '\'' | '2';

interface Rotation {
  cycles: number[][];
}

const rotations: Record<Move, Rotation> = {
  U: {
    cycles: [
      [0, 2, 8, 6],     // Top face corners
      [1, 5, 7, 3],     // Top face edges
      [9, 18, 45, 36],  // Side edges adjacent to top face
      [10, 19, 46, 37],
      [11, 20, 47, 38],
    ],
  },
  D: {
    cycles: [
      [27, 29, 35, 33],
      [28, 32, 34, 30],
      [15, 42, 51, 24],
      [16, 43, 52, 25],
      [17, 44, 53, 26],
    ],
  },
  F: {
    cycles: [
      [6, 8, 26, 24],
      [7, 17, 25, 15],
      [6, 15, 33, 9],
      [7, 16, 34, 10],
      [8, 17, 35, 11],
    ],
  },
  B: {
    cycles: [
      [0, 2, 20, 18],
      [1, 11, 19, 9],
      [0, 9, 27, 18],
      [1, 10, 28, 19],
      [2, 11, 29, 20],
    ],
  },
  L: {
    cycles: [
      [0, 18, 27, 45],
      [3, 21, 30, 48],
      [0, 3, 33, 24],
      [3, 6, 36, 27],
      [6, 9, 39, 30],
    ],
  },
  R: {
    cycles: [
      [2, 47, 35, 20],
      [5, 50, 32, 23],
      [2, 5, 38, 29],
      [5, 8, 41, 32],
      [8, 11, 44, 35],
    ],
  },
};

const CubeNet: React.FC<{ scramble: string }> = ({ scramble }) => {
  const [cubeState, setCubeState] = useState<number[]>([]);

  useEffect(() => {
    // Initialize the cube state
    const initialState = Array(54)
      .fill(0)
      .map((_, idx) => Math.floor(idx / 9));
    let state = [...initialState];

    // Parse the scramble and apply rotations
    const moves = scramble.match(/([UDLRFB]w?'?2?)/g);
    if (moves) {
      moves.forEach((move) => {
        const parsedMove = parseMove(move);
        if (parsedMove) {
          const { face, modifier } = parsedMove;
          applyRotation(state, face, modifier);
        }
      });
    }

    setCubeState(state);
  }, [scramble]);

  const parseMove = (
    move: string
  ): { face: Move; modifier: Modifier } | null => {
    const match = move.match(/([UDLRFB])('?2?)/);
    if (match) {
      const face = match[1] as Move;
      const modifier = match[2] as Modifier;
      return { face, modifier };
    }
    return null;
  };

  const applyRotation = (
    state: number[],
    face: Move,
    modifier: Modifier
  ) => {
    const rotation = rotations[face];
    let turns = modifier === '2' ? 2 : 1;
    if (modifier === '\'') {
      turns = 3;
    }

    for (let i = 0; i < turns; i++) {
      rotation.cycles.forEach((cycle) => {
        const temp = state[cycle[0]];
        for (let j = 0; j < 3; j++) {
          state[cycle[j]] = state[cycle[j + 1]];
        }
        state[cycle[3]] = temp;
      });
    }
  };

  const S1 = 3.5;
  const S2 = 2 * S1;
  const S3 = 3 * S1;
  const S4 = 4 * S1;

  const renderCube = () => {
    const positions = [
      // Top face
      { x: S1, y: 0 },
      // Left face
      { x: 0, y: S1 },
      // Front face
      { x: S1, y: S1 },
      // Right face
      { x: S2, y: S1 },
      // Back face
      { x: S3, y: S1 },
      // Bottom face
      { x: S1, y: S2 },
    ];

    const size = 20;
    const padding = 1;
    const stickers = [];

    for (let face = 0; face < 6; face++) {
      const { x: offsetX, y: offsetY } = positions[face];
      for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = (offsetX + col) * size;
        const y = (offsetY + row) * size;
        const idx = face * 9 + i;
        const color = stickerColors[cubeState[idx]];

        stickers.push(
          <rect
            key={idx}
            x={x+padding}
            y={y+padding}
            width={size-2*padding}
            height={size-2*padding}
            fill={color}
            stroke="black"
          />
        );
      }
    }

    return (
      <svg
        width={S4 * size}
        height={S3 * size}
      >
        {stickers}
      </svg>
    );
  };

  return renderCube()
};

export default CubeNet;
