import type { CubeStyle } from "./cubeMaterials";

export const CUBE_STYLE_KEY = "cubetimer365:cube-style:v1";
const offeredStyle = (value: string | null): value is CubeStyle =>
  value === "flat" || value === "neon" || value === "cyber";

export function loadCubeStyle(search: string): CubeStyle {
  const requested = new URLSearchParams(search).get("cube");
  if (offeredStyle(requested)) {
    return requested;
  }
  try {
    const saved = localStorage.getItem(CUBE_STYLE_KEY);
    return offeredStyle(saved) ? saved : "cyber";
  } catch {
    return "cyber";
  }
}

export function rememberCubeStyle(style: CubeStyle) {
  try {
    localStorage.setItem(CUBE_STYLE_KEY, style);
  } catch {
    // A blocked preference write must not interrupt the timer or in-memory choice.
  }
}
