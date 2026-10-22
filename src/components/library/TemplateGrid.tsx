'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  RotateCcw,
  Upload,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { CertificateTemplate } from '@/types/certificate';
import { TemplateCard } from './TemplateCard';
import { TemplateStorage } from '@/lib/storage/templateStorage';

interface TemplateGridProps {
  initialTemplates: CertificateTemplate[];
  onOpenPreview: (template: CertificateTemplate) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({
  initialTemplates,
  onOpenPreview,
  onToast,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [duplicateTarget, setDuplicateTarget] = useState<CertificateTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CertificateTemplate | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    initialTemplates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [initialTemplates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return initialTemplates.filter((t) => {
      // Status filter
      if (statusFilter === 'active' && t.isArchived) return false;
      if (statusFilter === 'archived' && !t.isArchived) return false;

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesCat = t.category.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      return true;
    });
  }, [initialTemplates, search, selectedCategory, statusFilter]);

  const handleDuplicateConfirm = () => {
    if (!duplicateTarget) return;
    const duplicated = TemplateStorage.duplicate(
      duplicateTarget.id,
      duplicateTarget.tenantId,
      duplicateName.trim() || undefined
    );
    if (duplicated) {
      onToast(`Modelo "${duplicated.name}" duplicado com sucesso!`, 'success');
      onRefresh();
    }
    setDuplicateTarget(null);
    setDuplicateName('');
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const ok = TemplateStorage.delete(deleteTarget.id, deleteTarget.tenantId);
    if (ok) {
      onToast(`Modelo "${deleteTarget.name}" excluído.`, 'info');
      onRefresh();
    }
    setDeleteTarget(null);
  };

  const handleToggleArchive = (t: CertificateTemplate) => {
    const updated = TemplateStorage.toggleArchive(t.id, t.tenantId);
    if (updated) {
      onToast(
        updated.isArchived
          ? `Modelo "${updated.name}" arquivado.`
          : `Modelo "${updated.name}" desarquivado.`,
        'info'
      );
      onRefresh();
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar os modelos oficiais padrão do sistema? Seus modelos personalizados serão mantidos.')) {
      TemplateStorage.resetToDefaults();
      onToast('Modelos padrão oficiais recarregados com sucesso!', 'success');
      onRefresh();
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = TemplateStorage.importJson(content);
        onToast(`Modelo "${imported.name}" importado com sucesso!`, 'success');
        onRefresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao importar arquivo JSON';
        onToast(message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20">
              SaaS Treinamentos & NRs
            </span>
            <span className="text-xs text-slate-400">
              {filteredTemplates.length} de {initialTemplates.length} modelos exibidos
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Biblioteca de Modelos de Certificados
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Crie, personalize e gerencie os layouts visuais da sua organização com campos dinâmicos prontos para emissão em lote.
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-3">
          <label className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 cursor-pointer flex items-center gap-2 transition-colors">
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Importar JSON</span>
            <input type="file" accept=".json" onChange={handleImportJsonFile} className="hidden" />
          </label>

          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
            title="Recarregar presets oficiais"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Restaurar Presets</span>
          </button>

          <Link
            href="/lotes"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Geração em Lote</span>
          </Link>

          <Link
            href="/editor"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Criar Modelo</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, treinamento ou categoria..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'archived'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Arquivados
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-950 font-bold shadow'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900 border border-white/5'
            }`}
          >
            Todas as Categorias
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-400 text-slate-950 font-bold shadow'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Templates */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={onOpenPreview}
              onDuplicate={(t) => {
                setDuplicateTarget(t);
                setDuplicateName(`${t.name} (Cópia)`);
              }}
              onToggleArchive={handleToggleArchive}
              onDelete={(t) => setDeleteTarget(t)}
              onToast={onToast}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-white/10 bg-slate-900/30">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">Nenhum modelo encontrado</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {search || selectedCategory !== 'all' || statusFilter !== 'active'
              ? 'Tente ajustar os filtros de busca ou categoria para localizar o modelo desejado.'
              : 'Você ainda não possui modelos salvos. Comece criando seu primeiro certificado ou restaure os presets oficiais.'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {(search || selectedCategory !== 'all' || statusFilter !== 'active') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setStatusFilter('active');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                Limpar Filtros
              </button>
            )}
            <Link
              href="/editor"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Novo Modelo
            </Link>
          </div>
        </div>
      )}

      {/* Duplicate Modal Dialog */}
      {duplicateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl glass-dropdown p-6 border border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Duplicar Modelo</h3>
            <p className="text-xs text-slate-400 mb-4">
              Crie uma cópia independente de <strong>&ldquo;{duplicateTarget.name}&rdquo;</strong> para personalizar.
            </p>
            <div className="space-y-3">
              <label className="text-xs font-medium text-slate-300">Nome do Novo Modelo</label>
              <input
                type="text"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
                placeholder="Ex: NR-20 Atualização Anual..."
                autoFocus
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDuplicateTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDuplicateConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors"
              >
                Confirmar e Duplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl glass-dropdown p-6 border border-rose-500/30 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Excluir Modelo?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Tem certeza que deseja excluir o modelo <strong>&ldquo;{deleteTarget.name}&rdquo;</strong>? Esta ação removerá a configuração do certificado da biblioteca da sua organização.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Sim, Excluir Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
