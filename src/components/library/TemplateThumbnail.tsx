'use client';

import React from 'react';
import { CertificateTemplate } from '@/types/certificate';

interface TemplateThumbnailProps {
  template: CertificateTemplate;
  className?: string;
}

export const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({ template, className = '' }) => {
  const isLandscape = template.orientation === 'landscape';
  const widthMm = isLandscape ? 297 : 210;
  const heightMm = isLandscape ? 210 : 297;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-slate-700/60 transition-transform duration-300 group-hover:scale-[1.01] ${className}`}
      style={{
        aspectRatio: `${widthMm} / ${heightMm}`,
        backgroundColor: template.background.color || '#FFFFFF',
      }}
    >
      {/* Background Image if present */}
      {template.background.imageUrl && (
        <img
          src={template.background.imageUrl}
          alt="Template Background"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: template.background.opacity || 1 }}
        />
      )}

      {/* Render elements proportionally in miniature */}
      {template.elements.map((el) => {
        if (el.hidden) return null;

        const leftPct = (el.xMm / widthMm) * 100;
        const topPct = (el.yMm / heightMm) * 100;
        const widthPct = (el.widthMm / widthMm) * 100;
        const heightPct = (el.heightMm / heightMm) * 100;

        if (el.type === 'frame') {
          return (
            <div
              key={el.id}
              className="absolute pointer-events-none"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                borderWidth: el.border?.borderWidth ? '1px' : 0,
                borderColor: el.border?.borderColor || '#B8860B',
                borderStyle: el.border?.borderStyle || 'solid',
                borderRadius: el.border?.borderRadius ? '2px' : 0,
                backgroundColor: el.border?.borderWidth === 0 ? el.border.borderColor : 'transparent',
              }}
            />
          );
        }

        if (el.type === 'line') {
          return (
            <div
              key={el.id}
              className="absolute pointer-events-none"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: '1px',
                backgroundColor: el.border?.borderColor || '#94A3B8',
              }}
            />
          );
        }

        if (el.type === 'variable') {
          return (
            <div
              key={el.id}
              className="absolute pointer-events-none flex items-center justify-center overflow-hidden"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
            >
              <div
                className="w-full text-center truncate font-bold text-blue-800"
                style={{
                  fontSize: '9px',
                  lineHeight: 1,
                  fontFamily: el.style?.fontFamily || 'Inter',
                  color: el.style?.color || '#1E3A8A',
                }}
              >
                {el.content || '{{nome_colaborador}}'}
              </div>
            </div>
          );
        }

        if (el.type === 'text') {
          return (
            <div
              key={el.id}
              className="absolute pointer-events-none flex items-center overflow-hidden"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                justifyContent:
                  el.style?.textAlign === 'center'
                    ? 'center'
                    : el.style?.textAlign === 'right'
                    ? 'flex-end'
                    : 'flex-start',
              }}
            >
              <span
                className="truncate font-semibold"
                style={{
                  fontSize: Math.max(5, (el.style?.fontSize || 12) * 0.32) + 'px',
                  lineHeight: 1,
                  fontFamily: el.style?.fontFamily || 'Inter',
                  color: el.style?.color || '#334155',
                  textAlign: el.style?.textAlign || 'left',
                }}
              >
                {el.content}
              </span>
            </div>
          );
        }

        if (el.type === 'qrcode') {
          return (
            <div
              key={el.id}
              className="absolute pointer-events-none bg-slate-900/40 border border-slate-700 flex items-center justify-center text-[5px] text-white"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
            >
              QR
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
