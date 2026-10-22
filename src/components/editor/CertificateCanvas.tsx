'use client';

import React, { useRef, useState, useEffect } from 'react';
import { CanvasElement, Orientation } from '@/types/certificate';

interface CertificateCanvasProps {
  orientation: Orientation;
  backgroundColor: string;
  backgroundImageUrl?: string;
  elements: CanvasElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  zoom: number;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const CertificateCanvas: React.FC<CertificateCanvasProps> = ({
  orientation,
  backgroundColor,
  backgroundImageUrl,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  zoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const isLandscape = orientation === 'landscape';
  const widthMm = isLandscape ? 297 : 210;
  const heightMm = isLandscape ? 210 : 297;

  // 1 mm in baseline screen pixels at 100% zoom (approximately 3.78 px per mm for standard 96 DPI screen)
  const PX_PER_MM = 3.6;

  const canvasWidthPx = widthMm * PX_PER_MM;
  const canvasHeightPx = heightMm * PX_PER_MM;

  // Dragging & Resizing state
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState<{ xMm: number; yMm: number; wMm: number; hMm: number }>({
    xMm: 0,
    yMm: 0,
    wMm: 0,
    hMm: 0,
  });

  // Magnetic Snap Guides
  const [snapX, setSnapX] = useState<number | null>(null);
  const [snapY, setSnapY] = useState<number | null>(null);

  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (!selectedElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteElement(selectedElement.id);
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onDuplicateElement(selectedElement.id);
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        onUpdateElement(selectedElement.id, {
          xMm: Math.max(0, Math.min(widthMm - selectedElement.widthMm, selectedElement.xMm + dx)),
          yMm: Math.max(0, Math.min(heightMm - selectedElement.heightMm, selectedElement.yMm + dy)),
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, widthMm, heightMm, onDeleteElement, onDuplicateElement, onUpdateElement]);

  // Mouse Move & Mouse Up handlers for smooth dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !activeHandle) return;
      if (!selectedElement) return;

      const deltaScreenX = e.clientX - dragStart.x;
      const deltaScreenY = e.clientY - dragStart.y;

      // Convert screen pixel delta to millimeter delta accounting for zoom
      const deltaMmX = deltaScreenX / (PX_PER_MM * zoom);
      const deltaMmY = deltaScreenY / (PX_PER_MM * zoom);

      if (isDragging) {
        let newX = elementStart.xMm + deltaMmX;
        let newY = elementStart.yMm + deltaMmY;

        // Snap to center
        const centerX = widthMm / 2;
        const centerY = heightMm / 2;
        const elementCenterX = newX + selectedElement.widthMm / 2;
        const elementCenterY = newY + selectedElement.heightMm / 2;

        const SNAP_THRESHOLD_MM = 2.5;

        if (Math.abs(elementCenterX - centerX) < SNAP_THRESHOLD_MM) {
          newX = centerX - selectedElement.widthMm / 2;
          setSnapX(centerX);
        } else {
          setSnapX(null);
        }

        if (Math.abs(elementCenterY - centerY) < SNAP_THRESHOLD_MM) {
          newY = centerY - selectedElement.heightMm / 2;
          setSnapY(centerY);
        } else {
          setSnapY(null);
        }

        onUpdateElement(selectedElement.id, {
          xMm: Math.round(newX * 10) / 10,
          yMm: Math.round(newY * 10) / 10,
        });
      } else if (activeHandle) {
        // Resizing logic
        let newX = elementStart.xMm;
        let newY = elementStart.yMm;
        let newW = elementStart.wMm;
        let newH = elementStart.hMm;

        if (activeHandle.includes('e')) {
          newW = Math.max(5, elementStart.wMm + deltaMmX);
        }
        if (activeHandle.includes('s')) {
          newH = Math.max(2, elementStart.hMm + deltaMmY);
        }
        if (activeHandle.includes('w')) {
          const possibleW = elementStart.wMm - deltaMmX;
          if (possibleW >= 5) {
            newW = possibleW;
            newX = elementStart.xMm + deltaMmX;
          }
        }
        if (activeHandle.includes('n')) {
          const possibleH = elementStart.hMm - deltaMmY;
          if (possibleH >= 2) {
            newH = possibleH;
            newY = elementStart.yMm + deltaMmY;
          }
        }

        onUpdateElement(selectedElement.id, {
          xMm: Math.round(newX * 10) / 10,
          yMm: Math.round(newY * 10) / 10,
          widthMm: Math.round(newW * 10) / 10,
          heightMm: Math.round(newH * 10) / 10,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveHandle(null);
      setSnapX(null);
      setSnapY(null);
    };

    if (isDragging || activeHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeHandle, dragStart, elementStart, selectedElement, zoom, widthMm, heightMm, onUpdateElement]);

  const handleElementMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    if (el.locked) {
      onSelectElement(el.id);
      return;
    }

    onSelectElement(el.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ xMm: el.xMm, yMm: el.yMm, wMm: el.widthMm, hMm: el.heightMm });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    if (!selectedElement || selectedElement.locked) return;

    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({
      xMm: selectedElement.xMm,
      yMm: selectedElement.yMm,
      wMm: selectedElement.widthMm,
      hMm: selectedElement.heightMm,
    });
  };

  return (
    <div
      ref={containerRef}
      onClick={() => onSelectElement(null)}
      className="flex-1 h-[calc(100vh-3.5rem)] overflow-auto studio-canvas-bg flex items-center justify-center p-8 select-none relative"
    >
      {/* Scaled Certificate Paper */}
      <div
        className="relative certificate-paper-shadow rounded-sm transition-transform duration-75 origin-center"
        style={{
          width: `${canvasWidthPx}px`,
          height: `${canvasHeightPx}px`,
          transform: `scale(${zoom})`,
          backgroundColor: backgroundColor || '#FFFFFF',
        }}
      >
        {/* Background Image / Overlay if present */}
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt="Background Overlay"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
        )}

        {/* Safety Margin Guide (15mm) */}
        <div
          className="absolute inset-0 border border-dashed border-slate-300/40 pointer-events-none"
          style={{
            margin: `${12 * PX_PER_MM}px`,
          }}
        />

        {/* Snap-to-center Guide Lines */}
        {snapX !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-50 pointer-events-none shadow-[0_0_8px_#f59e0b]"
            style={{ left: `${snapX * PX_PER_MM}px` }}
          />
        )}
        {snapY !== null && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-amber-400 z-50 pointer-events-none shadow-[0_0_8px_#f59e0b]"
            style={{ top: `${snapY * PX_PER_MM}px` }}
          />
        )}

        {/* Render Elements */}
        {elements.map((el) => {
          if (el.hidden) return null;

          const isSelected = selectedElementId === el.id;
          const leftPx = el.xMm * PX_PER_MM;
          const topPx = el.yMm * PX_PER_MM;
          const widthPx = el.widthMm * PX_PER_MM;
          const heightPx = el.heightMm * PX_PER_MM;

          return (
            <div
              key={el.id}
              onMouseDown={(e) => handleElementMouseDown(e, el)}
              className={`absolute group cursor-move select-none transition-shadow ${
                isSelected
                  ? 'ring-2 ring-amber-400 shadow-xl shadow-amber-400/20 z-40'
                  : 'hover:ring-1 hover:ring-amber-400/50'
              }`}
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${widthPx}px`,
                height: `${heightPx}px`,
                zIndex: isSelected ? 40 : el.zIndex,
              }}
            >
              {/* Element Content based on Type */}
              {el.type === 'frame' && (
                <div
                  className="w-full h-full pointer-events-none"
                  style={{
                    borderWidth: `${el.border?.borderWidth || 1}px`,
                    borderColor: el.border?.borderColor || '#B8860B',
                    borderStyle: el.border?.borderStyle || 'solid',
                    borderRadius: `${el.border?.borderRadius || 0}px`,
                    backgroundColor: el.border?.borderWidth === 0 ? el.border.borderColor : 'transparent',
                  }}
                >
                  {el.frameType === 'classic-double' && (
                    <div
                      className="w-full h-full p-1"
                      style={{
                        borderWidth: '1px',
                        borderColor: el.border?.borderColor || '#B8860B',
                        borderStyle: 'solid',
                      }}
                    />
                  )}
                </div>
              )}

              {el.type === 'line' && (
                <div
                  className="w-full pointer-events-none"
                  style={{
                    height: `${el.border?.borderWidth || 1}px`,
                    backgroundColor: el.border?.borderColor || '#94A3B8',
                    marginTop: `${heightPx / 2}px`,
                  }}
                />
              )}

              {(el.type === 'text' || el.type === 'variable') && (
                <div
                  className={`w-full h-full flex items-center overflow-hidden pointer-events-none ${
                    el.type === 'variable' ? 'bg-amber-400/10 rounded px-1' : ''
                  }`}
                  style={{
                    justifyContent:
                      el.style?.textAlign === 'center'
                        ? 'center'
                        : el.style?.textAlign === 'right'
                        ? 'flex-end'
                        : 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontFamily: el.style?.fontFamily || 'Inter',
                      fontSize: `${(el.style?.fontSize || 12) * 1.33}px`,
                      fontWeight: el.style?.fontWeight || '400',
                      color: el.style?.color || '#0F172A',
                      textAlign: el.style?.textAlign || 'left',
                      lineHeight: el.style?.lineHeight || 1.3,
                      letterSpacing: `${el.style?.letterSpacing || 0}px`,
                      fontStyle: el.style?.fontStyle || 'normal',
                      textTransform: el.style?.textTransform || 'none',
                      wordBreak: 'break-word',
                      whiteSpace: el.style?.maxLines === 1 ? 'nowrap' : 'normal',
                    }}
                  >
                    {el.content || (el.variableTag ? `{{${el.variableTag}}}` : '')}
                  </span>
                </div>
              )}

              {el.type === 'qrcode' && (
                <div className="w-full h-full bg-white border border-slate-300 p-1 flex items-center justify-center rounded shadow-sm pointer-events-none">
                  <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white">
                    <span className="text-[9px] font-bold">QR CODE</span>
                    <span className="text-[6px] text-slate-400">VALIDAÇÃO</span>
                  </div>
                </div>
              )}

              {el.type === 'image' && el.imageUrl && (
                <img
                  src={el.imageUrl}
                  alt={el.name}
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}

              {/* 8 Resize Handles on Selected Element */}
              {isSelected && !el.locked && (
                <>
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize z-50 shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-ns-resize z-50 shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize z-50 shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
                    className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-ew-resize z-50 shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize z-50 shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, 's')}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-ns-resize z-50 shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize z-50 shadow-sm"
                  />
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
                    className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-ew-resize z-50 shadow-sm"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
