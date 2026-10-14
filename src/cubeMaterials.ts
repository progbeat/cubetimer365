import { BASE, EFFECT_DEFAULTS, type MaterialParameters } from "./cubeRenderer";

export type CubeStyle = "original" | "flat" | "neon" | "cyber";
export type CubeMaterial = {
  description: string;
  parameters: MaterialParameters;
  rounded: boolean;
  raster: boolean;
  sourceOpacity: boolean;
};

const parameters = (
  values: Partial<MaterialParameters>,
): MaterialParameters => ({
  ...BASE,
  ...EFFECT_DEFAULTS,
  ...values,
});

// The three supported finishes differ only in declarative paint parameters.
// Shared geometry, clipping and screen-space compositing live in the renderer.
export const cubeMaterials: Record<CubeStyle, CubeMaterial> = {
  original: {
    description: "original",
    parameters: parameters({
      center: 1,
      edge: 1,
      glow: 0,
      contourWidth: 0,
      substrate: "var(--mantine-color-default-border)",
    }),
    rounded: false,
    raster: false,
    sourceOpacity: true,
  },
  flat: {
    description: "rounded flat",
    rounded: true,
    raster: true,
    sourceOpacity: false,
    parameters: parameters({
      center: 1,
      edge: 1,
      knee: 0.25,
      power: 2.2,
      brightness: 0.96,
      saturation: 1.1,
      edgeWhite: 0,
      contourWhite: 1,
      contourColor: "#060b10",
      contourWidth: 0.9,
      inset: 0,
      glow: 0,
      glowRadius: 2.4,
      glowSpread: 0,
      substrate: "#060b10",
      background: "#101619",
      noisePitch: 3.4,
      noiseWidth: 0.6,
      noiseOpacity: 0.18,
      noiseColor: "#020917",
      noisePhase: 0.7,
      palette: null,
      contourPalette: null,
      surface: null,
      contourMode: "stroke",
      contourMinFraction: 0.034,
      contourMaxFraction: 0.085,
      contourFade: null,
      lightFrom: [0.1, 0.16],
      lightTo: [0.85, 0.95],
      glints: null,
      noiseActive: false,
    }),
  },
  neon: {
    description: "rounded neon",
    rounded: true,
    raster: true,
    sourceOpacity: false,
    parameters: parameters({
      center: 0.26,
      edge: 0.6,
      knee: 0.32,
      power: 1.7,
      brightness: 1,
      saturation: 1.6,
      edgeWhite: 0,
      contourWhite: 0.45,
      contourColor: "#ffffff",
      contourWidth: 1.45,
      inset: 0.015,
      glow: 0.85,
      glowRadius: 2.6,
      glowSpread: 0.32,
      substrate: "#060b10",
      background: "#101619",
      noisePitch: 3.4,
      noiseWidth: 0.6,
      noiseOpacity: 0.18,
      noiseColor: "#020917",
      noisePhase: 0.7,
    }),
  },
  cyber: {
    description: "rounded cyber",
    rounded: true,
    raster: true,
    sourceOpacity: false,
    parameters: parameters({
      center: 1,
      edge: 1,
      knee: 0.25,
      power: 2.2,
      brightness: 1,
      saturation: 1,
      edgeWhite: 0,
      contourWhite: 0,
      contourColor: "#ffffff",
      contourWidth: 0.85,
      inset: 0.015,
      glow: 0,
      glowRadius: 2.4,
      glowSpread: 0,
      substrate: "#030911",
      background: "#101619",
      noisePitch: 3.4,
      noiseWidth: 0.6,
      noiseOpacity: 0.18,
      noiseColor: "#020917",
      noisePhase: 0.7,
      palette: {
        "yellow-4": "#dfbb2c",
        "gray-2": "#bfcbe2",
        "green-6": "#00a63e",
        "blue-6": "#0062ed",
        "red-6": "#f71229",
        "orange-5": "#ff7009",
      },
      contourPalette: {
        "yellow-4": "#fff8a6",
        "gray-2": "#f0faff",
        "green-6": "#00f788",
        "blue-6": "#00acff",
        "red-6": "#ff91a4",
        "orange-5": "#ffd17a",
      },
      surface: {
        from: [0.1, 0.16],
        to: [0.85, 0.95],
        stops: [
          {
            offset: 0,
            color: "#eafaff",
            opacity: 0.009,
          },
          {
            offset: 0.45,
            color: "#010611",
            opacity: 0.014,
          },
          {
            offset: 1,
            color: "#010611",
            opacity: 0.09,
          },
        ],
      },
      contourMode: "ring",
      contourMinFraction: 0.034,
      contourMaxFraction: 0.085,
      contourFade: [
        {
          offset: 0,
          opacity: 0.98,
        },
        {
          offset: 0.28,
          opacity: 0.87,
        },
        {
          offset: 0.55,
          opacity: 0.55,
        },
        {
          offset: 1,
          opacity: 0.87,
        },
      ],
      lightFrom: [0.1, 0.16],
      lightTo: [0.85, 0.95],
      glints: null,
      noiseActive: true,
    }),
  },
};
