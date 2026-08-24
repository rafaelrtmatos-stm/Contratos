import React, { useState } from 'react';
import { ContractType } from '../types/contract';
import {
  FileSignature,
  Plus,
  ChevronDown,
  LayoutGrid,
  Banknote,
  CalendarClock,
  ShieldCheck,
  UserPlus,
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
  isAdmin?: boolean;
  onOpenAdminPanel?: () => void;
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
  isAdmin,
  onOpenAdminPanel,
  onSignOut,
}) => {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800/80 sticky top-0 z-40 shadow-md print:hidden w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Logo e Nome do Sistema */}
          <div
            onClick={onNavigateDashboard}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none shrink-0"
            title="Ir para o Dashboard"
          >
            {/* Ícone com fundo branco e cantos arredondados */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-sm shrink-0">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-green-600 to-slate-600 flex items-center justify-center text-white">
                <FileSignature className="w-5 h-5" />
              </div>
            </div>
            
            <div className="min-w-0">
              <span className="font-extrabold text-base sm:text-lg text-white tracking-tight block leading-tight">
                Contratos<span className="text-green-500">360</span>
              </span>
              <span className="text-[11px] sm:text-xs text-slate-300 font-medium truncate block max-w-[150px] sm:max-w-none">
                Contratos de Venda de Imóveis
              </span>
            </div>
          </div>

          {/* Botões de Acesso Rápido e Botão "+ Novo" */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Botão de Grade / Dashboard */}
            <button
              onClick={onNavigateDashboard}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                currentView === 'dashboard'
                  ? 'bg-[#1e2c56] border-green-500/50 text-green-400 shadow-xs'
                  : 'bg-[#101935] hover:bg-[#18254b] border-slate-700/60 text-slate-300 hover:text-white'
              }`}
              title="Dashboard de Contratos"
            >
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botão de Gestão de Templates (Padrões Supabase) */}
            <button
              onClick={onOpenTemplateManager}
              className="p-2.5 rounded-xl bg-[#101935] hover:bg-[#18254b] border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="Gerenciar Templates Padrão do Supabase"
            >
              <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botão de Configurações */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-[#101935] hover:bg-[#18254b] border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="Configurações (Backup, Reset, etc)"
            >
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botão de Adicionar Usuário (somente admin) */}
            {isAdmin && (
              <button
                onClick={onOpenAdminPanel}
                className="p-2.5 rounded-xl bg-[#101935] hover:bg-[#18254b] border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                title="Adicionar Usuário"
              >
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Botão de Sair */}
            <button
              onClick={onSignOut}
              className="p-2.5 rounded-xl bg-[#101935] hover:bg-[#18254b] border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title="Sair"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Botão "+ Novo" em Destaque com Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                className="bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-900/40 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Exclusividade</div>
                        <div className="text-[10px] text-slate-500 font-normal">Comissão e monitor de prazos</div>
                      </div>
                    </button>

                    {onOpenWordTemplates && (
                      <div className="pt-1.5 border-t border-slate-100 mt-1">
                        <button
                          onClick={() => {
                            setIsNewMenuOpen(false);
                            onOpenWordTemplates();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-green-600 shrink-0" />
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



