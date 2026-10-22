'use client';

import React from 'react';
import Link from 'next/link';
import { Award, Layers, Plus, Sparkles, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab?: 'library' | 'editor' | 'batch' | 'verify';
  activeCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab = 'library', activeCount = 4 }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">
                  Certifica<span className="text-amber-400">Flow</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  Web Studio
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Gerador & Editor de Certificados</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-white/10">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'library'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              Modelos
              <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {activeCount}
              </span>
            </Link>

            <Link
              href="/lotes"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'batch'
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Geração em Lote
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase tracking-wider">
                Excel/CSV
              </span>
            </Link>

            <Link
              href="/verificar"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'verify'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verificador
            </Link>
          </nav>
        </div>

        {/* Right Side: LGPD status & New Model Button */}
        <div className="flex items-center gap-3">
          {/* LGPD Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Client-side (LGPD Seguro)</span>
          </div>

          {/* New Model Button */}
          <Link
            href="/editor"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Modelo</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
