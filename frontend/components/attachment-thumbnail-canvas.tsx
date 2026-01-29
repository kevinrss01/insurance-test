"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type PreviewStatus = "idle" | "loading" | "ready" | "error";

interface AttachmentThumbnailCanvasProps {
  url: string;
  width?: number;
  height?: number;
  label?: string;
  className?: string;
}

export function AttachmentThumbnailCanvas({
  url,
  width = 144,
  height = 96,
  label = "Attachment preview",
  className,
}: AttachmentThumbnailCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const deferredUrl = React.useDeferredValue(url);
  const [status, setStatus] = React.useState<PreviewStatus>("idle");

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const trimmed = deferredUrl.trim();
    const ctx = prepareCanvas(canvas, width, height);
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }

    if (!trimmed) {
      setStatus("idle");
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setStatus("error");
        return;
      }
    } catch {
      setStatus("error");
      return;
    }

    let active = true;
    setStatus("loading");

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!active) return;
      const drawContext = prepareCanvas(canvas, width, height);
      if (drawContext) {
        drawCover(drawContext, image, width, height);
      }
      setStatus("ready");
    };
    image.onerror = () => {
      if (!active) return;
      setStatus("error");
    };
    image.src = trimmed;

    return () => {
      active = false;
    };
  }, [deferredUrl, height, width]);

  const overlay =
    status === "loading"
      ? "Loading preview…"
      : status === "error"
      ? "Preview unavailable"
      : "Add image URL";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/60 bg-muted/40",
        className
      )}
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className={cn("h-full w-full", status !== "ready" && "opacity-60")}
        role="img"
        aria-label={label}
      />
      {status !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[11px] font-medium text-muted-foreground">
          {overlay}
        </div>
      ) : null}
    </div>
  );
}

function prepareCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;

  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > canvasRatio) {
    sourceWidth = image.height * canvasRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / canvasRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );
}
