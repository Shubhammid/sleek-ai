import { TOOL_MODE_ENUM, ToolModeType } from "@/constants/canvas";
import { Rnd } from "react-rnd";
import { getHTMLWrapper } from "@/lib/page-wrapper";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type PropsType = {
  page: any;
  initialPosition?: { x: number; y: number };
  scale?: number;
  toolMode: ToolModeType;
  selectedPageId: string | null;
  setSelectedPageId: (pageId: string | null) => void;
  isDeleting: boolean;
  onDeletePage: (pageId: string) => void;
};

const PageFrame = ({
  page,
  initialPosition = { x: 0, y: 0 },
  scale = 1,
  toolMode,
  selectedPageId,
  setSelectedPageId,
  isDeleting,
  onDeletePage,
}: PropsType) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [size, setSize] = useState({ width: 1550, height: 900 });
  const [isHovered, setIsHovered] = useState(false);

  const fullHtml = getHTMLWrapper(
    page.htmlContent,
    page.name,
    page.rootStyles,
    page.id,
  );

  const isSelected = selectedPageId === page.id;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "FRAME_HEIGHT" && event.data.pageId === page.id) {
        setSize((prev) => ({
          ...prev,
          height: event.data.height,
        }));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [page.id]);

  return (
    <>
      <Rnd
        default={{
          x: initialPosition.x,
          y: initialPosition.y,
          width: size.width,
          height: size.height,
        }}
        size={{ width: size.width, height: size.height }}
        minWidth={320}
        minHeight={900}
        scale={scale}
        disableDragging={toolMode === TOOL_MODE_ENUM.HAND}
        enableResizing={
          (isSelected || isHovered) && toolMode !== TOOL_MODE_ENUM.HAND
        }
        onResize={(e, direction, ref) => {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
        }}
        onClick={(e: any) => {
          e.stopPropagation();
          if (page.isLoading) return;
          if (toolMode === TOOL_MODE_ENUM.SELECT) {
            setSelectedPageId(page.id);
          }
        }}
        resizeHandleComponent={{
          topLeft: isSelected || isHovered ? <Handle /> : undefined,
          topRight: isSelected || isHovered ? <Handle /> : undefined,
          bottomLeft: isSelected || isHovered ? <Handle /> : undefined,
          bottomRight: isSelected || isHovered ? <Handle /> : undefined,
        }}

        className={cn(
          "relative z-30",
          (isSelected || isHovered) && toolMode !== TOOL_MODE_ENUM.HAND
          && "ring-4 ring-blue-500 ring-offset-1",
          toolMode === TOOL_MODE_ENUM.HAND ? `cursor-grab!
          active:cursor-grabbing!` : `cursor-move`
        )}

      >

      </Rnd>
    </>
  );
};

const Handle = () => (
  <div
    className="z-30 h-6 w-6 bg-white border-2
     border-blue-500 shadow-sm"
  />
);

export default PageFrame;
