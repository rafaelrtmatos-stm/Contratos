import React, { useState, useMemo } from 'react';
import { ContractData, ContractType } from '../types/contract';
import {
  formatCurrency,
  formatDate,
  getExclusivityStatus,
} from '../utils/contractGenerators';
import { renderContractDocumentPdf } from '../utils/renderContractFromDocx';
import { buildPdfFileName } from '../utils/pdfFileName';
import { startSimulatedPdfProgress } from '../utils/pdfProgressSimulator';
import {
  downloadDocxContract,
} from '../utils/docxProcessor';
import {
  Home,
  CalendarDays,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  PenTool,
  Folder,
  Users,
  Building2,
  BarChart3,
  Search,
  Filter,
  FileDown,
  Trash2,
  Loader2,
  Eye,
  AlertTriangle,
  CheckCircle,
  Plus,
  MoreHorizontal,
  X,
  Sparkles,
  Layers,
  Banknote,
  CalendarClock,
  FileSignature,
  FileCheck,
  Check,
  Car,
  CheckCircle2,
  ArrowUpDown,
  UserCheck,
  Clock3,
  AlertCircle,
  CalendarRange,
} from 'lucide-react';

interface DashboardProps {
  contracts: ContractData[];
  onSelectContract: (contract: ContractData) => void;
  onNewContract: (type?: ContractType) => void;
  onDeleteContract: (contractId: string) => void;
  onSignContractDirect: (contract: ContractData) => void;
  onOpenWordTemplates?: () => void;
  canDeleteContracts?: boolean;
  canViewFinanceiro?: boolean;
}

/** Indica se a parte (vendedor/contratante ou comprador/contratado) já assinou o contrato. */
function partySigned(contract: ContractData, side: 'vendedor' | 'comprador'): boolean {
  if (!contract.assinaturas || contract.assinaturas.length === 0) return false;
  return contract.assinaturas.some((s) => {
    if (s.role === 'ambos') return true;
    if (side === 'vendedor') return s.role === 'vendedor';
    return s.role === 'comprador' || s.role === 'comprador_adicional';
  });
}

/** Extrai iniciais de um nome (ex: "Alacid Lisboa" -> "AL") */
function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Badge moderna de Modalidade de Contrato */
const ModernModalidadeBadge: React.FC<{ contract: ContractData }> = ({ contract }) => {
  if (contract.tipo === 'venda_vista') {
    const isImovel = contract.subcategoria !== 'outros_bens';
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 font-bold text-[11px] shadow-2xs">
        <span className="w-5 h-5 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
          {isImovel ? <Home className="w-3 h-3 text-amber-900" /> : <Car className="w-3 h-3 text-amber-900" />}
        </span>
        <div className="flex items-center gap-1">
          <span>À Vista</span>
          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-950 uppercase tracking-tight">
            {isImovel ? 'Imóvel' : 'Móvel'}
          </span>
        </div>
      </div>
    );
  }

  if (contract.tipo === 'venda_parcelada') {
    const parcelas = contract.vendaParcelada?.numeroParcelas || '---';
    const isImovel = contract.subcategoria !== 'outros_bens';
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-[11px] shadow-2xs">
        <span className="w-5 h-5 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center shrink-0">
          {isImovel ? <CalendarDays className="w-3 h-3 text-yellow-400" /> : <Car className="w-3 h-3 text-yellow-400" />}
        </span>
        <div className="flex items-center gap-1">
          <span>Parcelada</span>
          <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-yellow-400 text-slate-950">
            {parcelas}x
          </span>
        </div>
      </div>
    );
  }

  if (contract.tipo === 'exclusividade') {
    const prazo = contract.exclusividade?.prazoMesesOuDias || '---';
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-950 font-bold text-[11px] shadow-2xs">
        <span className="w-5 h-5 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-3 h-3 text-slate-950 stroke-[2.5]" />
        </span>
        <div className="flex items-center gap-1">
          <span>Exclusividade</span>
          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-200/80 text-amber-950 font-mono">
            {prazo}d
          </span>
        </div>
      </div>
    );
  }

  return null;
};

/** Badge moderna de Status de Assinatura */
const ModernAssinaturaBadge: React.FC<{ contract: ContractData }> = ({ contract }) => {
  const isFullySigned = contract.status === 'assinado_total' || (contract.tipo === 'venda_vista' && (contract.assinaturas?.length || 0) >= 2);
  const sigCount = contract.assinaturas?.length || 0;
  const hasSignatures = sigCount > 0;

  if (isFullySigned) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-extrabold text-[11px] shadow-2xs">
        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
        <span>100% Assinado</span>
      </span>
    );
  }

  if (hasSignatures) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-extrabold text-[11px] shadow-2xs">
        <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
          <PenTool className="w-2.5 h-2.5 stroke-[2.5]" />
        </span>
        <span>Parcial ({sigCount}/2)</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-[11px]">
      <Clock3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span>Pendente (0/2)</span>
    </span>
  );
};

/** Componente moderno para visualização das Partes Envolvidas */
const ModernPartesEnvolvidas: React.FC<{ contract: ContractData }> = ({ contract }) => {
  const isExclusividade = contract.tipo === 'exclusividade';
  const label1 = isExclusividade ? 'Proprietário' : 'Vendedor';
  const label2 = isExclusividade ? 'Corretor' : 'Comprador';
  
  const nome1 = contract.vendedor?.nome || 'Não informado';
  const doc1 = contract.vendedor?.cpfCnpj || '';
  const signed1 = partySigned(contract, 'vendedor');

  const nome2 = contract.comprador?.nome || 'Não informado';
  const doc2 = isExclusividade
    ? (contract.comprador?.creci ? `CRECI ${contract.comprador.creci}` : contract.comprador?.cpfCnpj || '')
    : (contract.comprador?.cpfCnpj || '');
  const signed2 = partySigned(contract, 'comprador');

  return (
    <div className="space-y-2">
      {/* 1º Parte (Vendedor / Proprietário) */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative shrink-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black tracking-tight transition-colors ${
              signed1
                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title={`${label1}: ${nome1}`}
          >
            {getInitials(nome1)}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
              signed1 ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
              {label1}
            </span>
            <span className="font-extrabold text-slate-900 truncate text-[11px]" title={nome1}>
              {nome1}
            </span>
            {signed1 && (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 inline" title="Assinatura realizada" />
            )}
          </div>
          {doc1 && (
            <div className="text-[10px] font-mono text-slate-500 truncate leading-tight mt-0.5">
              {doc1}
            </div>
          )}
        </div>
      </div>

      {/* 2º Parte (Comprador / Corretor) */}
      <div className="flex items-center gap-2 min-w-0 pt-1 border-t border-slate-100">
        <div className="relative shrink-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black tracking-tight transition-colors ${
              signed2
                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title={`${label2}: ${nome2}`}
          >
            {getInitials(nome2)}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
              signed2 ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 shrink-0">
              {label2}
            </span>
            <span className="font-extrabold text-slate-900 truncate text-[11px]" title={nome2}>
              {nome2}
            </span>
            {signed2 && (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 inline" title="Assinatura realizada" />
            )}
          </div>
          {doc2 && (
            <div className="text-[10px] font-mono text-slate-500 truncate leading-tight mt-0.5">
              {doc2}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Bolinha de status simples */
const SignedDot: React.FC<{ signed: boolean }> = ({ signed }) => (
  <span
    className={`inline-block w-2 h-2 rounded-full shrink-0 ${signed ? 'bg-emerald-500' : 'bg-rose-500'}`}
    title={signed ? 'Assinado' : 'Pendente de assinatura'}
  />
);

/** Círculo de progresso (estilo "donut") com a porcentagem escrita no centro. */
const CircularProgress: React.FC<{
  percentage: number;
  colorClass: string; // cor do traço/número (classes tailwind, ex: 'text-yellow-600')
  trackClass?: string; // cor do trilho de fundo
  size?: number;
}> = ({ percentage, colorClass, trackClass = 'text-slate-200', size = 40 }) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          className={trackClass}
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-700 ease-out`}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-extrabold ${colorClass}`}>
        {Math.round(clamped)}%
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  contracts,
  onSelectContract,
  onNewContract,
  onDeleteContract,
  onSignContractDirect,
  onOpenWordTemplates,
  canDeleteContracts = true,
  canViewFinanceiro = true,
}) => {
  // Filtros principais
  const [selectedCategory, setSelectedCategory] = useState<ContractType | 'todos'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'assinados' | 'pendentes'>('todos');
  const [sortBy, setSortBy] = useState<'recentes' | 'antigos' | 'valor_maior' | 'valor_menor'>('recentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'este_mes' | 'ultimos_30' | 'este_ano' | 'todos'>('este_mes');
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inicio' | 'contratos' | 'vendas' | 'monitor'>('inicio');
  // Estados de Recolher/Expandir Seções do Dashboard (Toggle Acordeão)
  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);
  const [isNewActionsCollapsed, setIsNewActionsCollapsed] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isQuickActionsCollapsed, setIsQuickActionsCollapsed] = useState(false);
  const [isContractsListCollapsed, setIsContractsListCollapsed] = useState(false);

  // Modais de Ações Rápidas
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isMobileNewModalOpen, setIsMobileNewModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<ContractData | null>(null);
  const [isDeletingContract, setIsDeletingContract] = useState(false);

  // Baixar PDF direto da lista/card do contrato - gerado a partir do
  // .docx real (mesma fonte do botão Word), não mais um texto à parte.
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [downloadPdfProgress, setDownloadPdfProgress] = useState(0);
  const handleDownloadPdfDashboard = async (contract: ContractData) => {
    setDownloadingPdfId(contract.id);
    setDownloadPdfProgress(0);
    const cancelarProgresso = startSimulatedPdfProgress(setDownloadPdfProgress);
    try {
      const pdfBlob = await renderContractDocumentPdf(contract);
      cancelarProgresso();
      setDownloadPdfProgress(100);
      await new Promise((r) => setTimeout(r, 300));

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildPdfFileName(contract);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      cancelarProgresso();
      setDownloadingPdfId(null);
      setDownloadPdfProgress(0);
    }
  };

  // Baixar Word (.docx) direto da lista/card - mesma barra de progresso
  // simulada dos outros botões de download.
  const [downloadingDocxId, setDownloadingDocxId] = useState<string | null>(null);
  const [downloadDocxProgress, setDownloadDocxProgress] = useState(0);
  const handleDownloadDocxDashboard = async (contract: ContractData) => {
    setDownloadingDocxId(contract.id);
    setDownloadDocxProgress(0);
    const cancelarProgresso = startSimulatedPdfProgress(setDownloadDocxProgress);
    try {
      await downloadDocxContract(contract);
      cancelarProgresso();
      setDownloadDocxProgress(100);
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error('Erro ao gerar Word:', err);
    } finally {
      cancelarProgresso();
      setDownloadingDocxId(null);
      setDownloadDocxProgress(0);
    }
  };

  // Cálculos de Métricas
  const totalVendasAVista = contracts
    .filter((c) => c.tipo === 'venda_vista')
    .reduce((acc, c) => acc + (c.valorTotal || 0), 0);

  const countVendasAVista = contracts.filter((c) => c.tipo === 'venda_vista').length;

  const totalVendasParceladas = contracts
    .filter((c) => c.tipo === 'venda_parcelada')
    .reduce((acc, c) => acc + (c.valorTotal || 0), 0);

  const countVendasParceladas = contracts.filter((c) => c.tipo === 'venda_parcelada').length;

  const totalVendasGeral = totalVendasAVista + totalVendasParceladas;
  const countTotalVendas = countVendasAVista + countVendasParceladas;

  // Vendas Concluídas (Assinadas 100% ou Quitadas)
  const countVendasConcluidas = contracts.filter(
    (c) => c.status === 'assinado_total' || (c.tipo === 'venda_vista' && c.assinaturas.length >= 2)
  ).length;

  // Assinaturas Pendentes
  const pendingSignaturesCount = contracts.filter(
    (c) => c.status !== 'assinado_total' && (c.assinaturas?.length || 0) < 2
  ).length;

  // Métricas de Exclusividade
  const exclusivityContracts = contracts.filter((c) => c.tipo === 'exclusividade');
  const activeExclusivities = exclusivityContracts.filter((c) => {
    const status = getExclusivityStatus(c);
    return status.status === 'ativo' || status.status === 'alerta';
  });

  const activeOnlyExclusivities = exclusivityContracts.filter((c) => {
    const status = getExclusivityStatus(c);
    return status.status === 'ativo';
  });

  const expiringExclusivities = exclusivityContracts.filter(
    (c) => getExclusivityStatus(c).status === 'alerta'
  );

  const expiredExclusivities = exclusivityContracts.filter(
    (c) => getExclusivityStatus(c).status === 'vencido'
  );

  const totalComissaoExclusividades = exclusivityContracts.reduce((acc, c) => {
    const comissao = c.exclusividade?.valorComissaoEstimado || ((c.valorTotal || 0) * (c.exclusividade?.percentualComissao || 6)) / 100;
    return acc + comissao;
  }, 0);

  // Filtragem e Ordenação dos Contratos
  const filteredContracts = useMemo(() => {
    let result = contracts.filter((c) => {
      // Filtro de Categoria
      if (selectedCategory !== 'todos' && c.tipo !== selectedCategory) return false;

      // Filtro de Status de Assinatura
      if (statusFilter === 'assinados') {
        const isSigned = c.status === 'assinado_total' || (c.tipo === 'venda_vista' && (c.assinaturas?.length || 0) >= 2);
        if (!isSigned) return false;
      } else if (statusFilter === 'pendentes') {
        const isSigned = c.status === 'assinado_total' || (c.tipo === 'venda_vista' && (c.assinaturas?.length || 0) >= 2);
        if (isSigned) return false;
      }

      // Busca textual
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = (c.titulo || '').toLowerCase().includes(q);
        const matchDocNum = (c.numeroContrato || '').toLowerCase().includes(q);
        const matchVendedor = (c.vendedor?.nome || '').toLowerCase().includes(q) || (c.vendedor?.cpfCnpj || '').includes(q);
        const matchComprador = (c.comprador?.nome || '').toLowerCase().includes(q) || (c.comprador?.cpfCnpj || '').includes(q);
        const matchObjeto = (c.objetoDescricao || '').toLowerCase().includes(q) || (c.imovel?.nomeEmpreendimento || '').toLowerCase().includes(q);
        return matchTitle || matchDocNum || matchVendedor || matchComprador || matchObjeto;
      }

      return true;
    });

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === 'recentes') {
        return new Date(b.dataCriacao || 0).getTime() - new Date(a.dataCriacao || 0).getTime();
      }
      if (sortBy === 'antigos') {
        return new Date(a.dataCriacao || 0).getTime() - new Date(b.dataCriacao || 0).getTime();
      }
      if (sortBy === 'valor_maior') {
        return (b.valorTotal || 0) - (a.valorTotal || 0);
      }
      if (sortBy === 'valor_menor') {
        return (a.valorTotal || 0) - (b.valorTotal || 0);
      }
      return 0;
    });

    return result;
  }, [contracts, selectedCategory, statusFilter, searchTerm, sortBy]);

  const timeFilterLabels: Record<string, string> = {
    este_mes: 'Este mês',
    ultimos_30: 'Últimos 30 dias',
    este_ano: 'Este ano',
    todos: 'Todo o período',
  };

  const scrollToContracts = () => {
    const elem = document.getElementById('contracts-list-section');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToExclusivity = () => {
    const elem = document.getElementById('exclusivity-monitor-section');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    } else {
      scrollToContracts();
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. CARD PRINCIPAL (PAINEL PRINCIPAL) */}
      <section className="bg-white rounded-[2rem] p-5 sm:p-7 border border-slate-200 shadow-sm relative overflow-hidden transition-all">
        {/* Barra de controle / Header com Botão de Recolher */}
        <div className="flex items-center justify-between gap-3 relative z-20">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-extrabold text-yellow-600 uppercase tracking-wider block">
              PAINEL PRINCIPAL
            </span>
            {isBannerCollapsed && (
              <span className="text-xs sm:text-sm font-extrabold text-slate-800 ml-1 truncate">
                • Dashboard de Contratos & Vendas
              </span>
            )}
          </div>
          <button
            onClick={() => setIsBannerCollapsed(!isBannerCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
            title={isBannerCollapsed ? 'Expandir painel principal' : 'Recolher painel principal'}
          >
            <span className="hidden xs:inline text-[11px]">
              {isBannerCollapsed ? 'Expandir' : 'Recolher'}
            </span>
            {isBannerCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>
        </div>

        {!isBannerCollapsed && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 mt-3 pt-1 animate-in fade-in duration-200">
            <div className="flex-1 space-y-2.5 max-w-xl text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
                Dashboard de Contratos & Vendas
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                Gere contratos de venda, acompanhe suas negociações e gerencie prazos de exclusividade de forma ágil, segura e profissional.
              </p>
            </div>

            {/* Elemento Visual 3D de Contrato & Assinatura */}
            <div className="relative w-44 h-40 sm:w-56 sm:h-44 flex items-center justify-center shrink-0">
              {/* Folha do Contrato com Linhas e Sombra Suave */}
              <div className="relative w-32 sm:w-36 h-40 sm:h-44 bg-gradient-to-b from-white to-slate-50 rounded-2xl border border-slate-200 shadow-xl shadow-slate-300/40 p-3.5 flex flex-col justify-between transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="space-y-2">
                  {/* Linhas de cabeçalho do documento */}
                  <div className="h-2 w-12 bg-yellow-300 rounded-full"></div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full"></div>
                  <div className="h-1.5 w-4/5 bg-slate-200 rounded-full"></div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full"></div>
                  <div className="h-1.5 w-3/4 bg-slate-200 rounded-full"></div>
                </div>

                {/* Linha de Assinatura com Tinta Grafite */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="h-5 flex items-center">
                    <svg viewBox="0 0 100 25" className="w-20 h-5 text-yellow-600">
                      <path
                        d="M 5,18 Q 15,4 25,12 T 45,8 T 65,16 T 85,10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="h-1 w-full bg-slate-200 rounded-full mt-0.5"></div>
                </div>
              </div>

              {/* Escudo Amarelo Ouro Efeito Dourado com Checkmark */}
              <div className="absolute -bottom-1 -left-2 sm:-left-4 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 text-slate-950 flex items-center justify-center shadow-lg shadow-yellow-500/30 border-2 border-white transform -rotate-6">
                <ShieldCheck className="w-8 h-8 sm:w-9 sm:h-9 text-slate-950 stroke-[2.5]" />
              </div>

              {/* Caneta Inclinada Grafite com Ponta Ouro */}
              <div className="absolute -top-1 -right-1 sm:right-1 transform rotate-45">
                <div className="w-4 h-14 bg-gradient-to-b from-slate-800 to-slate-950 rounded-full shadow-md flex flex-col items-center justify-between p-0.5 border border-white">
                  <div className="w-2 h-3 bg-white/30 rounded-full"></div>
                  <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[6px] border-t-yellow-400"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. TRÊS AÇÕES PRINCIPAIS DE CRIAÇÃO (DIRETAS E VISÍVEIS) */}
      <section className="space-y-3.5 sm:space-y-4">
        {/* Cabeçalho com botão de recolher/expandir */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
            CRIAR NOVO CONTRATO
          </span>
          <button
            onClick={() => setIsNewActionsCollapsed(!isNewActionsCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title={isNewActionsCollapsed ? 'Expandir opções de criação' : 'Recolher opções de criação'}
          >
            <span>{isNewActionsCollapsed ? 'Expandir' : 'Recolher'}</span>
            {isNewActionsCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>
        </div>

        {!isNewActionsCollapsed && (
          <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-200">
            {/* Card 1: Venda à Vista - Amarelo Ouro com Efeito Dourado */}
            <div
              onClick={() => onNewContract('venda_vista')}
              className="w-full rounded-[1.75rem] p-4 sm:p-5 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20 hover:shadow-lg hover:shadow-yellow-500/30 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-4 group border border-yellow-400"
              role="button"
              title="Criar Contrato de Venda à Vista"
            >
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                {/* Ícone dentro de círculo grafite/preto */}
                <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-slate-950 text-yellow-400 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                  <Home className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-950 leading-snug">
                      Iniciar Venda à Vista
                    </h2>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-950 text-yellow-400 text-[10px] font-bold">
                      Quitação Imediata
                    </span>
                  </div>
                  <p className="text-slate-900/90 text-xs sm:text-sm font-medium line-clamp-1 mt-0.5">
                    Contratos à vista para Imóveis e Outros Bens (veículos, embarcações, etc.)
                  </p>
                </div>
              </div>

              {/* Botão de seta redonda à direita */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950 text-yellow-400 flex items-center justify-center shadow-xs shrink-0 group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-5 h-5 stroke-[2.8]" />
              </div>
            </div>

            {/* Card 2: Venda Parcelada - Cinza Grafite Escuro */}
            <div
              onClick={() => onNewContract('venda_parcelada')}
              className="w-full rounded-[1.75rem] p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md shadow-slate-900/20 hover:shadow-lg hover:shadow-slate-900/30 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-4 group border border-slate-800"
              role="button"
              title="Criar Contrato de Venda Parcelada"
            >
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                {/* Ícone dentro de círculo branco */}
                <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-snug">
                      Iniciar Venda Parcelada
                    </h2>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                      Reserva de Domínio
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm font-medium line-clamp-1 mt-0.5">
                    Contratos parcelados com reserva de domínio e cronograma de parcelas
                  </p>
                </div>
              </div>

              {/* Botão de seta redonda à direita */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-xs shrink-0 group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-5 h-5 stroke-[2.8]" />
              </div>
            </div>

            {/* Card 3: Exclusividade - Preto / Grafite com Ouro */}
            <div
              onClick={() => onNewContract('exclusividade')}
              className="w-full rounded-[1.75rem] p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-md shadow-slate-950/25 hover:shadow-lg hover:shadow-slate-950/35 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-4 group border border-slate-800"
              role="button"
              title="Criar Contrato de Exclusividade com Monitor de Prazos"
            >
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                {/* Ícone dentro de círculo amarelo ouro com efeito dourado */}
                <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform font-bold">
                  <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-snug">
                      Contrato de Exclusividade
                    </h2>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 text-[10px] font-bold border border-yellow-400/40">
                      Corretor & Prazos
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm font-medium line-clamp-1 mt-0.5">
                    Autorização de venda com exclusividade e controle automático de vigência.
                  </p>
                </div>
              </div>

              {/* Botão de seta redonda à direita */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center shadow-xs shrink-0 group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-5 h-5 stroke-[2.8]" />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. RESUMO GERAL */}
      <section className="bg-white rounded-[1.75rem] p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 transition-all">
        {/* Cabeçalho do Resumo com Filtro e Botão de Recolher */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-yellow-600 stroke-[2.5]" />
            <span className="text-xs font-extrabold text-yellow-600 uppercase tracking-wider">
              RESUMO GERAL
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Período */}
            <div className="relative">
              <button
                onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{timeFilterLabels[timeFilter]}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isTimeFilterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsTimeFilterOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-40 text-xs font-medium space-y-0.5 animate-in fade-in zoom-in-95">
                    {(['este_mes', 'ultimos_30', 'este_ano', 'todos'] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setTimeFilter(key);
                          setIsTimeFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                          timeFilter === key
                            ? 'bg-yellow-50 text-yellow-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{timeFilterLabels[key]}</span>
                        {timeFilter === key && <Check className="w-3.5 h-3.5 text-yellow-600 font-bold" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Botão Recolher/Expandir Resumo Geral */}
            <button
              onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              title={isSummaryCollapsed ? 'Expandir Resumo Geral' : 'Recolher Resumo Geral'}
            >
              <span className="hidden xs:inline text-[11px]">{isSummaryCollapsed ? 'Expandir' : 'Recolher'}</span>
              {isSummaryCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        {!isSummaryCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-1 animate-in fade-in duration-200">
            {/* Coluna Esquerda: Total em Vendas */}
            <div className="md:col-span-5 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                TOTAL EM VENDAS
              </span>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight">
                {formatCurrency(totalVendasGeral)}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                <span className="font-bold text-yellow-600">{countTotalVendas}</span> contratos de venda gerados
              </p>
            </div>

            {/* Divisor Vertical */}
            <div className="hidden md:block md:col-span-1 h-20 border-r border-slate-200 justify-self-center"></div>

            {/* Coluna Direita: Grade 2x2 de Indicadores */}
            <div className="md:col-span-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:gap-x-6 sm:gap-y-4">
              {/* 1. Contratos Gerados */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center shrink-0 border border-yellow-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-extrabold text-slate-950 leading-tight">
                    {contracts.length}
                  </div>
                  <div className="text-xs text-slate-500 font-medium leading-tight">
                    Contratos Gerados
                  </div>
                </div>
              </div>

              {/* 2. Vendas Concluídas */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-extrabold text-slate-950 leading-tight">
                    {countVendasConcluidas}
                  </div>
                  <div className="text-xs text-slate-500 font-medium leading-tight">
                    Vendas Concluídas
                  </div>
                </div>
              </div>

              {/* 3. Prazos de Exclusividade */}
              <div
                onClick={scrollToExclusivity}
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 active:scale-95 transition-all group"
                title="Ver Monitor de Prazos de Exclusividade"
                role="button"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center shrink-0 border border-yellow-200 group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-extrabold text-slate-950 leading-tight flex items-center gap-1.5">
                    <span>{exclusivityContracts.length}</span>
                    {expiringExclusivities.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Existem contratos vencendo em até 15 dias" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium leading-tight group-hover:text-yellow-700 transition-colors">
                    Prazos de Exclusividade
                  </div>
                </div>
              </div>

              {/* 4. Assinaturas Pendentes */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-extrabold text-slate-950 leading-tight">
                    {pendingSignaturesCount}
                  </div>
                  <div className="text-xs text-slate-500 font-medium leading-tight">
                    Assinaturas Pendentes
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. AÇÕES RÁPIDAS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
            AÇÕES RÁPIDAS
          </span>
          <button
            onClick={() => setIsQuickActionsCollapsed(!isQuickActionsCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title={isQuickActionsCollapsed ? 'Expandir Ações Rápidas' : 'Recolher Ações Rápidas'}
          >
            <span>{isQuickActionsCollapsed ? 'Expandir' : 'Recolher'}</span>
            {isQuickActionsCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
          </button>
        </div>

        {!isQuickActionsCollapsed && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3.5 animate-in fade-in duration-200">
            {/* Card 1: Meus Contratos */}
            <button
              onClick={scrollToContracts}
              className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 text-center shadow-xs transition-all cursor-pointer min-h-[82px] sm:min-h-[96px] group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center group-hover:scale-105 transition-transform border border-yellow-200">
                <Folder className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                Meus Contratos
              </span>
            </button>

            {/* Card 2: Clientes */}
            <button
              onClick={() => setIsClientsModalOpen(true)}
              className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 text-center shadow-xs transition-all cursor-pointer min-h-[82px] sm:min-h-[96px] group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                Clientes
              </span>
            </button>

            {/* Card 3: Imóveis */}
            <button
              onClick={() => setIsPropertiesModalOpen(true)}
              className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 text-center shadow-xs transition-all cursor-pointer min-h-[82px] sm:min-h-[96px] group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center group-hover:scale-105 transition-transform border border-yellow-200">
                <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                Imóveis
              </span>
            </button>

            {/* Card 4: Relatórios */}
            <button
              onClick={() => setIsReportsModalOpen(true)}
              className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 text-center shadow-xs transition-all cursor-pointer min-h-[82px] sm:min-h-[96px] group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                Relatórios
              </span>
            </button>

            {/* Card 5: Modelos Word */}
            {onOpenWordTemplates && (
              <button
                onClick={onOpenWordTemplates}
                className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 text-center shadow-xs transition-all cursor-pointer min-h-[82px] sm:min-h-[96px] group col-span-2 sm:col-span-1"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-slate-950 flex items-center justify-center group-hover:scale-105 transition-transform font-bold shadow-xs">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                  Modelos Word
                </span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* 5. LISTA COMPLETA DE CONTRATOS REGISTRADOS (REDESIGN MODERNO & MOBILE-FIRST) */}
      <section id="contracts-list-section" className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 transition-all">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center border border-yellow-200">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight">
                Contratos Registrados
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                {filteredContracts.length} de {contracts.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Gerencie, exporte em Word (.docx), PDF (.pdf) ou colete assinaturas digitais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Barra de Busca e Ordenação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 sm:flex-initial">
              {/* Input de Busca com Botão de Limpeza */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar contrato, cliente, nº..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Seletor de Ordenação */}
              <div className="relative shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="recentes">Mais recentes</option>
                    <option value="antigos">Mais antigos</option>
                    <option value="valor_maior">Maior valor</option>
                    <option value="valor_menor">Menor valor</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Botão Recolher/Expandir Lista de Contratos */}
            <button
              onClick={() => setIsContractsListCollapsed(!isContractsListCollapsed)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
              title={isContractsListCollapsed ? 'Expandir Lista de Contratos' : 'Recolher Lista de Contratos'}
            >
              <span className="hidden xs:inline">{isContractsListCollapsed ? 'Expandir' : 'Recolher'}</span>
              {isContractsListCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        {!isContractsListCollapsed && (
          <div className="space-y-4 animate-in fade-in duration-200">

        {/* Barra de Filtros: Categorias e Status de Assinatura (100% Responsivo sem rolagem lateral) */}
        <div className="space-y-3">
          {/* 1. Filtros por Categoria de Contrato - Grid responsivo de 4 botões (2 colunas em celular, 4 colunas em tela maior) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
            {/* Todos */}
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between sm:justify-center gap-2 cursor-pointer border ${
                selectedCategory === 'todos'
                  ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Layers className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'todos' ? 'text-yellow-400' : 'text-slate-500'}`} />
                <span className="truncate">Todos</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                selectedCategory === 'todos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {contracts.length}
              </span>
            </button>

            {/* À Vista */}
            <button
              onClick={() => setSelectedCategory('venda_vista')}
              className={`px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between sm:justify-center gap-2 cursor-pointer border ${
                selectedCategory === 'venda_vista'
                  ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 text-slate-950 border-yellow-400 shadow-sm'
                  : 'bg-amber-50/50 text-amber-950 hover:bg-amber-100/60 border-amber-200/70 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Home className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'venda_vista' ? 'text-slate-950' : 'text-amber-800'}`} />
                <span className="truncate">À Vista</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                selectedCategory === 'venda_vista' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-200 text-amber-950'
              }`}>
                {countVendasAVista}
              </span>
            </button>

            {/* Parcelada */}
            <button
              onClick={() => setSelectedCategory('venda_parcelada')}
              className={`px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between sm:justify-center gap-2 cursor-pointer border ${
                selectedCategory === 'venda_parcelada'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'venda_parcelada' ? 'text-yellow-400' : 'text-slate-500'}`} />
                <span className="truncate">Parcelada</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                selectedCategory === 'venda_parcelada' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {countVendasParceladas}
              </span>
            </button>

            {/* Exclusividade */}
            <button
              onClick={() => setSelectedCategory('exclusividade')}
              className={`px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between sm:justify-center gap-2 cursor-pointer border ${
                selectedCategory === 'exclusividade'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${selectedCategory === 'exclusividade' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className="truncate">Exclusividade</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                selectedCategory === 'exclusividade' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {exclusivityContracts.length}
              </span>
            </button>
          </div>

          {/* 2. Filtros por Status de Assinatura - Ajuste Automático e Fluido sem Barra Lateral */}
          <div className="flex flex-col xs:flex-row xs:items-center gap-2 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
              <Filter className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Status:</span>
            </div>
            
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center ${
                  statusFilter === 'todos'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('assinados')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  statusFilter === 'assinados'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">Assinados</span>
                <span className="text-[10px] opacity-90 shrink-0">({countVendasConcluidas})</span>
              </button>
              <button
                onClick={() => setStatusFilter('pendentes')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  statusFilter === 'pendentes'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50/80 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock3 className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">Pendentes</span>
                <span className="text-[10px] opacity-90 shrink-0">({pendingSignaturesCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Contratos */}
        {filteredContracts.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 flex items-center justify-center mx-auto border border-slate-200 shadow-xs">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-sm">Nenhum contrato encontrado</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm || selectedCategory !== 'todos' || statusFilter !== 'todos'
                  ? 'Nenhum contrato corresponde aos filtros ou busca selecionados.'
                  : 'Você ainda não possui contratos gerados. Crie seu primeiro contrato clicando nas opções acima.'}
              </p>
            </div>
            {(searchTerm || selectedCategory !== 'todos' || statusFilter !== 'todos') && (
              <button
                onClick={() => {
                  setSelectedCategory('todos');
                  setStatusFilter('todos');
                  setSearchTerm('');
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-all"
              >
                Limpar Todos os Filtros
              </button>
            )}
          </div>
        ) : (
          /* LISTA DE CONTRATOS 100% RESPONSIVA (Sem rolagem lateral em nenhum dispositivo) */
          <div className="space-y-3.5">
            {filteredContracts.map((contract) => {
              const isFullySigned = contract.status === 'assinado_total' || (contract.tipo === 'venda_vista' && (contract.assinaturas?.length || 0) >= 2);
              const isVendaVista = contract.tipo === 'venda_vista';
              const isParcelada = contract.tipo === 'venda_parcelada';

              return (
                <div
                  key={contract.id}
                  className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col relative"
                >
                  {/* Linha de Destaque Superior Colorida por Tipo */}
                  <div
                    className={`h-1.5 w-full ${
                      isVendaVista
                        ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500'
                        : isParcelada
                        ? 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900'
                        : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600'
                    }`}
                  />

                  <div className="p-3.5 sm:p-4 lg:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
                    {/* Bloco 1: Informações do Contrato (Badges, Título, Identificador, Data) */}
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Badges e Identificadores */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <ModernModalidadeBadge contract={contract} />
                        <ModernAssinaturaBadge contract={contract} />
                        <span className="font-mono bg-slate-900 text-white px-2 py-0.5 rounded-lg font-bold text-[10px] tracking-tight">
                          {contract.numeroContrato}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          {formatDate(contract.dataCriacao)}
                        </span>
                      </div>

                      {/* Título do Contrato */}
                      <div>
                        <h4
                          onClick={() => onSelectContract(contract)}
                          className="font-extrabold text-sm sm:text-base text-slate-950 hover:text-yellow-700 transition-colors cursor-pointer leading-snug break-words"
                        >
                          {contract.titulo}
                        </h4>
                      </div>
                    </div>

                    {/* Bloco 2: Partes Envolvidas & Valor Total */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 shrink-0">
                      {/* Caixa das Partes Envolvidas */}
                      <div className="bg-slate-50/90 rounded-2xl p-2.5 sm:p-3 border border-slate-200/70 sm:w-64 lg:max-w-xs">
                        <ModernPartesEnvolvidas contract={contract} />
                      </div>

                      {/* Faixa Financeira */}
                      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl p-3 sm:px-4 sm:py-3 flex flex-col justify-center border border-slate-800 shadow-2xs sm:min-w-[130px] text-left">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
                          Valor Total
                        </span>
                        <span className="text-base font-black text-white tracking-tight">
                          {canViewFinanceiro ? formatCurrency(contract.valorTotal) : '••••••'}
                        </span>
                        {contract.tipo === 'venda_parcelada' && contract.vendaParcelada?.numeroParcelas && (
                          <span className="text-[10px] text-yellow-400 font-bold block mt-0.5">
                            {contract.vendaParcelada.numeroParcelas}x parcelas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bloco 3: Barra de Ações (Todos os Ícones 100% Visíveis Sem Rolagem Lateral) */}
                    <div className="flex items-center gap-1.5 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-end flex-wrap sm:flex-nowrap shrink-0">
                      {/* 1. Botão Ver / Visualizar */}
                      <button
                        onClick={() => onSelectContract(contract)}
                        className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl btn-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                        title="Visualizar Contrato Completo"
                      >
                        <Eye className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                        <span>Ver</span>
                      </button>

                      {/* 2. Botão Word (.docx) */}
                      <button
                        onClick={() => !isFullySigned && handleDownloadDocxDashboard(contract)}
                        disabled={isFullySigned || downloadingDocxId === contract.id}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border active:scale-95 cursor-pointer ${
                          isFullySigned
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                        }`}
                        title={isFullySigned ? 'Indisponível: contrato já assinado digitalmente' : 'Baixar documento Word (.docx)'}
                      >
                        {downloadingDocxId === contract.id ? (
                          <CircularProgress percentage={downloadDocxProgress} colorClass="text-slate-700" size={18} />
                        ) : (
                          <>
                            <FileDown className={`w-4 h-4 ${isFullySigned ? 'text-slate-300' : 'text-slate-700'}`} />
                            <span className="hidden sm:inline text-[11px]">Word</span>
                          </>
                        )}
                      </button>

                      {/* 3. Botão PDF (.pdf) */}
                      <button
                        onClick={() => handleDownloadPdfDashboard(contract)}
                        disabled={downloadingPdfId === contract.id}
                        className="px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                        title="Baixar PDF Oficial com Selos (.pdf)"
                      >
                        {downloadingPdfId === contract.id ? (
                          <CircularProgress percentage={downloadPdfProgress} colorClass="text-slate-700" size={18} />
                        ) : (
                          <>
                            <FileText className="w-4 h-4 text-slate-700" />
                            <span className="hidden sm:inline text-[11px]">PDF</span>
                          </>
                        )}
                      </button>

                      {/* 4. Botão Assinar / Assinado */}
                      {isFullySigned ? (
                        <button
                          onClick={() => onSelectContract(contract)}
                          className="px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Contrato 100% Assinado"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                          <span className="hidden sm:inline text-[11px]">Assinado</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSignContractDirect(contract)}
                          className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-yellow-400 text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
                          title="Assinar com Carimbo Digital"
                        >
                          <PenTool className="w-4 h-4 text-yellow-400 stroke-[2.5]" />
                          <span className="hidden sm:inline text-[11px]">Assinar</span>
                        </button>
                      )}

                      {/* 5. Botão Excluir */}
                      {canDeleteContracts && (
                        <button
                          onClick={() => setContractToDelete(contract)}
                          className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer active:scale-95"
                          title="Mover para Lixeira"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        )}
      </section>

      {/* MODAIS COMPLEMENTARES DE AÇÕES RÁPIDAS */}

      {/* Modal Clientes */}
      {isClientsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-950 text-base">Clientes Registrados</h3>
                  <p className="text-xs text-slate-500">Compradores e vendedores dos contratos</p>
                </div>
              </div>
              <button
                onClick={() => setIsClientsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {contracts.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{c.vendedor.nome} (1º Titular)</span>
                    <span className="font-mono text-[11px] text-slate-500">{c.vendedor.cpfCnpj}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>{c.comprador.nome} (2º Titular)</span>
                    <span className="font-mono text-[11px] text-slate-500">{c.comprador.cpfCnpj}</span>
                  </div>
                  <div className="text-[10px] text-yellow-700 font-semibold pt-1 border-t border-slate-200 flex justify-between">
                    <span>Ref: {c.numeroContrato} - {c.titulo}</span>
                    <span>{canViewFinanceiro ? formatCurrency(c.valorTotal) : '••••••'}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsClientsModalOpen(false)}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Imóveis */}
      {isPropertiesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center border border-yellow-200">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-950 text-base">Imóveis e Lotes</h3>
                  <p className="text-xs text-slate-500">Unidades cadastradas nos instrumentos contratuais</p>
                </div>
              </div>
              <button
                onClick={() => setIsPropertiesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {contracts.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <div className="font-bold text-slate-900">
                    {c.imovel?.nomeEmpreendimento || 'Imóvel Individual'} • Quadra {c.imovel?.numeroQuadra || '---'}, Lote {c.imovel?.numeroLote || '---'}
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Área: {c.imovel?.areaTotalM2 ? `${c.imovel.areaTotalM2} m²` : 'Não especificada'} • Matrícula: {c.imovel?.matriculaRegistro || '---'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Localização: {c.cidadeAssinatura}/{c.ufAssinatura}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsPropertiesModalOpen(false)}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Relatórios */}
      {isReportsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-yellow-50 text-yellow-700 flex items-center justify-center border border-yellow-200">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-950 text-base">Relatório de Desempenho</h3>
                  <p className="text-xs text-slate-500">Balanço das vendas e comissões do período</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center justify-between">
                <div>
                  <span className="text-yellow-950 font-bold block">Vendas à Vista</span>
                  <span className="text-yellow-800 text-[11px]">{countVendasAVista} contratos liquidados</span>
                </div>
                <span className="text-base font-extrabold text-yellow-950">{formatCurrency(totalVendasAVista)}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-950 font-bold block">Vendas Parceladas</span>
                  <span className="text-slate-700 text-[11px]">{countVendasParceladas} contratos sob parcelamento</span>
                </div>
                <span className="text-base font-extrabold text-slate-950">{formatCurrency(totalVendasParceladas)}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-900 font-bold block">Contratos sob Exclusividade</span>
                  <span className="text-slate-700 text-[11px]">{activeExclusivities.length} ativos para promoção</span>
                </div>
                <span className="text-base font-extrabold text-slate-950">{exclusivityContracts.length} contratos</span>
              </div>
            </div>

            <button
              onClick={() => setIsReportsModalOpen(false)}
              className="w-full py-2.5 btn-gold text-slate-950 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* Modal Mobile "+ Novo" */}
      {isMobileNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-slate-950 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-950 text-base">Novo Contrato</h3>
                  <p className="text-xs text-slate-500">Escolha a modalidade jurídica</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setIsMobileNewModalOpen(false);
                  onNewContract('venda_vista');
                }}
                className="w-full p-3.5 rounded-2xl bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-950 text-sm">Venda à Vista</div>
                    <div className="text-[11px] text-slate-600">Quitação integral imediata</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-yellow-600" />
              </button>

              <button
                onClick={() => {
                  setIsMobileNewModalOpen(false);
                  onNewContract('venda_parcelada');
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-950 text-sm">Venda Parcelada</div>
                    <div className="text-[11px] text-slate-600">Entrada + parcelas mensais</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>

              <button
                onClick={() => {
                  setIsMobileNewModalOpen(false);
                  onNewContract('exclusividade');
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-white text-sm">Exclusividade</div>
                    <div className="text-[11px] text-slate-300">Corretagem com monitor de prazos</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-yellow-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mobile "Mais" */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-950 text-base">Menu do Sistema</h3>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsClientsModalOpen(true);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center gap-2 font-bold text-slate-800"
              >
                <Users className="w-4 h-4 text-yellow-600" />
                <span>Clientes</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsPropertiesModalOpen(true);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center gap-2 font-bold text-slate-800"
              >
                <Home className="w-4 h-4 text-yellow-600" />
                <span>Imóveis</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsReportsModalOpen(true);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center gap-2 font-bold text-slate-800"
              >
                <BarChart3 className="w-4 h-4 text-yellow-600" />
                <span>Relatórios</span>
              </button>

              {onOpenWordTemplates && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenWordTemplates();
                  }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center gap-2 font-bold text-slate-800"
                >
                  <FileText className="w-4 h-4 text-yellow-600" />
                  <span>Modelos Word</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (100% confiável no iframe) */}
      {contractToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  Mover Contrato para a Lixeira?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O contrato <strong className="text-slate-800 font-bold">"{contractToDelete.titulo}"</strong> será removido do painel principal e guardado na Lixeira por 30 dias, podendo ser restaurado a qualquer momento.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span className="font-semibold">Partes:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">
                  {contractToDelete.locador?.nome || contractToDelete.vendedor?.nome || 'Proprietário'} / {contractToDelete.locatario?.nome || contractToDelete.comprador?.nome || 'Cliente'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-semibold">Valor Total:</span>
                <span className="font-bold text-slate-900">{formatCurrency(contractToDelete.valorTotal)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingContract}
                onClick={() => setContractToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingContract}
                onClick={async () => {
                  try {
                    setIsDeletingContract(true);
                    await onDeleteContract(contractToDelete.id);
                    setContractToDelete(null);
                  } catch (err) {
                    console.error('Erro ao excluir:', err);
                  } finally {
                    setIsDeletingContract(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {isDeletingContract ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Mover para Lixeira</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
