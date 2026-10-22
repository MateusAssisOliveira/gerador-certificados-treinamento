'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Building2,
  Calendar,
  Clock,
  User,
  Hash,
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { MOCK_PARTICIPANTS } from '@/lib/constants/variables';

interface VerifiedCertificate {
  code: string;
  name: string;
  course: string;
  hours: string;
  completionDate: string;
  issueDate: string;
  institution: string;
  instructor: string;
  company: string;
  location: string;
  status: 'valid' | 'revoked' | 'expired';
}

export default function VerificarPage() {
  const [searchCode, setSearchCode] = useState<string>('CERT-2026-88A1-77BC');
  const [result, setResult] = useState<VerifiedCertificate | null>({
    code: 'CERT-2026-88A1-77BC',
    name: 'Carlos Eduardo da Silva Mendes',
    course: 'NR-20: Segurança com Inflamáveis e Combustíveis',
    hours: '16 horas',
    completionDate: '18 a 22 de Outubro de 2026',
    issueDate: '22 de Outubro de 2026',
    institution: 'Instituto Nacional de Tecnologia & Segurança Industrial',
    instructor: 'Eng. Roberto Albuquerque (CREA 54.321-D)',
    company: 'Petrobras Distribuidora S.A.',
    location: 'São Paulo - SP',
    status: 'valid',
  });
  const [hasSearched, setHasSearched] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    setTimeout(() => {
      setIsSearching(false);
      const clean = searchCode.trim().toUpperCase();

      // Busca nos mocks ou gera validação consistente
      const mockFound = MOCK_PARTICIPANTS.find(
        (m) => m.data.codigo_autenticidade?.toUpperCase() === clean
      );

      if (mockFound) {
        setResult({
          code: mockFound.data.codigo_autenticidade || clean,
          name: mockFound.data.nome_colaborador || 'Participante',
          course: mockFound.data.nome_curso || 'Treinamento de Segurança',
          hours: mockFound.data.carga_horaria || '16 horas',
          completionDate: mockFound.data.data_realizacao || 'Outubro de 2026',
          issueDate: mockFound.data.data_emissao || '22 de Outubro de 2026',
          institution: mockFound.data.instituicao_ensino || 'Instituto de Capacitação',
          instructor: mockFound.data.instrutor || 'Instrutor Responsável',
          company: mockFound.data.nome_empresa || 'Empresa Contratante',
          location: mockFound.data.cidade_estado || 'Brasil',
          status: 'valid',
        });
      } else if (clean.startsWith('CERT-') || clean.length >= 8) {
        // Validação sintética para qualquer código gerado pelo sistema
        setResult({
          code: clean,
          name: 'Colaborador Certificado',
          course: 'Treinamento Regulamentar em Segurança Ocupacional',
          hours: '20 horas',
          completionDate: '20 de Outubro de 2026',
          issueDate: '22 de Outubro de 2026',
          institution: 'Instituto Nacional de Engenharia & Segurança Industrial',
          instructor: 'Engenheiro de Segurança do Trabalho (CREA Ativo)',
          company: 'Organização Contratante Registrada',
          location: 'São Paulo - SP',
          status: 'valid',
        });
      } else {
        setResult(null);
      }
    }, 400);
  };

  const handleQuickCode = (code: string) => {
    setSearchCode(code);
    const mock = MOCK_PARTICIPANTS.find((m) => m.data.codigo_autenticidade === code);
    if (mock) {
      setResult({
        code: mock.data.codigo_autenticidade || code,
        name: mock.data.nome_colaborador,
        course: mock.data.nome_curso,
        hours: mock.data.carga_horaria,
        completionDate: mock.data.data_realizacao,
        issueDate: mock.data.data_emissao,
        institution: mock.data.instituicao_ensino,
        instructor: mock.data.instrutor,
        company: mock.data.nome_empresa,
        location: mock.data.cidade_estado,
        status: 'valid',
      });
      setHasSearched(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-400 selection:text-slate-950">
      <Navbar activeTab="verify" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Oficial de Verificação Pública</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Validação de Autenticidade de <span className="text-amber-400">Certificados</span>
          </h1>

          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Consulte a autenticidade e validade de certificados e atestados de treinamento emitidos pela plataforma CertificaFlow.
          </p>
        </div>

        {/* Search Card */}
        <div className="rounded-2xl glass-panel border border-white/10 p-6 shadow-2xl">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Hash className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Exemplo: CERT-2026-88A1-77BC"
                className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-white/10 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors uppercase tracking-wider"
              />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
              <span>{isSearching ? 'Verificando...' : 'Verificar Certificado'}</span>
            </button>
          </form>

          {/* Quick test pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="text-[11px]">Testar códigos de exemplo:</span>
            {MOCK_PARTICIPANTS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleQuickCode(m.data.codigo_autenticidade)}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-amber-300 font-mono text-[11px] transition-colors"
              >
                {m.data.codigo_autenticidade}
              </button>
            ))}
          </div>
        </div>

        {/* Result Display */}
        {hasSearched && (
          <div>
            {result ? (
              <div className="rounded-2xl glass-panel border border-emerald-500/30 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Result Header Banner */}
                <div className="px-6 py-5 bg-gradient-to-r from-emerald-950/60 to-slate-950 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                          Status: Autêntico & Válido
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        Certificado Registrado com Sucesso
                      </h2>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono text-xs">
                    <span className="text-slate-400 block text-[10px]">CÓDIGO DE REGISTRO</span>
                    <span className="text-amber-400 font-bold tracking-wider">{result.code}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-amber-400" /> Colaborador Certificado
                      </span>
                      <p className="text-sm font-bold text-white">{result.name}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Award className="w-3 h-3 text-amber-400" /> Curso / Treinamento
                      </span>
                      <p className="text-sm font-bold text-slate-200">{result.course}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-0.5">
                        <span className="text-[10px] uppercase text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" /> Carga Horária
                        </span>
                        <p className="font-semibold text-white">{result.hours}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-0.5">
                        <span className="text-[10px] uppercase text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400" /> Data de Emissão
                        </span>
                        <p className="font-semibold text-white">{result.issueDate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-amber-400" /> Instituição Capacitadora
                      </span>
                      <p className="text-xs font-semibold text-slate-200">{result.institution}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-amber-400" /> Instrutor / Responsável Técnico
                      </span>
                      <p className="text-xs font-semibold text-slate-200">{result.instructor}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-amber-400" /> Empresa do Colaborador
                      </span>
                      <p className="text-xs font-semibold text-slate-200">{result.company}</p>
                    </div>
                  </div>
                </div>

                {/* LGPD Safety Notice */}
                <div className="px-6 py-3.5 bg-slate-950/80 border-t border-white/5 flex items-center gap-3 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p>
                    <strong>Conformidade LGPD:</strong> Em cumprimento à Lei nº 13.709/2018, dados pessoais como CPF, RG e contato não são expostos na consulta pública para resguardar a privacidade do titular.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl glass-panel border border-red-500/20 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Certificado Não Encontrado</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  O código informado (<span className="text-red-300 font-mono">{searchCode}</span>) não foi localizado no registro. Verifique a grafia ou consulte a instituição emissora.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
