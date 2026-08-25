import React, { useState } from 'react';
import {
  ChevronDown,
  LayoutGrid,
  LogOut,
  Sliders,
  FileText,
  Trash2,
  User,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface NavbarProps {
  currentView: 'dashboard' | 'form' | 'viewer';
  onNavigateDashboard: () => void;
  onOpenSettings?: () => void;
  onOpenWordTemplates?: () => void;
  onOpenTrash?: () => void;
  contractCount: number;
  onSignOut?: () => void;
  userEmail?: string;
  userName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigateDashboard,
  onOpenSettings,
  onOpenWordTemplates,
  onOpenTrash,
  contractCount,
  onSignOut,
  userEmail,
  userName,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Iniciais do usuário para o avatar
  const displayName = userName || userEmail || 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg print:hidden w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          
          {/* ========================================================
              LADO ESQUERDO: LOGO & NOME DO SISTEMA
             ======================================================== */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              onClick={onNavigateDashboard}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none shrink-0"
              title="Ir para o Dashboard"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shadow-md shrink-0 overflow-hidden ring-1 ring-slate-700/80 group-hover:ring-yellow-400/60 transition-all">
                <img
                  src="/icon-512.png"
                  alt="Logo Contratos"
                  className="w-full h-full object-cover"
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

            {/* Botão de retorno rápido ao Dashboard quando estiver em formulário ou visualizador */}
            {currentView !== 'dashboard' && (
              <button
                onClick={onNavigateDashboard}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Início</span>
              </button>
            )}
          </div>

          {/* ========================================================
              LADO DIREITO: MENU DE PERFIL & AJUSTES UNIFICADO (AVATAR)
             ======================================================== */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* MENU UNIFICADO DE AJUSTES & PERFIL */}
            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                }}
                className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border transition-all cursor-pointer select-none ${
                  isProfileMenuOpen
                    ? 'bg-slate-800 border-yellow-400 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Ajustes, Modelos e Configurações"
              >
                {/* Avatar Circular com Inicial e Status Dot */}
                <div className="relative">
                  <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs text-yellow-400 shadow-xs">
                    {initial || <User className="w-4 h-4" />}
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-950 absolute -top-0.5 -right-0.5" />
                </div>

                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-200 leading-tight max-w-[100px] truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-none">
                    Menu & Ajustes
                  </span>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menu Flutuante Consolidado (Tudo organizado em 1 lugar) */}
              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 border border-slate-200 rounded-3xl shadow-2xl z-50 p-3 space-y-1.5 animate-in fade-in zoom-in-95">
                    
                    {/* Cabeçalho do Usuário */}
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-slate-950 truncate">
                            {displayName}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Supabase Nuvem Conectado</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Itens do Menu */}
                    <div className="space-y-1 text-xs font-semibold text-slate-700">
                      
                      {/* Dashboard */}
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onNavigateDashboard();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                          currentView === 'dashboard'
                            ? 'bg-amber-50 text-amber-950 font-bold border border-amber-200/60'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-bold">Painel / Dashboard</div>
                          <div className="text-[10px] text-slate-400 font-normal">{contractCount} contratos ativos</div>
                        </div>
                      </button>

                      {/* Central de Modelos Word (.docx) */}
                      {onOpenWordTemplates && (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenWordTemplates();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-800 transition-all cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center shrink-0 border border-yellow-200">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-bold text-slate-900">Modelos Word (.docx)</div>
                            <div className="text-[10px] text-slate-500 font-normal">Matrizes, tags e upload</div>
                          </div>
                        </button>
                      )}

                      {/* Ajustes & Backups */}
                      {onOpenSettings && (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenSettings();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-800 transition-all cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                            <Sliders className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-bold text-slate-900">Ajustes & Backups</div>
                            <div className="text-[10px] text-slate-500 font-normal">Exportação, banco e auditoria</div>
                          </div>
                        </button>
                      )}

                      {/* Lixeira */}
                      {onOpenTrash && (
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenTrash();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-800 transition-all cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-bold text-slate-900">Lixeira de Contratos</div>
                            <div className="text-[10px] text-slate-500 font-normal">Restauráveis por 30 dias</div>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Divisor e Botão de Sair */}
                    {onSignOut && (
                      <div className="pt-2 border-t border-slate-100 mt-2">
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onSignOut();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-700 transition-all cursor-pointer font-bold"
                        >
                          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                            <LogOut className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div>Encerrar Sessão</div>
                            <div className="text-[10px] text-rose-500/80 font-normal">Sair com segurança</div>
                          </div>
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




