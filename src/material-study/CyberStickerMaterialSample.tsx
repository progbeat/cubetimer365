import { useId } from "react";

// Material-only study traced from panel 05; the runtime CubeNet does not import it.
const contours = {
  front: {
    outer:
      "M17 5.2 L83.6 5.2 C91.2 5.2 96.5 10.2 96.5 17.7 L96.5 67.4 C96.5 75.1 90.7 80.8 82.1 80.8 L18.2 80.8 C10.1 80.8 5.2 74.9 5.2 67.0 L5.2 18.2 C5.2 10.8 10.3 5.2 17 5.2Z",
    inner:
      "M24 10 C18.7 10.1 17.5 12.4 14.5 16.3 C10.8 20.4 10.6 25.9 9.4 31.4 C8.6 39.3 9.3 49 9.4 62.5 C9.6 67 11.4 70.6 15.2 73 C17 74.3 18.3 78.1 23 78.5 L78.7 78.55 C82 78.45 84.3 78.45 87 75 C90 72.2 92 68.4 92.8 62.7 L92.6 28.4 C92.9 20.7 88.8 18 87 14.7 C85.2 12.1 83.2 10.1 80.2 10.2 C61 10.5 42 9.1 24 10Z",
    glints: [
      "M7 24 C7 17 11 10 17 7.5 C21 6.6 25 6.9 29 8.4 C24 9 21 10.4 19 12.4 C16.6 15 15.4 20 12.6 21.1 C10.6 22.3 10 25.7 7 27.7Z",
      "M6.2 61.5 C8.4 60.4 10.1 63.6 13.4 67.1 C16 70.1 16.4 73.5 19.8 77.7 C13.8 78.5 8.5 73.9 6.5 69.2Z",
      "M88 67 C91 64 95.4 62.8 95.4 66.2 C95 73 90.9 78.4 84.6 79.4 C79 80.1 76 78.7 80 76.5 C82.2 74.1 83.5 70.8 88 67Z",
    ],
    width: 103,
    height: 88,
  },
  side: {
    outer:
      "M7 18.5 L30.5 7.6 C33.5 5.3 35.4 6.5 36.3 8.5 C37.4 11 37 12.5 37 15 L37.1 79.9 C37 86.4 34.3 88.6 31.1 87.3 L9 80.5 C5.2 78.8 5.5 76 5.5 73 L5.5 24 C5.5 20.9 5.7 19.4 7 18.5Z",
    inner:
      "M13.2 21 C15.2 18.7 22.7 16 27 11.3 C29.2 9.4 31.3 10.2 33.2 12.4 C34 15.5 34.2 18.3 33.6 22.5 L33.6 73.8 C33.6 80.1 33.6 84.9 31.4 84.6 C27.9 84.7 24.6 81 21.5 78.7 C17 75.8 15.1 73.3 12.2 69.1 C10.4 64.3 10.1 62.4 10.1 56 L10.4 30.3 C10.2 26.7 11.6 23.3 13.2 21Z",
    glints: [
      "M6.4 24 C8.9 20.1 15.4 17.1 18.2 17.3 C15.5 20.7 12.3 24.9 11.2 28.6 C10.6 37.8 9.7 43.8 10.6 52.6 C9.5 55.9 6.8 54.3 6.4 50.8Z",
      "M6.2 59.7 C9.5 60.9 10.3 65.4 13.5 68.1 C17.2 71.8 22.9 77.7 28 80.4 C31.2 82.6 32 86.1 28.9 86.4 L10.2 79.9 C6.2 79 6 76.2 6 74.4Z",
      "M29 9.9 C31 8.3 35 8.2 35.6 12.1 L35.6 21.3 C34.4 17.8 33.2 15.7 32.2 14.3 C29.6 13 29.6 12.1 29 9.9Z",
    ],
    width: 44,
    height: 92,
  },
};

export function CyberStickerMaterialSample({
  variant,
}: {
  variant: "front" | "side";
}) {
  const id = useId().replace(/:/g, "");
  const shape = contours[variant];
  const front = variant === "front";
  const ring = `${shape.outer} ${shape.inner}`;
  const caps = front
    ? [
        { cx: "40%", cy: "13%", r: "40%", color: "#98ffd8", strength: 0.9 },
        { cx: "22%", cy: "86%", r: "63%", color: "#0effb2", strength: 0.45 },
        { cx: "72%", cy: "81%", r: "55%", color: "#02ff9c", strength: 0.45 },
      ]
    : [
        { cx: "20%", cy: "25%", r: "70%", color: "#ffffff", strength: 0.42 },
        { cx: "35%", cy: "60%", r: "75%", color: "#ffffff", strength: 0.4 },
        { cx: "75%", cy: "13%", r: "65%", color: "#ffffff", strength: 0.55 },
      ];
  return (
    <svg
      role="img"
      aria-label={`${variant} sticker asymmetric material study`}
      width={shape.width}
      height={shape.height}
      viewBox={`0 0 ${shape.width} ${shape.height}`}
    >
      <defs>
        <clipPath id={`${id}-plate`}>
          <path d={shape.outer} />
        </clipPath>
        <clipPath id={`${id}-light`}>
          <path d={ring} clipRule="evenodd" />
        </clipPath>
        <filter
          id={`${id}-feather`}
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
        >
          <feGaussianBlur stdDeviation="0.52" />
        </filter>
        <linearGradient id={`${id}-core`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={front ? "#01993a" : "#a5bad5"} />
          <stop offset=".53" stopColor={front ? "#009937" : "#9db2cd"} />
          <stop offset="1" stopColor={front ? "#019e38" : "#a3b9d3"} />
        </linearGradient>
        {!front && (
          <>
            <linearGradient
              id={`${id}-left-reflection`}
              gradientUnits="userSpaceOnUse"
              x1="10"
              y1="40"
              x2="22"
              y2="40"
            >
              <stop offset="0" stopColor="#e3f5ff" stopOpacity=".24" />
              <stop offset=".35" stopColor="#e3f5ff" stopOpacity=".12" />
              <stop offset="1" stopColor="#e3f5ff" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id={`${id}-bottom-reflection`}
              gradientUnits="userSpaceOnUse"
              x1="24"
              y1="83"
              x2="24"
              y2="69"
            >
              <stop offset="0" stopColor="#e3f5ff" stopOpacity=".18" />
              <stop offset=".5" stopColor="#e3f5ff" stopOpacity=".04" />
              <stop offset="1" stopColor="#e3f5ff" stopOpacity="0" />
            </linearGradient>
          </>
        )}
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2=".14">
          <stop offset="0" stopColor={front ? "#06f98e" : "#fbffff"} />
          <stop offset=".25" stopColor={front ? "#05f786" : "#f6fbff"} />
          <stop offset=".6" stopColor={front ? "#02f380" : "#d1e9fa"} />
          <stop offset="1" stopColor={front ? "#08fb8c" : "#e8fdff"} />
        </linearGradient>
        {caps.map(({ cx, cy, r, color, strength }, index) => (
          <radialGradient
            key={index}
            id={`${id}-cap-${index}`}
            cx={cx}
            cy={cy}
            r={r}
          >
            <stop offset="0" stopColor={color} stopOpacity={strength} />
            <stop
              offset=".45"
              stopColor={color}
              stopOpacity={strength * 0.42}
            />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        ))}
        <linearGradient id={`${id}-wave`} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0"
            stopColor="#000716"
            stopOpacity={front ? ".12" : ".065"}
          />
          <stop offset=".25" stopColor="#000716" stopOpacity=".04" />
          <stop
            offset=".52"
            stopColor={front ? "#00ff64" : "#ebffff"}
            stopOpacity={front ? ".06" : ".075"}
          />
          <stop offset=".76" stopColor="#000716" stopOpacity=".02" />
          <stop
            offset="1"
            stopColor="#000716"
            stopOpacity={front ? ".12" : ".065"}
          />
        </linearGradient>
        <pattern
          id={`${id}-lines`}
          x="0"
          y={front ? "2.3" : "1.9"}
          width="120"
          height="4.55"
          patternUnits="userSpaceOnUse"
        >
          <rect width="120" height="4.55" fill={`url(#${id}-wave)`} />
        </pattern>
      </defs>
      <g clipPath={`url(#${id}-plate)`}>
        <path d={shape.outer} fill={`url(#${id}-core)`} />
        {!front && (
          <>
            <path d={shape.inner} fill={`url(#${id}-left-reflection)`} />
            <path d={shape.inner} fill={`url(#${id}-bottom-reflection)`} />
          </>
        )}
        <g filter={`url(#${id}-feather)`}>
          <path d={ring} fill={`url(#${id}-rim)`} fillRule="evenodd" />
          <g clipPath={`url(#${id}-light)`}>
            {shape.glints.map((d, index) => (
              <path
                key={d}
                data-highlight={index}
                d={d}
                fill={`url(#${id}-cap-${index})`}
              />
            ))}
          </g>
        </g>
        <path d={shape.inner} fill={`url(#${id}-lines)`} />
      </g>
    </svg>
  );
}
