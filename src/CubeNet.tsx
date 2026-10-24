import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  const [dpr, setDpr] = useState(() =>
    Math.min(2, window.devicePixelRatio || 1),
  );
  const [measured, setMeasured] = useState(false);
  const [failedPaint, setFailedPaint] = useState<string | null>(null);
  const [image, setImage] = useState<{
    href: string;
    padding: number;
    width: number;
    key: string;
    materialKey: string;
  } | null>(null);
  const material = cubeMaterials[style];
  const parameters = material.parameters;
  const stickers = useMemo(
    () => (scramble ? cubeStickers(scramble) : []),
    [scramble],
  );
  const paths = useMemo(() => geometry(stickers), [stickers]);
  const paintKey = `${scramble}:${style}:${width}:${dpr}`;
  const materialKey = `${scramble}:${style}`;
  const canPaint = typeof CanvasRenderingContext2D !== "undefined";
  const failed = material.raster && (!canPaint || failedPaint === paintKey);
  const paintedImage = !failed && image?.key === paintKey ? image : null;
  // Keep an already decoded finish during size/DPR updates, never across styles or days.
  const displayedImage =
    !failed && image?.materialKey === materialKey && image.key !== failedPaint
      ? image
      : null;
  const showFallback = !material.raster || failed;
  const pending = material.raster && !failed && !paintedImage;

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return undefined;
    }
    const update = () => {
      setDpr(Math.min(2, window.devicePixelRatio || 1));
      const currentWidth = Math.round(svg.getBoundingClientRect().width);
      if (currentWidth > 0) {
        setWidth(currentWidth);
        setMeasured(true);
      }
    };
    update();
    window.addEventListener("resize", update);
    const observer = new window.ResizeObserver((entries) => {
      const measured = Math.round(entries[0]?.contentRect.width || 0);
      if (measured > 0) {
        setWidth(measured);
        setMeasured(true);
      }
    });
    observer.observe(svg);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [stickers.length]);

  useEffect(() => {
    if (!material.raster || !stickers.length || !canPaint || !measured) {
      return undefined;
    }
    let cancelled = false;
    setFailedPaint(null);
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
      .then(async (canvas) => {
        const href = canvas.toDataURL("image/png");
        const decoded = new Image();
        if (typeof decoded.decode === "function") {
          decoded.src = href;
          await decoded.decode();
        } else {
          await new Promise<void>((resolve, reject) => {
            decoded.onload = () => resolve();
            decoded.onerror = reject;
            decoded.src = href;
          });
        }
        if (!cancelled) {
          setFailedPaint(null);
          setImage({
            href,
            padding,
            width,
            key: paintKey,
            materialKey,
          });
        }
      })
      .catch(() => {
        // A real render/decode failure reveals the accessible projected fallback.
        if (!cancelled) {
          setFailedPaint(paintKey);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    stickers,
    material,
    parameters,
    width,
    dpr,
    paintKey,
    materialKey,
    canPaint,
    measured,
  ]);

  if (!scramble) {
    return null;
  }
  const pixelsPerUnit = width / 300;
  const paddingUnits = displayedImage
    ? displayedImage.padding / (displayedImage.width / 300)
    : 0;
  const noise =
    parameters.noiseActive &&
    screenInterference &&
    (showFallback || Boolean(displayedImage));
  return (
    <svg
      ref={svgRef}
      className={`cube-net cube-net--${style}`}
      role="img"
      focusable="false"
      aria-label={`Daily scramble cube, ${material.description} finish${failed ? " (simplified preview)" : ""}`}
      aria-busy={pending || undefined}
      width={side * 2}
      height={side * 2}
      viewBox="-150 -150 300 300"
      data-material-ready={!material.raster || Boolean(paintedImage)}
      data-material-state={
        showFallback
          ? "fallback"
          : paintedImage
            ? "ready"
            : displayedImage
              ? "updating"
              : "pending"
      }
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
      <g data-cube-fallback="" opacity={showFallback ? 1 : 0}>
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
      {pending && !displayedImage && (
        <g
          data-cube-loading=""
          aria-hidden="true"
          fill="#9aa7b0"
          opacity={0.65}
        >
          {[-12, 0, 12].map((x) => (
            <circle key={x} cx={x} cy={0} r={2.5} />
          ))}
        </g>
      )}
      {displayedImage && (
        <image
          className="cube-material-image"
          aria-hidden="true"
          x={-150 - paddingUnits}
          y={-150 - paddingUnits}
          width={300 + paddingUnits * 2}
          height={300 + paddingUnits * 2}
          href={displayedImage.href}
          onError={() => setFailedPaint(displayedImage.key)}
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
