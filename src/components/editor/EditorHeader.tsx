'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  FileDown,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  RotateCw,
} from 'lucide-react';
import { Orientation } from '@/types/certificate';

interface EditorHeaderProps {
  templateName: string;
  onNameChange: (name: string) => void;
  category: string;
  onCategoryChange: (cat: string) => void;
  orientation: Orientation;
  onOrientationChange: (orientation: Orientation) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDirty: boolean;
  onSave: () => void;
  onPreview: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  templateName,
  onNameChange,
  category,
  onCategoryChange,
  orientation,
  onOrientationChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDirty,
  onSave,
  onPreview,
  onExportPdf,
  isExporting,
}) => {
  return (
    <header className="h-14 border-b border-white/10 glass-panel px-4 flex items-center justify-between gap-4 z-30 select-none">
      {/* Left: Back & Template Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Voltar para Biblioteca de Modelos"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            className="bg-transparent hover:bg-white/5 focus:bg-slate-950 px-2 py-1 rounded-lg text-sm font-bold text-white border border-transparent focus:border-amber-400 focus:outline-none transition-all truncate max-w-[240px] sm:max-w-xs"
            placeholder="Nome do Modelo..."
          />

          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="hidden sm:block text-xs bg-slate-900 border border-white/10 text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-400"
          >
            <option value="Segurança do Trabalho (NRs)">Segurança do Trabalho (NRs)</option>
            <option value="Corporativo & Liderança">Corporativo & Liderança</option>
            <option value="Acadêmico & Homenagens">Acadêmico & Homenagens</option>
            <option value="Tecnologia & Inovação">Tecnologia & Inovação</option>
            <option value="Geral">Geral</option>
          </select>
        </div>
      </div>

      {/* Middle: Undo/Redo, Orientation & Zoom Controls */}
      <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-white/10 text-xs">
        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Orientation Toggle */}
        <button
          onClick={() => onOrientationChange(orientation === 'landscape' ? 'portrait' : 'landscape')}
          className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-slate-300 font-medium flex items-center gap-1.5 transition-colors"
          title="Alternar Orientação A4"
        >
          <RotateCw className="w-3.5 h-3.5 text-amber-400" />
          <span>A4 {orientation === 'landscape' ? 'Paisagem' : 'Retrato'}</span>
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Zoom */}
        <button
          onClick={onZoomOut}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Diminuir Zoom"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="w-12 text-center font-mono font-medium text-slate-300 text-[11px]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Aumentar Zoom"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onZoomFit}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Ajustar à Tela"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Preview, Export & Save */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPreview}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Prévia Real</span>
        </button>

        <button
          onClick={onExportPdf}
          disabled={isExporting}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Baixar PDF de teste com motor vetorial"
        >
          <FileDown className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'Baixar PDF'}</span>
        </button>

        <button
          onClick={onSave}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
            isDirty
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/25 ring-2 ring-amber-400/50'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {isDirty ? (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Salvo</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
