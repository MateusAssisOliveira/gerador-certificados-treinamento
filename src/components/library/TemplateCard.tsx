'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Edit3,
  Eye,
  MoreVertical,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  FileDown,
  Download,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { CertificateTemplate } from '@/types/certificate';
import { TemplateThumbnail } from './TemplateThumbnail';
import { generateCertificatePdfBytes, downloadPdfBlob } from '@/lib/pdf/pdfExport';
import { MOCK_PARTICIPANTS } from '@/lib/constants/variables';

interface TemplateCardProps {
  template: CertificateTemplate;
  onPreview: (template: CertificateTemplate) => void;
  onDuplicate: (template: CertificateTemplate) => void;
  onToggleArchive: (template: CertificateTemplate) => void;
  onDelete: (template: CertificateTemplate) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onDuplicate,
  onToggleArchive,
  onDelete,
  onToast,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const formattedDate = new Date(template.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handleDownloadTestPdf = async () => {
    setIsExporting(true);
    setMenuOpen(false);
    try {
      const mockData = MOCK_PARTICIPANTS[0].data;
      const pdfBytes = await generateCertificatePdfBytes(template, mockData);
      const filename = `${template.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_teste.pdf`;
      downloadPdfBlob(pdfBytes, filename);
      onToast(`PDF de teste gerado com sucesso: ${filename}`, 'success');
    } catch (e) {
      console.error(e);
      onToast('Erro ao exportar PDF de teste', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = () => {
    setMenuOpen(false);
    const jsonStr = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo_${template.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast('Modelo exportado em formato JSON.', 'info');
  };

  return (
    <div className="group relative rounded-lg border border-slate-200 bg-white overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/80 hover:border-blue-300 flex flex-col">
      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/80 backdrop-blur-md text-amber-300 border border-blue-600/20 shadow-md">
          {template.category}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/80 text-slate-300 border border-white/10 uppercase">
            A4 {template.orientation === 'landscape' ? 'Paisagem' : 'Retrato'}
          </span>
          {template.isArchived && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/90 text-amber-300 border border-blue-600/40">
              Arquivado
            </span>
          )}
        </div>
      </div>

      {/* Thumbnail clickable area */}
      <div
        onClick={() => onPreview(template)}
        className="cursor-pointer p-3 pt-11 bg-slate-50 border-b border-white/5 relative overflow-hidden flex items-center justify-center min-h-[190px]"
      >
        <TemplateThumbnail template={template} />

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px]">
          <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-lg transform -translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
            <Eye className="w-3.5 h-3.5" />
            Visualizar Prévia
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
              {template.name}
            </h3>

            {/* Menu Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-white/10 transition-colors"
                title="Mais ações"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Menu Dropdown */}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-30 w-48 rounded-xl glass-dropdown p-1.5 text-xs text-slate-200 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onPreview(template);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      Prévia Realista
                    </button>
                    <Link
                      href={`/lotes`}
                      onClick={() => setMenuOpen(false)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-600/20 text-amber-300 flex items-center gap-2 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Gerar em Lote (Excel)
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDuplicate(template);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-600" />
                      Duplicar Modelo
                    </button>
                    <button
                      onClick={handleDownloadTestPdf}
                      disabled={isExporting}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                      Baixar PDF de Teste
                    </button>
                    <button
                      onClick={handleExportJson}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-400" />
                      Exportar JSON
                    </button>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleArchive(template);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                      {template.isArchived ? (
                        <>
                          <ArchiveRestore className="w-3.5 h-3.5 text-blue-600" />
                          Desarquivar
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 text-slate-400" />
                          Arquivar Modelo
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(template);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {template.description || 'Sem descrição cadastrada.'}
          </p>
        </div>

        {/* Footer info & CTA */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>{formattedDate}</span>
          </div>

          <Link
            href={`/editor?id=${template.id}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-blue-600 hover:text-slate-950 text-slate-800 transition-all duration-200 flex items-center gap-1.5 group-hover:border-blue-600/40 border border-white/10"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar no Studio
          </Link>
        </div>
      </div>
    </div>
  );
};
