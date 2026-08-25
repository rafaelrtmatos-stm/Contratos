import React, { useState } from 'react';
import { ContractType } from '../types/contract';
import {
  Plus,
  ChevronDown,
  LayoutGrid,
  Banknote,
  CalendarClock,
  ShieldCheck,
  LogOut,
  Settings2,
  Sliders,
  FileText,
} from 'lucide-react';

interface NavbarProps {
  currentView: 'dashboard' | 'form' | 'viewer';
  onNavigateDashboard: () => void;
  onNewContract: (type: ContractType) => void;
  onOpenTemplateManager?: () => void;
  onOpenSettings?: () => void;
  onOpenWordTemplates?: () => void;
  contractCount: number;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigateDashboard,
  onNewContract,
  onOpenTemplateManager,
  onOpenSettings,
  onOpenWordTemplates,
  contractCount,
  onSignOut,
}) => {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg print:hidden w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Logo e Nome do Sistema */}
          <div
            onClick={onNavigateDashboard}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none shrink-0"
            title="Ir para o Dashboard"
          >
            {/* Ícone com fundo preto/grafite e destaque dourado - usa o
                mesmo arquivo do favicon/ícone iOS (public/icon-512.png),
                antes era um ícone genérico (FileSignature) diferente do
                que aparece na tela inicial do celular */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center p-1 shadow-md shrink-0 group-hover:border-yellow-400/60 transition-colors overflow-hidden">
              <img
                src="/icon-512.png"
                alt="Logo Contratos"
                className="w-full h-full rounded-xl object-cover"
              />
            </div>
            
            <div className="min-w-0">
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight block leading-tight">
                Contratos
              </span>
              <span className="text-[11px] sm:text-xs text-yellow-400 font-semibold truncate block">
                Gestão Imobiliária
              </span>
            </div>
          </div>

          {/* Botões de Acesso Rápido e Botão "+ Novo" */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Botão de Grade / Dashboard - escondido no mobile: clicar na logo já navega pro dashboard */}
            <button
              onClick={onNavigateDashboard}
              className={`hidden sm:flex p-2.5 rounded-xl border transition-all cursor-pointer items-center justify-center ${
                currentView === 'dashboard'
                  ? 'bg-slate-800 border-yellow-400/60 text-yellow-400 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Dashboard de Contratos"
            >
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botão de Gestão de Templates (Padrões Supabase) - escondido no mobile pra caber Sair/Novo */}
            <button
              onClick={onOpenTemplateManager}
              className="hidden sm:flex p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer items-center justify-center hover:border-slate-700"
              title="Gerenciar Templates Padrão do Supabase"
            >
              <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botão de Configurações */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center hover:border-slate-700"
              title="Configurações (Backup, Reset, etc)"
            >
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botão de Sair */}
            <button
              onClick={onSignOut}
              className="shrink-0 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center hover:border-slate-700"
              title="Sair"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botão "+ Novo" em Destaque com Amarelo Ouro Efeito Dourado */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                className="btn-gold text-slate-950 font-extrabold text-xs sm:text-sm px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.8]" />
                <span>Novo</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isNewMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menu Dropdown de Criação Rápida */}
              {isNewMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNewMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Selecione a Modalidade
                    </div>

                    <button
                      onClick={() => {
                        setIsNewMenuOpen(false);
                        onNewContract('venda_vista');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-yellow-50 hover:text-yellow-900 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0 border border-yellow-200">
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Venda à Vista</div>
                        <div className="text-[10px] text-slate-500 font-normal">Quitação integral do imóvel</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsNewMenuOpen(false);
                        onNewContract('venda_parcelada');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                        <CalendarClock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Venda Parcelada</div>
                        <div className="text-[10px] text-slate-500 font-normal">Entrada e parcelas com reserva</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsNewMenuOpen(false);
                        onNewContract('exclusividade');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-yellow-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Exclusividade</div>
                        <div className="text-[10px] text-slate-500 font-normal">Comissão e monitor de prazos</div>
                      </div>
                    </button>

                    {onOpenTemplateManager && (
                      <div className="sm:hidden">
                        <button
                          onClick={() => {
                            setIsNewMenuOpen(false);
                            onOpenTemplateManager();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-yellow-50 hover:text-yellow-900 rounded-xl transition-colors cursor-pointer"
                        >
                          <Settings2 className="w-4 h-4 text-yellow-600 shrink-0" />
                          <span>Gerenciar Modelos (Bucket)</span>
                        </button>
                      </div>
                    )}

                    {onOpenWordTemplates && (
                      <div className="pt-1.5 border-t border-slate-100 mt-1">
                        <button
                          onClick={() => {
                            setIsNewMenuOpen(false);
                            onOpenWordTemplates();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-yellow-50 hover:text-yellow-900 rounded-xl transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-yellow-600 shrink-0" />
                          <span>Gerenciar Modelos Word (.docx)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};



