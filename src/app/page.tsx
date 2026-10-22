'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { TemplateGrid } from '@/components/library/TemplateGrid';
import { LivePreviewModal } from '@/components/library/LivePreviewModal';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import { CertificateTemplate } from '@/types/certificate';
import { TemplateStorage } from '@/lib/storage/templateStorage';

export default function HomePage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [previewTarget, setPreviewTarget] = useState<CertificateTemplate | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadTemplates = () => {
    const list = TemplateStorage.getAll('tenant-demo', true);
    setTemplates(list);
    setIsLoaded(true);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-400 selection:text-slate-950">
      <Navbar activeTab="library" activeCount={templates.filter((t) => !t.isArchived).length} />

      <main className="flex-1">
        {isLoaded ? (
          <TemplateGrid
            initialTemplates={templates}
            onOpenPreview={(tpl) => setPreviewTarget(tpl)}
            onToast={addToast}
            onRefresh={loadTemplates}
          />
        ) : (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Carregando modelos da organização...</p>
            </div>
          </div>
        )}
      </main>

      <LivePreviewModal
        template={previewTarget}
        onClose={() => setPreviewTarget(null)}
        onToast={addToast}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
