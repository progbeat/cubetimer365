const getAxis = (face: string): string => {
  if (face === "U" || face === "D") {
    return "Y";
  }
  if (face === "L" || face === "R") {
    return "X";
  }
  if (face === "F" || face === "B") {
    return "Z";
  }
  return "";
};

function xoshiro128ss(seed: number): () => number {
  const s = new Uint32Array(4);
  // Initialize the state array with the seed
  function splitmix32(seed: number): number {
    let z = seed + 0x9e3779b9;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return z ^ (z >>> 16);
  }
  s[0] = splitmix32(seed);
  s[1] = splitmix32(s[0]);
  s[2] = splitmix32(s[1]);
  s[3] = splitmix32(s[2]);

  return function (): number {
    const t = s[1] << 9;
    let result = Math.imul(s[0], 5);
    result = ((result << 7) | (result >>> 25)) * 9;

    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];

    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);

    return (result >>> 0) / 4294967296;
  };
}

export const generateScramble = (seed: number): string => {
  const moves = ["U", "D", "L", "R", "F", "B"];
  const modifiers = ["", "'", "2"];
  const scrambleLength = 20;
  const rng = xoshiro128ss(seed);
  const scrambleMoves: string[] = [];
  let lastFace = "";
  let lastAxis = "";

  while (scrambleMoves.length < scrambleLength) {
    const moveIndex = Math.floor(rng() * moves.length);
    const moveFace = moves[moveIndex];
    const moveAxis = getAxis(moveFace);

    if (moveFace === lastFace) {
      continue;
    }

    if (
      scrambleMoves.length >= 2 &&
      moveAxis === lastAxis &&
      getAxis(scrambleMoves[scrambleMoves.length - 2][0]) === moveAxis &&
      getAxis(scrambleMoves[scrambleMoves.length - 1][0]) === moveAxis
    ) {
      continue;
    }

    const modifier = modifiers[Math.floor(rng() * modifiers.length)];
    scrambleMoves.push(moveFace + modifier);
    lastFace = moveFace;
    lastAxis = moveAxis;
  }

  return scrambleMoves.join(" ");
};
