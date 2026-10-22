import * as XLSX from 'xlsx';

export interface ParsedSpreadsheet {
  filename: string;
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

/**
 * Faz a leitura de uma planilha (.xlsx, .xls ou .csv) diretamente no navegador (client-side)
 */
export async function parseSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('A planilha enviada não contém abas visíveis.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: '',
          raw: false,
        });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('A planilha está vazia ou não possui linhas de dados válidas.');
        }

        // Extrai colunas únicas preservando ordem da primeira linha
        const columnsSet = new Set<string>();
        rawJson.forEach((row) => {
          Object.keys(row).forEach((col) => {
            const cleanCol = col.trim();
            if (cleanCol && !cleanCol.startsWith('__EMPTY')) {
              columnsSet.add(cleanCol);
            }
          });
        });

        const columns = Array.from(columnsSet);

        // Sanitiza valores em strings
        const rows: Record<string, string>[] = rawJson.map((row) => {
          const item: Record<string, string> = {};
          columns.forEach((col) => {
            const val = row[col];
            item[col] = val !== undefined && val !== null ? String(val).trim() : '';
          });
          return item;
        });

        resolve({
          filename: file.name,
          columns,
          rows,
          totalRows: rows.length,
        });
      } catch (err: unknown) {
        reject(err instanceof Error ? err : new Error('Falha ao processar arquivo Excel/CSV.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro de leitura do arquivo no navegador.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Mapeia automaticamente colunas da planilha para variáveis do template
 */
export function autoMapColumns(
  detectedColumns: string[],
  templateVariableTags: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const synonyms: Record<string, string[]> = {
    nome_colaborador: ['nome', 'nomecompleto', 'colaborador', 'participante', 'aluno', 'funcionario', 'trabalhador', 'pessoa'],
    cpf: ['cpf', 'documento', 'doc', 'cpfaluno'],
    rg: ['rg', 'identidade', 'rgaluno'],
    nome_curso: ['curso', 'treinamento', 'capacitacao', 'titulocurso', 'modulo', 'especializacao', 'nomecurso'],
    carga_horaria: ['cargahoraria', 'carga', 'ch', 'horas', 'duracao', 'tempocurso'],
    data_realizacao: ['data', 'datarealizacao', 'periodo', 'datas', 'dataconclusao', 'conclusao', 'datadeconclusao'],
    data_emissao: ['emissao', 'dataemissao', 'datadeemissao', 'datahoje'],
    nome_empresa: ['empresa', 'organizacao', 'razaosocial', 'cliente', 'contratante', 'nomeempresa'],
    instituicao_ensino: ['instituicao', 'instituicaodeensino', 'escola', 'entidade', 'capacitadora', 'centrodetreinamento'],
    instrutor: ['instrutor', 'professor', 'docente', 'responsaveltecnico', 'instrutorresponsavel', 'facilitador'],
    cidade_estado: ['cidade', 'local', 'municipio', 'cidadeestado', 'uf', 'localrealizacao'],
    codigo_autenticidade: ['codigo', 'codigovalidacao', 'hash', 'autenticidade', 'certid'],
  };

  templateVariableTags.forEach((tag) => {
    const synList = synonyms[tag] || [clean(tag)];

    // Busca coluna que melhor dê match com os sinônimos
    const matchedCol = detectedColumns.find((col) => {
      const colClean = clean(col);
      return synList.some((syn) => colClean === syn || colClean.includes(syn) || syn.includes(colClean));
    });

    if (matchedCol) {
      mapping[tag] = matchedCol;
    }
  });

  return mapping;
}

/**
 * Gera um arquivo Excel (.xlsx) de exemplo formatado para download
 */
export function generateSampleSpreadsheetBlob(): Blob {
  const headers = [
    'Nome Completo',
    'CPF',
    'RG',
    'Treinamento / Curso',
    'Carga Horária',
    'Período / Data',
    'Data de Emissão',
    'Empresa',
    'Instituição Capacitadora',
    'Instrutor / Responsável',
    'Cidade e Estado',
  ];

  const sampleRows = [
    [
      'Carlos Eduardo da Silva Mendes',
      '123.456.789-01',
      '12.345.678-9',
      'NR-20: Segurança com Inflamáveis e Combustíveis',
      '16 horas',
      '18 a 22 de Outubro de 2026',
      '22 de Outubro de 2026',
      'Petrobras Distribuidora S.A.',
      'Instituto de Engenharia & Segurança Industrial',
      'Eng. Roberto Albuquerque (CREA 54.321-D)',
      'São Paulo - SP',
    ],
    [
      'Mariana Oliveira de Albuquerque',
      '234.567.890-12',
      '23.456.789-0',
      'NR-35: Trabalho em Altura e Resgate Técnico',
      '8 horas',
      '20 de Outubro de 2026',
      '22 de Outubro de 2026',
      'Logística & Infraestrutura Brasil Ltda.',
      'Instituto de Engenharia & Segurança Industrial',
      'Instrutor Marcos Vinicius Medeiros',
      'Rio de Janeiro - RJ',
    ],
    [
      'Ana Beatriz dos Santos Ferreira',
      '345.678.901-23',
      '34.567.890-1',
      'NR-10: Segurança em Instalações Elétricas',
      '40 horas',
      '10 a 21 de Outubro de 2026',
      '22 de Outubro de 2026',
      'Indústria Metalúrgica Paulista S.A.',
      'Centro Técnico de Formação Ocupacional',
      'Eng. Eletricista Cláudio Ramos',
      'Campinas - SP',
    ],
    [
      'Rodrigo Fernandes de Castilho',
      '456.789.012-34',
      '45.678.901-2',
      'Brigada de Emergência e Combate a Princípio de Incêndio',
      '12 horas',
      '15 e 16 de Outubro de 2026',
      '22 de Outubro de 2026',
      'Comércio & Serviços Integrados S.A.',
      'Academia de Bombeiros e Socorristas',
      'Tenente Especialista Fernando Dias',
      'Belo Horizonte - MG',
    ],
    [
      'Washington Luís Mascarenhas Silveira',
      '567.890.123-45',
      '56.789.012-3',
      'Liderança Operacional e Gestão de Riscos Críticos',
      '24 horas',
      '12 a 19 de Outubro de 2026',
      '22 de Outubro de 2026',
      'Mineração e Logística Vale do Sol',
      'Fundação Brasileira de Gestão',
      'Profa. Dra. Helena Siqueira de Paula',
      'Vitória - ES',
    ],
  ];

  const worksheetData = [headers, ...sampleRows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Define larguras automáticas de colunas
  worksheet['!cols'] = [
    { wch: 34 }, // Nome Completo
    { wch: 18 }, // CPF
    { wch: 16 }, // RG
    { wch: 42 }, // Treinamento
    { wch: 16 }, // Carga Horaria
    { wch: 28 }, // Data
    { wch: 22 }, // Data Emissao
    { wch: 32 }, // Empresa
    { wch: 36 }, // Instituicao
    { wch: 36 }, // Instrutor
    { wch: 22 }, // Cidade e Estado
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
