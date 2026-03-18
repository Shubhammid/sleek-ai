import { TOOL_MODE_ENUM, ToolModeType } from "@/constants/canvas";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import CanvasControls from "./canvas-controls";

type PropsType = {
  pages: any[];
  isProjectLoading?: boolean;
};

const Canvas = ({ isProjectLoading, pages }: PropsType) => {
  const [toolMode, setToolMode] = useState<ToolModeType>(TOOL_MODE_ENUM.SELECT);
  const [zoomPercent, setZoomPercent] = useState<number>(26);
  const [currentScale, setCurrentScale] = useState<number>(0.26);

  return (
    <>
      <div
        className="relative w-full h-full
     overflow-hidden"
      >
        <TransformWrapper
          initialScale={0.26}
          initialPositionX={40}
          initialPositionY={5}
          minScale={0.1}
          maxScale={3}
          wheel={{ step: 0.1 }}
          pinch={{ step: 0.1 }}
          doubleClick={{ disabled: true }}
          centerZoomedOut={false}
          centerOnInit={false}
          smooth={true}
          limitToBounds={false}
          panning={{
            disabled: toolMode !== TOOL_MODE_ENUM.HAND,
          }}
          onTransformed={(ref) => {
            setZoomPercent(Math.round(ref.state.scale * 100));
            setCurrentScale(ref.state.scale);
          }}
        >
          {({ zoomIn, zoomOut }) => (
            <>
              <div
                className={cn(
                  `absolute inset-0 w-full h-full bg-[#eee] dark:bg-[#101010] p-3`,
                  toolMode === TOOL_MODE_ENUM.HAND
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-default",
                )}
                style={{
                  backgroundImage:
                    "radial-gradient(circle, color-mix(in oklch, var(--primary) 30%, transparent) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              >
                {isProjectLoading && (
                  <div
                    className="absolute w-full h-full flex flex-col
                  gap-1.5 items-center justify-center"
                  >
                    <Spinner className="w-15 h-15 stroke-1" />
                    <span className="text-sm font-medium">
                      Preparing workspace
                    </span>
                  </div>
                )}

                <TransformComponent
                  wrapperStyle={{
                    width: "100%",
                    height: "100%",
                    overflow: "unset",
                  }}
                  contentStyle={{
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <div>Page Frames</div>
                </TransformComponent>
              </div>
              <CanvasControls
                zoomIn={zoomIn}
                zoomOut={zoomOut}
                zoomPercent={zoomPercent}
                toolMode={toolMode}
                setToolMode={setToolMode}
              />
            </>
          )}
        </TransformWrapper>
      </div>
    </>
  );
};

export default Canvas;
