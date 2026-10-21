import type { CubeStyle } from "./cubeMaterials";

export const CUBE_STYLE_KEY = "cubetimer365:cube-style:v1";
export const DEFAULT_CUBE_STYLE: CubeStyle = "neon";
const offeredStyle = (value: string | null): value is CubeStyle =>
  value === "flat" || value === "neon" || value === "cyber";

export function loadCubeStyle(search: string): CubeStyle {
  const requested = new URLSearchParams(search).get("cube");
  if (offeredStyle(requested)) {
    return requested;
  }
  try {
    const saved = localStorage.getItem(CUBE_STYLE_KEY);
    return offeredStyle(saved) ? saved : DEFAULT_CUBE_STYLE;
  } catch {
    return DEFAULT_CUBE_STYLE;
  }
}

export function rememberCubeStyle(style: CubeStyle) {
  try {
    localStorage.setItem(CUBE_STYLE_KEY, style);
  } catch {
    // A blocked preference write must not interrupt the timer or in-memory choice.
  }
}
