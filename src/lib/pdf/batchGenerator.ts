import JSZip from 'jszip';
import { CertificateTemplate } from '@/types/certificate';
import { generateCertificatePdfBytes } from './pdfExport';

export interface BatchProgress {
  current: number;
  total: number;
  currentItem: string;
  percentage: number;
}

export interface BatchGenerationOptions {
  template: CertificateTemplate;
  rows: Record<string, string>[];
  columnMapping: Record<string, string>;
  filenamePattern?: string; // default: "Certificado_{nome_colaborador}"
  maskCpf?: boolean;
  onProgress?: (progress: BatchProgress) => void;
  signal?: AbortSignal;
}

export interface BatchGenerationResult {
  zipBlob: Blob;
  total: number;
  successCount: number;
  errors: { row: number; name: string; error: string }[];
  summaryRows: Array<{
    codigo: string;
    nome: string;
    curso: string;
    arquivo: string;
  }>;
}

/**
 * Aplica máscara de proteção LGPD ao CPF caso esteja em formato de 11 dígitos
 */
export function maskCpfValue(cpfRaw: string): string {
  if (!cpfRaw) return '';
  const digits = cpfRaw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }
  return cpfRaw;
}

/**
 * Remove caracteres inválidos para nomes de arquivos
 */
export function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Gera certificados em lote 100% no navegador e compacta em um arquivo ZIP
 */
export async function generateBatchCertificates({
  template,
  rows,
  columnMapping,
  filenamePattern = 'Certificado_{nome_colaborador}',
  maskCpf = false,
  onProgress,
  signal,
}: BatchGenerationOptions): Promise<BatchGenerationResult> {
  const zip = new JSZip();
  const certsFolder = zip.folder('certificados');

  const total = rows.length;
  let successCount = 0;
  const errors: { row: number; name: string; error: string }[] = [];
  const summaryRows: Array<{
    codigo: string;
    nome: string;
    curso: string;
    arquivo: string;
  }> = [];

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      throw new Error('A geração do lote foi cancelada pelo usuário.');
    }

    const row = rows[i];
    const rowIndex = i + 1;

    // Transforma dados da linha para o dicionário de variáveis do template
    const participantData: Record<string, string> = {};

    Object.entries(columnMapping).forEach(([tag, colName]) => {
      let val = row[colName] || '';
      if (tag === 'cpf' && maskCpf) {
        val = maskCpfValue(val);
      }
      participantData[tag] = val;
    });

    // Se a tag codigo_autenticidade não veio na planilha, gera código único
    if (!participantData.codigo_autenticidade) {
      const year = new Date().getFullYear();
      const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const numPart = String(rowIndex).padStart(4, '0');
      participantData.codigo_autenticidade = `CERT-${year}-${numPart}-${randPart}`;
    }

    const nome = participantData.nome_colaborador || `Participante_${rowIndex}`;

    onProgress?.({
      current: rowIndex,
      total,
      currentItem: nome,
      percentage: Math.round((rowIndex / total) * 90), // primeiros 90% para renderização
    });

    try {
      // Gera bytes do PDF com pdf-lib
      const pdfBytes = await generateCertificatePdfBytes(template, participantData);

      // Define nome do arquivo
      let baseFilename = filenamePattern;
      Object.entries(participantData).forEach(([tag, val]) => {
        baseFilename = baseFilename.replace(new RegExp(`\\{${tag}\\}`, 'g'), val);
      });
      baseFilename = baseFilename.replace('{index}', String(rowIndex));

      const cleanFileName = `${sanitizeFilename(baseFilename) || `Certificado_${rowIndex}`}.pdf`;

      certsFolder?.file(cleanFileName, pdfBytes);
      successCount++;

      summaryRows.push({
        codigo: participantData.codigo_autenticidade,
        nome,
        curso: participantData.nome_curso || template.name,
        arquivo: cleanFileName,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na renderização';
      errors.push({ row: rowIndex, name: nome, error: msg });
    }

    // Pequeno intervalo assíncrono para permitir atualização fluida da UI sem travar o browser
    if (i % 5 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // Gera relatório CSV de conferência do lote
  const csvHeader = 'Codigo,Nome,Treinamento,Arquivo_PDF\n';
  const csvBody = summaryRows
    .map(
      (r) =>
        `"${r.codigo}","${r.nome.replace(/"/g, '""')}","${r.curso.replace(/"/g, '""')}","${r.arquivo}"`
    )
    .join('\n');
  zip.file('relatorio_certificados_gerados.csv', csvHeader + csvBody);

  onProgress?.({
    current: total,
    total,
    currentItem: 'Compactando arquivo ZIP...',
    percentage: 95,
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.({
        current: total,
        total,
        currentItem: 'Finalizando download compactado...',
        percentage: 90 + Math.round(metadata.percent * 0.1),
      });
    }
  );

  onProgress?.({
    current: total,
    total,
    currentItem: 'Lote concluído com sucesso!',
    percentage: 100,
  });

  return {
    zipBlob,
    total,
    successCount,
    errors,
    summaryRows,
  };
}
