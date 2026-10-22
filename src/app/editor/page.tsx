'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { ElementsSidebar } from '@/components/editor/ElementsSidebar';
import { CertificateCanvas } from '@/components/editor/CertificateCanvas';
import { PropertyInspector } from '@/components/editor/PropertyInspector';
import { LivePreviewModal } from '@/components/library/LivePreviewModal';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import { CertificateTemplate, CanvasElement, Orientation } from '@/types/certificate';
import { TemplateStorage } from '@/lib/storage/templateStorage';
import { INITIAL_PRESETS } from '@/lib/constants/presets';
import { generateCertificatePdfBytes, downloadPdfBlob } from '@/lib/pdf/pdfExport';
import { MOCK_PARTICIPANTS } from '@/lib/constants/variables';

function CertificateStudioInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get('id');

  // Active Template State
  const [template, setTemplate] = useState<CertificateTemplate>(() => {
    if (templateId) {
      const found = TemplateStorage.getById(templateId);
      if (found) return JSON.parse(JSON.stringify(found));
    }
    // Default template (NR-20 preset as starting point)
    return JSON.parse(JSON.stringify(INITIAL_PRESETS[0]));
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(0.85);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<CertificateTemplate[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Push current state to undo history
  const pushHistory = (newTemplate: CertificateTemplate) => {
    setHistory((prev) => {
      const currentSlice = prev.slice(0, historyIndex + 1);
      return [...currentSlice, JSON.parse(JSON.stringify(newTemplate))].slice(-30); // max 30 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
    setIsDirty(true);
  };

  // Initial load if templateId changes
  useEffect(() => {
    if (templateId) {
      const found = TemplateStorage.getById(templateId);
      if (found) {
        setTemplate(JSON.parse(JSON.stringify(found)));
        setHistory([JSON.parse(JSON.stringify(found))]);
        setHistoryIndex(0);
        setIsDirty(false);
      }
    } else {
      setHistory([JSON.parse(JSON.stringify(INITIAL_PRESETS[0]))]);
      setHistoryIndex(0);
    }
  }, [templateId]);

  // Handle Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setTemplate(JSON.parse(JSON.stringify(history[newIndex])));
      setIsDirty(true);
      addToast('Ação desfeita (Undo)', 'info');
    }
  }, [history, historyIndex]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setTemplate(JSON.parse(JSON.stringify(history[newIndex])));
      setIsDirty(true);
      addToast('Ação refeita (Redo)', 'info');
    }
  }, [history, historyIndex]);

  // Save handler
  const handleSave = () => {
    const saved = TemplateStorage.save(template);
    setTemplate(saved);
    setIsDirty(false);
    addToast(`Modelo "${saved.name}" salvo com sucesso!`, 'success');
  };

  // Global keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, template]);

  // Element actions
  const handleAddElement = (partialEl: Partial<CanvasElement>) => {
    const isLandscape = template.orientation === 'landscape';
    const pageWidthMm = isLandscape ? 297 : 210;
    const pageHeightMm = isLandscape ? 210 : 297;

    const elWidth = partialEl.widthMm || 80;
    const elHeight = partialEl.heightMm || 15;

    const newElement: CanvasElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: partialEl.type || 'text',
      name: partialEl.name || 'Novo Elemento',
      xMm: Math.round((pageWidthMm - elWidth) / 2),
      yMm: Math.round((pageHeightMm - elHeight) / 2),
      widthMm: elWidth,
      heightMm: elHeight,
      zIndex: template.elements.length + 1,
      content: partialEl.content || 'Novo Texto',
      variableTag: partialEl.variableTag,
      style: partialEl.style || {
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: '400',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 1.3,
        letterSpacing: 0,
      },
      border: partialEl.border,
      frameType: partialEl.frameType,
      imageUrl: partialEl.imageUrl,
    };

    const updatedTemplate = {
      ...template,
      elements: [...template.elements, newElement],
    };

    setTemplate(updatedTemplate);
    setSelectedElementId(newElement.id);
    pushHistory(updatedTemplate);
    addToast(`Elemento "${newElement.name}" inserido no centro.`, 'info');
  };

  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    const updatedElements = template.elements.map((el) => {
      if (el.id === id) {
        return { ...el, ...updates };
      }
      return el;
    });

    const updatedTemplate = {
      ...template,
      elements: updatedElements,
    };

    setTemplate(updatedTemplate);
    pushHistory(updatedTemplate);
  };

  const handleDeleteElement = (id: string) => {
    const target = template.elements.find((el) => el.id === id);
    const updatedElements = template.elements.filter((el) => el.id !== id);

    const updatedTemplate = {
      ...template,
      elements: updatedElements,
    };

    setTemplate(updatedTemplate);
    if (selectedElementId === id) setSelectedElementId(null);
    pushHistory(updatedTemplate);
    addToast(`Elemento "${target?.name || ''}" removido.`, 'info');
  };

  const handleDuplicateElement = (id: string) => {
    const original = template.elements.find((el) => el.id === id);
    if (!original) return;

    const duplicated: CanvasElement = {
      ...JSON.parse(JSON.stringify(original)),
      id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${original.name} (Cópia)`,
      xMm: Math.min(270, original.xMm + 8),
      yMm: Math.min(180, original.yMm + 8),
      zIndex: template.elements.length + 1,
    };

    const updatedTemplate = {
      ...template,
      elements: [...template.elements, duplicated],
    };

    setTemplate(updatedTemplate);
    setSelectedElementId(duplicated.id);
    pushHistory(updatedTemplate);
    addToast(`Elemento duplicado.`, 'info');
  };

  const handleReorderElement = (id: string, direction: 'up' | 'down') => {
    const index = template.elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const updatedElements = [...template.elements];
    if (direction === 'up' && index < updatedElements.length - 1) {
      const temp = updatedElements[index].zIndex;
      updatedElements[index].zIndex = updatedElements[index + 1].zIndex;
      updatedElements[index + 1].zIndex = temp;
      const swap = updatedElements[index];
      updatedElements[index] = updatedElements[index + 1];
      updatedElements[index + 1] = swap;
    } else if (direction === 'down' && index > 0) {
      const temp = updatedElements[index].zIndex;
      updatedElements[index].zIndex = updatedElements[index - 1].zIndex;
      updatedElements[index - 1].zIndex = temp;
      const swap = updatedElements[index];
      updatedElements[index] = updatedElements[index - 1];
      updatedElements[index - 1] = swap;
    }

    const updatedTemplate = {
      ...template,
      elements: updatedElements,
    };

    setTemplate(updatedTemplate);
    pushHistory(updatedTemplate);
  };

  // Export PDF test
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const mockData = MOCK_PARTICIPANTS[0].data;
      const pdfBytes = await generateCertificatePdfBytes(template, mockData);
      const filename = `${template.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
      downloadPdfBlob(pdfBytes, filename);
      addToast('PDF vetorial gerado e baixado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      addToast('Erro ao exportar PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedElement = template.elements.find((el) => el.id === selectedElementId) || null;
  const isLandscape = template.orientation === 'landscape';
  const pageWidthMm = isLandscape ? 297 : 210;
  const pageHeightMm = isLandscape ? 210 : 297;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden selection:bg-amber-400 selection:text-slate-950">
      {/* Top Bar */}
      <EditorHeader
        templateName={template.name}
        onNameChange={(name) => {
          const upd = { ...template, name };
          setTemplate(upd);
          pushHistory(upd);
        }}
        category={template.category}
        onCategoryChange={(cat) => {
          const upd = { ...template, category: cat };
          setTemplate(upd);
          pushHistory(upd);
        }}
        orientation={template.orientation}
        onOrientationChange={(ori) => {
          const upd = { ...template, orientation: ori };
          setTemplate(upd);
          pushHistory(upd);
          addToast(`Orientação alterada para A4 ${ori === 'landscape' ? 'Paisagem' : 'Retrato'}.`, 'info');
        }}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
        onZoomOut={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}
        onZoomFit={() => setZoom(0.85)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isDirty={isDirty}
        onSave={handleSave}
        onPreview={() => setIsPreviewOpen(true)}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
      />

      {/* 3-Column Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Elements, Layers & Background */}
        <ElementsSidebar
          onAddElement={handleAddElement}
          elements={template.elements}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onReorderElement={handleReorderElement}
          backgroundColor={template.background.color || '#FFFFFF'}
          onBackgroundColorChange={(color) => {
            const upd = { ...template, background: { ...template.background, color } };
            setTemplate(upd);
            pushHistory(upd);
          }}
          backgroundImageUrl={template.background.imageUrl}
          onBackgroundImageChange={(url) => {
            const upd = {
              ...template,
              background: {
                ...template.background,
                type: url ? ('image' as const) : ('color' as const),
                imageUrl: url,
              },
            };
            setTemplate(upd);
            pushHistory(upd);
            addToast(url ? 'Imagem de fundo importada com sucesso.' : 'Fundo removido.', 'info');
          }}
          onLoadPreset={(preset) => {
            const loaded = {
              ...JSON.parse(JSON.stringify(preset)),
              id: template.id, // preserves current model ID
              name: template.name, // preserves current model name
            };
            setTemplate(loaded);
            pushHistory(loaded);
            addToast(`Modelo predefinido "${preset.name}" carregado.`, 'success');
          }}
        />

        {/* Center: Live Interactive A4 Canvas */}
        <CertificateCanvas
          orientation={template.orientation}
          backgroundColor={template.background.color || '#FFFFFF'}
          backgroundImageUrl={template.background.imageUrl}
          elements={template.elements}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          zoom={zoom}
        />

        {/* Right: Property Inspector of Selected Element */}
        <PropertyInspector
          element={selectedElement}
          onUpdate={(updates) => {
            if (selectedElementId) {
              handleUpdateElement(selectedElementId, updates);
            }
          }}
          onDuplicate={handleDuplicateElement}
          onDelete={handleDeleteElement}
          pageWidthMm={pageWidthMm}
          pageHeightMm={pageHeightMm}
        />
      </div>

      {/* Realistic Live Preview Modal */}
      {isPreviewOpen && (
        <LivePreviewModal
          template={template}
          onClose={() => setIsPreviewOpen(false)}
          onToast={addToast}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default function CertificateStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p>Carregando Estúdio Visual de Certificados...</p>
          </div>
        </div>
      }
    >
      <CertificateStudioInner />
    </Suspense>
  );
}
