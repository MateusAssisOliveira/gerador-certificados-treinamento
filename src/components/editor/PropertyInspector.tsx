'use client';

import React from 'react';
import {
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Copy,
  Trash2,
  Type,
  Variable,
  Maximize,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { CanvasElement, TextStyle, BorderStyle } from '@/types/certificate';
import { DYNAMIC_VARIABLES } from '@/lib/constants/variables';

interface PropertyInspectorProps {
  element: CanvasElement | null;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  pageWidthMm: number;
  pageHeightMm: number;
}

const FONT_FAMILIES = [
  { label: 'Cinzel (Clássico Cerimonial)', value: 'Cinzel' },
  { label: 'Playfair Display (Serifada Elegante)', value: 'Playfair Display' },
  { label: 'Montserrat (Corporativa / NRs)', value: 'Montserrat' },
  { label: 'Inter (Moderna Neutra)', value: 'Inter' },
  { label: 'Roboto (Acadêmica)', value: 'Roboto' },
];

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  element,
  onUpdate,
  onDuplicate,
  onDelete,
  pageWidthMm,
  pageHeightMm,
}) => {
  if (!element) {
    return (
      <aside className="w-80 border-l border-white/10 glass-panel flex flex-col h-[calc(100vh-3.5rem)] select-none p-6 text-center justify-center items-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 mb-3">
          <Sliders className="w-6 h-6" />
        </div>
        <h4 className="font-semibold text-sm text-slate-300">Nenhum elemento selecionado</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
          Clique em qualquer texto, logotipo ou moldura no certificado para ajustar propriedades e estilos.
        </p>
      </aside>
    );
  }

  const isTextOrVar = element.type === 'text' || element.type === 'variable';

  // Quick alignment helpers
  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    switch (type) {
      case 'left':
        onUpdate({ xMm: 15 });
        break;
      case 'center':
        onUpdate({ xMm: Math.round((pageWidthMm - element.widthMm) / 2) });
        break;
      case 'right':
        onUpdate({ xMm: Math.round(pageWidthMm - element.widthMm - 15) });
        break;
      case 'top':
        onUpdate({ yMm: 15 });
        break;
      case 'middle':
        onUpdate({ yMm: Math.round((pageHeightMm - element.heightMm) / 2) });
        break;
      case 'bottom':
        onUpdate({ yMm: Math.round(pageHeightMm - element.heightMm - 15) });
        break;
    }
  };

  return (
    <aside className="w-80 border-l border-white/10 glass-panel flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
            {element.type}
          </span>
          <input
            type="text"
            value={element.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="bg-transparent hover:bg-white/5 focus:bg-slate-900 px-1.5 py-0.5 rounded text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-amber-400 truncate max-w-[150px]"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicate(element.id)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Duplicar (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(element.id)}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            title="Excluir (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Quick Align to Sheet */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Alinhamento Rápido na Folha
          </span>
          <div className="grid grid-cols-6 gap-1 p-1 rounded-xl bg-slate-950 border border-white/10 text-slate-300">
            <button
              onClick={() => handleAlign('left')}
              className="p-1.5 rounded hover:bg-white/10 flex items-center justify-center"
              title="Alinhar à Esquerda da Folha"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlign('center')}
              className="p-1.5 rounded hover:bg-white/10 flex items-center justify-center font-bold"
              title="Centralizar Horizontalmente"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlign('right')}
              className="p-1.5 rounded hover:bg-white/10 flex items-center justify-center"
              title="Alinhar à Direita da Folha"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlign('top')}
              className="p-1.5 rounded hover:bg-white/10 flex items-center justify-center"
              title="Alinhar ao Topo"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlign('middle')}
              className="p-1.5 rounded hover:bg-white/10 flex items-center justify-center"
              title="Centralizar Verticalmente"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAlign('bottom')}
              className="p-1.5 rounded hover:bg-white/10 flex items-center justify-center"
              title="Alinhar à Base"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Position & Dimensions (mm) */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Posição & Dimensões (mm)
          </span>
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Posição X (mm)</label>
              <input
                type="number"
                value={Math.round(element.xMm)}
                onChange={(e) => onUpdate({ xMm: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Posição Y (mm)</label>
              <input
                type="number"
                value={Math.round(element.yMm)}
                onChange={(e) => onUpdate({ yMm: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Largura W (mm)</label>
              <input
                type="number"
                value={Math.round(element.widthMm)}
                onChange={(e) => onUpdate({ widthMm: Math.max(5, Number(e.target.value)) })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Altura H (mm)</label>
              <input
                type="number"
                value={Math.round(element.heightMm)}
                onChange={(e) => onUpdate({ heightMm: Math.max(1, Number(e.target.value)) })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Variable Selection if type === 'variable' */}
        {element.type === 'variable' && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Variable className="w-3.5 h-3.5" />
              Tag da Variável Dinâmica
            </span>
            <select
              value={element.variableTag || ''}
              onChange={(e) => {
                const tag = e.target.value;
                onUpdate({
                  variableTag: tag,
                  content: `{{${tag}}}`,
                  name: `Campo: ${tag}`,
                });
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-blue-500/30 text-blue-200 font-mono text-xs focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              {DYNAMIC_VARIABLES.map((v) => (
                <option key={v.tag} value={v.tag}>
                  {`{{${v.tag}}}`} — {v.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Text Content if type === 'text' */}
        {element.type === 'text' && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-400" />
              Conteúdo do Texto
            </span>
            <textarea
              value={element.content || ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
              placeholder="Digite o texto ou insira tags..."
            />
          </div>
        )}

        {/* Typography Controls */}
        {isTextOrVar && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Estilo de Tipografia
            </span>

            {/* Font Family */}
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Família da Fonte</label>
              <select
                value={element.style?.fontFamily || 'Inter'}
                onChange={(e) =>
                  onUpdate({
                    style: { ...element.style!, fontFamily: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Tamanho ({element.style?.fontSize || 12} pt)</label>
                <input
                  type="number"
                  min={6}
                  max={72}
                  value={element.style?.fontSize || 12}
                  onChange={(e) =>
                    onUpdate({
                      style: { ...element.style!, fontSize: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Peso (Weight)</label>
                <select
                  value={element.style?.fontWeight || '400'}
                  onChange={(e) =>
                    onUpdate({
                      style: { ...element.style!, fontWeight: e.target.value as TextStyle['fontWeight'] },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="300">300 - Leve</option>
                  <option value="400">400 - Normal</option>
                  <option value="500">500 - Médio</option>
                  <option value="600">600 - Semi-Bold</option>
                  <option value="700">700 - Negrito</option>
                  <option value="800">800 - Extra-Bold</option>
                </select>
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Cor do Texto</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={element.style?.color || '#0F172A'}
                  onChange={(e) =>
                    onUpdate({
                      style: { ...element.style!, color: e.target.value },
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                />
                <input
                  type="text"
                  value={element.style?.color || '#0F172A'}
                  onChange={(e) =>
                    onUpdate({
                      style: { ...element.style!, color: e.target.value },
                    })
                  }
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono text-xs uppercase"
                />
              </div>
            </div>

            {/* Text Align */}
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Alinhamento do Texto</label>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950 border border-white/10">
                {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() =>
                      onUpdate({
                        style: { ...element.style!, textAlign: align },
                      })
                    }
                    className={`py-1 rounded flex items-center justify-center transition-colors ${
                      element.style?.textAlign === align
                        ? 'bg-amber-400/20 text-amber-300 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                    {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                    {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                    {align === 'justify' && <AlignJustify className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Shrink-to-fit toggle */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-white">Auto-Ajuste (Shrink-to-fit)</p>
                <p className="text-[10px] text-slate-400">Reduz tamanho para nomes muito longos</p>
              </div>
              <input
                type="checkbox"
                checked={element.style?.shrinkToFit ?? true}
                onChange={(e) =>
                  onUpdate({
                    style: { ...element.style!, shrinkToFit: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-amber-400 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Frame & Border Controls */}
        {(element.type === 'frame' || element.type === 'line' || element.border) && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Estilo da Borda / Moldura
            </span>

            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Cor da Moldura</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={element.border?.borderColor || '#B8860B'}
                  onChange={(e) =>
                    onUpdate({
                      border: {
                        borderColor: e.target.value,
                        borderWidth: element.border?.borderWidth || 1,
                        borderStyle: element.border?.borderStyle || 'solid',
                        borderRadius: element.border?.borderRadius || 0,
                      },
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                />
                <input
                  type="text"
                  value={element.border?.borderColor || '#B8860B'}
                  onChange={(e) =>
                    onUpdate({
                      border: {
                        borderColor: e.target.value,
                        borderWidth: element.border?.borderWidth || 1,
                        borderStyle: element.border?.borderStyle || 'solid',
                        borderRadius: element.border?.borderRadius || 0,
                      },
                    })
                  }
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Espessura (pt)</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={element.border?.borderWidth || 1}
                  onChange={(e) =>
                    onUpdate({
                      border: {
                        borderColor: element.border?.borderColor || '#B8860B',
                        borderWidth: Number(e.target.value),
                        borderStyle: element.border?.borderStyle || 'solid',
                        borderRadius: element.border?.borderRadius || 0,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Estilo</label>
                <select
                  value={element.border?.borderStyle || 'solid'}
                  onChange={(e) =>
                    onUpdate({
                      border: {
                        borderColor: element.border?.borderColor || '#B8860B',
                        borderWidth: element.border?.borderWidth || 1,
                        borderStyle: e.target.value as BorderStyle['borderStyle'],
                        borderRadius: element.border?.borderRadius || 0,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs"
                >
                  <option value="solid">Sólida</option>
                  <option value="double">Dupla</option>
                  <option value="dashed">Tracejada</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
