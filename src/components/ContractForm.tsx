import React, { useState, useEffect } from 'react';
import {
  ContractData,
  ContractType,
  ContractSubtype,
  PartyDetailedInfo,
  PropertyDetails,
  VehicleOrGoodsDetails,
} from '../types/contract';
import { formatDecimalNumber, MONTH_NAMES_PT } from '../utils/contractGenerators';
import { numeroPorExtensoReais } from '../utils/numberToWords';
import { generateUUID, toUpperCase, toUpperCaseObject } from '../utils/validators';
import {
  Banknote,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  User,
  Scale,
  Calendar,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  MapPin,
  FileCheck,
  Car,
  Package,
} from 'lucide-react';
import { ValidatedInput } from './ValidatedInput';
import { CEPSearch } from './CEPSearch';
import { GenderSelect } from './GenderSelect';
import { EstadoCivilSelect } from './EstadoCivilSelect';
import { NacionalidadeSelect } from './NacionalidadeSelect';
import { OrgaoEmissorInput } from './OrgaoEmissorInput';
import { convertEstadoCivilToGenero } from '../utils/civilStatus';
import { convertNacionalidadeToGenero } from '../utils/nacionalidade';
import { SavedPartyPicker } from './SavedPartyPicker';
import { SavedParty } from '../types/contract';
import { fetchSavedParties, saveParty } from '../utils/savedPartiesRepository';

interface ContractFormProps {
  initialData?: ContractData | null;
  defaultType?: ContractType;
  onSave: (contract: ContractData) => void | Promise<void>;
  onSaveDraft: (contract: ContractData) => Promise<void>;
  onCancel: () => void;
}

// Nenhum campo vem pré-preenchido: o usuário digita do zero ou seleciona
// um contato já salvo (dropdown "Usar contato salvo" em cada aba).
const emptyParty: PartyDetailedInfo = {
  nome: '',
  nacionalidade: '',
  estadoCivil: '',
  rg: '',
  rgOrgao: '',
  cpfCnpj: '',
  endereco: '',
  numero: '',
  bairro: '',
  cep: '',
  cidade: '',
  uf: '',
  telefone: '',
  email: '',
};

const emptyProperty: PropertyDetails = {
  nomeEmpreendimento: '',
  localizacaoImovel: '',
  cidadeImovel: '',
  ufImovel: '',
  numeroLote: '',
  numeroQuadra: '',
  enderecoLote: '',
  metragemFrente: '',
  metragemLateralDireita: '',
  metragemLateralEsquerda: '',
  metragemFundos: '',
  areaTotalM2: '',
};

const emptyGoods: VehicleOrGoodsDetails = {
  tipoBem: 'carro',
  descricao: '',
  marca: '',
  modelo: '',
  anoFabricacao: '',
  anoModelo: '',
  cor: '',
  placa: '',
  chassi: '',
  renavam: '',
  numeroSerie: '',
  quilometragemOuUso: '',
  estadoConservacao: '',
  acessoriosInclusos: '',
  documentacaoSituacao: '',
};

export const ContractForm: React.FC<ContractFormProps> = ({
  initialData,
  defaultType = 'venda_vista',
  onSave,
  onSaveDraft,
  onCancel,
}) => {
  // Gerado UMA VEZ por sessão de preenchimento (não a cada save) - senão
  // salvar rascunho mais de uma vez criaria um contrato novo a cada clique
  // em vez de atualizar o mesmo registro no Supabase.
  const [contractId] = useState(() => initialData?.id || generateUUID());
  const [tipo, setTipo] = useState<ContractType>(initialData?.tipo || defaultType);
  const [subcategoria, setSubcategoria] = useState<ContractSubtype>(
    initialData?.subcategoria || 'imovel'
  );
  type TabKey = 'vendedor' | 'comprador' | 'imovel' | 'financeiro' | 'foro' | 'revisao';
  const [activeTab, setActiveTab] = useState<TabKey>('vendedor');
  const [missingFields, setMissingFields] = useState<{ label: string; tab: TabKey }[]>([]);
  
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [numeroContrato, setNumeroContrato] = useState(
    initialData?.numeroContrato || `CT-${tipo === 'venda_vista' ? 'VISTA' : tipo === 'venda_parcelada' ? 'PARC' : tipo === 'locacao' ? 'LOC' : 'EXCL'}-${Date.now().toString().slice(-4)}`
  );

  // Data/hora fixa pro título automático (venda à vista/parcelada) -
  // capturada uma única vez quando o formulário abre, nunca recalculada
  // a cada re-render (senão o título ficaria mudando de segundo em
  // segundo enquanto o corretor digita outros campos).
  const [tituloTimestamp] = useState<Date>(() =>
    initialData?.dataCriacao ? new Date(initialData.dataCriacao) : new Date()
  );

  // Foro e Assinatura - contrato novo já nasce com Santarém/PA e a data
  // atual preenchidos (evita ter que digitar isso toda vez); em edição
  // de contrato existente, respeita o que já estava salvo.
  const [cidadeForo, setCidadeForo] = useState(initialData?.cidadeForo || 'Santarém');
  const [ufForo, setUfForo] = useState(initialData?.ufForo || 'PA');
  const [cidadeAssinatura, setCidadeAssinatura] = useState(initialData?.cidadeAssinatura || 'Santarém');
  const [ufAssinatura, setUfAssinatura] = useState(initialData?.ufAssinatura || 'PA');

  // Data de Assinatura desmembrada - default é a data de hoje por extenso
  const MESES_EXTENSO = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const hoje = new Date();
  const [diaAssinatura, setDiaAssinatura] = useState(
    initialData?.diaAssinatura || String(hoje.getDate())
  );
  const [mesExtensoAssinatura, setMesExtensoAssinatura] = useState(
    initialData?.mesExtensoAssinatura || MESES_EXTENSO[hoje.getMonth()]
  );
  const [anoAssinatura, setAnoAssinatura] = useState(
    initialData?.anoAssinatura || String(hoje.getFullYear())
  );

  // Partes Detalhadas
  const [vendedor, setVendedor] = useState<PartyDetailedInfo>(
    initialData?.vendedor ? { ...emptyParty, ...initialData.vendedor } : { ...emptyParty }
  );
  const [comprador, setComprador] = useState<PartyDetailedInfo>(
    initialData?.comprador ? { ...emptyParty, ...initialData.comprador } : { ...emptyParty }
  );

  // Contatos salvos (Contratado/Vendedor) reutilizáveis via dropdown
  const [savedParties, setSavedParties] = useState<SavedParty[]>([]);
  const [loadingSavedParties, setLoadingSavedParties] = useState(true);

  useEffect(() => {
    fetchSavedParties()
      .then(setSavedParties)
      .catch(() => setSavedParties([]))
      .finally(() => setLoadingSavedParties(false));
  }, []);

  const refreshSavedParties = async () => {
    try {
      setSavedParties(await fetchSavedParties());
    } catch {
      // silencioso: dropdown apenas fica sem atualizar
    }
  };

  const handleSaveVendedorContact = async () => {
    await saveParty(vendedor);
    await refreshSavedParties();
  };

  const handleSaveCompradorContact = async () => {
    await saveParty(comprador);
    await refreshSavedParties();
  };

  // Imóvel Detalhado
  const [imovel, setImovel] = useState<PropertyDetails>(
    initialData?.imovel ? { ...emptyProperty, ...initialData.imovel } : { ...emptyProperty }
  );

  // Bem Móvel / Veículo Detalhado
  const [bemOutros, setBemOutros] = useState<VehicleOrGoodsDetails>(
    initialData?.bemOutros ? { ...emptyGoods, ...initialData.bemOutros } : { ...emptyGoods }
  );

  // Condições Financeiras
  const [valorTotal, setValorTotal] = useState<number>(initialData?.valorTotal || 0);
  const [valorTotalExtenso, setValorTotalExtenso] = useState(
    initialData?.valorTotalExtenso || ''
  );

  // Venda à Vista
  const [formaPagamentoVista, setFormaPagamentoVista] = useState<'PIX' | 'TED/DOC' | 'Dinheiro' | 'Cartão' | 'Cheque' | 'Mesclado'>(
    (initialData as any)?.formaPagamentoVista || 'PIX'
  );
  const [dadosBancariosRecebedor, setDadosBancariosRecebedor] = useState(
    (initialData as any)?.dadosBancariosRecebedor || ''
  );
  const [detalhesPagamentoMesclado, setDetalhesPagamentoMesclado] = useState(
    (initialData as any)?.detalhesPagamentoMesclado || ''
  );

  // Venda Parcelada
  const [valorEntrada, setValorEntrada] = useState<number>(initialData?.valorEntrada || 0);
  const [numeroParcelas, setNumeroParcelas] = useState<number>(initialData?.numeroParcelas || 0);
  const [valorParcela, setValorParcela] = useState<number>(initialData?.valorParcela || 0);
  // Cálculo bilateral SEM seletor manual: os 2 campos editados mais
  // recentemente (entre Entrada / Valor da Parcela / Total) são tratados
  // como "dados conhecidos", e o terceiro é sempre recalculado sozinho -
  // mesma lógica de calculadora de conversão (os últimos 2 mexidos
  // "prendem" o valor, o que sobra se ajusta). Todos os 4 campos (Entrada,
  // Parcelas, Valor da Parcela, Total) ficam sempre editáveis.
  const [ultimosTocados, setUltimosTocados] = useState<Array<'entrada' | 'parcela' | 'total'>>(['entrada', 'parcela']);
  const tocarCampoParcelado = (campo: 'entrada' | 'parcela' | 'total') => {
    setUltimosTocados((prev) => [...prev.filter((f) => f !== campo), campo].slice(-2) as typeof prev);
  };
  const [formaPagamentoParcelas, setFormaPagamentoParcelas] = useState<string>(
    initialData?.formaPagamentoParcelas || 'Boleto Bancário'
  );
  const [clausulaReservaDominio, setClausulaReservaDominio] = useState<boolean>(
    initialData?.clausulaReservaDominio !== false
  );

  // Exclusividade
  const [finalidadeExclusividade, setFinalidadeExclusividade] = useState<'venda' | 'locacao' | 'ambos'>(
    initialData?.exclusividade?.finalidade ||
    (initialData?.exclusividade?.tipoExclusividade === 'Locação de Imóvel' ? 'locacao' : initialData?.exclusividade?.tipoExclusividade === 'Venda e Locação' ? 'ambos' : 'venda')
  );
  const [percentualComissao, setPercentualComissao] = useState<number>(initialData?.percentualComissao || 0);
  const [prazoMesesOuDias, setPrazoMesesOuDias] = useState<number>(initialData?.prazoMesesOuDias || 0);
  const [unidadePrazo, setUnidadePrazo] = useState<'dias' | 'meses'>(initialData?.unidadePrazo || 'dias');
  const [dataInicioExcl, setDataInicioExcl] = useState<string>(
    initialData?.dataInicioExcl || ''
  );

  // Campos específicos de Intermediação de Locação em Exclusividade
  const [valorLocacaoSugeridoExcl, setValorLocacaoSugeridoExcl] = useState<number>(
    initialData?.exclusividade?.valorLocacaoSugerido || 0
  );
  const [valorLocacaoSugeridoExtensoExcl, setValorLocacaoSugeridoExtensoExcl] = useState<string>(
    initialData?.exclusividade?.valorLocacaoSugeridoExtenso || ''
  );
  const [comissaoLocacaoExcl, setComissaoLocacaoExcl] = useState<string>(
    initialData?.exclusividade?.comissaoLocacao || '100% do primeiro aluguel mensal'
  );
  const [taxaAdministracaoLocacaoExcl, setTaxaAdministracaoLocacaoExcl] = useState<string>(
    initialData?.exclusividade?.taxaAdministracaoLocacao || '10% ao mês sobre os aluguéis recebidos'
  );
  const [garantiasAceitasLocacaoExcl, setGarantiasAceitasLocacaoExcl] = useState<string>(
    initialData?.exclusividade?.garantiasAceitasLocacao || 'Caução em dinheiro (até 3 meses), Fiador idôneo ou Seguro-Fiança Locatícia'
  );
  const [autorizaDivulgacaoPlacasRedesExcl, setAutorizaDivulgacaoPlacasRedesExcl] = useState<boolean>(
    initialData?.exclusividade?.autorizaDivulgacaoPlacasRedes !== false
  );
  const [autorizaProspeccaoClientesExcl, setAutorizaProspeccaoClientesExcl] = useState<boolean>(
    initialData?.exclusividade?.autorizaProspeccaoClientes !== false
  );

  // Dados do imóvel específicos do Contrato de Exclusividade
  const [documentoPropriedade, setDocumentoPropriedade] = useState<string>(
    initialData?.exclusividade?.documentoPropriedade || ''
  );
  const [matricula, setMatricula] = useState<string>(
    initialData?.exclusividade?.matricula || ''
  );
  const [inscricaoPrefeitura, setInscricaoPrefeitura] = useState<string>(
    initialData?.exclusividade?.inscricaoPrefeitura || ''
  );
  const [outrosDadosImovel, setOutrosDadosImovel] = useState<string>(
    initialData?.exclusividade?.outrosDadosImovel || ''
  );
  const [condicoesPagamento, setCondicoesPagamento] = useState<string>(
    initialData?.exclusividade?.condicoesPagamento || ''
  );

  // Locação de Imóvel Detalhada
  const [tipoImovelLocacao, setTipoImovelLocacao] = useState<'casa' | 'galpao' | 'apartamento' | 'sala_comercial' | 'predio' | 'terreno' | 'outro'>(
    initialData?.locacao?.tipoImovel || 'casa'
  );
  const [finalidadeLocacao, setFinalidadeLocacao] = useState<'residencial' | 'comercial' | 'industrial_galpao' | 'temporada'>(
    initialData?.locacao?.finalidadeLocacao || 'residencial'
  );
  const [valorAluguel, setValorAluguel] = useState<number>(
    initialData?.locacao?.valorAluguel || initialData?.valorTotal || 0
  );
  const [valorAluguelExtenso, setValorAluguelExtenso] = useState<string>(
    initialData?.locacao?.valorAluguelExtenso || ''
  );
  const [diaVencimento, setDiaVencimento] = useState<number>(
    initialData?.locacao?.diaVencimento || 10
  );
  const [formaPagamentoLocacao, setFormaPagamentoLocacao] = useState<string>(
    initialData?.locacao?.formaPagamento || 'PIX'
  );
  const [dadosBancariosLocador, setDadosBancariosLocador] = useState<string>(
    initialData?.locacao?.dadosBancariosLocador || ''
  );
  const [indiceReajuste, setIndiceReajuste] = useState<string>(
    initialData?.locacao?.indiceReajuste || 'IGP-M'
  );
  const [periodicidadeReajuste, setPeriodicidadeReajuste] = useState<string>(
    initialData?.locacao?.periodicidadeReajuste || 'Anual'
  );
  const [prazoMesesLocacao, setPrazoMesesLocacao] = useState<number>(
    initialData?.locacao?.prazoMeses || 12
  );
  const [dataInicioLocacao, setDataInicioLocacao] = useState<string>(
    initialData?.locacao?.dataInicio || new Date().toISOString().split('T')[0]
  );
  const [dataTerminoLocacao, setDataTerminoLocacao] = useState<string>(
    initialData?.locacao?.dataTermino || ''
  );
  const [garantiaTipoLocacao, setGarantiaTipoLocacao] = useState<'caucao' | 'fiador' | 'seguro_fianca' | 'sem_garantia'>(
    initialData?.locacao?.garantiaTipo || 'caucao'
  );
  const [numeroMesesCaucao, setNumeroMesesCaucao] = useState<number>(
    initialData?.locacao?.numeroMesesCaucao || 1
  );
  const [valorCaucaoLocacao, setValorCaucaoLocacao] = useState<number>(
    initialData?.locacao?.valorCaucao || 0
  );
  const [fiadorLocacao, setFiadorLocacao] = useState<PartyDetailedInfo>(
    initialData?.locacao?.fiador ? { ...emptyParty, ...initialData.locacao.fiador } : { ...emptyParty }
  );
  const [multaAtrasoLocacao, setMultaAtrasoLocacao] = useState<number>(
    initialData?.locacao?.multaAtrasoPercentual || 10
  );
  const [jurosMoraLocacao, setJurosMoraLocacao] = useState<number>(
    initialData?.locacao?.jurosMoraMensalPercentual || 1
  );
  const [multaRescisaoLocacao, setMultaRescisaoLocacao] = useState<string>(
    initialData?.locacao?.multaRescisao || '3 (três) meses de aluguel vigente proporcional ao tempo restante de contrato'
  );
  const [despesasLocatario, setDespesasLocatario] = useState<string>(
    initialData?.locacao?.despesasLocatario || 'Consumo de energia elétrica, taxa de água/esgoto, IPTU e taxa de coleta de lixo'
  );
  const [destinacaoUso, setDestinacaoUso] = useState<string>(
    initialData?.locacao?.destinacaoUso || ''
  );
  const [vistoriaInicialRealizada, setVistoriaInicialRealizada] = useState<boolean>(
    initialData?.locacao?.vistoriaInicialRealizada !== false
  );
  const [autorizaSublocacao, setAutorizaSublocacao] = useState<boolean>(
    initialData?.locacao?.autorizaSublocacao === true
  );

  const [clausulasExtras, setClausulasExtras] = useState(initialData?.clausulasExtras || '');

  // Atualizar cálculo de extenso quando o valor muda
  const handleValorTotalChange = (val: number) => {
    setValorTotal(val);
    setValorTotalExtenso(val > 0 ? numeroPorExtensoReais(val) : '');
    if (tipo === 'venda_parcelada') tocarCampoParcelado('total');
  };

  const handleValorAluguelChange = (val: number) => {
    setValorAluguel(val);
    setValorTotal(val);
    const ext = val > 0 ? numeroPorExtensoReais(val) : '';
    setValorAluguelExtenso(ext);
    setValorTotalExtenso(ext);
    if (garantiaTipoLocacao === 'caucao') {
      setValorCaucaoLocacao(val * (numeroMesesCaucao || 1));
    }
  };

  useEffect(() => {
    if (tipo !== 'locacao' || !dataInicioLocacao || !prazoMesesLocacao) return;
    try {
      const d = new Date(dataInicioLocacao);
      d.setMonth(d.getMonth() + Number(prazoMesesLocacao));
      setDataTerminoLocacao(d.toISOString().split('T')[0]);
    } catch {
      // ignore
    }
  }, [tipo, dataInicioLocacao, prazoMesesLocacao]);

  const updateDefaultTitle = (t: ContractType, sub: ContractSubtype) => {
    if (t === 'venda_vista') {
      setTitulo(
        sub === 'outros_bens'
          ? 'Contrato de Compra e Venda de Veículo / Bem Móvel à Vista'
          : 'Contrato de Compra e Venda de Imóvel à Vista com Quitação Plena'
      );
    } else if (t === 'venda_parcelada') {
      setTitulo(
        sub === 'outros_bens'
          ? 'Contrato de Compra e Venda de Veículo / Bem Móvel Parcelado com Reserva de Domínio'
          : 'Contrato de Compra e Venda de Imóvel Parcelado com Reserva de Domínio'
      );
    } else if (t === 'locacao') {
      setTitulo('Contrato de Locação de Imóvel Residencial / Comercial');
    } else {
      setTitulo('Contrato de Prestação de Serviços de Corretagem com Exclusividade');
    }
  };

  const handleTipoChange = (newTipo: ContractType) => {
    // Impedir mudança de tipo se está editando um contrato existente
    if (initialData) {
      console.warn('Não é permitido alterar o tipo de um contrato existente');
      return; // Sair sem fazer nada
    }

    setTipo(newTipo);
    if (!initialData) {
      setNumeroContrato(
        `CT-${newTipo === 'venda_vista' ? 'VISTA' : newTipo === 'venda_parcelada' ? 'PARC' : newTipo === 'locacao' ? 'LOC' : 'EXCL'}-${Date.now().toString().slice(-4)}`
      );
      updateDefaultTitle(newTipo, subcategoria);
    }
  };

  const handleSubcategoriaChange = (newSub: ContractSubtype) => {
    setSubcategoria(newSub);
    if (!initialData) {
      updateDefaultTitle(tipo, newSub);
    }
  };

  useEffect(() => {
    if (!initialData && !titulo) {
      updateDefaultTitle(tipo, subcategoria);
    }
  }, [tipo, subcategoria]);

  // Cálculo bilateral do parcelamento: o campo que NÃO está entre os 2
  // últimos tocados é sempre o recalculado (ver tocarCampoParcelado acima).
  useEffect(() => {
    if (tipo !== 'venda_parcelada' || numeroParcelas <= 0) return;

    const derivado = (['entrada', 'parcela', 'total'] as const).find((f) => !ultimosTocados.includes(f));
    if (!derivado) return;

    if (derivado === 'parcela') {
      const saldo = Math.max(0, valorTotal - valorEntrada);
      const novaParcela = Number((saldo / numeroParcelas).toFixed(2));
      if (novaParcela !== valorParcela) setValorParcela(novaParcela);
    } else if (derivado === 'total') {
      const novoTotal = Number((valorEntrada + numeroParcelas * valorParcela).toFixed(2));
      if (novoTotal !== valorTotal) {
        setValorTotal(novoTotal);
        setValorTotalExtenso(numeroPorExtensoReais(novoTotal));
      }
    } else if (derivado === 'entrada') {
      const novaEntrada = Number((valorTotal - numeroParcelas * valorParcela).toFixed(2));
      if (novaEntrada !== valorEntrada) setValorEntrada(Math.max(0, novaEntrada));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorTotal, valorEntrada, numeroParcelas, valorParcela, ultimosTocados, tipo]);

  // Título de Identificação Interna automático (venda à vista/parcelada,
  // imóvel): sempre no formato L{lote}_Q{quadra}_{empreendimento}_
  // {nome do cliente}_{data}_{hora} - a data/hora usada é fixa (capturada
  // uma vez ao abrir o formulário), só o lote/quadra/empreendimento/nome
  // do cliente atualizam ao vivo enquanto o corretor preenche.
  useEffect(() => {
    if (tipo === 'exclusividade' || subcategoria === 'outros_bens') return;

    const slug = (s: string) => (s || '').trim().replace(/\s+/g, '_');
    const dataStr = tituloTimestamp.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const horaStr = tituloTimestamp
      .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
      .replace(/:/g, 'h');

    const partes = [
      imovel.numeroLote ? `L${slug(imovel.numeroLote)}` : '',
      imovel.numeroQuadra ? `Q${slug(imovel.numeroQuadra)}` : '',
      slug(imovel.nomeEmpreendimento),
      slug(comprador.nome),
      dataStr,
      horaStr,
    ].filter(Boolean);

    if (partes.length > 0) setTitulo(partes.join('_'));
  }, [tipo, subcategoria, imovel.numeroLote, imovel.numeroQuadra, imovel.nomeEmpreendimento, comprador.nome, tituloTimestamp]);

  // Todos os campos que aparecem na tela (dado o tipo/subcategoria/variante
  // escolhidos) são obrigatórios - exceto "Cláusulas Adicionais", que o
  // próprio rótulo já marca como "(Opcional)".
  const TAB_LABELS: Record<TabKey, string> = {
    vendedor: tipo === 'exclusividade' ? 'Contratante' : tipo === 'locacao' ? 'Locador' : 'Vendedor',
    comprador: tipo === 'exclusividade' ? 'Contratado' : tipo === 'locacao' ? 'Locatário' : 'Comprador',
    imovel: subcategoria === 'outros_bens' && tipo !== 'exclusividade' && tipo !== 'locacao' ? 'Bem / Veículo' : 'Imóvel',
    financeiro: tipo === 'locacao' ? 'Condições da Locação' : 'Condições Financeiras',
    foro: 'Foro e Datação',
    revisao: 'Resumo e Emissão',
  };

  const TAB_ORDER: TabKey[] = ['vendedor', 'comprador', 'imovel', 'financeiro', 'foro', 'revisao'];
  const currentTabIndex = TAB_ORDER.indexOf(activeTab);
  const handlePrevTab = () => {
    if (currentTabIndex > 0) setActiveTab(TAB_ORDER[currentTabIndex - 1]);
  };
  const handleNextTab = () => {
    if (currentTabIndex < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[currentTabIndex + 1]);
  };

  const getMissingFields = (): { label: string; tab: TabKey }[] => {
    const missing: { label: string; tab: TabKey }[] = [];
    const req = (val: string | undefined | null, label: string, tab: TabKey) => {
      if (!val || !val.trim()) missing.push({ label, tab });
    };

    const vLabel = tipo === 'exclusividade' ? 'Contratante' : tipo === 'locacao' ? 'Locador' : 'Vendedor';
    req(vendedor.nome, `${vLabel}: Nome`, 'vendedor');
    req(vendedor.genero, `${vLabel}: Gênero`, 'vendedor');
    req(vendedor.cpfCnpj, `${vLabel}: CPF`, 'vendedor');
    req(vendedor.nacionalidade, `${vLabel}: Nacionalidade`, 'vendedor');
    req(vendedor.estadoCivil, `${vLabel}: Estado Civil`, 'vendedor');
    req(vendedor.rg, `${vLabel}: RG`, 'vendedor');
    req(vendedor.rgOrgao, `${vLabel}: Órgão Emissor`, 'vendedor');
    req(vendedor.telefone, `${vLabel}: Telefone`, 'vendedor');
    req(vendedor.endereco, `${vLabel}: Endereço`, 'vendedor');
    req(vendedor.numero, `${vLabel}: Número`, 'vendedor');
    req(vendedor.bairro, `${vLabel}: Bairro`, 'vendedor');
    req(vendedor.cep, `${vLabel}: CEP`, 'vendedor');
    req(vendedor.cidade, `${vLabel}: Cidade`, 'vendedor');
    req(vendedor.uf, `${vLabel}: UF`, 'vendedor');

    const cLabel = tipo === 'exclusividade' ? 'Contratado' : tipo === 'locacao' ? 'Locatário' : 'Comprador';
    req(comprador.nome, `${cLabel}: Nome`, 'comprador');
    req(comprador.genero, `${cLabel}: Gênero`, 'comprador');
    req(comprador.cpfCnpj, `${cLabel}: CPF`, 'comprador');
    if (tipo === 'exclusividade') req(comprador.creci, `${cLabel}: CRECI`, 'comprador');
    req(comprador.nacionalidade, `${cLabel}: Nacionalidade`, 'comprador');
    req(comprador.estadoCivil, `${cLabel}: Estado Civil`, 'comprador');
    req(comprador.rg, `${cLabel}: RG`, 'comprador');
    req(comprador.rgOrgao, `${cLabel}: Órgão Emissor`, 'comprador');
    req(comprador.telefone, `${cLabel}: Telefone`, 'comprador');
    if (tipo === 'venda_parcelada') req(comprador.telefone2, `${cLabel}: Telefone Secundário`, 'comprador');
    req(comprador.endereco, `${cLabel}: Endereço`, 'comprador');
    req(comprador.numero, `${cLabel}: Número`, 'comprador');
    req(comprador.bairro, `${cLabel}: Bairro`, 'comprador');
    req(comprador.cep, `${cLabel}: CEP`, 'comprador');
    req(comprador.cidade, `${cLabel}: Cidade`, 'comprador');
    req(comprador.uf, `${cLabel}: UF`, 'comprador');

    req(titulo, 'Título de Identificação Interna', 'imovel');
    if (tipo === 'exclusividade') {
      req(imovel.tipoImovel, 'Tipo do Imóvel', 'imovel');
      req(imovel.localizacaoImovel, 'Localização do Imóvel', 'imovel');
      req(imovel.cidadeImovel, 'Cidade do Imóvel', 'imovel');
      req(imovel.ufImovel, 'UF do Imóvel', 'imovel');
      req(documentoPropriedade, 'Documento de Propriedade', 'imovel');
      req(matricula, 'Matrícula', 'imovel');
      req(inscricaoPrefeitura, 'Inscrição na Prefeitura', 'imovel');
      req(outrosDadosImovel, 'Outros Dados do Imóvel', 'imovel');
      if (finalidadeExclusividade !== 'locacao') {
        req(condicoesPagamento, 'Condições de Pagamento', 'imovel');
      }
    } else if (tipo === 'locacao') {
      req(imovel.enderecoLote || imovel.localizacaoImovel, 'Endereço do Imóvel Locado', 'imovel');
      req(imovel.cidadeImovel, 'Cidade do Imóvel Locado', 'imovel');
      req(imovel.ufImovel, 'UF do Imóvel Locado', 'imovel');
    } else if (subcategoria === 'outros_bens') {
      req(bemOutros.descricao, 'Descrição Principal do Bem', 'imovel');
      req(bemOutros.marca, 'Marca / Fabricante', 'imovel');
      req(bemOutros.modelo, 'Modelo / Versão', 'imovel');
      req(bemOutros.anoFabricacao, 'Ano Fabricação', 'imovel');
      req(bemOutros.anoModelo, 'Ano Modelo', 'imovel');
      req(bemOutros.cor, 'Cor Predominante', 'imovel');
      req(bemOutros.placa, 'Placa / Identificação', 'imovel');
      req(bemOutros.renavam, 'RENAVAM', 'imovel');
      req(bemOutros.chassi, 'Chassi', 'imovel');
      req(bemOutros.numeroSerie, 'Número de Série / Motor', 'imovel');
      req(bemOutros.quilometragemOuUso, 'Quilometragem / Horímetro / Uso', 'imovel');
      req(bemOutros.estadoConservacao, 'Estado de Conservação', 'imovel');
      req(bemOutros.acessoriosInclusos, 'Acessórios e Itens Inclusos', 'imovel');
      req(bemOutros.documentacaoSituacao, 'Situação Documental', 'imovel');
    } else {
      req(imovel.nomeEmpreendimento, 'Nome do Empreendimento / Loteamento', 'imovel');
      req(imovel.localizacaoImovel, 'Localização do Imóvel', 'imovel');
      req(imovel.cidadeImovel, 'Cidade do Imóvel', 'imovel');
      req(imovel.ufImovel, 'UF do Imóvel', 'imovel');
      req(imovel.numeroLote, 'Número do Lote', 'imovel');
      req(imovel.numeroQuadra, 'Número da Quadra', 'imovel');
      req(imovel.enderecoLote, 'Endereço Completo do Lote', 'imovel');
    }
    if ((subcategoria === 'imovel' && tipo !== 'locacao') || tipo === 'exclusividade') {
      req(imovel.metragemFrente, 'Metragem Frente', 'imovel');
      req(imovel.metragemLateralDireita, 'Metragem Lateral Direita', 'imovel');
      req(imovel.metragemLateralEsquerda, 'Metragem Lateral Esquerda', 'imovel');
      req(imovel.metragemFundos, 'Metragem Fundos', 'imovel');
      req(imovel.areaTotalM2, 'Área Total (m²)', 'imovel');
    }

    if (tipo === 'locacao') {
      if ((!valorAluguel || valorAluguel <= 0) && (!valorTotal || valorTotal <= 0)) {
        missing.push({ label: 'Valor Mensal do Aluguel', tab: 'financeiro' });
      }
      req(dataInicioLocacao, 'Data de Início da Locação', 'financeiro');
    } else if (tipo === 'exclusividade') {
      if (finalidadeExclusividade === 'locacao') {
        if ((!valorLocacaoSugeridoExcl || valorLocacaoSugeridoExcl <= 0) && (!valorTotal || valorTotal <= 0)) {
          missing.push({ label: 'Valor Mensal Sugerido do Aluguel', tab: 'financeiro' });
        }
      } else {
        if (!valorTotal || valorTotal <= 0) missing.push({ label: 'Valor Total da Negociação', tab: 'financeiro' });
        req(valorTotalExtenso, 'Valor por Extenso', 'financeiro');
      }
      req(dataInicioExcl, 'Data Início da Exclusividade', 'financeiro');
    } else {
      if (!valorTotal || valorTotal <= 0) missing.push({ label: 'Valor Total da Negociação', tab: 'financeiro' });
      req(valorTotalExtenso, 'Valor por Extenso', 'financeiro');
    }

    if (tipo === 'venda_vista') {
      req(formaPagamentoVista, 'Forma de Pagamento', 'financeiro');
      if (formaPagamentoVista === 'Mesclado') {
        req(detalhesPagamentoMesclado, 'Detalhes do Pagamento Mesclado', 'financeiro');
      }
    }

    req(cidadeForo, 'Cidade do Foro', 'foro');
    req(ufForo, 'UF do Foro', 'foro');
    req(cidadeAssinatura, 'Cidade da Assinatura', 'foro');
    req(ufAssinatura, 'UF da Assinatura', 'foro');
    req(diaAssinatura, 'Dia da Assinatura', 'foro');
    req(mesExtensoAssinatura, 'Mês da Assinatura', 'foro');
    req(anoAssinatura, 'Ano da Assinatura', 'foro');

    return missing;
  };

  // Marca em vermelho o card do campo que estiver faltando (além do banner
  // de alerta que já existia) - some sozinho assim que o campo deixa de
  // estar vazio, porque missingFields é recalculado ao vivo enquanto o
  // banner estiver visível (ver useEffect abaixo).
  const missingLabelsSet = new Set(missingFields.map((f) => f.label));
  const errCls = (label: string) => (missingLabelsSet.has(label) ? 'border-red-500! ring-1 ring-red-500' : '');
  // Mesmos rótulos usados dentro de getMissingFields(), só que acessíveis
  // aqui no JSX pra montar as mesmas chaves passadas pro errCls().
  const vLabelUI = tipo === 'exclusividade' ? 'Contratante' : tipo === 'locacao' ? 'Locador' : 'Vendedor';
  const cLabelUI = tipo === 'exclusividade' ? 'Contratado' : tipo === 'locacao' ? 'Locatário' : 'Comprador';

  const buildContractData = (): ContractData => ({
    id: contractId,
    numeroContrato,
    titulo: toUpperCase(titulo) || (subcategoria === 'outros_bens' ? 'Contrato de Compra e Venda de Bem Móvel' : 'Contrato Imobiliário'),
    tipo,
    subcategoria: tipo === 'exclusividade' || tipo === 'locacao' ? 'imovel' : subcategoria,
    dataCriacao: initialData?.dataCriacao || new Date().toISOString(),
    status: initialData?.status || 'rascunho',
    vendedor: toUpperCaseObject(vendedor),
    comprador: toUpperCaseObject(comprador),
    imovel: (subcategoria === 'imovel' || tipo === 'exclusividade' || tipo === 'locacao') ? toUpperCaseObject(imovel) : undefined,
    bemOutros: subcategoria === 'outros_bens' && tipo !== 'exclusividade' && tipo !== 'locacao' ? toUpperCaseObject(bemOutros) : undefined,
    cidadeForo: toUpperCase(cidadeForo),
    ufForo,
    cidadeAssinatura: toUpperCase(cidadeAssinatura),
    ufAssinatura,
    diaAssinatura,
    mesExtensoAssinatura,
    anoAssinatura,
    valorTotal: tipo === 'locacao' ? (valorAluguel || valorTotal) : tipo === 'exclusividade' && finalidadeExclusividade === 'locacao' ? (valorTotal || valorLocacaoSugeridoExcl) : valorTotal,
    valorTotalExtenso: tipo === 'locacao'
      ? (valorAluguelExtenso || valorTotalExtenso || numeroPorExtensoReais(valorAluguel || valorTotal))
      : tipo === 'exclusividade' && finalidadeExclusividade === 'locacao'
      ? (valorLocacaoSugeridoExtensoExcl || valorTotalExtenso || numeroPorExtensoReais(valorLocacaoSugeridoExcl || valorTotal))
      : (valorTotalExtenso || numeroPorExtensoReais(valorTotal)),
    vendaVista: tipo === 'venda_vista' ? {
      formaPagamento: formaPagamentoVista as any,
      dadosBancariosRecebedor,
      detalhesPagamento: formaPagamentoVista === 'Mesclado' ? detalhesPagamentoMesclado : undefined,
      dataQuitacao: `${diaAssinatura}/${mesExtensoAssinatura}/${anoAssinatura}`,
      prazoEntregaPosse: 'Imediata na assinatura deste instrumento',
    } : undefined,
    vendaParcelada: tipo === 'venda_parcelada' ? {
      valorEntrada,
      formaPagamentoEntrada: 'Transferência / PIX',
      dataEntrada: `${diaAssinatura}/${mesExtensoAssinatura}/${anoAssinatura}`,
      numeroParcelas,
      valorParcela,
      periodicidade: 'Mensal',
      dataPrimeiroVencimento: '30 dias após a assinatura',
      formaPagamentoParcelas: formaPagamentoParcelas as any,
      multaAtrasoPercentual: 2,
      jurosMoraMensalPercentual: 1,
      clausulaReservaDominio,
    } : undefined,
    exclusividade: tipo === 'exclusividade' ? {
      tipoExclusividade: finalidadeExclusividade === 'locacao' ? 'Locação de Imóvel' : finalidadeExclusividade === 'ambos' ? 'Venda e Locação' : 'Venda de Imóvel',
      finalidade: finalidadeExclusividade,
      dataInicio: dataInicioExcl,
      dataTermino: new Date(Date.now() + (prazoMesesOuDias * (unidadePrazo === 'meses' ? 30 : 1) * 86400000)).toISOString().split('T')[0],
      prazoMesesOuDias,
      unidadePrazo,
      percentualComissao: finalidadeExclusividade !== 'locacao' ? percentualComissao : 0,
      valorLocacaoSugerido: finalidadeExclusividade !== 'venda' ? valorLocacaoSugeridoExcl : undefined,
      valorLocacaoSugeridoExtenso: finalidadeExclusividade !== 'venda' ? (valorLocacaoSugeridoExtensoExcl || numeroPorExtensoReais(valorLocacaoSugeridoExcl)) : undefined,
      comissaoLocacao: finalidadeExclusividade !== 'venda' ? comissaoLocacaoExcl : undefined,
      taxaAdministracaoLocacao: finalidadeExclusividade !== 'venda' ? taxaAdministracaoLocacaoExcl : undefined,
      garantiasAceitasLocacao: finalidadeExclusividade !== 'venda' ? garantiasAceitasLocacaoExcl : undefined,
      multaRescisaoOuQuebra: 10,
      renovacaoAutomatica: false,
      autorizaDivulgacaoPlacasRedes: autorizaDivulgacaoPlacasRedesExcl,
      autorizaProspeccaoClientes: autorizaProspeccaoClientesExcl,
      condicoesPagamento: finalidadeExclusividade !== 'locacao' ? toUpperCase(condicoesPagamento || 'À vista ou parcelado') : 'Locação mensal',
      documentoPropriedade: toUpperCase(documentoPropriedade),
      matricula: toUpperCase(matricula),
      inscricaoPrefeitura: toUpperCase(inscricaoPrefeitura),
      outrosDadosImovel: toUpperCase(outrosDadosImovel),
    } : undefined,
    locacao: tipo === 'locacao' ? {
      tipoImovel: tipoImovelLocacao,
      finalidadeLocacao: finalidadeLocacao,
      valorAluguel: valorAluguel || valorTotal,
      valorAluguelExtenso: valorAluguelExtenso || valorTotalExtenso || numeroPorExtensoReais(valorAluguel || valorTotal),
      diaVencimento: Number(diaVencimento) || 10,
      formaPagamento: formaPagamentoLocacao,
      dadosBancariosLocador: toUpperCase(dadosBancariosLocador),
      indiceReajuste,
      periodicidadeReajuste,
      prazoMeses: Number(prazoMesesLocacao) || 12,
      dataInicio: dataInicioLocacao,
      dataTermino: dataTerminoLocacao,
      garantiaTipo: garantiaTipoLocacao,
      valorCaucao: garantiaTipoLocacao === 'caucao' ? (valorCaucaoLocacao || ((valorAluguel || valorTotal) * (numeroMesesCaucao || 1))) : undefined,
      numeroMesesCaucao: garantiaTipoLocacao === 'caucao' ? numeroMesesCaucao : undefined,
      fiador: garantiaTipoLocacao === 'fiador' ? toUpperCaseObject(fiadorLocacao) : undefined,
      multaAtrasoPercentual: Number(multaAtrasoLocacao) || 10,
      jurosMoraMensalPercentual: Number(jurosMoraLocacao) || 1,
      multaRescisao: multaRescisaoLocacao,
      despesasLocatario,
      destinacaoUso: toUpperCase(destinacaoUso),
      vistoriaInicialRealizada,
      autorizaSublocacao,
    } : undefined,
    clausulasExtras,
    assinaturas: initialData?.assinaturas || [],
    modalidadeAssinatura: initialData?.modalidadeAssinatura,
    testemunha1: initialData?.testemunha1,
    testemunha2: initialData?.testemunha2,
  });

  // Salvar Rascunho: NÃO valida campos obrigatórios - salva o que já foi
  // preenchido até agora no Supabase, pra continuar depois em outro
  // dispositivo (ex: começou no celular com o cliente, termina no PC).
  // Não navega pra outra tela - fica no formulário, só confirma o salvamento.
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setDraftSaved(false);
    try {
      await onSaveDraft({ ...buildContractData(), status: 'rascunho' });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const missing = getMissingFields();
    if (missing.length > 0) {
      setMissingFields(missing);
      setActiveTab(missing[0].tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setMissingFields([]);

    const contractData = buildContractData();
    onSave(contractData);
  };

  // Depois que o banner "campos obrigatórios faltando" já apareceu (usuário
  // tentou gerar e faltava algo), recalcula a lista a cada alteração nos
  // campos do formulário. Assim, à medida que o usuário vai preenchendo o
  // que faltava, o item some da lista sozinho - sem precisar clicar em
  // "Gerar Contrato" de novo pra ver a lista atualizar. Só recalcula
  // enquanto o banner está visível (missingFields.length > 0) pra não gastar
  // processamento em formulário que ainda não foi submetido nenhuma vez.
  useEffect(() => {
    if (missingFields.length === 0) return;
    setMissingFields(getMissingFields());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vendedor,
    comprador,
    imovel,
    bemOutros,
    titulo,
    documentoPropriedade,
    matricula,
    inscricaoPrefeitura,
    outrosDadosImovel,
    condicoesPagamento,
    valorTotal,
    valorTotalExtenso,
    dadosBancariosRecebedor,
    dataInicioExcl,
    cidadeForo,
    ufForo,
    cidadeAssinatura,
    ufAssinatura,
    diaAssinatura,
    mesExtensoAssinatura,
    anoAssinatura,
    tipo,
    subcategoria,
  ]);

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cabeçalho do Formulário com Visual Executivo */}
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-900 border border-yellow-300/80 text-[11px] font-extrabold uppercase tracking-wide">
                  {initialData ? 'Edição de Contrato' : 'Novo Instrumento Contratual'}
                </span>
                <span className="font-mono bg-slate-900 text-white px-2 py-0.5 rounded-md font-bold text-[10px] tracking-tight">
                  {numeroContrato}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {tipo === 'venda_vista'
                  ? 'Contrato de Compra e Venda à Vista'
                  : tipo === 'venda_parcelada'
                  ? 'Contrato de Compra e Venda Parcelada'
                  : tipo === 'locacao'
                  ? 'Contrato de Locação de Imóvel'
                  : 'Contrato de Prestação de Serviços com Exclusividade'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Preencha as informações cadastrais e financeiras para emissão jurídica e colheita de assinaturas.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="px-4 py-2.5 text-xs font-bold text-yellow-900 bg-yellow-100/70 hover:bg-yellow-200/80 border border-yellow-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{savingDraft ? 'Salvando...' : 'Salvar Rascunho'}</span>
              </button>
            </div>
          </div>

          {/* SELETOR DE SUBCATEGORIA (Imóvel vs Outros Bens) */}
          {tipo !== 'exclusividade' && tipo !== 'locacao' && (
            <div className="space-y-2.5">
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                Subcategoria do Objeto Negociado:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSubcategoriaChange('imovel')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                    subcategoria === 'imovel'
                      ? 'border-yellow-400 bg-yellow-50/70 ring-2 ring-yellow-400/30 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${subcategoria === 'imovel' ? 'bg-yellow-400 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Imóvel (Terreno / Lote / Casa)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Metragens, loteamento, quadra e confrontações
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubcategoriaChange('outros_bens')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                    subcategoria === 'outros_bens'
                      ? 'border-yellow-400 bg-yellow-50/70 ring-2 ring-yellow-400/30 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${subcategoria === 'outros_bens' ? 'bg-yellow-400 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Outros Bens (Carro, Moto, Embarcação, etc.)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Marca, modelo, placa, chassi, renavam e estado
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stepper / Barra de Etapas 100% Responsiva sem Rolagem Lateral */}
        <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {[
              {
                id: 'vendedor' as TabKey,
                num: 1,
                label: tipo === 'exclusividade' ? 'Contratante' : tipo === 'locacao' ? 'Locador' : 'Vendedor',
                icon: <User className="w-3.5 h-3.5 shrink-0" />,
              },
              {
                id: 'comprador' as TabKey,
                num: 2,
                label: tipo === 'exclusividade' ? 'Contratado' : tipo === 'locacao' ? 'Locatário' : 'Comprador',
                icon: <User className="w-3.5 h-3.5 shrink-0" />,
              },
              {
                id: 'imovel' as TabKey,
                num: 3,
                label: subcategoria === 'outros_bens' && tipo !== 'exclusividade' && tipo !== 'locacao' ? 'Bem / Veículo' : 'Imóvel',
                icon: subcategoria === 'outros_bens' && tipo !== 'exclusividade' && tipo !== 'locacao' ? (
                  <Car className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                ),
              },
              {
                id: 'financeiro' as TabKey,
                num: 4,
                label: tipo === 'locacao' ? 'Locação' : 'Financeiro',
                icon: <Banknote className="w-3.5 h-3.5 shrink-0" />,
              },
              {
                id: 'foro' as TabKey,
                num: 5,
                label: 'Foro & Data',
                icon: <Scale className="w-3.5 h-3.5 shrink-0" />,
              },
              {
                id: 'revisao' as TabKey,
                num: 6,
                label: 'Revisão',
                icon: <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />,
              },
            ].map((step) => {
              const isActive = activeTab === step.id;
              const hasErrors = missingFields.some((f) => f.tab === step.id);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveTab(step.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border relative text-center sm:text-left ${
                    isActive
                      ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                      : hasErrors
                      ? 'bg-rose-50/80 text-rose-900 border-rose-200 hover:bg-rose-100/70'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950 border-slate-200/90'
                  }`}
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isActive
                          ? 'bg-yellow-400 text-slate-950'
                          : hasErrors
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {step.num}
                    </span>
                    <span className={isActive ? 'text-yellow-400' : hasErrors ? 'text-rose-600' : 'text-slate-500'}>
                      {step.icon}
                    </span>
                  </div>
                  <span className="truncate text-[11px] sm:text-xs font-bold">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Banner de campos obrigatórios faltando */}
        {missingFields.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs sm:text-sm font-black text-rose-800">
              Preencha os campos obrigatórios antes de gerar o contrato ({missingFields.length} pendente{missingFields.length > 1 ? 's' : ''}):
            </p>
            <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside">
              {missingFields.map((f, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(f.tab)}
                    className="underline hover:text-rose-950 font-bold cursor-pointer"
                  >
                    {TAB_LABELS[f.tab]}
                  </button>
                  {' — '}{f.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ABA: DADOS DO IMÓVEL OU DO BEM */}
        {activeTab === 'imovel' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? (
                    <Car className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Building2 className="w-5 h-5 text-amber-500" />
                  )}
                  {subcategoria === 'outros_bens' && tipo !== 'exclusividade'
                    ? 'Identificação do Bem Móvel / Veículo'
                    : 'Identificação do Imóvel / Objeto'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {subcategoria === 'outros_bens' && tipo !== 'exclusividade'
                    ? 'Preencha os detalhes do veículo, moto, embarcação, maquinário ou bem negociado.'
                    : 'Identificação detalhada, metragens, confrontações e localização geográfica.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título de Identificação Interna do Contrato
                  {tipo !== 'exclusividade' && subcategoria !== 'outros_bens' && (
                    <span className="font-normal text-slate-400"> (gerado automaticamente)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  readOnly={tipo !== 'exclusividade' && subcategoria !== 'outros_bens'}
                  placeholder={
                    subcategoria === 'outros_bens' && tipo !== 'exclusividade'
                      ? 'Ex: Compra e Venda Toyota Corolla XEi 2024 - Placa QEZ-8A90'
                      : 'Ex: Compra e Venda Lote 14 Quadra 08 - Loteamento Tapajós'
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 focus:outline-hidden read-only:bg-slate-100 read-only:text-slate-600"
                />
                {tipo !== 'exclusividade' && subcategoria !== 'outros_bens' && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Segue sempre o padrão Lote_Quadra_Empreendimento_Cliente_Data_Hora, a partir dos dados
                    preenchidos abaixo e do comprador.
                  </p>
                )}
              </div>

              {/* RENDERIZAÇÃO CONDICIONAL: EXCLUSIVIDADE vs IMÓVEL vs OUTROS BENS */}
              {tipo === 'exclusividade' ? (
                <>
                  <div className="md:col-span-2 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Modalidade / Finalidade da Intermediação Imobiliária
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFinalidadeExclusividade('venda')}
                        className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                          finalidadeExclusividade === 'venda'
                            ? 'bg-white border-amber-500 ring-2 ring-amber-400 shadow-xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white text-slate-700'
                        }`}
                      >
                        <span className="block text-xs font-extrabold text-slate-900">Venda do Imóvel</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">Exclusividade para alienação / comercialização</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinalidadeExclusividade('locacao')}
                        className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                          finalidadeExclusividade === 'locacao'
                            ? 'bg-white border-amber-500 ring-2 ring-amber-400 shadow-xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white text-slate-700'
                        }`}
                      >
                        <span className="block text-xs font-extrabold text-slate-900">Locação do Imóvel</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">Exclusividade para aluguel e administração</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinalidadeExclusividade('ambos')}
                        className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                          finalidadeExclusividade === 'ambos'
                            ? 'bg-white border-amber-500 ring-2 ring-amber-400 shadow-xs'
                            : 'bg-white/60 border-slate-200 hover:bg-white text-slate-700'
                        }`}
                      >
                        <span className="block text-xs font-extrabold text-slate-900">Venda e Locação</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">Intermediação mista com prioridade</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo do Imóvel
                    </label>
                    <input
                      type="text"
                      value={imovel.tipoImovel || ''}
                      onChange={(e) => setImovel({ ...imovel, tipoImovel: e.target.value })}
                      placeholder="Ex: Terreno urbano, Casa, Apartamento, Sala comercial"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Tipo do Imóvel')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Localização do Imóvel
                    </label>
                    <input
                      type="text"
                      value={imovel.localizacaoImovel}
                      onChange={(e) => setImovel({ ...imovel, localizacaoImovel: e.target.value })}
                      placeholder="Ex: Rua das Palmeiras, nº 120, Bairro Aldeia"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Localização do Imóvel')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cidade do Imóvel
                    </label>
                    <input
                      type="text"
                      value={imovel.cidadeImovel}
                      onChange={(e) => setImovel({ ...imovel, cidadeImovel: e.target.value })}
                      placeholder="Ex: Santarém"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Cidade do Imóvel')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      UF do Imóvel
                    </label>
                    <input
                      type="text"
                      value={imovel.ufImovel}
                      onChange={(e) => setImovel({ ...imovel, ufImovel: e.target.value.toUpperCase() })}
                      placeholder="Ex: PA"
                      maxLength={2}
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden uppercase ${errCls('UF do Imóvel')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Documento de Propriedade
                    </label>
                    <input
                      type="text"
                      value={documentoPropriedade}
                      onChange={(e) => setDocumentoPropriedade(e.target.value)}
                      placeholder="Ex: Título Definitivo de Propriedade nº 1234/2020"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Documento de Propriedade')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Matrícula
                    </label>
                    <input
                      type="text"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      placeholder="Ex: Sob o nº 12.345 do 1º Ofício de Registro de Imóveis"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Matrícula')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Inscrição na Prefeitura
                    </label>
                    <input
                      type="text"
                      value={inscricaoPrefeitura}
                      onChange={(e) => setInscricaoPrefeitura(e.target.value)}
                      placeholder="Ex: Cadastrado sob o nº 00.00.000.0000.000"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Inscrição na Prefeitura')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Outros Dados do Imóvel
                    </label>
                    <input
                      type="text"
                      value={outrosDadosImovel}
                      onChange={(e) => setOutrosDadosImovel(e.target.value)}
                      placeholder="Descrição, dimensões e confrontações"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Outros Dados do Imóvel')}`}
                    />
                  </div>

                  {finalidadeExclusividade !== 'locacao' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Condições de Pagamento (para venda futura do imóvel)
                      </label>
                      <input
                        type="text"
                        value={condicoesPagamento}
                        onChange={(e) => setCondicoesPagamento(e.target.value)}
                        placeholder="Ex: À vista, em moeda corrente nacional, via PIX ou transferência bancária"
                        className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Condições de Pagamento')}`}
                      />
                    </div>
                  )}
                </>
              ) : subcategoria === 'outros_bens' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Bem
                    </label>
                    <select
                      value={bemOutros.tipoBem}
                      onChange={(e) => setBemOutros({ ...bemOutros, tipoBem: e.target.value as any })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden bg-white"
                    >
                      <option value="carro">Carro / Automóvel</option>
                      <option value="moto">Moto / Motocicleta</option>
                      <option value="caminhao">Caminhão / Utilitário</option>
                      <option value="embarcacao">Embarcação / Lancha / Jet Ski</option>
                      <option value="maquinario">Maquinário / Equipamento Agrícola</option>
                      <option value="outro">Outro Bem Móvel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descrição Principal do Bem
                    </label>
                    <input
                      type="text"
                      value={bemOutros.descricao}
                      onChange={(e) => setBemOutros({ ...bemOutros, descricao: e.target.value })}
                      placeholder="Ex: Veículo automotor Toyota Corolla XEi 2.0 Automático"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Descrição Principal do Bem')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Marca / Fabricante
                    </label>
                    <input
                      type="text"
                      value={bemOutros.marca}
                      onChange={(e) => setBemOutros({ ...bemOutros, marca: e.target.value })}
                      placeholder="Ex: Toyota, Honda, Yamaha, Volkswagen..."
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Marca / Fabricante')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Modelo / Versão
                    </label>
                    <input
                      type="text"
                      value={bemOutros.modelo}
                      onChange={(e) => setBemOutros({ ...bemOutros, modelo: e.target.value })}
                      placeholder="Ex: Corolla XEi 2.0 Flex"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Modelo / Versão')}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ano Fabricação
                      </label>
                      <input
                        type="text"
                        value={bemOutros.anoFabricacao}
                        onChange={(e) => setBemOutros({ ...bemOutros, anoFabricacao: e.target.value })}
                        placeholder="Ex: 2023"
                        className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Ano Fabricação')}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ano Modelo
                      </label>
                      <input
                        type="text"
                        value={bemOutros.anoModelo}
                        onChange={(e) => setBemOutros({ ...bemOutros, anoModelo: e.target.value })}
                        placeholder="Ex: 2024"
                        className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Ano Modelo')}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cor Predominante
                    </label>
                    <input
                      type="text"
                      value={bemOutros.cor}
                      onChange={(e) => setBemOutros({ ...bemOutros, cor: e.target.value })}
                      placeholder="Ex: Prata Metálico, Preto..."
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Cor Predominante')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Placa / Identificação
                    </label>
                    <input
                      type="text"
                      value={bemOutros.placa}
                      onChange={(e) => setBemOutros({ ...bemOutros, placa: e.target.value.toUpperCase() })}
                      placeholder="Ex: QEZ-8A90"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden uppercase ${errCls('Placa / Identificação')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      RENAVAM (se veículo)
                    </label>
                    <input
                      type="text"
                      value={bemOutros.renavam}
                      onChange={(e) => setBemOutros({ ...bemOutros, renavam: e.target.value })}
                      placeholder="Ex: 01298471203"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('RENAVAM')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chassi (se veículo)
                    </label>
                    <input
                      type="text"
                      value={bemOutros.chassi}
                      onChange={(e) => setBemOutros({ ...bemOutros, chassi: e.target.value.toUpperCase() })}
                      placeholder="Ex: 9BRBL42E4N0198421"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden uppercase ${errCls('Chassi')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nº de Série / Motor (se aplicável)
                    </label>
                    <input
                      type="text"
                      value={bemOutros.numeroSerie}
                      onChange={(e) => setBemOutros({ ...bemOutros, numeroSerie: e.target.value })}
                      placeholder="Ex: 2ZR-FE-9842"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Número de Série / Motor')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Quilometragem / Horímetro / Uso
                    </label>
                    <input
                      type="text"
                      value={bemOutros.quilometragemOuUso}
                      onChange={(e) => setBemOutros({ ...bemOutros, quilometragemOuUso: e.target.value })}
                      placeholder="Ex: 18.500 km rodados"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Quilometragem / Horímetro / Uso')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estado de Conservação / Condição
                    </label>
                    <input
                      type="text"
                      value={bemOutros.estadoConservacao}
                      onChange={(e) => setBemOutros({ ...bemOutros, estadoConservacao: e.target.value })}
                      placeholder="Ex: Em perfeito estado de conservação e funcionamento"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Estado de Conservação')}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Acessórios e Itens Inclusos
                    </label>
                    <input
                      type="text"
                      value={bemOutros.acessoriosInclusos}
                      onChange={(e) => setBemOutros({ ...bemOutros, acessoriosInclusos: e.target.value })}
                      placeholder="Ex: Chave reserva, manual do proprietário, estepe, kit multimídia..."
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Acessórios e Itens Inclusos')}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Situação Documental / Declaração de Desembaraço
                    </label>
                    <input
                      type="text"
                      value={bemOutros.documentacaoSituacao}
                      onChange={(e) => setBemOutros({ ...bemOutros, documentacaoSituacao: e.target.value })}
                      placeholder="Ex: IPVA 2026 quitado, livre e desembaraçado de multas, restrições e gravames."
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Situação Documental')}`}
                    />
                  </div>
                </>
              ) : tipo === 'locacao' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo do Imóvel Locado
                    </label>
                    <select
                      value={tipoImovelLocacao}
                      onChange={(e) => setTipoImovelLocacao(e.target.value as any)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 bg-white"
                    >
                      <option value="casa">Casa Residencial</option>
                      <option value="apartamento">Apartamento</option>
                      <option value="galpao">Galpão Comercial / Industrial / Depósito</option>
                      <option value="sala_comercial">Sala Comercial / Escritório</option>
                      <option value="predio">Prédio Comercial / Edifício</option>
                      <option value="terreno">Terreno / Área Urbana</option>
                      <option value="outro">Outro Tipo de Imóvel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Finalidade da Locação
                    </label>
                    <select
                      value={finalidadeLocacao}
                      onChange={(e) => setFinalidadeLocacao(e.target.value as any)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 bg-white"
                    >
                      <option value="residencial">Residencial (Moradia)</option>
                      <option value="comercial">Comercial (Comércio / Serviços)</option>
                      <option value="industrial_galpao">Industrial / Armazenagem / Logística</option>
                      <option value="temporada">Temporada</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Endereço Completo do Imóvel Locado (Rua, Av, Número)
                    </label>
                    <input
                      type="text"
                      value={imovel.enderecoLote || imovel.localizacaoImovel || ''}
                      onChange={(e) => setImovel({ ...imovel, enderecoLote: e.target.value, localizacaoImovel: e.target.value })}
                      placeholder="Ex: Av. Mendonça Furtado, nº 1540"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-hidden ${errCls('Endereço do Imóvel Locado')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bairro / Região
                    </label>
                    <input
                      type="text"
                      value={imovel.nomeEmpreendimento || ''}
                      onChange={(e) => setImovel({ ...imovel, nomeEmpreendimento: e.target.value })}
                      placeholder="Ex: Aldeia / Centro"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cidade do Imóvel Locado
                    </label>
                    <input
                      type="text"
                      value={imovel.cidadeImovel || cidadeForo}
                      onChange={(e) => setImovel({ ...imovel, cidadeImovel: e.target.value })}
                      placeholder="Ex: Santarém"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-hidden ${errCls('Cidade do Imóvel Locado')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      UF do Imóvel Locado
                    </label>
                    <input
                      type="text"
                      value={imovel.ufImovel || ufForo}
                      onChange={(e) => setImovel({ ...imovel, ufImovel: e.target.value.toUpperCase() })}
                      placeholder="PA"
                      maxLength={2}
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-hidden uppercase ${errCls('UF do Imóvel Locado')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Área Construída / Privativa (m²) (Opcional)
                    </label>
                    <input
                      type="text"
                      value={imovel.areaTotalM2 || ''}
                      onChange={(e) => setImovel({ ...imovel, areaTotalM2: e.target.value })}
                      placeholder="Ex: 120"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Destinação Específica do Uso (Opcional)
                    </label>
                    <input
                      type="text"
                      value={destinacaoUso}
                      onChange={(e) => setDestinacaoUso(e.target.value)}
                      placeholder="Ex: Exclusivamente para residência familiar do Locatário"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-hidden"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome do Empreendimento / Loteamento
                    </label>
                    <input
                      type="text"
                      value={imovel.nomeEmpreendimento}
                      onChange={(e) => setImovel({ ...imovel, nomeEmpreendimento: e.target.value })}
                      placeholder="Ex: Loteamento Residencial Tapajós"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Nome do Empreendimento / Loteamento')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Localização do Imóvel
                    </label>
                    <input
                      type="text"
                      value={imovel.localizacaoImovel}
                      onChange={(e) => setImovel({ ...imovel, localizacaoImovel: e.target.value })}
                      placeholder="Ex: Rodovia Fernando Guilhon, Km 06"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Localização do Imóvel')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cidade do Imóvel
                    </label>
                    <input
                      type="text"
                      value={imovel.cidadeImovel}
                      onChange={(e) => setImovel({ ...imovel, cidadeImovel: e.target.value })}
                      placeholder="Ex: Santarém"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Cidade do Imóvel')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      UF do Imóvel
                    </label>
                    <input
                      type="text"
                      value={imovel.ufImovel}
                      onChange={(e) => setImovel({ ...imovel, ufImovel: e.target.value.toUpperCase() })}
                      placeholder="Ex: PA"
                      maxLength={2}
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden uppercase ${errCls('UF do Imóvel')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Número do Lote
                    </label>
                    <input
                      type="text"
                      value={imovel.numeroLote}
                      onChange={(e) => setImovel({ ...imovel, numeroLote: e.target.value })}
                      placeholder="Ex: 14"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Número do Lote')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Número da Quadra
                    </label>
                    <input
                      type="text"
                      value={imovel.numeroQuadra}
                      onChange={(e) => setImovel({ ...imovel, numeroQuadra: e.target.value })}
                      placeholder="Ex: 08"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Número da Quadra')}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Endereço Completo do Lote
                    </label>
                    <input
                      type="text"
                      value={imovel.enderecoLote}
                      onChange={(e) => setImovel({ ...imovel, enderecoLote: e.target.value })}
                      placeholder="Ex: Rua das Palmeiras, Quadra 08, Lote 14"
                      className={`w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden ${errCls('Endereço Completo do Lote')}`}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Metragens e Confrontações apenas se for Imóvel e não for Locação */}
            {tipo !== 'locacao' && (subcategoria === 'imovel' || tipo === 'exclusividade') && (
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Dimensões e Metragens do Terreno
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Frente (metros)
                    </label>
                    <input
                      type="text"
                      value={imovel.metragemFrente}
                      onChange={(e) => setImovel({ ...imovel, metragemFrente: e.target.value })}
                      placeholder="12,00"
                      className={`w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 ${errCls('Metragem Frente')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Lateral Direita (m)
                    </label>
                    <input
                      type="text"
                      value={imovel.metragemLateralDireita}
                      onChange={(e) => setImovel({ ...imovel, metragemLateralDireita: e.target.value })}
                      placeholder="30,00"
                      className={`w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 ${errCls('Metragem Lateral Direita')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Lateral Esquerda (m)
                    </label>
                    <input
                      type="text"
                      value={imovel.metragemLateralEsquerda}
                      onChange={(e) => setImovel({ ...imovel, metragemLateralEsquerda: e.target.value })}
                      placeholder="30,00"
                      className={`w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 ${errCls('Metragem Lateral Esquerda')}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Fundos (metros)
                    </label>
                    <input
                      type="text"
                      value={imovel.metragemFundos}
                      onChange={(e) => setImovel({ ...imovel, metragemFundos: e.target.value })}
                      placeholder="12,00"
                      className={`w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 ${errCls('Metragem Fundos')}`}
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Área Total (m²)
                    </label>
                    <input
                      type="text"
                      value={imovel.areaTotalM2}
                      onChange={(e) => setImovel({ ...imovel, areaTotalM2: e.target.value })}
                      placeholder="360,00"
                      className={`w-full px-3 py-1.5 text-xs border border-amber-300 bg-amber-50/50 font-bold text-amber-950 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 ${errCls('Área Total (m²)')}`}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('comprador')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar: {tipo === 'exclusividade' ? 'Contratado' : tipo === 'locacao' ? 'Locatário' : 'Comprador'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('financeiro')}
                className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] text-xs font-extrabold text-slate-950 btn-gold rounded-xl shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
              >
                Próximo: {tipo === 'locacao' ? 'Condições da Locação' : 'Condições Financeiras'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ABA: PARTES CONTRATANTES */}
        {activeTab === 'vendedor' && (
          <div className="space-y-6">
            {/* 1. PROMITENTE VENDEDOR(A) / LOCADOR */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center justify-center">1</span>
                  {tipo === 'exclusividade'
                    ? 'PROPRIETÁRIO / CONTRATANTE'
                    : tipo === 'locacao'
                    ? 'PROPRIETÁRIO / LOCADOR(A)'
                    : 'PROMITENTE VENDEDOR(A)'}
                </h2>
                <span className="text-[11px] font-medium text-slate-500">
                  {tipo === 'exclusividade'
                    ? 'Dados do Proprietário / Contratante'
                    : tipo === 'locacao'
                    ? 'Dados do Proprietário / Locador'
                    : 'Dados do Transmitente / Vendedor'}
                </span>
              </div>

              <SavedPartyPicker
                savedParties={savedParties}
                loading={loadingSavedParties}
                currentParty={vendedor}
                onSelect={(data) => setVendedor({ ...emptyParty, ...data })}
                onSaveContact={handleSaveVendedorContact}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo / Razão Social
                  </label>
                  <input
                    type="text"
                    value={vendedor.nome}
                    onChange={(e) => setVendedor({ ...vendedor, nome: e.target.value })}
                    placeholder="Ex: José Maria Figueira de Alencar"
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 ${errCls(`${vLabelUI}: Nome`)}`}
                  />
                </div>

                <div>
                  <GenderSelect
                    value={vendedor.genero || ''}
                    onChange={(val) =>
                      setVendedor({
                        ...vendedor,
                        genero: val,
                        estadoCivil: convertEstadoCivilToGenero(vendedor.estadoCivil, val),
                        nacionalidade: convertNacionalidadeToGenero(vendedor.nacionalidade, val),
                      })
                    }
                    label="Gênero"
                    error={missingLabelsSet.has(`${vLabelUI}: Gênero`)}
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="cpf"
                    value={vendedor.cpfCnpj}
                    onChange={(val) => setVendedor({ ...vendedor, cpfCnpj: val })}
                    label="CPF"
                    placeholder="000.000.000-00"
                    className={errCls(`${vLabelUI}: CPF`)}
                  />
                </div>

                <div>
                  <NacionalidadeSelect
                    value={vendedor.nacionalidade}
                    onChange={(val) => setVendedor({ ...vendedor, nacionalidade: val })}
                    genero={vendedor.genero || ''}
                    error={missingLabelsSet.has(`${vLabelUI}: Nacionalidade`)}
                  />
                </div>

                <div>
                  <EstadoCivilSelect
                    value={vendedor.estadoCivil}
                    onChange={(val) => setVendedor({ ...vendedor, estadoCivil: val })}
                    genero={vendedor.genero || ''}
                    error={missingLabelsSet.has(`${vLabelUI}: Estado Civil`)}
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="rg"
                    value={vendedor.rg}
                    onChange={(val) => setVendedor({ ...vendedor, rg: val })}
                    label="RG nº"
                    placeholder="Ex: 3456789"
                    className={errCls(`${vLabelUI}: RG`)}
                  />
                </div>

                <div>
                  <OrgaoEmissorInput
                    value={vendedor.rgOrgao}
                    onChange={(val) => setVendedor({ ...vendedor, rgOrgao: val })}
                    error={missingLabelsSet.has(`${vLabelUI}: Órgão Emissor`)}
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="phone"
                    value={vendedor.telefone}
                    onChange={(val) => setVendedor({ ...vendedor, telefone: val })}
                    label="Telefone / WhatsApp"
                    placeholder="(93) 99122-3344"
                    className={errCls(`${vLabelUI}: Telefone`)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Logradouro / Endereço
                  </label>
                  <input
                    type="text"
                    value={vendedor.endereco}
                    onChange={(e) => setVendedor({ ...vendedor, endereco: e.target.value })}
                    placeholder="Ex: Av. Mendonça Furtado"
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 ${errCls(`${vLabelUI}: Endereço`)}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={vendedor.numero}
                    onChange={(e) => setVendedor({ ...vendedor, numero: e.target.value })}
                    placeholder="1420"
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 ${errCls(`${vLabelUI}: Número`)}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={vendedor.bairro}
                    onChange={(e) => setVendedor({ ...vendedor, bairro: e.target.value })}
                    placeholder="Aldeia"
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 ${errCls(`${vLabelUI}: Bairro`)}`}
                  />
                </div>

                <div>
                  <CEPSearch
                    cep={vendedor.cep}
                    onCEPChange={(val) => setVendedor({ ...vendedor, cep: val })}
                    onAddressChange={(addr) => setVendedor({ ...vendedor, ...addr })}
                    label="CEP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cidade / UF
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vendedor.cidade}
                      onChange={(e) => setVendedor({ ...vendedor, cidade: e.target.value })}
                      placeholder="Santarém"
                      className={`w-2/3 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 ${errCls(`${vLabelUI}: Cidade`)}`}
                    />
                    <input
                      type="text"
                      value={vendedor.uf}
                      onChange={(e) => setVendedor({ ...vendedor, uf: e.target.value.toUpperCase() })}
                      placeholder="PA"
                      maxLength={2}
                      className={`w-1/3 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 uppercase ${errCls(`${vLabelUI}: UF`)}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('comprador')}
                className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] text-xs font-extrabold text-slate-950 btn-gold rounded-xl shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
              >
                Próximo: {tipo === 'exclusividade' ? 'Contratado' : tipo === 'locacao' ? 'Locatário' : 'Comprador'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'comprador' && (
          <div className="space-y-6">
            {/* 2. PROMITENTE COMPRADOR(A) / LOCATÁRIO */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center justify-center">2</span>
                  {tipo === 'exclusividade'
                    ? 'CORRETOR / CONTRATADO'
                    : tipo === 'locacao'
                    ? 'INQUILINO / LOCATÁRIO(A)'
                    : 'PROMITENTE COMPRADOR(A)'}
                </h2>
                <span className="text-[11px] font-medium text-slate-500">
                  {tipo === 'exclusividade'
                    ? 'Dados do Corretor / Contratado'
                    : tipo === 'locacao'
                    ? 'Dados do Inquilino / Locatário'
                    : 'Dados do Adquirente / Beneficiário'}
                </span>
              </div>

              <SavedPartyPicker
                savedParties={savedParties}
                loading={loadingSavedParties}
                currentParty={comprador}
                onSelect={(data) => setComprador({ ...emptyParty, ...data })}
                onSaveContact={handleSaveCompradorContact}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={comprador.nome}
                    onChange={(e) => setComprador({ ...comprador, nome: e.target.value })}
                    placeholder="Ex: Cláudia Beatriz Menezes Silva"
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 ${errCls(`${cLabelUI}: Nome`)}`}
                  />
                </div>

                <div>
                  <GenderSelect
                    value={comprador.genero || ''}
                    onChange={(val) =>
                      setComprador({
                        ...comprador,
                        genero: val,
                        estadoCivil: convertEstadoCivilToGenero(comprador.estadoCivil, val),
                        nacionalidade: convertNacionalidadeToGenero(comprador.nacionalidade, val),
                      })
                    }
                    label="Gênero"
                    error={missingLabelsSet.has(`${cLabelUI}: Gênero`)}
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="cpf"
                    value={comprador.cpfCnpj}
                    onChange={(val) => setComprador({ ...comprador, cpfCnpj: val })}
                    label="CPF"
                    placeholder="000.000.000-00"
                    className={errCls(`${cLabelUI}: CPF`)}
                  />
                </div>

                {tipo === 'exclusividade' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CRECI
                    </label>
                    <input
                      type="text"
                      value={comprador.creci || ''}
                      onChange={(e) => setComprador({ ...comprador, creci: e.target.value })}
                      placeholder="Ex: 1234-J"
                      className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 ${errCls(`${cLabelUI}: CRECI`)}`}
                    />
                  </div>
                )}

                <div>
                  <NacionalidadeSelect
                    value={comprador.nacionalidade}
                    onChange={(val) => setComprador({ ...comprador, nacionalidade: val })}
                    genero={comprador.genero || ''}
                    error={missingLabelsSet.has(`${cLabelUI}: Nacionalidade`)}
                  />
                </div>

                <div>
                  <EstadoCivilSelect
                    value={comprador.estadoCivil}
                    onChange={(val) => setComprador({ ...comprador, estadoCivil: val })}
                    genero={comprador.genero || ''}
                    error={missingLabelsSet.has(`${cLabelUI}: Estado Civil`)}
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="rg"
                    value={comprador.rg}
                    onChange={(val) => setComprador({ ...comprador, rg: val })}
                    label="RG nº"
                    placeholder="Ex: 4567890"
                    className={errCls(`${cLabelUI}: RG`)}
                  />
                </div>

                <div>
                  <OrgaoEmissorInput
                    value={comprador.rgOrgao}
                    onChange={(val) => setComprador({ ...comprador, rgOrgao: val })}
                    error={missingLabelsSet.has(`${cLabelUI}: Órgão Emissor`)}
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="phone"
                    value={comprador.telefone}
                    onChange={(val) => setComprador({ ...comprador, telefone: val })}
                    label="Telefone / WhatsApp"
                    placeholder="(93) 98400-5566"
                    className={errCls(`${cLabelUI}: Telefone`)}
                  />
                </div>

                {tipo === 'venda_parcelada' && (
                  <div>
                    <ValidatedInput
                      validationType="phone"
                      value={comprador.telefone2 || ''}
                      onChange={(val) => setComprador({ ...comprador, telefone2: val })}
                      label="Telefone Secundário"
                      placeholder="(93) 98400-9999"
                      className={errCls(`${cLabelUI}: Telefone Secundário`)}
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Logradouro / Endereço
                  </label>
                  <input
                    type="text"
                    value={comprador.endereco}
                    onChange={(e) => setComprador({ ...comprador, endereco: e.target.value })}
                    placeholder="Ex: Travessa dos Mártires"
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 ${errCls(`${cLabelUI}: Endereço`)}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={comprador.numero}
                    onChange={(e) => setComprador({ ...comprador, numero: e.target.value })}
                    placeholder="580"
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 ${errCls(`${cLabelUI}: Número`)}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={comprador.bairro}
                    onChange={(e) => setComprador({ ...comprador, bairro: e.target.value })}
                    placeholder="Centro"
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 ${errCls(`${cLabelUI}: Bairro`)}`}
                  />
                </div>

                <div>
                  <CEPSearch
                    cep={comprador.cep}
                    onCEPChange={(val) => setComprador({ ...comprador, cep: val })}
                    onAddressChange={(addr) => setComprador({ ...comprador, ...addr })}
                    label="CEP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cidade / UF
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={comprador.cidade}
                      onChange={(e) => setComprador({ ...comprador, cidade: e.target.value })}
                      placeholder="Santarém"
                      className={`w-2/3 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 ${errCls(`${cLabelUI}: Cidade`)}`}
                    />
                    <input
                      type="text"
                      value={comprador.uf}
                      onChange={(e) => setComprador({ ...comprador, uf: e.target.value.toUpperCase() })}
                      placeholder="PA"
                      maxLength={2}
                      className={`w-1/3 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase ${errCls(`${cLabelUI}: UF`)}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('vendedor')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar: {tipo === 'exclusividade' ? 'Contratante' : tipo === 'locacao' ? 'Locador' : 'Vendedor'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('imovel')}
                className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] text-xs font-extrabold text-slate-950 btn-gold rounded-xl shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
              >
                Próximo: {subcategoria === 'outros_bens' && tipo !== 'exclusividade' && tipo !== 'locacao' ? 'Bem / Veículo' : 'Imóvel'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ABA: FINANCEIRO & PAGAMENTO / CONDIÇÕES DA LOCAÇÃO */}
        {activeTab === 'financeiro' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-600" />
                {tipo === 'locacao' ? '4. Condições da Locação, Aluguel e Garantias' : '4. Condições Financeiras e Pagamento'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tipo === 'locacao'
                  ? 'Definição do valor locatício mensal, vencimento, vigência, índice de reajuste, modalidade de garantia e despesas.'
                  : 'Definição de preço, valores por extenso, quitação e prazos de liquidação.'}
              </p>
            </div>

            {tipo === 'locacao' ? (
              <div className="space-y-5">
                {/* 1. Aluguel e Vencimento */}
                <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Valor Mensal do Aluguel & Vencimento
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Valor Mensal do Aluguel (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={valorAluguel > 0 ? valorAluguel : ''}
                          onChange={(e) => handleValorAluguelChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className={`w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 ${errCls('Valor Mensal do Aluguel')}`}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Exibição: <strong className="text-amber-700">{valorAluguel > 0 ? `R$ ${formatDecimalNumber(valorAluguel)}` : 'R$ 0,00'}</strong>
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Valor do Aluguel por Extenso
                      </label>
                      <input
                        type="text"
                        value={valorAluguelExtenso}
                        onChange={(e) => setValorAluguelExtenso(e.target.value)}
                        placeholder="Ex: um mil e oitocentos reais"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Gerado automaticamente por extenso para segurança jurídica.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/50">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dia do Vencimento Mensal
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold">Todo dia</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={diaVencimento}
                          onChange={(e) => setDiaVencimento(parseInt(e.target.value, 10) || 10)}
                          className="w-20 px-3 py-1.5 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-400"
                        />
                        <span className="text-xs text-slate-500">de cada mês</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Forma de Pagamento
                      </label>
                      <select
                        value={formaPagamentoLocacao}
                        onChange={(e) => setFormaPagamentoLocacao(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Transferência Bancária">Transferência Bancária</option>
                        <option value="Boleto Bancário">Boleto Bancário</option>
                        <option value="Dinheiro">Dinheiro em Espécie</option>
                        <option value="Depósito Identificado">Depósito Identificado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Chave PIX / Dados Bancários do Locador
                      </label>
                      <input
                        type="text"
                        value={dadosBancariosLocador}
                        onChange={(e) => setDadosBancariosLocador(e.target.value)}
                        placeholder="Ex: Chave PIX (CPF): 000.000.000-00 (Banco do Brasil)"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Vigência, Prazos e Reajuste */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Vigência Contratual & Reajuste Anual
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Prazo de Vigência (meses)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={prazoMesesLocacao}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 12;
                          setPrazoMesesLocacao(val);
                        }}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Data de Início da Locação
                      </label>
                      <input
                        type="date"
                        value={dataInicioLocacao}
                        onChange={(e) => {
                          setDataInicioLocacao(e.target.value);
                        }}
                        className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400 ${errCls('Data de Início da Locação')}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Data de Término Prevista
                      </label>
                      <input
                        type="date"
                        value={dataTerminoLocacao}
                        onChange={(e) => setDataTerminoLocacao(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Índice de Reajuste
                      </label>
                      <select
                        value={indiceReajuste}
                        onChange={(e) => setIndiceReajuste(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="IPCA (IBGE)">IPCA (IBGE)</option>
                        <option value="IGP-M (FGV)">IGP-M (FGV)</option>
                        <option value="INPC (IBGE)">INPC (IBGE)</option>
                        <option value="FIPE-ZAP">FIPE-ZAP</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Modalidade de Garantia Locatícia */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Garantia Locatícia (Lei do Inquilinato nº 8.245/91)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tipo de Garantia Exigida
                      </label>
                      <select
                        value={garantiaTipoLocacao}
                        onChange={(e) => setGarantiaTipoLocacao(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="caucao">Caução em Dinheiro (Depósito)</option>
                        <option value="fiador">Fiador(es) Solidário(s)</option>
                        <option value="seguro_fianca">Seguro-Fiança Locatícia</option>
                        <option value="titulo_capitalizacao">Título de Capitalização</option>
                        <option value="sem_garantia">Sem Garantia (Locação Desprovida de Garantia)</option>
                      </select>
                    </div>

                    {garantiaTipoLocacao === 'caucao' && (
                      <div className="flex gap-2">
                        <div className="w-1/2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Qtd Meses de Caução
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="3"
                            value={numeroMesesCaucao}
                            onChange={(e) => {
                              const meses = parseInt(e.target.value, 10) || 1;
                              setNumeroMesesCaucao(meses);
                              setValorCaucaoLocacao((valorAluguel || valorTotal) * meses);
                            }}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                          />
                        </div>
                        <div className="w-1/2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Valor Total Caução (R$)
                          </label>
                          <input
                            type="number"
                            value={valorCaucaoLocacao > 0 ? valorCaucaoLocacao : ''}
                            onChange={(e) => setValorCaucaoLocacao(parseFloat(e.target.value) || 0)}
                            placeholder="0,00"
                            className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dados do Fiador se selecionado */}
                  {garantiaTipoLocacao === 'fiador' && (
                    <div className="pt-3 border-t border-slate-200 mt-2 space-y-3">
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Qualificação Completa do Fiador Solidário
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo do Fiador</label>
                          <input
                            type="text"
                            value={fiadorLocacao.nome}
                            onChange={(e) => setFiadorLocacao({ ...fiadorLocacao, nome: e.target.value })}
                            placeholder="Ex: Carlos Eduardo de Sousa"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">CPF do Fiador</label>
                          <input
                            type="text"
                            value={fiadorLocacao.cpfCnpj}
                            onChange={(e) => setFiadorLocacao({ ...fiadorLocacao, cpfCnpj: e.target.value })}
                            placeholder="000.000.000-00"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">RG / Órgão</label>
                          <input
                            type="text"
                            value={fiadorLocacao.rg}
                            onChange={(e) => setFiadorLocacao({ ...fiadorLocacao, rg: e.target.value })}
                            placeholder="Ex: 1234567 SEGUP/PA"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                          <input
                            type="text"
                            value={fiadorLocacao.telefone}
                            onChange={(e) => setFiadorLocacao({ ...fiadorLocacao, telefone: e.target.value })}
                            placeholder="(93) 99000-0000"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Cidade / UF do Fiador</label>
                          <input
                            type="text"
                            value={`${fiadorLocacao.cidade || ''}${fiadorLocacao.uf ? '/' + fiadorLocacao.uf : ''}`}
                            onChange={(e) => {
                              const parts = e.target.value.split('/');
                              setFiadorLocacao({ ...fiadorLocacao, cidade: parts[0] || '', uf: parts[1] || '' });
                            }}
                            placeholder="Santarém/PA"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Endereço Residencial do Fiador</label>
                          <input
                            type="text"
                            value={fiadorLocacao.endereco}
                            onChange={(e) => setFiadorLocacao({ ...fiadorLocacao, endereco: e.target.value })}
                            placeholder="Ex: Av. Presidente Vargas, nº 450, Bairro Santa Clara"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Encargos, Despesas e Penalidades */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Despesas, Encargos & Penalidades por Inadimplência
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Multa por Atraso (%)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={multaAtrasoLocacao}
                          onChange={(e) => setMultaAtrasoLocacao(parseFloat(e.target.value) || 10)}
                          className="w-20 px-3 py-1.5 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                        />
                        <span className="text-xs text-slate-600">% sobre o aluguel em atraso</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Juros de Mora Mensal (%)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={jurosMoraLocacao}
                          onChange={(e) => setJurosMoraLocacao(parseFloat(e.target.value) || 1)}
                          className="w-20 px-3 py-1.5 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                        />
                        <span className="text-xs text-slate-600">% ao mês (pro rata die)</span>
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Despesas e Encargos sob Responsabilidade do Locatário
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {[
                          { key: 'energia', label: 'Energia Elétrica' },
                          { key: 'agua', label: 'Água e Esgoto' },
                          { key: 'iptu', label: 'IPTU' },
                          { key: 'condominio', label: 'Taxa de Condomínio' },
                          { key: 'gas', label: 'Gás' },
                          { key: 'taxaLixo', label: 'Taxa de Lixo' },
                          { key: 'seguroIncendio', label: 'Seguro Contra Incêndio' },
                        ].map((item) => (
                          <label key={item.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(despesasLocatario[item.key as keyof typeof despesasLocatario])}
                              onChange={(e) => setDespesasLocatario({ ...despesasLocatario, [item.key]: e.target.checked })}
                              className="w-4 h-4 text-amber-600 rounded"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-3 flex flex-wrap gap-4 pt-2 border-t border-slate-200">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vistoriaInicialRealizada}
                          onChange={(e) => setVistoriaInicialRealizada(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded"
                        />
                        <span>Laudo de Vistoria Inicial de Entrada Realizado e Anexado</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autorizaSublocacao}
                          onChange={(e) => setAutorizaSublocacao(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded"
                        />
                        <span>Autoriza Sublocação ou Empréstimo do Imóvel</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Se for Exclusividade exclusiva de Locação, não exibe campo de venda total */}
                {tipo === 'exclusividade' && finalidadeExclusividade === 'locacao' ? null : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {tipo === 'exclusividade' ? 'Valor Pretendido para Venda (R$)' : 'Valor Total da Negociação (R$)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={valorTotal > 0 ? valorTotal : ''}
                          onChange={(e) => handleValorTotalChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className={`w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 ${errCls('Valor Total da Negociação')}`}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Exibição formatada: <strong className="text-amber-700">{valorTotal > 0 ? `R$ ${formatDecimalNumber(valorTotal)}` : 'R$ 0,00'}</strong>
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Valor por Extenso
                      </label>
                      <input
                        type="text"
                        value={valorTotalExtenso}
                        onChange={(e) => setValorTotalExtenso(e.target.value)}
                        placeholder="Ex: duzentos e vinte mil reais"
                        className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 ${errCls('Valor por Extenso')}`}
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Formatado automaticamente em conformidade jurídica.
                      </span>
                    </div>
                  </div>
                )}

                {/* Condições Específicas: Venda à Vista */}
                {tipo === 'venda_vista' && (
                  <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-lg space-y-3">
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Detalhes do Pagamento à Vista & Quitação Plena
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                        <select
                          value={formaPagamentoVista}
                          onChange={(e) => setFormaPagamentoVista(e.target.value as any)}
                          className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400 ${errCls('Forma de Pagamento')}`}
                        >
                          <option value="PIX">PIX</option>
                          <option value="Cartão">Cartão</option>
                          <option value="Dinheiro">Dinheiro em Espécie</option>
                          <option value="TED/DOC">TED / Transferência Bancária</option>
                          <option value="Cheque">Cheque Administrativo</option>
                          <option value="Mesclado">Mesclado (mais de uma forma)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Dados Bancários / Chave PIX <span className="font-normal text-slate-400">(opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={dadosBancariosRecebedor}
                          onChange={(e) => setDadosBancariosRecebedor(e.target.value)}
                          placeholder="Ex: Chave PIX (CPF): 234.567.890-12 (Banco do Brasil)"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                    </div>

                    {formaPagamentoVista === 'Mesclado' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Como foi a situação do pagamento?
                        </label>
                        <textarea
                          value={detalhesPagamentoMesclado}
                          onChange={(e) => setDetalhesPagamentoMesclado(e.target.value)}
                          placeholder="Ex: R$ 50.000,00 via PIX na assinatura + R$ 130.000,00 em dinheiro na entrega das chaves"
                          rows={2}
                          className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400 ${errCls('Detalhes do Pagamento Mesclado')}`}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Condições Específicas: Venda Parcelada */}
                {tipo === 'venda_parcelada' && (
                  <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-lg space-y-3">
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Entrada & Condições de Parcelamento
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Valor da Entrada (R$)</label>
                        <input
                          type="number"
                          value={valorEntrada > 0 ? valorEntrada : ''}
                          onChange={(e) => {
                            setValorEntrada(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0);
                            tocarCampoParcelado('entrada');
                          }}
                          placeholder="0,00"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Qtd de Parcelas</label>
                        <input
                          type="number"
                          min="1"
                          value={numeroParcelas > 0 ? numeroParcelas : ''}
                          onChange={(e) => setNumeroParcelas(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                          placeholder="Ex: 36"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Valor de Cada Parcela (R$)</label>
                        <input
                          type="number"
                          value={valorParcela > 0 ? valorParcela : ''}
                          onChange={(e) => {
                            setValorParcela(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0);
                            tocarCampoParcelado('parcela');
                          }}
                          placeholder="0,00"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Valor Total (R$)</label>
                        <input
                          type="number"
                          value={valorTotal > 0 ? valorTotal : ''}
                          onChange={(e) => handleValorTotalChange(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          placeholder="0,00"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                    </div>

                    {valorTotal > 0 && (
                      <p className="text-[11px] text-amber-900">
                        R$ {valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de entrada + {numeroParcelas}x
                        de R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R${' '}
                        {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no total. Mexa em qualquer 2
                        desses 3 campos (Entrada / Valor da Parcela / Total) que o terceiro se ajusta sozinho.
                      </p>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Cobrança</label>
                      <select
                        value={formaPagamentoParcelas}
                        onChange={(e) => setFormaPagamentoParcelas(e.target.value as any)}
                        className="w-full sm:w-64 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="Boleto Bancário">Boleto Bancário</option>
                        <option value="PIX Recorrente">PIX</option>
                        <option value="Transferência">Transferência Bancária</option>
                        <option value="Promissórias">Notas Promissórias</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="reservaDominio"
                        checked={clausulaReservaDominio}
                        onChange={(e) => setClausulaReservaDominio(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <label htmlFor="reservaDominio" className="text-xs font-bold text-slate-800">
                        Incluir Cláusula Expressa de Reserva de Domínio (Art. 521 do Código Civil)
                      </label>
                    </div>
                  </div>
                )}

                {/* Condições Específicas: Exclusividade */}
                {tipo === 'exclusividade' && (
                  <div className="p-5 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        {finalidadeExclusividade === 'locacao'
                          ? 'Parâmetros de Exclusividade para Intermediação de Locação'
                          : finalidadeExclusividade === 'ambos'
                          ? 'Parâmetros de Exclusividade (Venda & Locação)'
                          : 'Parâmetros de Exclusividade & Comissão de Venda'}
                      </h3>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                        {finalidadeExclusividade === 'locacao' ? 'Locação' : finalidadeExclusividade === 'ambos' ? 'Venda & Locação' : 'Venda'}
                      </span>
                    </div>

                    {/* Vigência e Prazo Geral da Exclusividade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Data Início da Exclusividade</label>
                        <input
                          type="date"
                          value={dataInicioExcl}
                          onChange={(e) => setDataInicioExcl(e.target.value)}
                          className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white ${errCls('Data Início da Exclusividade')}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Prazo de Duração da Exclusividade</label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={prazoMesesOuDias > 0 ? prazoMesesOuDias : ''}
                            onChange={(e) => setPrazoMesesOuDias(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                            placeholder="Ex: 90"
                            className="w-1/2 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                          />
                          <select
                            value={unidadePrazo}
                            onChange={(e) => setUnidadePrazo(e.target.value as any)}
                            className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                          >
                            <option value="dias">Dias</option>
                            <option value="meses">Meses</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Bloco de Venda (se venda ou ambos) */}
                    {finalidadeExclusividade !== 'locacao' && (
                      <div className="p-3.5 bg-white border border-amber-200/60 rounded-xl space-y-2">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase">Condições da Venda</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Comissão de Corretagem de Venda (%)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.5"
                                value={percentualComissao > 0 ? percentualComissao : ''}
                                onChange={(e) => setPercentualComissao(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                placeholder="Ex: 6"
                                className="w-24 px-3 py-2 text-xs font-bold text-center border border-slate-300 rounded-xl bg-white"
                              />
                              <span className="text-xs text-slate-600 font-semibold">% sobre o valor da venda</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 block pt-1">
                              Valor de venda sugerido: <strong className="text-amber-800">R$ {formatDecimalNumber(valorTotal)}</strong>
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Comissão estimada: R$ {formatDecimalNumber((valorTotal * (percentualComissao || 0)) / 100)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bloco de Locação (se locação ou ambos) */}
                    {finalidadeExclusividade !== 'venda' && (
                      <div className="p-3.5 bg-white border border-amber-200/60 rounded-xl space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase">Condições da Locação</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Valor Mensal Sugerido do Aluguel (R$)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={valorLocacaoSugeridoExcl > 0 ? valorLocacaoSugeridoExcl : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                  setValorLocacaoSugeridoExcl(val);
                                  if (val > 0) {
                                    setValorLocacaoSugeridoExtensoExcl(numeroPorExtensoReais(val));
                                    if (finalidadeExclusividade === 'locacao') {
                                      setValorTotal(val);
                                    }
                                  } else {
                                    setValorLocacaoSugeridoExtensoExcl('');
                                  }
                                }}
                                placeholder="0,00"
                                className={`w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 border border-slate-300 rounded-xl bg-white ${errCls('Valor Mensal Sugerido do Aluguel')}`}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 block">
                              Exibição: <strong className="text-amber-800">{valorLocacaoSugeridoExcl > 0 ? `R$ ${formatDecimalNumber(valorLocacaoSugeridoExcl)}` : 'R$ 0,00'}</strong>
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Valor do Aluguel por Extenso
                            </label>
                            <input
                              type="text"
                              value={valorLocacaoSugeridoExtensoExcl}
                              onChange={(e) => setValorLocacaoSugeridoExtensoExcl(e.target.value)}
                              placeholder="Ex: um mil e oitocentos reais"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Honorários / Comissão de Intermediação da Locação
                            </label>
                            <input
                              type="text"
                              value={comissaoLocacaoExcl}
                              onChange={(e) => setComissaoLocacaoExcl(e.target.value)}
                              placeholder="Ex: 100% do primeiro aluguel integral"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Normalmente equivale ao 1º aluguel pago pelo locatário.
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Taxa de Administração Mensal da Locação
                            </label>
                            <input
                              type="text"
                              value={taxaAdministracaoLocacaoExcl}
                              onChange={(e) => setTaxaAdministracaoLocacaoExcl(e.target.value)}
                              placeholder="Ex: 10% ao mês sobre os aluguéis recebidos"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              Percentual retido mensalmente pela gestão e cobrança do aluguel.
                            </span>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Garantias Locatícias Aceitas
                            </label>
                            <input
                              type="text"
                              value={garantiasAceitasLocacaoExcl}
                              onChange={(e) => setGarantiasAceitasLocacaoExcl(e.target.value)}
                              placeholder="Ex: Caução em dinheiro (até 3 meses), Fiador com imóvel próprio ou Seguro-Fiança"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Autorizações Especiais */}
                    <div className="pt-2 border-t border-amber-200/60 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autorizaDivulgacaoPlacasRedesExcl}
                          onChange={(e) => setAutorizaDivulgacaoPlacasRedesExcl(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded"
                        />
                        <span>Autoriza fixação de placas publicitárias e divulgação em portais imobiliários e redes sociais</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autorizaProspeccaoClientesExcl}
                          onChange={(e) => setAutorizaProspeccaoClientesExcl(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded"
                        />
                        <span>Autoriza agendamento de visitas com clientes e realização de prospecção ativa</span>
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('imovel')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar: {subcategoria === 'outros_bens' && tipo !== 'exclusividade' && tipo !== 'locacao' ? 'Bem / Veículo' : 'Imóvel'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('foro')}
                className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] text-xs font-extrabold text-slate-950 btn-gold rounded-xl shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
              >
                Próximo: Foro e Datação
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ABA: FORO & DATA DE ASSINATURA */}
        {activeTab === 'foro' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                5. Foro de Eleição e Datação
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Definição da comarca eleita para dirimir controvérsias e data oficial de assinatura.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 5. FORO */}
              <div className="p-4 border border-slate-200 rounded-lg space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Comarca do Foro Eleito
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cidade do Foro</label>
                    <input
                      type="text"
                      value={cidadeForo}
                      onChange={(e) => setCidadeForo(e.target.value)}
                      placeholder="Santarém"
                      className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 ${errCls('Cidade do Foro')}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">UF</label>
                    <input
                      type="text"
                      value={ufForo}
                      onChange={(e) => setUfForo(e.target.value.toUpperCase())}
                      placeholder="PA"
                      maxLength={2}
                      className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 uppercase ${errCls('UF do Foro')}`}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Comarca fixada no instrumento: <strong className="text-slate-800">{cidadeForo}/{ufForo}</strong>
                </p>
              </div>

              {/* 6. DATA DE ASSINATURA */}
              <div className="p-4 border border-slate-200 rounded-lg space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Local e Data da Assinatura
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Cidade da Assinatura
                    </label>
                    <input
                      type="text"
                      value={cidadeAssinatura}
                      onChange={(e) => setCidadeAssinatura(e.target.value)}
                      placeholder="Santarém"
                      className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 ${errCls('Cidade da Assinatura')}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      UF
                    </label>
                    <input
                      type="text"
                      value={ufAssinatura}
                      onChange={(e) => setUfAssinatura(e.target.value.toUpperCase())}
                      placeholder="PA"
                      maxLength={2}
                      className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 uppercase ${errCls('UF da Assinatura')}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Dia
                    </label>
                    <input
                      type="text"
                      value={diaAssinatura}
                      onChange={(e) => setDiaAssinatura(e.target.value)}
                      placeholder="23"
                      className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 ${errCls('Dia da Assinatura')}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Mês (por extenso)
                    </label>
                    <input
                      type="text"
                      value={mesExtensoAssinatura}
                      onChange={(e) => setMesExtensoAssinatura(e.target.value)}
                      placeholder="agosto"
                      className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 ${errCls('Mês da Assinatura')}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Ano
                    </label>
                    <input
                      type="text"
                      value={anoAssinatura}
                      onChange={(e) => setAnoAssinatura(e.target.value)}
                      placeholder="2026"
                      className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400 ${errCls('Ano da Assinatura')}`}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Datação no contrato: <strong className="text-slate-800">{cidadeAssinatura}/{ufAssinatura}, {diaAssinatura} de {mesExtensoAssinatura} de {anoAssinatura}.</strong>
                </p>
              </div>
            </div>

            {/* Cláusulas Extras */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cláusulas Adicionais ou Disposições Especiais (Opcional)
              </label>
              <textarea
                rows={3}
                value={clausulasExtras}
                onChange={(e) => setClausulasExtras(e.target.value)}
                placeholder="Insira cláusulas particulares acordadas entre as partes..."
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('financeiro')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar: {tipo === 'locacao' ? 'Condições da Locação' : 'Condições Financeiras'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('revisao')}
                className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] text-xs font-extrabold text-slate-950 btn-gold rounded-xl shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
              >
                Avançar: Revisão dos Dados
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ABA: RESUMO E EMISSÃO */}
        {activeTab === 'revisao' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-amber-600" />
                  6. Conferência e Emissão do Instrumento
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Revise o resumo das informações antes de gerar o documento e iniciar a assinatura.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vendedor / Locador Resumo */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>1. {tipo === 'exclusividade' ? 'Contratante' : tipo === 'locacao' ? 'Locador(a)' : 'Vendedor(a)'}</span>
                  <span className="text-[10px] text-amber-600 font-semibold">
                    {tipo === 'exclusividade' ? 'Proprietário' : tipo === 'locacao' ? 'Proprietário / Locador' : 'Transmitente'}
                  </span>
                </h3>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <p><span className="font-semibold text-slate-500">Nome:</span> {vendedor.nome || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-500">CPF/CNPJ:</span> {vendedor.cpfCnpj || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-500">RG:</span> {vendedor.rg} {vendedor.rgOrgao}</p>
                  <p><span className="font-semibold text-slate-500">Endereço:</span> {vendedor.endereco}, nº {vendedor.numero} - {vendedor.bairro}, {vendedor.cidade}/{vendedor.uf}</p>
                </div>
              </div>

              {/* Comprador / Locatário Resumo */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>2. {tipo === 'exclusividade' ? 'Contratado' : tipo === 'locacao' ? 'Locatário(a)' : 'Comprador(a)'}</span>
                  <span className="text-[10px] text-amber-600 font-semibold">
                    {tipo === 'exclusividade' ? 'Corretor' : tipo === 'locacao' ? 'Inquilino / Locatário' : 'Adquirente'}
                  </span>
                </h3>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <p><span className="font-semibold text-slate-500">Nome:</span> {comprador.nome || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-500">CPF/CNPJ:</span> {comprador.cpfCnpj || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-500">RG:</span> {comprador.rg} {comprador.rgOrgao}</p>
                  <p><span className="font-semibold text-slate-500">Endereço:</span> {comprador.endereco}, nº {comprador.numero} - {comprador.bairro}, {comprador.cidade}/{comprador.uf}</p>
                </div>
              </div>

              {/* Objeto Resumo (Imóvel Locado, Imóvel ou Bem Móvel) */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>3. {tipo === 'locacao' ? 'Imóvel Objeto da Locação' : tipo === 'exclusividade' ? 'Imóvel Objeto da Exclusividade' : subcategoria === 'outros_bens' ? 'Objeto / Bem Móvel' : 'Objeto Imobiliário'}</span>
                  <span className="text-[10px] text-amber-600 font-semibold">
                    {tipo === 'locacao' ? `${tipoImovelLocacao} (${finalidadeLocacao})` : tipo === 'exclusividade' ? `Intermediação (${finalidadeExclusividade})` : subcategoria === 'outros_bens' ? 'Bem / Veículo' : 'Imóvel'}
                  </span>
                </h3>
                {tipo === 'locacao' ? (
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <p><span className="font-semibold text-slate-500">Endereço:</span> {imovel.enderecoLote || imovel.localizacaoImovel || `${imovel.cidadeImovel}/${imovel.ufImovel}` || 'Não informado'}</p>
                    <p><span className="font-semibold text-slate-500">Finalidade:</span> {finalidadeLocacao === 'residencial' ? 'Residencial' : 'Comercial / Não Residencial'}</p>
                    <p><span className="font-semibold text-slate-500">Tipo de Imóvel:</span> {tipoImovelLocacao}</p>
                    <p><span className="font-semibold text-slate-500">IPTU / Matrícula:</span> {imovel.inscricaoPrefeitura || '-'} • {imovel.matricula || '-'}</p>
                  </div>
                ) : tipo === 'exclusividade' ? (
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <p><span className="font-semibold text-slate-500">Modalidade:</span> <strong className="text-amber-800">{finalidadeExclusividade === 'venda' ? 'Exclusividade de Venda' : finalidadeExclusividade === 'locacao' ? 'Exclusividade de Locação' : 'Exclusividade de Venda e Locação'}</strong></p>
                    <p><span className="font-semibold text-slate-500">Tipo de Imóvel:</span> {imovel.tipoImovel || 'Imóvel residencial/comercial'}</p>
                    <p><span className="font-semibold text-slate-500">Localização:</span> {imovel.localizacaoImovel || '-'}, {imovel.cidadeImovel}/{imovel.ufImovel}</p>
                    <p><span className="font-semibold text-slate-500">Matrícula / Inscrição:</span> {imovel.matricula || '-'} • {imovel.inscricaoPrefeitura || '-'}</p>
                  </div>
                ) : subcategoria === 'outros_bens' ? (
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <p><span className="font-semibold text-slate-500">Descrição:</span> {bemOutros.descricao || 'Não informado'}</p>
                    <p><span className="font-semibold text-slate-500">Marca/Modelo:</span> {bemOutros.marca || '-'} {bemOutros.modelo || '-'}</p>
                    <p><span className="font-semibold text-slate-500">Ano / Cor:</span> {bemOutros.anoFabricacao || '-'}/{bemOutros.anoModelo || '-'} • {bemOutros.cor || '-'}</p>
                    <p><span className="font-semibold text-slate-500">Placa / Chassi:</span> {bemOutros.placa || '-'} • {bemOutros.chassi || '-'}</p>
                  </div>
                ) : (
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <p><span className="font-semibold text-slate-500">Empreendimento:</span> {imovel.nomeEmpreendimento || 'Não informado'}</p>
                    <p><span className="font-semibold text-slate-500">Identificação:</span> Lote {imovel.numeroLote || '-'}, Quadra {imovel.numeroQuadra || '-'}</p>
                    <p><span className="font-semibold text-slate-500">Localização:</span> {imovel.cidadeImovel}/{imovel.ufImovel}</p>
                    <p><span className="font-semibold text-slate-500">Área Total:</span> {imovel.areaTotalM2} m²</p>
                  </div>
                )}
              </div>

              {/* Financeiro / Locação e Foro Resumo */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  4. {tipo === 'locacao' ? 'Condições Locatícias e Foro' : tipo === 'exclusividade' ? 'Parâmetros de Exclusividade e Foro' : 'Condições e Assinatura'}
                </h3>
                {tipo === 'locacao' ? (
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <p><span className="font-semibold text-slate-500">Aluguel Mensal:</span> <strong className="text-amber-700">R$ {formatDecimalNumber(valorAluguel || valorTotal)}</strong></p>
                    <p><span className="font-semibold text-slate-500">Vencimento:</span> Todo dia {diaVencimento} do mês</p>
                    <p><span className="font-semibold text-slate-500">Vigência:</span> {prazoMesesLocacao} meses ({dataInicioLocacao ? new Date(dataInicioLocacao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'} até {dataTerminoLocacao ? new Date(dataTerminoLocacao + 'T12:00:00').toLocaleDateString('pt-BR') : '-'})</p>
                    <p><span className="font-semibold text-slate-500">Garantia:</span> {garantiaTipoLocacao === 'caucao' ? `Caução (${numeroMesesCaucao} meses - R$ ${formatDecimalNumber(valorCaucaoLocacao)})` : garantiaTipoLocacao === 'fiador' ? `Fiador (${fiadorLocacao.nome || 'Solidário'})` : garantiaTipoLocacao === 'seguro_fianca' ? 'Seguro-Fiança' : garantiaTipoLocacao === 'titulo_capitalizacao' ? 'Título de Capitalização' : 'Sem Garantia'}</p>
                    <p><span className="font-semibold text-slate-500">Foro:</span> Comarca de {cidadeForo}/{ufForo}</p>
                  </div>
                ) : tipo === 'exclusividade' ? (
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <p><span className="font-semibold text-slate-500">Vigência da Exclusividade:</span> {prazoMesesOuDias} {unidadePrazo} (Início: {dataInicioExcl ? new Date(dataInicioExcl + 'T12:00:00').toLocaleDateString('pt-BR') : '-'})</p>
                    {finalidadeExclusividade !== 'locacao' && (
                      <p><span className="font-semibold text-slate-500">Valor Venda / Comissão:</span> <strong className="text-amber-700">R$ {formatDecimalNumber(valorTotal)}</strong> ({percentualComissao}% comissão)</p>
                    )}
                    {finalidadeExclusividade !== 'venda' && (
                      <p><span className="font-semibold text-slate-500">Aluguel Sugerido:</span> <strong className="text-amber-700">R$ {formatDecimalNumber(valorLocacaoSugeridoExcl || valorTotal)}/mês</strong> (Honorários: {comissaoLocacaoExcl || '100%'} | Taxa Adm: {taxaAdministracaoLocacaoExcl || '10%'})</p>
                    )}
                    <p><span className="font-semibold text-slate-500">Foro Eleito:</span> Comarca de {cidadeForo}/{ufForo}</p>
                    <p><span className="font-semibold text-slate-500">Datação:</span> {cidadeAssinatura}/{ufAssinatura}, {diaAssinatura} de {mesExtensoAssinatura} de {anoAssinatura}</p>
                  </div>
                ) : (
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <p><span className="font-semibold text-slate-500">Valor Negociado:</span> <strong className="text-amber-700">R$ {formatDecimalNumber(valorTotal)}</strong></p>
                    <p className="text-[11px] text-slate-500">({valorTotalExtenso})</p>
                    <p><span className="font-semibold text-slate-500">Foro Eleito:</span> Comarca de {cidadeForo}/{ufForo}</p>
                    <p><span className="font-semibold text-slate-500">Datação:</span> {cidadeAssinatura}/{ufAssinatura}, {diaAssinatura} de {mesExtensoAssinatura} de {anoAssinatura}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-3">
              <FileCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Tudo pronto para a emissão do instrumento!</strong>
                <p>
                  Clique em <strong>"Salvar & Gerar Contrato"</strong> para visualizar a minuta completa, selecionar a modalidade de assinatura (Digital, Assinatura Manual ou Impressão a Punho) ou exportar para Microsoft Word e PDF.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Barra Fixa / Inferior de Ação Executiva */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft}
              title="Salva o que já foi preenchido para continuar depois"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-yellow-900 bg-yellow-50 hover:bg-yellow-100 disabled:opacity-60 border border-yellow-200 rounded-xl transition-all cursor-pointer"
            >
              {draftSaved ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <FileText className="w-4 h-4 shrink-0" />
              )}
              <span>{savingDraft ? 'Salvando...' : draftSaved ? 'Rascunho salvo!' : 'Salvar Rascunho'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentTabIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevTab}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            {currentTabIndex < TAB_ORDER.length - 1 ? (
              <button
                type="button"
                onClick={handleNextTab}
                className="flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-extrabold text-slate-950 btn-gold rounded-xl transition-all cursor-pointer shadow-md shadow-yellow-500/20"
              >
                <span>Próximo Passo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-7 py-2.5 text-xs font-extrabold text-slate-950 btn-gold rounded-xl transition-all cursor-pointer shadow-lg shadow-yellow-500/30"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-950" />
                <span>Salvar & Gerar Contrato</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
