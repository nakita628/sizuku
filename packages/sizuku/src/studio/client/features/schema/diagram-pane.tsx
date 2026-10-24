import { Button } from "@heroui/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { LuMaximize, LuMinus, LuPlus } from "react-icons/lu";

type View = { readonly x: number; readonly y: number; readonly scale: number };

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function svgSize(svg: string) {
  const width = Number(/width="([\d.]+)"/u.exec(svg)?.[1] ?? 0);
  const height = Number(/height="([\d.]+)"/u.exec(svg)?.[1] ?? 0);
  return { width, height };
}

/**
 * The ER diagram on a dotted canvas: dragged to pan, scrolled to zoom around the pointer. It is
 * fitted to the pane the first time it is drawn and then left where it was put, so a redraw while
 * typing does not throw the view back.
 */
export function DiagramPane({
  svg,
  overlay,
}: {
  readonly svg: string | null;
  readonly overlay?: React.ReactNode;
}) {
  const pane = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const fitted = useRef(false);
  const drag = useRef<{ readonly x: number; readonly y: number } | null>(null);

  const fit = useCallback(() => {
    const element = pane.current;
    if (element === null || svg === null) return;
    const { width, height } = svgSize(svg);
    if (width === 0 || height === 0) return;
    const scale = clampScale(
      Math.min(element.clientWidth / width, element.clientHeight / height, 1.25) * 0.95,
    );
    setView({
      scale,
      x: (element.clientWidth - width * scale) / 2,
      y: (element.clientHeight - height * scale) / 2,
    });
  }, [svg]);

  useLayoutEffect(() => {
    if (svg !== null && !fitted.current) {
      fitted.current = true;
      fit();
    }
  }, [svg, fit]);

  // React's onWheel is passive, and a passive listener cannot keep the page from scrolling.
  useEffect(() => {
    const element = pane.current;
    if (element === null) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      setView((current) => {
        const scale = clampScale(current.scale * Math.exp(-event.deltaY * 0.0015));
        const k = scale / current.scale;
        return { scale, x: px - (px - current.x) * k, y: py - (py - current.y) * k };
      });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const element = pane.current;
    if (element === null) return;
    const px = element.clientWidth / 2;
    const py = element.clientHeight / 2;
    setView((current) => {
      const scale = clampScale(current.scale * factor);
      const k = scale / current.scale;
      return { scale, x: px - (px - current.x) * k, y: py - (py - current.y) * k };
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX - view.x, y: event.clientY - view.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start === null) return;
    setView((current) => ({ ...current, x: event.clientX - start.x, y: event.clientY - start.y }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={pane}
      role="img"
      aria-label="ER diagram"
      className="diagram-canvas relative h-full min-h-0 cursor-grab overflow-hidden active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {svg === null ? (
        <div className="absolute inset-0 flex items-center justify-center text-body text-muted">
          Drawing…
        </div>
      ) : (
        <div
          className="absolute top-0 left-0 origin-top-left [&>svg]:block"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          // The SVG is the server's own rendering of the schema; every label in it is escaped there.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      <div
        className="absolute top-3 right-3 flex items-center gap-1 rounded-lg border border-line bg-surface p-1 shadow-sm"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Button
          variant="ghost"
          isIconOnly
          size="sm"
          aria-label="Zoom out"
          onPress={() => zoomBy(1 / 1.2)}
        >
          <LuMinus />
        </Button>
        <span className="w-11 text-center text-meta text-muted tabular-nums">
          {Math.round(view.scale * 100)}%
        </span>
        <Button
          variant="ghost"
          isIconOnly
          size="sm"
          aria-label="Zoom in"
          onPress={() => zoomBy(1.2)}
        >
          <LuPlus />
        </Button>
        <Button variant="ghost" isIconOnly size="sm" aria-label="Fit the diagram" onPress={fit}>
          <LuMaximize />
        </Button>
      </div>
      {overlay}
    </div>
  );
}
