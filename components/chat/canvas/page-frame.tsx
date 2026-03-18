import { ToolModeType } from '@/constants/canvas';
import { getHTMLWrapper } from '@/lib/page-wrapper';
import React, { useEffect, useRef, useState } from 'react'

type PropsType = {
  page: any
  initialPosition?: { x: number; y: number };
  scale?: number;
  toolMode: ToolModeType;
  selectedPageId: string | null;
  setSelectedPageId: (pageId: string | null) => void
  isDeleting: boolean;
  onDeletePage: (pageId: string) => void
}

const PageFrame = ({
  page,
  initialPosition = { x: 0, y: 0 },
  scale = 1,
  toolMode,
  selectedPageId,
  setSelectedPageId,
  isDeleting,
  onDeletePage
}: PropsType) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [size, setSize] = useState({ width: 1550, height: 900 });
    const [isHovered, setIsHovered] = useState(false);

    const fullHtml = getHTMLWrapper(page.htmlContent,
    page.name, page.rootStyles, page.id
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "FRAME_HEIGHT" && event.data.
        pageId === page.id) {
        setSize(prev => ({
          ...prev,
          height: event.data.height
        }))
      }
    }
  
  return (
    <div>PageFrame</div>
  )
}

export default PageFrame