'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Eye,
  Sparkles,
  FileArchive,
  RefreshCw,
  Search,
  Check,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { ToastContainer, ToastMessage } from '@/components/ui/Toast';
import { LivePreviewModal } from '@/components/library/LivePreviewModal';
import { CertificateTemplate } from '@/types/certificate';
import { TemplateStorage } from '@/lib/storage/templateStorage';
import { DYNAMIC_VARIABLES } from '@/lib/constants/variables';
import {
  parseSpreadsheet,
  autoMapColumns,
  generateSampleSpreadsheetBlob,
  ParsedSpreadsheet,
} from '@/lib/excel/spreadsheetParser';
import {
  generateBatchCertificates,
  BatchProgress,
  BatchGenerationResult,
  maskCpfValue,
} from '@/lib/pdf/batchGenerator';

export default function LotesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [spreadsheet, setSpreadsheet] = useState<ParsedSpreadsheet | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [maskCpf, setMaskCpf] = useState<boolean>(true);
  const [filenamePattern, setFilenamePattern] = useState<string>('Certificado_{nome_colaborador}');

  // Estado de Processamento
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [batchResult, setBatchResult] = useState<BatchGenerationResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Prévia
  const [previewParticipant, setPreviewParticipant] = useState<Record<string, string> | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToasts((prev) => [
      ...prev,
      {
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        type,
        message,
      },
    ]);
  };
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Carrega modelos disponíveis
  useEffect(() => {
    const list = TemplateStorage.getAll('tenant-demo', true);
    setTemplates(list);
    if (list.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(list[0].id);
    }
  }, [selectedTemplateId]);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0] || null;

  // Atualiza mapeamento ao selecionar novo template ou subir nova planilha
  useEffect(() => {
    if (spreadsheet && activeTemplate) {
      const neededTags = DYNAMIC_VARIABLES.map((v) => v.tag);
      const auto = autoMapColumns(spreadsheet.columns, neededTags);
      setColumnMapping(auto);
    }
  }, [spreadsheet, activeTemplate]);

  // Upload de arquivo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
    e.target.value = '';
  };

  const processUploadedFile = async (file: File) => {
    try {
      const parsed = await parseSpreadsheet(file);
      setSpreadsheet(parsed);
      setBatchResult(null);
      setCurrentPage(1);
      addToast(`Planilha "${file.name}" carregada com ${parsed.totalRows} participantes!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar planilha';
      addToast(msg, 'error');
    }
  };

  // Drag and Drop
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  // Baixar planilha modelo
  const handleDownloadSample = () => {
    try {
      const blob = generateSampleSpreadsheetBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo_participantes_treinamento.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Planilha de exemplo baixada com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      addToast('Erro ao gerar planilha de exemplo', 'error');
    }
  };

  // Iniciar Geração em Lote
  const handleStartBatch = async () => {
    if (!activeTemplate || !spreadsheet || spreadsheet.rows.length === 0) {
      addToast('Selecione um modelo e carregue uma planilha antes de iniciar.', 'error');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: spreadsheet.totalRows, currentItem: 'Iniciando...', percentage: 0 });
    setBatchResult(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await generateBatchCertificates({
        template: activeTemplate,
        rows: spreadsheet.rows,
        columnMapping,
        filenamePattern,
        maskCpf,
        onProgress: (p) => setProgress(p),
        signal: controller.signal,
      });

      setBatchResult(result);
      addToast(`Sucesso! ${result.successCount} certificados gerados no pacote ZIP.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na geração do lote';
      addToast(msg, 'error');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Cancelar processamento
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addToast('Geração do lote cancelada.', 'info');
    }
  };

  // Baixar o ZIP gerado
  const handleDownloadZip = () => {
    if (!batchResult) return;
    const url = URL.createObjectURL(batchResult.zipBlob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `Certificados_Lote_${activeTemplate?.name ? activeTemplate.name.replace(/\s+/g, '_') : 'Treinamento'}_${dateStr}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Download do pacote ZIP iniciado!', 'success');
  };

  // Abrir prévia para uma linha específica
  const handlePreviewRow = (row: Record<string, string>) => {
    const data: Record<string, string> = {};
    Object.entries(columnMapping).forEach(([tag, colName]) => {
      let val = row[colName] || '';
      if (tag === 'cpf' && maskCpf) {
        val = maskCpfValue(val);
      }
      data[tag] = val;
    });
    setPreviewParticipant(data);
  };

  // Filtro e paginação da tabela
  const filteredRows = spreadsheet
    ? spreadsheet.rows.filter((r) => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return Object.values(r).some((val) => String(val).toLowerCase().includes(s));
      })
    : [];

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-400 selection:text-slate-950">
      <Navbar activeTab="batch" activeCount={templates.filter((t) => !t.isArchived).length} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title & Intro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                <FileArchive className="w-4 h-4" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Geração de Certificados em <span className="text-amber-400">Lote</span>
              </h1>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Importe sua planilha Excel (.xlsx) ou CSV, confira os participantes e gere centenas de certificados em PDF compactados em ZIP em segundos — 100% no seu navegador com proteção LGPD.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadSample}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-amber-400/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              title="Baixar planilha padrão com colunas prontas"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Baixar Planilha Modelo (.XLSX)</span>
            </button>
          </div>
        </div>

        {/* Stepper Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Seleção do Modelo */}
          <div className="rounded-2xl glass-panel border border-white/10 p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Modelo do Certificado</span>
              </div>
              {activeTemplate && (
                <Link
                  href={`/editor?id=${activeTemplate.id}`}
                  className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                  target="_blank"
                >
                  <span>Editar</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Escolha o modelo ativo:</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.category}) - {tpl.orientation === 'landscape' ? 'Paisagem' : 'Retrato'}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Info Preview Box */}
            {activeTemplate && (
              <div className="flex-1 rounded-xl bg-slate-950/60 border border-white/5 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white truncate">{activeTemplate.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                      {activeTemplate.elements.length} elementos
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                    {activeTemplate.description || 'Modelo profissional pronto para emissão em massa.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Orientação: <strong className="text-slate-200 capitalize">{activeTemplate.orientation}</strong></span>
                  <button
                    onClick={() => setPreviewParticipant({})}
                    className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Upload da Planilha */}
          <div className="rounded-2xl glass-panel border border-white/10 p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Upload da Planilha</span>
              </div>
              {spreadsheet && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {spreadsheet.totalRows} linhas
                </span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 min-h-[140px] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer ${
                isDragging
                  ? 'border-amber-400 bg-amber-400/10 scale-[1.02]'
                  : spreadsheet
                  ? 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-500/70'
                  : 'border-white/15 bg-slate-900/40 hover:border-amber-400/40 hover:bg-white/5'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
                {spreadsheet ? <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> : <Upload className="w-5 h-5" />}
              </div>
              <p className="text-xs font-semibold text-white mb-0.5 truncate max-w-[220px]">
                {spreadsheet ? spreadsheet.filename : 'Clique ou arraste sua planilha'}
              </p>
              <p className="text-[10px] text-slate-400">Suporta .xlsx, .xls e .csv (sem limite de linhas)</p>
            </div>

            {spreadsheet && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>{spreadsheet.columns.length} colunas identificadas</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  Trocar arquivo
                </button>
              </div>
            )}
          </div>

          {/* Card 3: Configurações & Ação de Geração */}
          <div className="rounded-2xl glass-panel border border-white/10 p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
                <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Configurações & Disparo</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={maskCpf}
                    onChange={(e) => setMaskCpf(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-white/20 cursor-pointer"
                  />
                  <span>Mascarar CPF no PDF (<span className="text-amber-300 font-mono">***.456.789-**</span>)</span>
                </label>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">Padrão do nome dos PDFs:</label>
                  <input
                    type="text"
                    value={filenamePattern}
                    onChange={(e) => setFilenamePattern(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="Certificado_{nome_colaborador}"
                  />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="space-y-2 pt-2">
              {isProcessing ? (
                <div className="space-y-2">
                  <div className="w-full h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gerando ({progress?.percentage}%)</span>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="w-full py-1.5 text-center text-xs text-red-400 hover:text-red-300"
                  >
                    Cancelar Geração
                  </button>
                </div>
              ) : batchResult ? (
                <button
                  onClick={handleDownloadZip}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar ZIP ({batchResult.successCount} PDFs)</span>
                </button>
              ) : (
                <button
                  onClick={handleStartBatch}
                  disabled={!spreadsheet || spreadsheet.rows.length === 0}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    spreadsheet && spreadsheet.rows.length > 0
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
                      : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {spreadsheet
                      ? `Gerar ${spreadsheet.totalRows} Certificados em ZIP`
                      : 'Carregue a Planilha para Iniciar'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Progresso Animada em Tempo Real */}
        {isProcessing && progress && (
          <div className="rounded-2xl glass-panel border border-amber-400/30 p-6 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-semibold text-white">Processando certificados no navegador...</span>
                <span className="text-slate-400 truncate max-w-xs font-mono">({progress.currentItem})</span>
              </div>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {progress.current} / {progress.total} ({progress.percentage}%)
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-white/10 relative">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 transition-all duration-200 rounded-full shadow-lg shadow-amber-500/50"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Card de Conclusão com Estatísticas */}
        {batchResult && (
          <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Lote de Certificados Concluído com Sucesso!
                </h3>
                <p className="text-xs text-slate-300">
                  {batchResult.successCount} PDFs foram renderizados e compactados com segurança. Seu arquivo ZIP está pronto para download.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleDownloadZip}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Baixar Pacote ZIP Agora</span>
              </button>
            </div>
          </div>
        )}

        {/* Mapeamento de Colunas (Exibido quando planilha estiver carregada) */}
        {spreadsheet && (
          <div className="rounded-2xl glass-panel border border-white/10 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Mapeamento de Colunas Inteligente
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                O sistema associou automaticamente as colunas da planilha às tags do modelo. Ajuste se necessário.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {DYNAMIC_VARIABLES.map((v) => {
                const currentMappedCol = columnMapping[v.tag] || '';
                return (
                  <div
                    key={v.tag}
                    className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{v.label}</span>
                      <code className="text-[10px] text-amber-400 bg-amber-400/10 px-1 rounded font-mono">
                        {`{{${v.tag}}}`}
                      </code>
                    </div>

                    <select
                      value={currentMappedCol}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, [v.tag]: e.target.value }))
                      }
                      className="w-full bg-slate-950 border border-white/10 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Não mapear (usar valor padrão) --</option>
                      {spreadsheet.columns.map((col) => (
                        <option key={col} value={col}>
                          Coluna: {col}
                        </option>
                      ))}
                    </select>

                    {currentMappedCol && spreadsheet.rows[0] && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Exemplo: <span className="text-slate-300 font-medium">{spreadsheet.rows[0][currentMappedCol]}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabela de Conferência dos Participantes */}
        {spreadsheet && (
          <div className="rounded-2xl glass-panel border border-white/10 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Conferência dos Participantes</h2>
                  <p className="text-xs text-slate-400">
                    Total de {spreadsheet.totalRows} participantes identificados na planilha.
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar participante..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Participante</th>
                    <th className="py-2.5 px-3">CPF</th>
                    <th className="py-2.5 px-3">Curso / Treinamento</th>
                    <th className="py-2.5 px-3">Carga Horária</th>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {paginatedRows.map((row, idx) => {
                    const rowGlobalIdx = (currentPage - 1) * pageSize + idx + 1;
                    const nomeCol = columnMapping['nome_colaborador'] || '';
                    const cpfCol = columnMapping['cpf'] || '';
                    const cursoCol = columnMapping['nome_curso'] || '';
                    const chCol = columnMapping['carga_horaria'] || '';
                    const dataCol = columnMapping['data_realizacao'] || '';

                    const nome = row[nomeCol] || '-';
                    const cpfRaw = row[cpfCol] || '-';
                    const cpfDisplay = maskCpf ? maskCpfValue(cpfRaw) : cpfRaw;
                    const curso = row[cursoCol] || activeTemplate?.name || '-';
                    const ch = row[chCol] || '-';
                    const data = row[dataCol] || '-';

                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3 text-slate-500 font-sans">{rowGlobalIdx}</td>
                        <td className="py-2.5 px-3 font-semibold font-sans text-white truncate max-w-[200px]">
                          {nome}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{cpfDisplay}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans truncate max-w-[200px]">
                          {curso}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{ch}</td>
                        <td className="py-2.5 px-3 text-slate-300">{data}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handlePreviewRow(row)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-400/20 text-slate-300 hover:text-amber-300 border border-white/5 hover:border-amber-400/30 transition-all inline-flex items-center gap-1 font-sans text-[11px]"
                            title="Ver certificado deste participante"
                          >
                            <Eye className="w-3 h-3 text-amber-400" />
                            <span>Prévia</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <span>
                  Mostrando {(currentPage - 1) * pageSize + 1} a{' '}
                  {Math.min(currentPage * pageSize, filteredRows.length)} de {filteredRows.length}{' '}
                  participantes
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                  >
                    Anterior
                  </button>
                  <span className="px-2 py-1 text-slate-300">
                    {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Prévia Individual do Participante */}
      {previewParticipant && activeTemplate && (
        <LivePreviewModal
          template={activeTemplate}
          customParticipantData={previewParticipant}
          customTitle={`Prévia: ${previewParticipant.nome_colaborador || 'Participante'}`}
          onClose={() => setPreviewParticipant(null)}
          onToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
