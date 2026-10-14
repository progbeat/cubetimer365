import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { cubeFaces, cubeStickers } from "./cubeGeometry";
import { cubeMaterials, type CubeStyle } from "./cubeMaterials";
import { fillAt, geometry, renderCube, rgbCss } from "./cubeRenderer";

export type { CubeStyle } from "./cubeMaterials";

const outline =
  "-50,-150 50,-150 150,-50 150,50 50,150 -50,150 -150,50 -150,-50";

const CubeNet: React.FC<{
  scramble: string;
  side: number;
  style?: CubeStyle;
  screenInterference?: boolean;
}> = ({ scramble, side, style = "original", screenInterference = true }) => {
  const id = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(side * 2);
  const [dpr, setDpr] = useState(1);
  const [image, setImage] = useState<{
    href: string;
    padding: number;
    key: string;
  } | null>(null);
  const material = cubeMaterials[style];
  const parameters = material.parameters;
  const stickers = useMemo(
    () => (scramble ? cubeStickers(scramble) : []),
    [scramble],
  );
  const paths = useMemo(() => geometry(stickers), [stickers]);
  const paintKey = `${scramble}:${style}:${width}:${dpr}`;
  const paintedImage = image?.key === paintKey ? image : null;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return undefined;
    }
    const updateDpr = () => setDpr(Math.min(2, window.devicePixelRatio || 1));
    updateDpr();
    window.addEventListener("resize", updateDpr);
    const observer = new window.ResizeObserver((entries) => {
      const measured = Math.round(entries[0]?.contentRect.width || 0);
      if (measured > 0) {
        setWidth(measured);
      }
    });
    observer.observe(svg);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDpr);
    };
  }, [stickers.length]);

  useEffect(() => {
    setImage(null);
    if (
      !material.raster ||
      !stickers.length ||
      typeof CanvasRenderingContext2D === "undefined"
    ) {
      return undefined;
    }
    let cancelled = false;
    const padding = Math.ceil(width * 0.06);
    // Paint static material once. The final SVG pass keeps interference in
    // screen pixels, outside the face projection and outside the bitmap.
    renderCube(stickers, parameters, {
      size: width,
      padding,
      dpr,
      opaqueBackground: false,
      renderInterference: false,
    })
      .then((canvas) => {
        if (!cancelled) {
          setImage({
            href: canvas.toDataURL("image/png"),
            padding,
            key: paintKey,
          });
        }
      })
      .catch(() => {
        // A material failure must not interrupt the timer. The accessible
        // projected fallback remains visible when canvas/image decoding fails.
      });
    return () => {
      cancelled = true;
    };
  }, [stickers, material, parameters, width, dpr, paintKey]);

  if (!scramble) {
    return null;
  }
  const pixelsPerUnit = width / 300;
  const paddingUnits = paintedImage ? paintedImage.padding / pixelsPerUnit : 0;
  const noise = parameters.noiseActive && screenInterference;
  return (
    <svg
      ref={svgRef}
      className={`cube-net cube-net--${style}`}
      role="img"
      focusable="false"
      aria-label={`Daily scramble cube, ${material.description} finish`}
      width={side * 2}
      height={side * 2}
      viewBox="-150 -150 300 300"
      data-material-ready={!material.raster || Boolean(paintedImage)}
    >
      {material.rounded && (
        <defs>
          <clipPath id={`${id}-outline`}>
            <polygon points={outline} />
          </clipPath>
          {noise && (
            <pattern
              id={`${id}-screen-interference`}
              patternUnits="userSpaceOnUse"
              x="-150"
              y="-150"
              width="300"
              height={parameters.noisePitch / pixelsPerUnit}
            >
              <rect
                y={parameters.noisePhase / pixelsPerUnit}
                width="300"
                height={parameters.noiseWidth / pixelsPerUnit}
                fill={parameters.noiseColor}
                opacity={parameters.noiseOpacity}
              />
            </pattern>
          )}
        </defs>
      )}
      <g opacity={paintedImage ? 0 : 1}>
        {cubeFaces.map((face) => (
          <polygon
            key={face.id}
            data-face={face.id}
            points={face.points}
            fill={parameters.substrate}
          />
        ))}
        {paths.map((sticker) => {
          const paint = {
            "data-sticker": sticker.id,
            "data-color": sticker.color,
            "data-source-opacity": sticker.sourceOpacity,
            fill: material.raster
              ? rgbCss(fillAt(0.5, 0.5, sticker.color, parameters))
              : sticker.color,
            fillOpacity: material.sourceOpacity ? sticker.sourceOpacity : 1,
          };
          return material.rounded ? (
            <path
              key={sticker.id}
              {...paint}
              data-points={sticker.points}
              d={sticker.d}
            />
          ) : (
            <polygon key={sticker.id} {...paint} points={sticker.points} />
          );
        })}
      </g>
      {paintedImage && (
        <image
          className="cube-material-image"
          aria-hidden="true"
          x={-150 - paddingUnits}
          y={-150 - paddingUnits}
          width={300 + paddingUnits * 2}
          height={300 + paddingUnits * 2}
          href={paintedImage.href}
        />
      )}
      {noise && (
        <g
          data-screen-interference=""
          aria-hidden="true"
          clipPath={`url(#${id}-outline)`}
        >
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
