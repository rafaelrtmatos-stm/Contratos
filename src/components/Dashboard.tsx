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

/** Bolinha de status: verde = assinou, vermelho = pendente. */
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
}) => {
  // Filtros principais
  const [selectedCategory, setSelectedCategory] = useState<ContractType | 'todos'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'assinados' | 'pendentes'>('todos');
  const [sortBy, setSortBy] = useState<'recentes' | 'antigos' | 'valor_maior' | 'valor_menor'>('recentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'este_mes' | 'ultimos_30' | 'este_ano' | 'todos'>('este_mes');
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inicio' | 'contratos' | 'vendas' | 'monitor'>('inicio');
  const [exclusivityFilter, setExclusivityFilter] = useState<'todos' | 'ativos' | 'alerta' | 'vencidos'>('todos');

  // Modais de Ações Rápidas
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isMobileNewModalOpen, setIsMobileNewModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

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
      const nomeClientePdf =
        (contract.tipo === 'exclusividade' ? contract.vendedor?.nome : contract.comprador?.nome) ||
        contract.imovel?.nomeEmpreendimento ||
        'documento';
      a.download = buildPdfFileName(nomeClientePdf);
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

  const filteredExclusivityContracts = useMemo(() => {
    return exclusivityContracts.filter((c) => {
      const statusInfo = getExclusivityStatus(c);
      if (exclusivityFilter === 'ativos') return statusInfo.status === 'ativo';
      if (exclusivityFilter === 'alerta') return statusInfo.status === 'alerta';
      if (exclusivityFilter === 'vencidos') return statusInfo.status === 'vencido';
      return true;
    });
  }, [exclusivityContracts, exclusivityFilter]);

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
      <section className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex-1 space-y-2.5 max-w-xl text-left">
            <span className="text-[11px] sm:text-xs font-extrabold text-yellow-600 uppercase tracking-wider block">
              PAINEL PRINCIPAL
            </span>
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
      </section>

      {/* TRÊS AÇÕES PRINCIPAIS DE CRIAÇÃO (DIRETAS E VISÍVEIS) */}
      <section className="space-y-3.5 sm:space-y-4">
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
      </section>

      {/* 3. RESUMO GERAL */}
      <section className="bg-white rounded-[1.75rem] p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        {/* Cabeçalho do Resumo com Filtro */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-yellow-600 stroke-[2.5]" />
            <span className="text-xs font-extrabold text-yellow-600 uppercase tracking-wider">
              RESUMO GERAL
            </span>
          </div>

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
        </div>

        {/* Layout do Resumo Geral: Total em Vendas à Esquerda e Grade 2x2 à Direita */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
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
      </section>

      {/* 4. AÇÕES RÁPIDAS */}
      <section className="space-y-3">
        <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block px-1">
          AÇÕES RÁPIDAS
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3.5">
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
      </section>

      {/* 5. MONITOR DE PRAZOS DE EXCLUSIVIDADE (REDESIGN MODERNO, ERGONÔMICO & MOBILE-FIRST) */}
      {exclusivityContracts.length > 0 && (
        <section
          id="exclusivity-monitor-section"
          className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5"
        >
          {/* Cabeçalho do Monitor */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200 shrink-0 shadow-xs">
                <Clock3 className="w-5 h-5 stroke-[2.3]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight">
                    Monitor de Prazos de Exclusividade
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold border border-amber-200">
                    {exclusivityContracts.length} {exclusivityContracts.length === 1 ? 'contrato' : 'contratos'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Controle de vigência em tempo real, contagem regressiva de prazos e comissões estimadas.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNewContract('exclusividade')}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl btn-gold text-slate-950 text-xs font-extrabold shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer self-start sm:self-auto shrink-0"
              title="Novo Contrato de Exclusividade"
            >
              <Plus className="w-4 h-4 stroke-[2.8]" />
              <span>Nova Exclusividade</span>
            </button>
          </div>

          {/* Banner Inteligente de Alertas (Se houver contratos vencendo em até 15 dias) */}
          {expiringExclusivities.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 via-amber-100/60 to-yellow-50 border border-amber-300 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-amber-950 leading-snug">
                    {expiringExclusivities.length === 1
                      ? '1 contrato de exclusividade vence em menos de 15 dias!'
                      : `${expiringExclusivities.length} contratos de exclusividade vencem em menos de 15 dias!`}
                  </div>
                  <p className="text-[11px] sm:text-xs text-amber-800 font-medium mt-0.5">
                    Programe a renovação com o proprietário ou acelere o fechamento das negociações em andamento.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setExclusivityFilter('alerta')}
                className="px-3 py-1.5 rounded-lg bg-amber-900 text-white hover:bg-amber-950 text-xs font-bold transition-all cursor-pointer shrink-0 self-end sm:self-auto"
              >
                Ver Contratos em Alerta
              </button>
            </div>
          )}

          {/* KPIs de Exclusividade (Grid Compacto e Responsivo) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {/* Card 1: Total */}
            <div className="p-3 sm:p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-slate-950 leading-tight">
                  {exclusivityContracts.length}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                  Total Registrado
                </div>
              </div>
            </div>

            {/* Card 2: Vigentes */}
            <div className="p-3 sm:p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-emerald-950 leading-tight">
                  {activeOnlyExclusivities.length}
                </div>
                <div className="text-[10px] sm:text-xs text-emerald-700 font-medium truncate">
                  Vigência Normal
                </div>
              </div>
            </div>

            {/* Card 3: Vencendo em Breve */}
            <div className="p-3 sm:p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 stroke-[2.3]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-amber-950 leading-tight">
                  {expiringExclusivities.length}
                </div>
                <div className="text-[10px] sm:text-xs text-amber-700 font-medium truncate">
                  Vence &lt; 15 dias
                </div>
              </div>
            </div>

            {/* Card 4: Honorários Estimados Totais */}
            <div className="p-3 sm:p-3.5 bg-yellow-50/70 rounded-2xl border border-yellow-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
                <Banknote className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-slate-950 leading-tight truncate">
                  {formatCurrency(totalComissaoExclusividades)}
                </div>
                <div className="text-[10px] sm:text-xs text-yellow-800 font-medium truncate">
                  Honorários Estimados
                </div>
              </div>
            </div>
          </div>

          {/* Filtro Rápido por Status de Vigência */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
            <button
              onClick={() => setExclusivityFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 border ${
                exclusivityFilter === 'todos'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todos ({exclusivityContracts.length})
            </button>

            <button
              onClick={() => setExclusivityFilter('ativos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 border ${
                exclusivityFilter === 'ativos'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Vigentes ({activeOnlyExclusivities.length})
            </button>

            <button
              onClick={() => setExclusivityFilter('alerta')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 border ${
                exclusivityFilter === 'alerta'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
            >
              Em Alerta ({expiringExclusivities.length})
            </button>

            <button
              onClick={() => setExclusivityFilter('vencidos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 border ${
                exclusivityFilter === 'vencidos'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              Vencidos ({expiredExclusivities.length})
            </button>
          </div>

          {/* Lista / Grid de Cards de Exclusividade */}
          {filteredExclusivityContracts.length === 0 ? (
            <div className="py-8 px-4 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                Nenhum contrato de exclusividade encontrado para o filtro selecionado.
              </p>
              <button
                onClick={() => setExclusivityFilter('todos')}
                className="text-xs font-extrabold text-yellow-700 hover:underline cursor-pointer"
              >
                Limpar filtro e ver todos ({exclusivityContracts.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
              {filteredExclusivityContracts.map((contract) => {
                const statusInfo = getExclusivityStatus(contract);
                const ex = contract.exclusividade;
                const isSignedTotal = contract.status === 'assinado_total' || (contract.assinaturas && contract.assinaturas.length >= 2);
                const comissaoEstimada = ex?.valorComissaoEstimado || ((contract.valorTotal || 0) * (ex?.percentualComissao || 6)) / 100;
                
                // Status visual
                const isExpired = statusInfo.status === 'vencido';
                const isAlert = statusInfo.status === 'alerta';

                return (
                  <div
                    key={contract.id}
                    className="group relative rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Borda Superior com Cor de Status */}
                    <div
                      className={`h-1.5 w-full bg-gradient-to-r ${
                        isExpired
                          ? 'from-rose-500 via-rose-600 to-red-600'
                          : isAlert
                          ? 'from-amber-400 via-amber-500 to-yellow-500'
                          : 'from-emerald-400 via-emerald-500 to-teal-500'
                      }`}
                    />

                    <div className="p-4 sm:p-5 space-y-3.5 flex-1">
                      {/* Topo do Card: Status de Vigência + Assinatura + Número */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Badge de Status de Vigência */}
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${statusInfo.badgeColor}`}
                          >
                            {isExpired ? (
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            ) : isAlert ? (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <Clock3 className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{statusInfo.label}</span>
                          </span>

                          {/* Badge de Assinatura */}
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isSignedTotal
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <SignedDot signed={Boolean(isSignedTotal)} />
                            <span>{isSignedTotal ? '100% Assinado' : 'Pendente de Assinatura'}</span>
                          </span>
                        </div>

                        {/* Número do Contrato */}
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {contract.numeroContrato}
                        </span>
                      </div>

                      {/* Título da Exclusividade & Dados do Imóvel */}
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-950 leading-snug group-hover:text-amber-900 transition-colors">
                          {contract.titulo}
                        </h4>
                        
                        {/* Identificação do Imóvel / Endereço */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Home className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="line-clamp-1 font-medium">
                            {contract.imovel?.nomeEmpreendimento || contract.imovel?.localizacaoImovel || contract.imovel?.enderecoLote || 'Imóvel em Santarém/PA'}
                          </span>
                        </div>
                      </div>

                      {/* Bloco das Partes (Proprietário e Corretor) */}
                      <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <SignedDot signed={partySigned(contract, 'vendedor')} />
                            <span className="font-bold text-slate-900 truncate">
                              Proprietário: {contract.vendedor.nome}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">
                            {contract.vendedor.cpfCnpj}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <SignedDot signed={partySigned(contract, 'comprador')} />
                            <span className="font-medium text-slate-700 truncate">
                              Corretor: {contract.comprador.nome}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 shrink-0">
                            {contract.comprador.creci || contract.comprador.rg || 'CRECI'}
                          </span>
                        </div>
                      </div>

                      {/* Barra Visual de Vigência / Progresso Temporal */}
                      <div className="space-y-1.5 bg-slate-50/50 rounded-xl p-2.5 border border-slate-100">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-slate-400" />
                            Início: {formatDate(ex?.dataInicio || '')}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarRange className="w-3 h-3 text-slate-400" />
                            Término: {formatDate(ex?.dataTermino || '')}
                          </span>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isExpired
                                ? 'bg-rose-500'
                                : isAlert
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${statusInfo.progressoPercentual}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{statusInfo.progressoPercentual}% do período decorrido</span>
                          <span className="font-bold text-slate-700">
                            {isExpired
                              ? `Expirado (${statusInfo.totalDias} dias totais)`
                              : `${statusInfo.diasRestantes} de ${statusInfo.totalDias} dias restantes`}
                          </span>
                        </div>
                      </div>

                      {/* Bloco Financeiro e Comissão */}
                      <div className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/60 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Valor de Venda</div>
                          <div className="font-extrabold text-slate-950 text-sm">
                            {formatCurrency(contract.valorTotal)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-amber-800 font-extrabold uppercase">
                            Honorários ({ex?.percentualComissao || 6}%)
                          </div>
                          <div className="font-black text-amber-900 text-sm">
                            {formatCurrency(comissaoEstimada)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ações Rápidas do Card de Exclusividade (Touch-First) */}
                    <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 space-y-2">
                      {/* Botão Primário: Visualizar Contrato */}
                      <button
                        onClick={() => onSelectContract(contract)}
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
                      >
                        <Eye className="w-4 h-4 text-yellow-400" />
                        <span>Visualizar Contrato Completo</span>
                      </button>

                      {/* Grid de Ações Secundárias */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {/* Word (.docx) */}
                        <button
                          onClick={() => handleDownloadDocxDashboard(contract)}
                          disabled={downloadingDocxId === contract.id}
                          className="min-h-[36px] px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="Baixar Contrato no formato Word (.docx)"
                        >
                          <FileDown className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            {downloadingDocxId === contract.id ? `${downloadDocxProgress}%` : 'Word (.docx)'}
                          </span>
                        </button>

                        {/* PDF Oficial (.pdf) */}
                        <button
                          onClick={() => handleDownloadPdfDashboard(contract)}
                          disabled={downloadingPdfId === contract.id}
                          className="min-h-[36px] px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="Baixar PDF Oficial com carimbos"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-600" />
                          <span>
                            {downloadingPdfId === contract.id ? `${downloadPdfProgress}%` : 'PDF (.pdf)'}
                          </span>
                        </button>

                        {/* Assinar */}
                        <button
                          onClick={() => onSignContractDirect(contract)}
                          className="min-h-[36px] px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Assinar digitalmente"
                        >
                          <PenTool className="w-3.5 h-3.5 text-amber-700" />
                          <span>Assinar</span>
                        </button>

                        {/* Excluir */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Deseja excluir permanentemente o contrato "${contract.titulo}"?`)) {
                              onDeleteContract(contract.id);
                            }
                          }}
                          className="min-h-[36px] px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Excluir contrato"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 6. LISTA COMPLETA DE CONTRATOS REGISTRADOS (REDESIGN MODERNO & MOBILE-FIRST) */}
      <section id="contracts-list-section" className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
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

          {/* Barra de Busca e Ordenação */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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
        </div>

        {/* Barra de Filtros: Categorias e Status de Assinatura */}
        <div className="space-y-2.5">
          {/* 1. Filtros por Categoria de Contrato */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedCategory === 'todos'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span>Todos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === 'todos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {contracts.length}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('venda_vista')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedCategory === 'venda_vista'
                  ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 text-slate-950 shadow-sm border border-yellow-400'
                  : 'bg-yellow-50/70 text-yellow-900 hover:bg-yellow-100/70 border border-yellow-200/50'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>À Vista</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === 'venda_vista' ? 'bg-slate-950/20 text-slate-950' : 'bg-yellow-100 text-yellow-900'
              }`}>
                {countVendasAVista}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('venda_parcelada')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedCategory === 'venda_parcelada'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70 border border-slate-200/50'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Parcelada</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === 'venda_parcelada' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {countVendasParceladas}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('exclusividade')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedCategory === 'exclusividade'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70 border border-slate-200/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-500" />
              <span>Exclusividade</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === 'exclusividade' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {exclusivityContracts.length}
              </span>
            </button>
          </div>

          {/* 2. Filtros por Status de Assinatura */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Status:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'todos'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('assinados')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'assinados'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>100% Assinados</span>
                <span className="text-[10px] opacity-80">({countVendasConcluidas})</span>
              </button>
              <button
                onClick={() => setStatusFilter('pendentes')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'pendentes'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock3 className="w-3 h-3 text-amber-500" />
                <span>Pendentes</span>
                <span className="text-[10px] opacity-80">({pendingSignaturesCount})</span>
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
          <>
            {/* VERSÃO MOBILE: Cards Otimizados para Touch com Visual Executivo Moderno */}
            <div className="block md:hidden space-y-3.5">
              {filteredContracts.map((contract) => {
                const hasSignatures = contract.assinaturas && contract.assinaturas.length > 0;
                const isFullySigned = contract.status === 'assinado_total' || (contract.tipo === 'venda_vista' && (contract.assinaturas?.length || 0) >= 2);
                const isVendaVista = contract.tipo === 'venda_vista';
                const isParcelada = contract.tipo === 'venda_parcelada';
                const isExclusividade = contract.tipo === 'exclusividade';

                return (
                  <div
                    key={contract.id}
                    className="rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col relative"
                  >
                    {/* Linha de Destaque Superior Colorida por Tipo */}
                    <div
                      className={`h-1.5 w-full ${
                        isVendaVista
                          ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500'
                          : isParcelada
                          ? 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900'
                          : 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600'
                      }`}
                    />

                    <div className="p-4 space-y-3.5">
                      {/* Topo do Card: Badge de Modalidade + Status de Assinatura */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Tag de Modalidade com Ícone */}
                        <div className="shrink-0">
                          {isVendaVista && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-50 text-yellow-950 font-bold text-[11px] border border-yellow-300/80">
                              {contract.subcategoria === 'outros_bens' ? (
                                <>
                                  <Car className="w-3.5 h-3.5 text-yellow-700 shrink-0" />
                                  <span>À Vista (Bens Móveis)</span>
                                </>
                              ) : (
                                <>
                                  <Home className="w-3.5 h-3.5 text-yellow-700 shrink-0" />
                                  <span>À Vista (Imóvel)</span>
                                </>
                              )}
                            </span>
                          )}
                          {isParcelada && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-300/80">
                              {contract.subcategoria === 'outros_bens' ? (
                                <>
                                  <Car className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                                  <span>Parcelada ({contract.vendaParcelada?.numeroParcelas || '---'}x)</span>
                                </>
                              ) : (
                                <>
                                  <CalendarDays className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                                  <span>Parcelada ({contract.vendaParcelada?.numeroParcelas || '---'}x)</span>
                                </>
                              )}
                            </span>
                          )}
                          {isExclusividade && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-300/80">
                              <ShieldCheck className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
                              <span>Exclusividade ({contract.exclusividade?.prazoMesesOuDias || '---'}d)</span>
                            </span>
                          )}
                        </div>

                        {/* Status de Assinatura */}
                        <div className="shrink-0">
                          {isFullySigned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Assinado
                            </span>
                          ) : hasSignatures ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-extrabold">
                              <PenTool className="w-3 h-3 text-amber-600" /> Parcial ({contract.assinaturas.length}/2)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                              <Clock3 className="w-3 h-3 text-slate-400" /> Pendente
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Título do Contrato & Identificador */}
                      <div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-semibold text-[10px]">
                            {contract.numeroContrato}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(contract.dataCriacao)}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-950 mt-1 leading-snug break-words">
                          {contract.titulo}
                        </h4>
                      </div>

                      {/* Caixa de Informações: Partes & Valores */}
                      <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 space-y-2.5">
                        {/* 1º e 2º Titulares com Indicador de Assinatura */}
                        <div className="space-y-1.5 text-xs">
                          {/* 1º Titular */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                              {isExclusividade ? 'Contratante:' : '1º Titular:'}
                            </span>
                            <div className="flex items-center gap-1.5 min-w-0 text-right">
                              <SignedDot signed={partySigned(contract, 'vendedor')} />
                              <span className="font-semibold text-slate-800 truncate text-[11px]">
                                {contract.vendedor?.nome || '---'}
                              </span>
                            </div>
                          </div>

                          {/* 2º Titular */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                              {isExclusividade ? 'Corretor:' : '2º Titular:'}
                            </span>
                            <div className="flex items-center gap-1.5 min-w-0 text-right">
                              <SignedDot signed={partySigned(contract, 'comprador')} />
                              <span className="font-semibold text-slate-800 truncate text-[11px]">
                                {contract.comprador?.nome || '---'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Faixa Financeira */}
                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500">Valor Total:</span>
                          <span className="text-sm sm:text-base font-black text-slate-950">
                            {formatCurrency(contract.valorTotal)}
                          </span>
                        </div>
                      </div>

                      {/* BARRA DE AÇÕES MOBILE (Ergonomia Touch-First) */}
                      <div className="space-y-2 pt-1">
                        {/* Botão Primário: Visualizar Contrato */}
                        <button
                          onClick={() => onSelectContract(contract)}
                          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 hover:from-yellow-400 hover:to-yellow-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer border border-yellow-400"
                        >
                          <Eye className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                          <span>Visualizar Contrato Completo</span>
                        </button>

                        {/* Grid de Ações Secundárias (Word, PDF, Assinar, Excluir) */}
                        <div className="grid grid-cols-4 gap-2">
                          {/* 1. Botão Word (.docx) */}
                          <button
                            onClick={() => !isFullySigned && handleDownloadDocxDashboard(contract)}
                            disabled={isFullySigned || downloadingDocxId === contract.id}
                            className={`min-h-[42px] py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all border ${
                              isFullySigned
                                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 active:scale-95 cursor-pointer'
                            }`}
                            title={isFullySigned ? 'Indisponível: contrato já assinado digitalmente (use o PDF)' : 'Baixar documento Word (.docx)'}
                          >
                            {downloadingDocxId === contract.id ? (
                              <CircularProgress percentage={downloadDocxProgress} colorClass="text-slate-700" size={22} />
                            ) : (
                              <>
                                <FileDown className={`w-4 h-4 ${isFullySigned ? 'text-slate-300' : 'text-slate-700'}`} />
                                <span>Word</span>
                              </>
                            )}
                          </button>

                          {/* 2. Botão PDF (.pdf) */}
                          <button
                            onClick={() => handleDownloadPdfDashboard(contract)}
                            disabled={downloadingPdfId === contract.id}
                            className="min-h-[42px] py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                            title="Baixar PDF Oficial com Selos"
                          >
                            {downloadingPdfId === contract.id ? (
                              <CircularProgress percentage={downloadPdfProgress} colorClass="text-slate-700" size={22} />
                            ) : (
                              <>
                                <FileText className="w-4 h-4 text-slate-700" />
                                <span>PDF</span>
                              </>
                            )}
                          </button>

                          {/* 3. Botão Assinatura / Carimbo Digital */}
                          {isFullySigned ? (
                            <button
                              onClick={() => onSelectContract(contract)}
                              className="min-h-[42px] py-2 px-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer"
                              title="Contrato 100% Assinado"
                            >
                              <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                              <span>Assinado</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onSignContractDirect(contract)}
                              className="min-h-[42px] py-2 px-1 rounded-xl bg-yellow-50 hover:bg-yellow-100 text-yellow-950 border border-yellow-300 text-[10px] font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                              title="Assinar com Carimbo Digital"
                            >
                              <PenTool className="w-4 h-4 text-yellow-700" />
                              <span>Assinar</span>
                            </button>
                          )}

                          {/* 4. Botão Excluir */}
                          <button
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir o contrato "${contract.titulo}"?`)) {
                                onDeleteContract(contract.id);
                              }
                            }}
                            className="min-h-[42px] py-2 px-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                            title="Mover para Lixeira"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VERSÃO DESKTOP: Tabela Executiva Elegante */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Contrato / Título</th>
                    <th className="py-3 px-3">Modalidade</th>
                    <th className="py-3 px-3">Partes Envolvidas</th>
                    <th className="py-3 px-3">Valor Total</th>
                    <th className="py-3 px-3">Assinaturas</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {filteredContracts.map((contract) => {
                    const hasSignatures = contract.assinaturas && contract.assinaturas.length > 0;
                    const isFullySigned = contract.status === 'assinado_total' || (contract.tipo === 'venda_vista' && (contract.assinaturas?.length || 0) >= 2);

                    return (
                      <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Título & Número */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-950 text-sm">{contract.titulo}</div>
                          <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                              {contract.numeroContrato}
                            </span>
                            <span>•</span>
                            <span>{formatDate(contract.dataCriacao)}</span>
                          </div>
                        </td>

                        {/* Modalidade */}
                        <td className="py-3.5 px-3">
                          {contract.tipo === 'venda_vista' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-900 font-bold border border-yellow-300">
                              {contract.subcategoria === 'outros_bens' ? (
                                <>
                                  <Car className="w-3 h-3 text-yellow-700" /> Venda à Vista (Bens Móveis)
                                </>
                              ) : (
                                <>
                                  <Home className="w-3 h-3 text-yellow-700" /> Venda à Vista (Imóvel)
                                </>
                              )}
                            </span>
                          )}
                          {contract.tipo === 'venda_parcelada' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-300">
                              {contract.subcategoria === 'outros_bens' ? (
                                <>
                                  <Car className="w-3 h-3 text-slate-700" /> Venda Parcelada ({contract.vendaParcelada?.numeroParcelas || '---'}x)
                                </>
                              ) : (
                                <>
                                  <CalendarDays className="w-3 h-3 text-slate-700" /> Venda Parcelada ({contract.vendaParcelada?.numeroParcelas || '---'}x)
                                </>
                              )}
                            </span>
                          )}
                          {contract.tipo === 'exclusividade' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-300">
                              <ShieldCheck className="w-3 h-3 text-yellow-600" /> Exclusividade ({contract.exclusividade?.prazoMesesOuDias || '---'}d)
                            </span>
                          )}
                        </td>

                        {/* Partes */}
                        <td className="py-3.5 px-3">
                          <div className="font-medium text-slate-800 line-clamp-1 flex items-center gap-1.5">
                            <SignedDot signed={partySigned(contract, 'vendedor')} />
                            <span className="truncate">1º: {contract.vendedor?.nome || '---'}</span>
                          </div>
                          <div className="text-slate-500 text-[11px] line-clamp-1 flex items-center gap-1.5 mt-0.5">
                            <SignedDot signed={partySigned(contract, 'comprador')} />
                            <span className="truncate">2º: {contract.comprador?.nome || '---'}</span>
                          </div>
                        </td>

                        {/* Valor */}
                        <td className="py-3.5 px-3 font-extrabold text-slate-950">
                          {formatCurrency(contract.valorTotal)}
                        </td>

                        {/* Status de Assinatura */}
                        <td className="py-3.5 px-3">
                          {isFullySigned ? (
                            <span className="inline-flex items-center gap-1 text-emerald-900 font-bold text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 100% Assinado
                            </span>
                          ) : hasSignatures ? (
                            <span className="inline-flex items-center gap-1 text-amber-900 font-bold text-[11px] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              <PenTool className="w-3 h-3 text-amber-600" /> Parcial ({contract.assinaturas.length}/2)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 text-[11px] bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium">
                              <Clock3 className="w-3 h-3 text-slate-400" /> Pendente
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onSelectContract(contract)}
                              className="p-2 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-yellow-200"
                              title="Visualizar Contrato"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => !isFullySigned && handleDownloadDocxDashboard(contract)}
                              disabled={isFullySigned || downloadingDocxId === contract.id}
                              className={`p-2 min-w-[32px] rounded-xl transition-colors flex items-center justify-center border border-transparent ${
                                isFullySigned
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 cursor-pointer'
                              }`}
                              title={isFullySigned ? 'Indisponível: contrato já assinado digitalmente (use o PDF)' : 'Baixar Word (.docx)'}
                            >
                              {downloadingDocxId === contract.id ? (
                                <CircularProgress percentage={downloadDocxProgress} colorClass="text-slate-700" size={22} />
                              ) : (
                                <FileDown className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              onClick={() => handleDownloadPdfDashboard(contract)}
                              disabled={downloadingPdfId === contract.id}
                              className="p-2 min-w-[32px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 border border-transparent disabled:opacity-60 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                              title="Baixar PDF Oficial (.pdf)"
                            >
                              {downloadingPdfId === contract.id ? (
                                <CircularProgress percentage={downloadPdfProgress} colorClass="text-slate-700" size={22} />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </button>

                            {!isFullySigned && (
                              <button
                                onClick={() => onSignContractDirect(contract)}
                                className="p-2 text-slate-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-xl transition-colors cursor-pointer"
                                title="Assinar com Carimbo Digital"
                              >
                                <PenTool className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir o contrato "${contract.titulo}"?`)) {
                                  onDeleteContract(contract.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Mover para Lixeira"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
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
                    <span>{formatCurrency(c.valorTotal)}</span>
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
    </div>
  );
};
