import React, { useState } from 'react';
import QRCode from 'qrcode';
import {
  Menu,
  X,
  LayoutGrid,
  LogOut,
  Sliders,
  FileText,
  Trash2,
  User,
  ArrowLeft,
  CheckCircle2,
  Settings2,
  QrCode,
  Copy,
} from 'lucide-react';

const PIX_KEY = '60659875000121';
const PIX_PAYLOAD = '00020126360014BR.GOV.BCB.PIX0114606598750001215204000053039865802BR5925Imobiliaria Geo Florestal6003stm62070503***63045E11';

interface NavbarProps {
  currentView: 'dashboard' | 'form' | 'viewer';
  onNavigateDashboard: () => void;
  onOpenSettings?: () => void;
  onOpenWordTemplates?: () => void;
  onOpenTemplateManager?: () => void;
  onOpenTrash?: () => void;
  contractCount: number;
  onSignOut?: () => void;
  userEmail?: string;
  userName?: string;
  canManageTemplates?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigateDashboard,
  onOpenSettings,
  onOpenWordTemplates,
  onOpenTemplateManager,
  onOpenTrash,
  contractCount,
  onSignOut,
  userEmail,
  userName,
  canManageTemplates = true,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  const openPixModal = async () => {
    setIsPixModalOpen(true);
    setPixCopied(false);
    if (!pixQrCode) {
      try {
        const dataUrl = await QRCode.toDataURL(PIX_PAYLOAD, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        setPixQrCode(dataUrl);
      } catch {
        setPixQrCode(null);
      }
    }
  };

  const handleCopyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setPixCopied(true);
    } catch {
      setPixCopied(false);
    }
  };

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
              LADO DIREITO: BOTÃO HAMBÚRGUER & MENU DO SISTEMA
             ======================================================== */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openPixModal}
              className="flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs uppercase tracking-wide shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Abrir QR Code e chave PIX"
              aria-label="Abrir PIX para recebimento"
            >
              <QrCode className="w-4 h-4" />
              <span>PIX</span>
            </button>
            
            {/* BOTÃO HAMBÚRGUER DO MENU */}
            <div className="relative shrink-0">
              <button
                id="main-hamburger-menu-btn"
                onClick={() => {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none shadow-sm active:scale-95 ${
                  isProfileMenuOpen
                    ? 'bg-slate-800 border-yellow-400 text-yellow-400 ring-2 ring-yellow-400/20'
                    : 'bg-slate-900 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white'
                }`}
                title={isProfileMenuOpen ? 'Fechar menu' : 'Abrir menu de navegação e ajustes'}
                aria-label="Menu principal"
                aria-expanded={isProfileMenuOpen}
              >
                {/* Ícone Hambúrguer / Fechar */}
                <div className="relative flex items-center justify-center w-5 h-5">
                  {isProfileMenuOpen ? (
                    <X className="w-5 h-5 stroke-[2.5] text-yellow-400 transition-transform duration-200 rotate-90 scale-105" />
                  ) : (
                    <Menu className="w-5 h-5 stroke-[2.5] text-yellow-400 transition-transform duration-200" />
                  )}
                </div>

                <span className="text-xs font-extrabold tracking-wide uppercase">
                  Menu
                </span>

                {/* Avatar Compacto com Inicial */}
                <div className="hidden xs:flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-black text-yellow-400 shrink-0">
                  {initial}
                </div>
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
                      {onOpenWordTemplates && canManageTemplates && (
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

      {isPixModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={() => setIsPixModalOpen(false)}
          role="presentation"
        >
          <section
            className="relative w-full max-w-md rounded-3xl bg-white p-5 sm:p-7 text-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pix-modal-title"
          >
            <button
              type="button"
              onClick={() => setIsPixModalOpen(false)}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              aria-label="Fechar PIX"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <QrCode className="h-6 w-6" />
              </div>
              <h2 id="pix-modal-title" className="text-xl font-black tracking-tight">Recebimento via PIX</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Imobiliária Geo Florestal</p>
            </div>

            <div className="mx-auto mt-5 flex min-h-[280px] w-full max-w-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-3">
              {pixQrCode ? (
                <img src={pixQrCode} alt="QR Code PIX da Imobiliária Geo Florestal" className="h-auto w-full" />
              ) : (
                <p className="text-sm text-slate-500">Não foi possível gerar o QR Code.</p>
              )}
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-xs">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Razão social</span><strong className="text-right">D Souza de Andrade Imóveis</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Banco</span><strong className="text-right">Santander</strong></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">CNPJ / Chave PIX</span><strong className="text-right">60.659.875/0001-21</strong></div>
            </div>

            <button
              type="button"
              onClick={handleCopyPixKey}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              {pixCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {pixCopied ? 'Chave PIX copiada' : 'Copiar chave PIX'}
            </button>
            <p className="mt-2 text-center text-[10px] text-slate-400">Confira o destinatário antes de confirmar o pagamento.</p>
          </section>
        </div>
      )}
    </header>
  );
};




