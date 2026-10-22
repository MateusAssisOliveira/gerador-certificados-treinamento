'use client';

import React, { useState } from 'react';
import { X, Eye, FileDown, UserCheck } from 'lucide-react';
import { CertificateTemplate } from '@/types/certificate';
import { MOCK_PARTICIPANTS } from '@/lib/constants/variables';
import { generateCertificatePdfBytes, downloadPdfBlob } from '@/lib/pdf/pdfExport';

interface LivePreviewModalProps {
  template: CertificateTemplate | null;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  customParticipantData?: Record<string, string>;
  customTitle?: string;
}

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  template,
  onClose,
  onToast,
  customParticipantData,
}) => {
  const [previewMode, setPreviewMode] = useState<'tags' | 'simulated'>('simulated');
  const [selectedMockIndex, setSelectedMockIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  if (!template) return null;

  const activeParticipantData = customParticipantData || MOCK_PARTICIPANTS[selectedMockIndex].data;
  const isLandscape = template.orientation === 'landscape';
  const widthMm = isLandscape ? 297 : 210;
  const heightMm = isLandscape ? 210 : 297;

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const data = previewMode === 'simulated' ? activeParticipantData : {};
      const pdfBytes = await generateCertificatePdfBytes(template, data);
      const filename = `${template.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_previa.pdf`;
      downloadPdfBlob(pdfBytes, filename);
      onToast('PDF em alta resolução baixado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      onToast('Erro ao renderizar PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const substitute = (text: string) => {
    if (previewMode === 'tags') return text;
    let out = text;
    for (const [key, val] of Object.entries(activeParticipantData)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      out = out.replace(regex, val);
    }
    return out;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-5xl max-h-[95vh] rounded-2xl glass-dropdown border border-white/10 flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pré-visualização Realista
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  A4 {isLandscape ? 'Paisagem (297×210mm)' : 'Retrato (210×297mm)'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 line-clamp-1">{template.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExporting ? 'Renderizando...' : 'Baixar PDF Real'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="px-6 py-3 border-b border-white/5 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Modo de Exibição:</span>
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-white/10">
              <button
                onClick={() => setPreviewMode('tags')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  previewMode === 'tags'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tags (Ex: {'{{nome}}'})
              </button>
              <button
                onClick={() => setPreviewMode('simulated')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  previewMode === 'simulated'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Preenchido com Dados Reais
              </button>
            </div>
          </div>

          {/* Participant Selector */}
          {previewMode === 'simulated' && (
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400 font-medium">Aluno Simulado:</span>
              <select
                value={selectedMockIndex}
                onChange={(e) => setSelectedMockIndex(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {MOCK_PARTICIPANTS.map((mock, idx) => (
                  <option key={mock.id} value={idx}>
                    {mock.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Certificate Rendering Stage */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-950/90 flex items-center justify-center">
          <div
            className="certificate-paper-shadow relative rounded-sm transition-all duration-300 overflow-hidden"
            style={{
              width: isLandscape ? '100%' : '70%',
              maxWidth: isLandscape ? '820px' : '580px',
              aspectRatio: `${widthMm} / ${heightMm}`,
              backgroundColor: template.background.color || '#FFFFFF',
            }}
          >
            {/* Background Image/Overlay */}
            {template.background.imageUrl && (
              <img
                src={template.background.imageUrl}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ opacity: template.background.opacity || 1 }}
              />
            )}

            {/* Elements */}
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
                      borderWidth: `${el.border?.borderWidth || 1}px`,
                      borderColor: el.border?.borderColor || '#B8860B',
                      borderStyle: el.border?.borderStyle || 'solid',
                      borderRadius: `${el.border?.borderRadius || 0}px`,
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
                      height: `${el.border?.borderWidth || 1}px`,
                      backgroundColor: el.border?.borderColor || '#94A3B8',
                    }}
                  />
                );
              }

              if (el.type === 'variable' || el.type === 'text') {
                const rawContent = el.content || (el.variableTag ? `{{${el.variableTag}}}` : '');
                const text = substitute(rawContent);
                const isVar = el.type === 'variable';

                return (
                  <div
                    key={el.id}
                    className={`absolute flex items-center overflow-hidden pointer-events-none ${
                      isVar && previewMode === 'tags' ? 'bg-amber-400/20 rounded ring-1 ring-amber-400/50' : ''
                    }`}
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
                      style={{
                        fontFamily: el.style?.fontFamily || 'Inter',
                        fontSize: `clamp(9px, ${(el.style?.fontSize || 12) * 0.9}px, 28px)`,
                        fontWeight: el.style?.fontWeight || '400',
                        color: el.style?.color || '#1E293B',
                        textAlign: el.style?.textAlign || 'left',
                        lineHeight: el.style?.lineHeight || 1.3,
                        letterSpacing: `${el.style?.letterSpacing || 0}px`,
                        fontStyle: el.style?.fontStyle || 'normal',
                        textTransform: el.style?.textTransform || 'none',
                        wordBreak: 'break-word',
                        whiteSpace: el.style?.maxLines === 1 ? 'nowrap' : 'normal',
                      }}
                    >
                      {text}
                    </span>
                  </div>
                );
              }

              if (el.type === 'qrcode') {
                return (
                  <div
                    key={el.id}
                    className="absolute flex items-center justify-center bg-white border border-slate-300 p-1 rounded-sm shadow-sm"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                  >
                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white">
                      <span className="text-[7px] font-bold tracking-tighter">QR VERIFY</span>
                      <span className="text-[5px] text-slate-300">CERT-2026</span>
                    </div>
                  </div>
                );
              }

              if (el.type === 'image' && el.imageUrl) {
                return (
                  <img
                    key={el.id}
                    src={el.imageUrl}
                    alt={el.name}
                    className="absolute object-contain pointer-events-none"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                  />
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* Modal Footer Tip */}
        <div className="px-6 py-2.5 border-t border-white/5 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Esta pré-visualização simula as dimensões e quebras de linha exatas que serão gravadas no PDF final.</span>
          <span className="text-amber-400">Motor de PDF Vetorial Ativo</span>
        </div>
      </div>
    </div>
  );
};
