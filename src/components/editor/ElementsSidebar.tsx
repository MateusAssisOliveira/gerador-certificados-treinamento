'use client';

import React, { useState } from 'react';
import {
  Type,
  Variable,
  Image as ImageIcon,
  Square,
  Layers,
  Palette,
  Upload,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  ChevronUp,
  ChevronDown,
  Award,
  PenTool,
} from 'lucide-react';
import { CanvasElement, CertificateTemplate } from '@/types/certificate';
import { DYNAMIC_VARIABLES } from '@/lib/constants/variables';
import { INITIAL_PRESETS } from '@/lib/constants/presets';

interface ElementsSidebarProps {
  onAddElement: (element: Partial<CanvasElement>) => void;
  elements: CanvasElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onReorderElement: (id: string, direction: 'up' | 'down') => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  backgroundImageUrl?: string;
  onBackgroundImageChange: (url?: string) => void;
  onLoadPreset: (preset: CertificateTemplate) => void;
}

export const ElementsSidebar: React.FC<ElementsSidebarProps> = ({
  onAddElement,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement: _onDuplicateElement,
  onReorderElement,
  backgroundColor,
  onBackgroundColorChange,
  backgroundImageUrl,
  onBackgroundImageChange,
  onLoadPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'elements' | 'layers' | 'background'>('elements');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onAddElement({
        type: 'image',
        name: file.name.substring(0, 20),
        widthMm: 45,
        heightMm: 25,
        imageUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onBackgroundImageChange(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <aside className="w-80 border-r border-white/10 glass-panel flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Sidebar Tabs */}
      <div className="flex items-center border-b border-white/10 p-1.5 bg-slate-950/60 text-xs">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'elements'
              ? 'bg-amber-400/15 text-amber-300 font-bold border border-amber-400/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Square className="w-3.5 h-3.5 text-amber-400" />
          <span>Elementos</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'layers'
              ? 'bg-amber-400/15 text-amber-300 font-bold border border-amber-400/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Camadas ({elements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('background')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'background'
              ? 'bg-amber-400/15 text-amber-300 font-bold border border-amber-400/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-emerald-400" />
          <span>Fundo</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'elements' && (
          <>
            {/* Text Blocks */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-400" />
                Textos & Títulos
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() =>
                    onAddElement({
                      type: 'text',
                      name: 'Título Principal',
                      content: 'CERTIFICADO',
                      widthMm: 200,
                      heightMm: 20,
                      style: {
                        fontFamily: 'Cinzel',
                        fontSize: 32,
                        fontWeight: '700',
                        color: '#0F172A',
                        textAlign: 'center',
                        lineHeight: 1.1,
                        letterSpacing: 4,
                      },
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/30 text-left transition-all"
                >
                  <p className="font-bold text-white">Título Cerimonial</p>
                  <p className="text-[10px] text-slate-400">Cinzel / Caixa alta</p>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      type: 'text',
                      name: 'Subtítulo',
                      content: 'DE CONCLUSÃO E PARTICIPAÇÃO',
                      widthMm: 180,
                      heightMm: 10,
                      style: {
                        fontFamily: 'Montserrat',
                        fontSize: 11,
                        fontWeight: '600',
                        color: '#B8860B',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        letterSpacing: 2,
                      },
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/30 text-left transition-all"
                >
                  <p className="font-bold text-white">Subtítulo</p>
                  <p className="text-[10px] text-slate-400">Elegante / Médio</p>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      type: 'text',
                      name: 'Corpo do Texto',
                      content:
                        'Certificamos que {{nome_colaborador}}, inscrito no CPF {{cpf}}, concluiu com pleno aproveitamento o curso de {{nome_curso}} com carga horária de {{carga_horaria}}.',
                      widthMm: 210,
                      heightMm: 30,
                      style: {
                        fontFamily: 'Inter',
                        fontSize: 11,
                        fontWeight: '400',
                        color: '#334155',
                        textAlign: 'center',
                        lineHeight: 1.6,
                        letterSpacing: 0,
                      },
                    })
                  }
                  className="col-span-2 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/30 text-left transition-all"
                >
                  <p className="font-bold text-white">Parágrafo com Variáveis</p>
                  <p className="text-[10px] text-slate-400">Texto corrido de certificação legal</p>
                </button>
              </div>
            </div>

            {/* Dynamic Variables */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Variable className="w-3.5 h-3.5 text-blue-400" />
                Campos Dinâmicos (Variáveis)
              </span>
              <p className="text-[11px] text-slate-400">
                Clique para inserir um campo variável que será substituído automaticamente:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DYNAMIC_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    onClick={() =>
                      onAddElement({
                        type: 'variable',
                        name: `Campo: ${v.label}`,
                        content: `{{${v.tag}}}`,
                        variableTag: v.tag,
                        widthMm: v.tag === 'nome_colaborador' ? 200 : 100,
                        heightMm: v.tag === 'nome_colaborador' ? 16 : 10,
                        style: {
                          fontFamily: v.tag === 'nome_colaborador' ? 'Cinzel' : 'Inter',
                          fontSize: v.tag === 'nome_colaborador' ? 22 : 12,
                          fontWeight: '700',
                          color: v.tag === 'nome_colaborador' ? '#1E3A8A' : '#1E293B',
                          textAlign: 'center',
                          lineHeight: 1.2,
                          letterSpacing: 0.5,
                          shrinkToFit: true,
                        },
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-400 text-[11px] text-blue-300 font-mono transition-all flex items-center gap-1.5"
                    title={v.description}
                  >
                    <span>{`{{${v.tag}}}`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Shapes, Borders & Frames */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                Molduras, Bordas & Assinaturas
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() =>
                    onAddElement({
                      type: 'frame',
                      name: 'Moldura Dupla Ouro',
                      widthMm: 270,
                      heightMm: 185,
                      zIndex: 1,
                      frameType: 'classic-double',
                      border: {
                        borderWidth: 2,
                        borderColor: '#B8860B',
                        borderStyle: 'double',
                        borderRadius: 4,
                      },
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/30 text-left transition-all"
                >
                  <p className="font-bold text-white">Moldura Dupla</p>
                  <p className="text-[10px] text-amber-400">Clássica Dourada</p>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      type: 'line',
                      name: 'Linha de Assinatura',
                      widthMm: 70,
                      heightMm: 1,
                      border: {
                        borderWidth: 1,
                        borderColor: '#94A3B8',
                        borderStyle: 'solid',
                      },
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/30 text-left transition-all"
                >
                  <p className="font-bold text-white">Linha Assinatura</p>
                  <p className="text-[10px] text-slate-400">Traço horizontal</p>
                </button>

                <button
                  onClick={() =>
                    onAddElement({
                      type: 'qrcode',
                      name: 'QR Code de Validação',
                      widthMm: 22,
                      heightMm: 22,
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/30 text-left transition-all"
                >
                  <p className="font-bold text-white">QR Code</p>
                  <p className="text-[10px] text-slate-400">Validação pública</p>
                </button>

                <label className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/30 text-left transition-all cursor-pointer flex flex-col justify-center">
                  <p className="font-bold text-white flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                    Enviar Logotipo
                  </p>
                  <p className="text-[10px] text-slate-400">PNG ou JPEG</p>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Camadas (Layers) */}
        {activeTab === 'layers' && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Camadas do Certificado</span>
              <span className="text-slate-500 font-normal">Topo para Fundo</span>
            </span>

            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {[...elements]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((el) => {
                  const isSelected = selectedElementId === el.id;
                  return (
                    <div
                      key={el.id}
                      onClick={() => onSelectElement(el.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400/15 border-amber-400/40 text-amber-200'
                          : 'bg-slate-900/80 border-white/5 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-slate-500">#{el.zIndex}</span>
                        <span className="truncate font-medium">{el.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onReorderElement(el.id, 'up')}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Mover para cima"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onReorderElement(el.id, 'down')}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onUpdateElement(el.id, { hidden: !el.hidden })}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title={el.hidden ? 'Mostrar' : 'Ocultar'}
                        >
                          {el.hidden ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onUpdateElement(el.id, { locked: !el.locked })}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title={el.locked ? 'Destravar' : 'Travar'}
                        >
                          {el.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onDeleteElement(el.id)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Excluir elemento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 3: Fundo & Importação */}
        {activeTab === 'background' && (
          <div className="space-y-6">
            {/* Color Swatches */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Cor de Fundo da Folha
              </span>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: 'Branco', color: '#FFFFFF' },
                  { name: 'Creme', color: '#FAFAF7' },
                  { name: 'Papiro', color: '#FCFBF7' },
                  { name: 'Pérola', color: '#F8FAFC' },
                  { name: 'Chumbo', color: '#0F172A' },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => onBackgroundColorChange(c.color)}
                    className={`h-9 rounded-xl border flex items-center justify-center transition-transform hover:scale-105 ${
                      backgroundColor === c.color ? 'ring-2 ring-amber-400 border-white' : 'border-white/10'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Background Overlay Upload */}
            <div className="space-y-2.5 pt-4 border-t border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                Importar Modelo Existente (Overlay)
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Envie o PDF ou Imagem do seu certificado para usá-lo como fundo imutável de alta fidelidade e desenhar as variáveis por cima.
              </p>

              {backgroundImageUrl ? (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden border border-amber-400/40 p-1 bg-slate-900">
                    <img src={backgroundImageUrl} alt="Background Overlay" className="w-full h-24 object-cover rounded-lg" />
                  </div>
                  <button
                    onClick={() => onBackgroundImageChange(undefined)}
                    className="w-full py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                  >
                    Remover Fundo Importado
                  </button>
                </div>
              ) : (
                <label className="p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-amber-400/40 bg-slate-900/60 hover:bg-slate-900 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
                  <Upload className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-semibold text-white">Carregar Imagem ou PDF</span>
                  <span className="text-[10px] text-slate-500">PNG, JPG ou WebP de alta resolução</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBackgroundUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Load Official Presets */}
            <div className="space-y-2.5 pt-4 border-t border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-blue-400" />
                Substituir por Modelo Pronto
              </span>
              <div className="space-y-1.5">
                {INITIAL_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (confirm(`Deseja carregar o modelo "${p.name}"? Os elementos atuais serão substituídos.`)) {
                        onLoadPreset(p);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-amber-400/30 text-left transition-all"
                  >
                    <p className="font-semibold text-white text-xs line-clamp-1">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.category}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
