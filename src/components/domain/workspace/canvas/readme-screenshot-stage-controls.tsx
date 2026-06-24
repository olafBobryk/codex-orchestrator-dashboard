"use client";

import { Camera, Download, EyeOff, Loader2, RotateCcw, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function ReadmeScreenshotStageControls({
  captureError,
  capturedImageUrl,
  capturing,
  controlsHidden,
  onClearCapture,
  onFit,
  onHide,
  onRender,
}: {
  captureError: string | null;
  capturedImageUrl: string | null;
  capturing: boolean;
  controlsHidden: boolean;
  onClearCapture: () => void;
  onFit: () => void;
  onHide: () => void;
  onRender: () => void;
}) {
  return (
    <>
      {!controlsHidden ? (
        <div
          data-readme-stage-controls
          className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border/70 bg-background/92 p-1 text-xs text-muted-foreground shadow-xl backdrop-blur"
        >
          <span className="px-2 font-medium text-foreground">README stage</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Fit graph"
            onClick={onFit}
          >
            <RotateCcw />
            Fit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Hide staging controls"
            onClick={onHide}
          >
            <EyeOff />
            Hide
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            title="Render a clean README screenshot"
            disabled={capturing}
            onClick={onRender}
          >
            {capturing ? <Loader2 className="animate-spin" /> : <Camera />}
            Render
          </Button>
        </div>
      ) : null}

      {capturedImageUrl || captureError ? (
        <div
          data-readme-stage-result
          className="fixed bottom-16 left-1/2 z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-border bg-background p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                README screenshot render
              </p>
              <p className="text-xs text-muted-foreground">
                Generated from the current browser viewport.
              </p>
            </div>
            <div className="flex items-center gap-1">
              {capturedImageUrl ? (
                <a
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                  download="codex-orchestrator-dashboard-readme.png"
                  href={capturedImageUrl}
                >
                  <Download />
                  Download
                </a>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Close render preview"
                onClick={onClearCapture}
              >
                <X />
              </Button>
            </div>
          </div>
          {captureError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {captureError}
            </p>
          ) : null}
          {capturedImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Rendered README screenshot"
              className="max-h-[48vh] w-full rounded-md border border-border object-contain"
              src={capturedImageUrl}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
