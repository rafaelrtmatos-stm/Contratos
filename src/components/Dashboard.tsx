import React, { useState } from 'react';
import { ContractData, ContractType } from '../types/contract';
import {
  formatCurrency,
  formatDate,
  getExclusivityStatus,
  exportToPdf,
} from '../utils/contractGenerators';
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
} from 'lucide-react';

interface DashboardProps {
  contracts: ContractData[];
  onSelectContract: (contract: ContractData) => void;
  onNewContract: (type?: ContractType) => void;
  onDeleteContract: (contractId: string) => void;
  onSignContractDirect: (contract: ContractData) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  contracts,
  onSelectContract,
  onNewContract,
  onDeleteContract,
  onSignContractDirect,
}) => {
  // Filtros principais
  const [selectedCategory, setSelectedCategory] = useState<ContractType | 'todos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'este_mes' | 'ultimos_30' | 'este_ano' | 'todos'>('este_mes');
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inicio' | 'contratos' | 'vendas' | 'monitor'>('inicio');

  // Modais de Ações Rápidas
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isMobileNewModalOpen, setIsMobileNewModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

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

  const expiringExclusivities = exclusivityContracts.filter(
    (c) => getExclusivityStatus(c).status === 'alerta'
  );

  // Filtragem dos Contratos
  const filteredContracts = contracts.filter((c) => {
    if (selectedCategory !== 'todos' && c.tipo !== selectedCategory) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = c.titulo.toLowerCase().includes(q);
      const matchDocNum = c.numeroContrato.toLowerCase().includes(q);
      const matchVendedor = (c.vendedor?.nome || '').toLowerCase().includes(q) || (c.vendedor?.cpfCnpj || '').includes(q);
      const matchComprador = (c.comprador?.nome || '').toLowerCase().includes(q) || (c.comprador?.cpfCnpj || '').includes(q);
      const matchObjeto = (c.objetoDescricao || '').toLowerCase().includes(q) || (c.imovel?.nomeEmpreendimento || '').toLowerCase().includes(q);
      return matchTitle || matchDocNum || matchVendedor || matchComprador || matchObjeto;
    }

    return true;
  });

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

  return (
    <div className="space-y-5 sm:space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto">
      {/* 1. CARD PRINCIPAL (PAINEL PRINCIPAL) */}
      <section className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex-1 space-y-2.5 max-w-xl text-left">
            <span className="text-[11px] sm:text-xs font-extrabold text-green-600 uppercase tracking-wider block">
              PAINEL PRINCIPAL
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Dashboard de Contratos & Vendas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
              Gere contratos de venda, acompanhe suas vendas e gerencie prazos de exclusividade de forma simples e segura.
            </p>
          </div>

          {/* Elemento Visual 3D de Contrato & Assinatura (Fiel à Referência) */}
          <div className="relative w-44 h-40 sm:w-56 sm:h-44 flex items-center justify-center shrink-0">
            {/* Folha do Contrato com Linhas e Sombra Suave */}
            <div className="relative w-32 sm:w-36 h-40 sm:h-44 bg-gradient-to-b from-white to-slate-50 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-300/40 p-3.5 flex flex-col justify-between transform rotate-2 hover:rotate-0 transition-transform duration-300">
              <div className="space-y-2">
                {/* Linhas de cabeçalho do documento */}
                <div className="h-2 w-12 bg-green-100 rounded-full"></div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full"></div>
                <div className="h-1.5 w-4/5 bg-slate-200 rounded-full"></div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full"></div>
                <div className="h-1.5 w-3/4 bg-slate-200 rounded-full"></div>
              </div>

              {/* Linha de Assinatura com Tinta Azul */}
              <div className="pt-2 border-t border-slate-100">
                <div className="h-5 flex items-center">
                  <svg viewBox="0 0 100 25" className="w-20 h-5 text-green-600">
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

            {/* Escudo 3D Azul com Checkmark */}
            <div className="absolute -bottom-1 -left-2 sm:-left-4 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 border-2 border-white transform -rotate-6">
              <ShieldCheck className="w-8 h-8 sm:w-9 sm:h-9 text-white stroke-[2.5]" />
            </div>

            {/* Caneta 3D Inclinada */}
            <div className="absolute -top-1 -right-1 sm:right-1 transform rotate-45">
              <div className="w-4 h-14 bg-gradient-to-b from-green-600 to-green-800 rounded-full shadow-md flex flex-col items-center justify-between p-0.5 border border-white">
                <div className="w-2 h-3 bg-white/40 rounded-full"></div>
                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[6px] border-t-amber-400"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRÊS AÇÕES PRINCIPAIS (EMPILHADOS VERTICALMENTE) */}
      <section className="space-y-3.5 sm:space-y-4">
        {/* Card 1: Venda à Vista */}
        <div
          onClick={() => onNewContract('venda_vista')}
          className="w-full rounded-[1.75rem] p-4 sm:p-5 bg-gradient-to-r from-[#1e5ae6] via-[#2d6df6] to-[#407eff] text-white shadow-md shadow-blue-600/15 hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-4 group"
          role="button"
          title="Criar Contrato de Venda à Vista"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Ícone dentro de círculo branco */}
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-white text-green-600 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
              <Home className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 stroke-[2]" />
            </div>
            <div className="min-w-0 text-left">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
                1. Venda à Vista
              </h2>
              <p className="text-white/90 text-xs sm:text-sm font-medium line-clamp-1 mt-0.5">
                Contratos à vista para Imóveis e Outros Bens (veículos, etc.)
              </p>
            </div>
          </div>

          {/* Botão de seta redonda à direita */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-green-600 flex items-center justify-center shadow-xs shrink-0 group-hover:translate-x-1 transition-transform">
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Card 2: Venda Parcelada */}
        <div
          onClick={() => onNewContract('venda_parcelada')}
          className="w-full rounded-[1.75rem] p-4 sm:p-5 bg-gradient-to-r from-[#0da776] via-[#10b981] to-[#22c55e] text-white shadow-md shadow-emerald-600/15 hover:shadow-lg hover:shadow-emerald-600/25 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-4 group"
          role="button"
          title="Criar Contrato de Venda Parcelada"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Ícone dentro de círculo branco */}
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
              <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 stroke-[2]" />
            </div>
            <div className="min-w-0 text-left">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
                2. Venda Parcelada
              </h2>
              <p className="text-white/90 text-xs sm:text-sm font-medium line-clamp-1 mt-0.5">
                Contratos parcelados com reserva de domínio (Imóveis e Bens Móveis)
              </p>
            </div>
          </div>

          {/* Botão de seta redonda à direita */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-xs shrink-0 group-hover:translate-x-1 transition-transform">
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Card 3: Exclusividade */}
        <div
          onClick={() => onNewContract('exclusividade')}
          className="w-full rounded-[1.75rem] p-4 sm:p-5 bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#a855f7] text-white shadow-md shadow-slate-600/15 hover:shadow-lg hover:shadow-slate-600/25 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-4 group"
          role="button"
          title="Criar Contrato de Exclusividade com Monitor de Prazos"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Ícone dentro de círculo branco */}
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-white text-slate-600 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-slate-600 stroke-[2]" />
            </div>
            <div className="min-w-0 text-left">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
                3. Exclusividade
              </h2>
              <p className="text-white/90 text-xs sm:text-sm font-medium line-clamp-1 mt-0.5">
                Crie contratos de exclusividade e gerencie prazos.
              </p>
            </div>
          </div>

          {/* Botão de seta redonda à direita */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-slate-600 flex items-center justify-center shadow-xs shrink-0 group-hover:translate-x-1 transition-transform">
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
      </section>

      {/* 3. RESUMO GERAL */}
      <section className="bg-white rounded-[1.75rem] p-5 sm:p-6 border border-slate-100 shadow-sm space-y-5">
        {/* Cabeçalho do Resumo com Filtro */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-green-600 stroke-[2.5]" />
            <span className="text-xs font-extrabold text-green-600 uppercase tracking-wider">
              RESUMO GERAL
            </span>
          </div>

          {/* Seletor de Período */}
          <div className="relative">
            <button
              onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
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
                          ? 'bg-green-50 text-green-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{timeFilterLabels[key]}</span>
                      {timeFilter === key && <Check className="w-3.5 h-3.5 text-green-600" />}
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
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(totalVendasGeral)}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              <span className="font-bold text-green-600">{countTotalVendas}</span> contratos de venda gerados
            </p>
          </div>

          {/* Divisor Vertical */}
          <div className="hidden md:block md:col-span-1 h-20 border-r border-slate-100 justify-self-center"></div>

          {/* Coluna Direita: Grade 2x2 de Indicadores */}
          <div className="md:col-span-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:gap-x-6 sm:gap-y-4">
            {/* 1. Contratos Gerados */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 leading-tight">
                  {contracts.length}
                </div>
                <div className="text-xs text-slate-500 font-medium leading-tight">
                  Contratos Gerados
                </div>
              </div>
            </div>

            {/* 2. Vendas Concluídas */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 leading-tight">
                  {countVendasConcluidas}
                </div>
                <div className="text-xs text-slate-500 font-medium leading-tight">
                  Vendas Concluídas
                </div>
              </div>
            </div>

            {/* 3. Prazos de Exclusividade */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 leading-tight">
                  {activeExclusivities.length}
                </div>
                <div className="text-xs text-slate-500 font-medium leading-tight">
                  Prazos de Exclusividade
                </div>
              </div>
            </div>

            {/* 4. Assinaturas Pendentes */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 leading-tight">
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

        <div className="grid grid-cols-5 gap-2 sm:gap-3.5">
          {/* Card 1: Meus Contratos */}
          <button
            onClick={scrollToContracts}
            className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-100 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 text-center shadow-xs transition-all cursor-pointer min-h-[82px] sm:min-h-[96px] group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Folder className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">
              Meus Contratos
            </span>
          </button>

          {/* Card 2: Clientes */}
          <button
            onClick={() => setIsClientsModalOpen(true)}
            className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-100 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 text-center shadow-xs transition-all cursor-pointer min-h-[82px] sm:min-h-[96px] group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">
              Clientes
            </span>
          </button>

          {/* Card 3: Imóveis */}
          <button
            onClick={() => setIsPropertiesModalOpen(true)}
            className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-100 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 text-center shadow-xs transition-all cursor-pointer min-h-[82px] sm:min-h-[96px] group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">
              Imóveis
            </span>
          </button>

          {/* Card 4: Relatórios */}
          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-100 rounded-2xl p-2.5 sm:p-4 flex flex-col items-center justify-center gap-2 text-center shadow-xs transition-all cursor-pointer min-h-[82px] sm:min-h-[96px] group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">
              Relatórios
            </span>
          </button>

          {/* Removido: Card de Modelos (agora gerenciado pelo TemplateManager) */}
        </div>
      </section>

      {/* 5. MONITOR DE PRAZOS DE EXCLUSIVIDADE (SEÇÃO EXPANSÍVEL/EM DESTAQUE) */}
      {exclusivityContracts.length > 0 && (
        <section className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Monitor de Prazos de Exclusividade ({activeExclusivities.length} ativos)
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Acompanhe a vigência dos contratos de exclusividade e alertas de vencimento.
                </p>
              </div>
            </div>

            {expiringExclusivities.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-full text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{expiringExclusivities.length} contrato(s) vencendo em até 15 dias!</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {exclusivityContracts.map((contract) => {
              const statusInfo = getExclusivityStatus(contract);
              const ex = contract.exclusividade;

              return (
                <div
                  key={contract.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        {contract.numeroContrato}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                        {contract.titulo}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                        Proprietário: {contract.vendedor.nome}
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusInfo.badgeColor}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Barra de Progresso do Prazo */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Início: {formatDate(ex?.dataInicio || '')}</span>
                      <span>Término: {formatDate(ex?.dataTermino || '')}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          statusInfo.status === 'vencido'
                            ? 'bg-rose-500'
                            : statusInfo.status === 'alerta'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${statusInfo.progressoPercentual}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    <div className="text-slate-600">
                      Valor: <strong className="text-slate-900">{formatCurrency(contract.valorTotal)}</strong>
                      <span className="text-[10px] text-slate-700 ml-1 font-bold">
                        ({ex?.percentualComissao}% comissão)
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectContract(contract)}
                      className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-green-600" />
                      <span>Ver</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. LISTA COMPLETA DE CONTRATOS REGISTRADOS */}
      <section id="contracts-list-section" className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-green-600 shrink-0" />
              Contratos Registrados ({filteredContracts.length})
            </h3>
            <p className="text-xs text-slate-500">
              Visualize, exporte em Word (.docx), PDF (.pdf) ou assine digitalmente.
            </p>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Seletor de Categoria */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedCategory('todos')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'todos' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedCategory('venda_vista')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'venda_vista' ? 'bg-white text-green-700 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                À Vista
              </button>
              <button
                onClick={() => setSelectedCategory('venda_parcelada')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'venda_parcelada' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Parcelada
              </button>
              <button
                onClick={() => setSelectedCategory('exclusividade')}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'exclusividade' ? 'bg-white text-slate-700 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Exclusividade
              </button>
            </div>

            {/* Input de Busca */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar contrato, cliente ou nº..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Lista de Contratos */}
        {filteredContracts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Nenhum contrato encontrado para os critérios selecionados.
          </div>
        ) : (
          <>
            {/* Versão Mobile (Cards Otimizados Touch-friendly) */}
            <div className="block md:hidden space-y-3">
              {filteredContracts.map((contract) => {
                const hasSignatures = contract.assinaturas && contract.assinaturas.length > 0;
                const isFullySigned = contract.status === 'assinado_total';

                return (
                  <div
                    key={contract.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                          <span>{contract.numeroContrato}</span>
                          <span>•</span>
                          <span>{formatDate(contract.dataCriacao)}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-0.5 break-words">
                          {contract.titulo}
                        </h4>
                      </div>

                      <div className="shrink-0">
                        {contract.tipo === 'venda_vista' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 font-bold text-[10px] border border-green-200">
                            {contract.subcategoria === 'outros_bens' ? 'À Vista (Bens Móveis)' : 'À Vista (Imóvel)'}
                          </span>
                        )}
                        {contract.tipo === 'venda_parcelada' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            {contract.subcategoria === 'outros_bens' ? 'Parcelada (Bens Móveis)' : 'Parcelada (Imóvel)'}
                          </span>
                        )}
                        {contract.tipo === 'exclusividade' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 font-bold text-[10px] border border-slate-200">
                            Exclusividade
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dados das Partes e Valor */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">1º Titular</span>
                        <span className="text-slate-800 font-medium truncate block">{contract.vendedor.nome || '---'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">2º Titular</span>
                        <span className="text-slate-800 font-medium truncate block">{contract.comprador.nome || '---'}</span>
                      </div>
                      <div className="col-span-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">Valor Total:</span>
                        <span className="text-sm font-extrabold text-slate-900">{formatCurrency(contract.valorTotal)}</span>
                      </div>
                    </div>

                    {/* Status de Assinatura */}
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        {isFullySigned ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> 100% Assinado
                          </span>
                        ) : hasSignatures ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-bold text-[11px] bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                            <PenTool className="w-3 h-3" /> Parcialmente Assinado
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">Pendente de Assinatura</span>
                        )}
                      </div>
                    </div>

                    {/* Barra de Ações Mobile */}
                    <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => onSelectContract(contract)}
                        className="min-h-[42px] flex flex-col items-center justify-center gap-1 p-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                        title="Ver Contrato"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Ver</span>
                      </button>

                      <button
                        onClick={() => !isFullySigned && downloadDocxContract(contract)}
                        disabled={isFullySigned}
                        className={`min-h-[42px] flex flex-col items-center justify-center gap-1 p-1 rounded-xl text-[10px] font-bold transition-colors ${
                          isFullySigned
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                        }`}
                        title={isFullySigned ? 'Indisponível: contrato já assinado digitalmente (use o PDF)' : 'Baixar Word (.docx)'}
                      >
                        <FileDown className={`w-4 h-4 ${isFullySigned ? 'text-slate-300' : 'text-green-600'}`} />
                        <span>Word</span>
                      </button>

                      <button
                        onClick={() => exportToPdf(contract)}
                        className="min-h-[42px] flex flex-col items-center justify-center gap-1 p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                        title="Baixar PDF"
                      >
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span>PDF</span>
                      </button>

                      {isFullySigned ? (
                        <button
                          onClick={() => onSelectContract(contract)}
                          className="min-h-[42px] flex flex-col items-center justify-center gap-1 p-1 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold cursor-pointer"
                          title="Contrato assinado — somente visualização"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Assinado</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSignContractDirect(contract)}
                          className="min-h-[42px] flex flex-col items-center justify-center gap-1 p-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                          title="Assinar com Carimbo Digital"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Carimbo Digital</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir o contrato "${contract.titulo}"?`)) {
                            onDeleteContract(contract.id);
                          }
                        }}
                        className="min-h-[42px] flex flex-col items-center justify-center gap-1 p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-bold transition-colors cursor-pointer"
                        title="Excluir Contrato"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Versão Desktop (Tabela Executiva) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="py-3 px-3">Contrato / Título</th>
                    <th className="py-3 px-3">Modalidade</th>
                    <th className="py-3 px-3">Partes Envolvidas</th>
                    <th className="py-3 px-3">Valor Total</th>
                    <th className="py-3 px-3">Assinaturas</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredContracts.map((contract) => {
                    const hasSignatures = contract.assinaturas && contract.assinaturas.length > 0;
                    const isFullySigned = contract.status === 'assinado_total';

                    return (
                      <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Título & Número */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 text-sm">{contract.titulo}</div>
                          <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>{contract.numeroContrato}</span>
                            <span>•</span>
                            <span>{formatDate(contract.dataCriacao)}</span>
                          </div>
                        </td>

                        {/* Modalidade */}
                        <td className="py-3 px-3">
                          {contract.tipo === 'venda_vista' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-bold border border-green-200">
                              {contract.subcategoria === 'outros_bens' ? (
                                <>
                                  <Car className="w-3 h-3 text-green-600" /> Venda à Vista (Bens Móveis)
                                </>
                              ) : (
                                <>
                                  <Home className="w-3 h-3" /> Venda à Vista (Imóvel)
                                </>
                              )}
                            </span>
                          )}
                          {contract.tipo === 'venda_parcelada' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              {contract.subcategoria === 'outros_bens' ? (
                                <>
                                  <Car className="w-3 h-3 text-emerald-600" /> Venda Parcelada ({contract.vendaParcelada?.numeroParcelas}x)
                                </>
                              ) : (
                                <>
                                  <CalendarDays className="w-3 h-3" /> Venda Parcelada ({contract.vendaParcelada?.numeroParcelas}x)
                                </>
                              )}
                            </span>
                          )}
                          {contract.tipo === 'exclusividade' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 font-bold border border-slate-200">
                              <ShieldCheck className="w-3 h-3" /> Exclusividade ({contract.exclusividade?.prazoMesesOuDias}d)
                            </span>
                          )}
                        </td>

                        {/* Partes */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 line-clamp-1">
                            1º: {contract.vendedor.nome}
                          </div>
                          <div className="text-slate-500 text-[11px] line-clamp-1">
                            2º: {contract.comprador.nome}
                          </div>
                        </td>

                        {/* Valor */}
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          {formatCurrency(contract.valorTotal)}
                        </td>

                        {/* Status de Assinatura */}
                        <td className="py-3 px-3">
                          {isFullySigned ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> 100% Assinado
                            </span>
                          ) : hasSignatures ? (
                            <span className="inline-flex items-center gap-1 text-green-700 font-bold text-[11px] bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                              <PenTool className="w-3 h-3" /> Parcial ({contract.assinaturas.length}/2)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Pendente</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onSelectContract(contract)}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-xl transition-colors cursor-pointer"
                              title="Visualizar Contrato"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => !isFullySigned && downloadDocxContract(contract)}
                              disabled={isFullySigned}
                              className={`p-2 rounded-xl transition-colors ${
                                isFullySigned
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-600 hover:text-green-700 hover:bg-green-50 cursor-pointer'
                              }`}
                              title={isFullySigned ? 'Indisponível: contrato já assinado digitalmente (use o PDF)' : 'Baixar Word (.docx)'}
                            >
                              <FileDown className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => exportToPdf(contract)}
                              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                              title="Baixar PDF (.pdf)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {!isFullySigned && (
                              <button
                                onClick={() => onSignContractDirect(contract)}
                                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                                title="Assinar com Carimbo Digital"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir o contrato "${contract.titulo}"?`)) {
                                  onDeleteContract(contract.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Excluir Contrato"
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

      {/* 7. BARRA DE NAVEGAÇÃO INFERIOR MOBILE FIXA (ESTILO APP) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-1.5 shadow-2xl flex items-center justify-around">
        {/* Início */}
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center gap-0.5 p-1 text-green-600 min-w-[54px] cursor-pointer"
        >
          <Home className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-bold">Início</span>
        </button>

        {/* Contratos */}
        <button
          onClick={scrollToContracts}
          className="flex flex-col items-center justify-center gap-0.5 p-1 text-slate-500 hover:text-green-600 min-w-[54px] cursor-pointer"
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-medium">Contratos</span>
        </button>

        {/* Botão Central Destacado "+ Novo" */}
        <div className="relative -top-3 flex flex-col items-center">
          <button
            onClick={() => setIsMobileNewModalOpen(true)}
            className="w-13 h-13 rounded-full bg-green-600 hover:bg-green-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-white transition-all cursor-pointer"
            title="Criar Novo Contrato"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
          <span className="text-[10px] font-bold text-slate-700 mt-0.5">Novo</span>
        </div>

        {/* Vendas */}
        <button
          onClick={() => setIsReportsModalOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 p-1 text-slate-500 hover:text-green-600 min-w-[54px] cursor-pointer"
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-medium">Vendas</span>
        </button>

        {/* Mais */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 p-1 text-slate-500 hover:text-green-600 min-w-[54px] cursor-pointer"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </div>

      {/* MODAIS COMPLEMENTARES DE AÇÕES RÁPIDAS */}

      {/* Modal Clientes */}
      {isClientsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Clientes Registrados</h3>
                  <p className="text-xs text-slate-500">Compradores e vendedores dos contratos</p>
                </div>
              </div>
              <button
                onClick={() => setIsClientsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {contracts.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{c.vendedor.nome} (Vendedor)</span>
                    <span className="font-mono text-[11px] text-slate-500">{c.vendedor.cpfCnpj}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>{c.comprador.nome} (Comprador)</span>
                    <span className="font-mono text-[11px] text-slate-500">{c.comprador.cpfCnpj}</span>
                  </div>
                  <div className="text-[10px] text-green-600 font-semibold pt-1 border-t border-slate-200 flex justify-between">
                    <span>Ref: {c.numeroContrato} - {c.titulo}</span>
                    <span>{formatCurrency(c.valorTotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsClientsModalOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Imóveis */}
      {isPropertiesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Imóveis e Lotes</h3>
                  <p className="text-xs text-slate-500">Unidades cadastradas nos instrumentos contratuais</p>
                </div>
              </div>
              <button
                onClick={() => setIsPropertiesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {contracts.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
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
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Relatórios */}
      {isReportsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Relatório de Desempenho</h3>
                  <p className="text-xs text-slate-500">Balanço das vendas e comissões do período</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-between">
                <div>
                  <span className="text-green-900 font-bold block">Vendas à Vista</span>
                  <span className="text-green-700 text-[11px]">{countVendasAVista} contratos liquidados</span>
                </div>
                <span className="text-base font-extrabold text-green-950">{formatCurrency(totalVendasAVista)}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-emerald-900 font-bold block">Vendas Parceladas</span>
                  <span className="text-emerald-700 text-[11px]">{countVendasParceladas} contratos sob parcelamento</span>
                </div>
                <span className="text-base font-extrabold text-emerald-950">{formatCurrency(totalVendasParceladas)}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-900 font-bold block">Contratos sob Exclusividade</span>
                  <span className="text-slate-700 text-[11px]">{activeExclusivities.length} ativos para promoção</span>
                </div>
                <span className="text-base font-extrabold text-slate-950">{exclusivityContracts.length} contratos</span>
              </div>
            </div>

            <button
              onClick={() => setIsReportsModalOpen(false)}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* Modal Mobile "+ Novo" */}
      {isMobileNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Novo Contrato</h3>
                  <p className="text-xs text-slate-500">Escolha a modalidade jurídica</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
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
                className="w-full p-3.5 rounded-2xl bg-green-50 hover:bg-green-100 border border-green-200 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">Venda à Vista</div>
                    <div className="text-[11px] text-slate-600">Quitação integral imediata</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-green-600" />
              </button>

              <button
                onClick={() => {
                  setIsMobileNewModalOpen(false);
                  onNewContract('venda_parcelada');
                }}
                className="w-full p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">Venda Parcelada</div>
                    <div className="text-[11px] text-slate-600">Entrada + parcelas mensais</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-600" />
              </button>

              <button
                onClick={() => {
                  setIsMobileNewModalOpen(false);
                  onNewContract('exclusividade');
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">Exclusividade</div>
                    <div className="text-[11px] text-slate-600">Corretagem com monitor de prazos</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mobile "Mais" */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Menu do Sistema</h3>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
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
                <Users className="w-4 h-4 text-green-600" />
                <span>Clientes</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsPropertiesModalOpen(true);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center gap-2 font-bold text-slate-800"
              >
                <Home className="w-4 h-4 text-green-600" />
                <span>Imóveis</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsReportsModalOpen(true);
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center gap-2 font-bold text-slate-800"
              >
                <BarChart3 className="w-4 h-4 text-green-600" />
                <span>Relatórios</span>
              </button>

              {/* Removido: Botão Modelos Word (gerenciado pelo TemplateManager) */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
