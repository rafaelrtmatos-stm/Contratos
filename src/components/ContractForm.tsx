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
  cidadeImovel: 'Santarém',
  ufImovel: 'PA',
  numeroLote: '',
  numeroQuadra: '',
  enderecoLote: '',
  metragemFrente: '10,00',
  metragemLateralDireita: '30,00',
  metragemLateralEsquerda: '30,00',
  metragemFundos: '10,00',
  areaTotalM2: '300,00',
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
  estadoConservacao: 'Em perfeito estado de uso e funcionamento',
  acessoriosInclusos: '',
  documentacaoSituacao: 'Documentação 100% regularizada e sem débitos',
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
  const [activeTab, setActiveTab] = useState<'comprador' | 'vendedor' | 'imovel' | 'financeiro' | 'foro' | 'revisao'>('comprador');
  type TabKey = 'comprador' | 'vendedor' | 'imovel' | 'financeiro' | 'foro' | 'revisao';
  const [missingFields, setMissingFields] = useState<{ label: string; tab: TabKey }[]>([]);
  
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [numeroContrato, setNumeroContrato] = useState(
    initialData?.numeroContrato || `CT-${tipo === 'venda_vista' ? 'VISTA' : tipo === 'venda_parcelada' ? 'PARC' : 'EXCL'}-${Date.now().toString().slice(-4)}`
  );

  // Foro e Assinatura
  const [cidadeForo, setCidadeForo] = useState(initialData?.cidadeForo || 'Santarém');
  const [ufForo, setUfForo] = useState(initialData?.ufForo || 'PA');
  const [cidadeAssinatura, setCidadeAssinatura] = useState(initialData?.cidadeAssinatura || 'Santarém');
  const [ufAssinatura, setUfAssinatura] = useState(initialData?.ufAssinatura || 'PA');
  
  // Data de Assinatura desmembrada
  const today = new Date();
  const [diaAssinatura, setDiaAssinatura] = useState(initialData?.diaAssinatura || String(today.getDate()));
  const [mesExtensoAssinatura, setMesExtensoAssinatura] = useState(
    initialData?.mesExtensoAssinatura || MONTH_NAMES_PT[today.getMonth()] || 'agosto'
  );
  const [anoAssinatura, setAnoAssinatura] = useState(initialData?.anoAssinatura || String(today.getFullYear()));

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
  const [valorTotal, setValorTotal] = useState<number>(initialData?.valorTotal || 180000);
  const [valorTotalExtenso, setValorTotalExtenso] = useState(
    initialData?.valorTotalExtenso || 'cento e oitenta mil reais'
  );

  // Venda à Vista
  const [formaPagamentoVista, setFormaPagamentoVista] = useState<'PIX' | 'TED/DOC' | 'Dinheiro' | 'Cheque'>(
    (initialData as any)?.formaPagamentoVista || 'PIX'
  );
  const [dadosBancariosRecebedor, setDadosBancariosRecebedor] = useState(
    (initialData as any)?.dadosBancariosRecebedor || ''
  );

  // Venda Parcelada
  const [valorEntrada, setValorEntrada] = useState<number>(initialData?.valorEntrada || 50000);
  const [numeroParcelas, setNumeroParcelas] = useState<number>(initialData?.numeroParcelas || 36);
  const [valorParcela, setValorParcela] = useState<number>(initialData?.valorParcela || 3611.11);
  const [formaPagamentoParcelas, setFormaPagamentoParcelas] = useState<string>(
    initialData?.formaPagamentoParcelas || 'Boleto Bancário'
  );
  const [clausulaReservaDominio, setClausulaReservaDominio] = useState<boolean>(
    initialData?.clausulaReservaDominio !== false
  );

  // Exclusividade
  const [percentualComissao, setPercentualComissao] = useState<number>(initialData?.percentualComissao || 6);
  const [prazoMesesOuDias, setPrazoMesesOuDias] = useState<number>(initialData?.prazoMesesOuDias || 90);
  const [unidadePrazo, setUnidadePrazo] = useState<'dias' | 'meses'>(initialData?.unidadePrazo || 'dias');
  const [dataInicioExcl, setDataInicioExcl] = useState<string>(
    initialData?.dataInicioExcl || new Date().toISOString().split('T')[0]
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

  const [clausulasExtras, setClausulasExtras] = useState(initialData?.clausulasExtras || '');

  // Atualizar cálculo de extenso quando o valor muda
  const handleValorTotalChange = (val: number) => {
    setValorTotal(val);
    setValorTotalExtenso(numeroPorExtensoReais(val));
    if (tipo === 'venda_parcelada' && numeroParcelas > 0) {
      const saldo = Math.max(0, val - valorEntrada);
      setValorParcela(Number((saldo / numeroParcelas).toFixed(2)));
    }
  };

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
        `CT-${newTipo === 'venda_vista' ? 'VISTA' : newTipo === 'venda_parcelada' ? 'PARC' : 'EXCL'}-${Date.now().toString().slice(-4)}`
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

  // Recalcular valor de parcela
  useEffect(() => {
    if (tipo === 'venda_parcelada' && numeroParcelas > 0) {
      const saldo = Math.max(0, valorTotal - valorEntrada);
      setValorParcela(Number((saldo / numeroParcelas).toFixed(2)));
    }
  }, [valorTotal, valorEntrada, numeroParcelas, tipo]);

  // Preenchimento de exemplo rápido
  const preencherExemplo = () => {
    if (subcategoria === 'outros_bens') {
      setBemOutros({
        tipoBem: 'carro',
        descricao: 'Veículo automotor Toyota Corolla XEi 2.0 Flex Automático',
        marca: 'Toyota',
        modelo: 'Corolla XEi 2.0 Flex',
        anoFabricacao: '2023',
        anoModelo: '2024',
        cor: 'Prata Metálico',
        placa: 'QEZ-8A90',
        chassi: '9BRBL42E4N0198421',
        renavam: '01298471203',
        numeroSerie: 'BR-2023-9842',
        quilometragemOuUso: '18.500 km',
        estadoConservacao: 'Excelente estado de conservação, revisões em concessionária',
        acessoriosInclusos: 'Chave reserva, manual do proprietário, multimídia original',
        documentacaoSituacao: 'IPVA 2026 pago, sem multas, restrições ou gravames',
      });
    } else {
      setImovel({
        nomeEmpreendimento: 'Loteamento Residencial Tapajós',
        localizacaoImovel: 'Rodovia Fernando Guilhon, Km 06, Bairro Aeroporto Velho',
        cidadeImovel: 'Santarém',
        ufImovel: 'PA',
        numeroLote: '14',
        numeroQuadra: '08',
        enderecoLote: 'Rua das Palmeiras, Quadra 08, Lote 14, Loteamento Tapajós',
        metragemFrente: '12,00',
        metragemLateralDireita: '30,00',
        metragemLateralEsquerda: '30,00',
        metragemFundos: '12,00',
        areaTotalM2: '360,00',
      });
    }

    setVendedor({
      nome: 'José Maria Figueira de Alencar',
      nacionalidade: 'brasileiro',
      estadoCivil: 'casado',
      rg: '3456789',
      rgOrgao: 'SSP/PA',
      cpfCnpj: '234.567.890-12',
      endereco: 'Av. Mendonça Furtado',
      numero: '1420',
      bairro: 'Aldeia',
      cep: '68040-050',
      cidade: 'Santarém',
      uf: 'PA',
      telefone: '(93) 99122-3344',
      email: 'jose.alencar@email.com',
    });

    setComprador({
      nome: 'Cláudia Beatriz Menezes Silva',
      nacionalidade: 'brasileira',
      estadoCivil: 'solteira',
      rg: '4567890',
      rgOrgao: 'SSP/PA',
      cpfCnpj: '456.789.012-34',
      endereco: 'Travessa dos Mártires',
      numero: '580',
      bairro: 'Centro',
      cep: '68005-090',
      cidade: 'Santarém',
      uf: 'PA',
      telefone: '(93) 98400-5566',
      email: 'claudia.menezes@email.com',
    });

    setCidadeForo('Santarém');
    setUfForo('PA');
    setCidadeAssinatura('Santarém');
    setUfAssinatura('PA');
    setDiaAssinatura('23');
    setMesExtensoAssinatura('agosto');
    setAnoAssinatura('2026');

    handleValorTotalChange(subcategoria === 'outros_bens' ? 145000 : 220000);
    setValorEntrada(subcategoria === 'outros_bens' ? 45000 : 60000);
    setNumeroParcelas(subcategoria === 'outros_bens' ? 24 : 36);
  };

  // Todos os campos que aparecem na tela (dado o tipo/subcategoria/variante
  // escolhidos) são obrigatórios - exceto "Cláusulas Adicionais", que o
  // próprio rótulo já marca como "(Opcional)".
  const TAB_LABELS: Record<TabKey, string> = {
    comprador: tipo === 'exclusividade' ? 'Contratado' : 'Comprador',
    vendedor: tipo === 'exclusividade' ? 'Contratante' : 'Vendedor',
    imovel: subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? 'Bem / Veículo' : 'Imóvel',
    financeiro: 'Condições Financeiras',
    foro: 'Foro e Datação',
    revisao: 'Resumo e Emissão',
  };

  const getMissingFields = (): { label: string; tab: TabKey }[] => {
    const missing: { label: string; tab: TabKey }[] = [];
    const req = (val: string | undefined | null, label: string, tab: TabKey) => {
      if (!val || !val.trim()) missing.push({ label, tab });
    };

    const vLabel = tipo === 'exclusividade' ? 'Contratante' : 'Vendedor';
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

    const cLabel = tipo === 'exclusividade' ? 'Contratado' : 'Comprador';
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
      req(condicoesPagamento, 'Condições de Pagamento', 'imovel');
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
    if (subcategoria === 'imovel' || tipo === 'exclusividade') {
      req(imovel.metragemFrente, 'Metragem Frente', 'imovel');
      req(imovel.metragemLateralDireita, 'Metragem Lateral Direita', 'imovel');
      req(imovel.metragemLateralEsquerda, 'Metragem Lateral Esquerda', 'imovel');
      req(imovel.metragemFundos, 'Metragem Fundos', 'imovel');
      req(imovel.areaTotalM2, 'Área Total (m²)', 'imovel');
    }

    if (!valorTotal || valorTotal <= 0) missing.push({ label: 'Valor Total da Negociação', tab: 'financeiro' });
    req(valorTotalExtenso, 'Valor por Extenso', 'financeiro');
    if (tipo === 'venda_vista') {
      req(dadosBancariosRecebedor, 'Dados Bancários / Chave PIX', 'financeiro');
    }
    if (tipo === 'exclusividade') {
      req(dataInicioExcl, 'Data Início da Exclusividade', 'financeiro');
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

  const buildContractData = (): ContractData => ({
    id: contractId,
    numeroContrato,
    titulo: toUpperCase(titulo) || (subcategoria === 'outros_bens' ? 'Contrato de Compra e Venda de Bem Móvel' : 'Contrato Imobiliário'),
    tipo,
    subcategoria: tipo === 'exclusividade' ? 'imovel' : subcategoria,
    dataCriacao: initialData?.dataCriacao || new Date().toISOString(),
    status: initialData?.status || 'rascunho',
    vendedor: toUpperCaseObject(vendedor),
    comprador: toUpperCaseObject(comprador),
    imovel: subcategoria === 'imovel' || tipo === 'exclusividade' ? toUpperCaseObject(imovel) : undefined,
    bemOutros: subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? toUpperCaseObject(bemOutros) : undefined,
    cidadeForo: toUpperCase(cidadeForo),
    ufForo,
    cidadeAssinatura: toUpperCase(cidadeAssinatura),
    ufAssinatura,
    diaAssinatura,
    mesExtensoAssinatura,
    anoAssinatura,
    valorTotal,
    valorTotalExtenso: valorTotalExtenso || numeroPorExtensoReais(valorTotal),
    vendaVista: tipo === 'venda_vista' ? {
      formaPagamento: formaPagamentoVista as any,
      dadosBancariosRecebedor,
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
      tipoExclusividade: 'Venda de Imóvel',
      dataInicio: dataInicioExcl,
      dataTermino: new Date(Date.now() + (prazoMesesOuDias * (unidadePrazo === 'meses' ? 30 : 1) * 86400000)).toISOString().split('T')[0],
      prazoMesesOuDias,
      unidadePrazo,
      percentualComissao,
      multaRescisaoOuQuebra: 10,
      renovacaoAutomatica: false,
      autorizaDivulgacaoPlacasRedes: true,
      condicoesPagamento: toUpperCase(condicoesPagamento),
      documentoPropriedade: toUpperCase(documentoPropriedade),
      matricula: toUpperCase(matricula),
      inscricaoPrefeitura: toUpperCase(inscricaoPrefeitura),
      outrosDadosImovel: toUpperCase(outrosDadosImovel),
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

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cabeçalho do Formulário */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-600 uppercase">
                {initialData ? 'Edição de Contrato' : 'Elaboração de Instrumento Contratual'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                {tipo === 'venda_vista'
                  ? 'Contrato de Compra e Venda de Imóvel à Vista'
                  : tipo === 'venda_parcelada'
                  ? 'Contrato de Compra e Venda Parcelada'
                  : 'Contrato de Exclusividade com Monitor de Prazos'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Preencha as informações cadastrais e financeiras do contrato para emissão imediata e assinatura.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-sm rounded-lg transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>{initialData ? 'Atualizar Contrato' : 'Gerar Contrato'}</span>
              </button>
            </div>
          </div>

          {/* SELETOR DE SUBCATEGORIA (Imóvel vs Outros Bens) */}
            {tipo !== 'exclusividade' && (
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  1. Subcategoria do Objeto Negociado:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSubcategoriaChange('imovel')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      subcategoria === 'imovel'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${subcategoria === 'imovel' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Imóvel (Terreno / Lote / Casa)</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Metragens, loteamento, quadra e confrontações
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubcategoriaChange('outros_bens')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      subcategoria === 'outros_bens'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${subcategoria === 'outros_bens' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Outros Bens (Carro, Moto, Embarcação, etc.)</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Marca, modelo, placa, chassi, renavam e estado
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Barra de Abas do Formulário */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-lg px-2 sm:px-4 overflow-x-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('comprador')}
            className={`flex items-center gap-2 py-3 px-2 sm:px-3 min-h-[44px] text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'comprador'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className={`w-4 h-4 shrink-0 ${activeTab === 'comprador' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">1. {tipo === 'exclusividade' ? 'Contratado' : 'Comprador'}</span>
            <span className="sm:hidden">{tipo === 'exclusividade' ? 'Contratado' : 'Comprador'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vendedor')}
            className={`flex items-center gap-2 py-3 px-2 sm:px-3 min-h-[44px] text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'vendedor'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className={`w-4 h-4 shrink-0 ${activeTab === 'vendedor' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">2. {tipo === 'exclusividade' ? 'Contratante' : 'Vendedor'}</span>
            <span className="sm:hidden">{tipo === 'exclusividade' ? 'Contratante' : 'Vendedor'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('imovel')}
            className={`flex items-center gap-2 py-3 px-2 sm:px-3 min-h-[44px] text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'imovel'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? (
              <Car className={`w-4 h-4 shrink-0 ${activeTab === 'imovel' ? 'text-amber-600' : 'text-slate-400'}`} />
            ) : (
              <Building2 className={`w-4 h-4 shrink-0 ${activeTab === 'imovel' ? 'text-amber-600' : 'text-slate-400'}`} />
            )}
            <span className="hidden sm:inline">3. {subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? 'Bem / Veículo' : 'Imóvel'}</span>
            <span className="sm:hidden">{subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? 'Bem' : 'Imóvel'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`flex items-center gap-2 py-3 px-2 sm:px-3 min-h-[44px] text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'financeiro'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Banknote className={`w-4 h-4 shrink-0 ${activeTab === 'financeiro' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>3. Condições Financeiras</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('foro')}
            className={`flex items-center gap-2 py-3 px-3 min-h-[44px] text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'foro'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className={`w-4 h-4 shrink-0 ${activeTab === 'foro' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>4. Foro e Datação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('revisao')}
            className={`flex items-center gap-2 py-3 px-3 min-h-[44px] text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'revisao'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardCheck className={`w-4 h-4 shrink-0 ${activeTab === 'revisao' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>5. Resumo e Emissão</span>
          </button>
        </div>

        {/* Banner de campos obrigatórios faltando */}
        {missingFields.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-2">
            <p className="text-sm font-bold text-red-800">
              Preencha os campos obrigatórios antes de gerar o contrato ({missingFields.length} pendente{missingFields.length > 1 ? 's' : ''}):
            </p>
            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
              {missingFields.map((f, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(f.tab)}
                    className="underline hover:text-red-900 cursor-pointer"
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
                    <Car className="w-5 h-5 text-green-600" />
                  ) : (
                    <Building2 className="w-5 h-5 text-green-600" />
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
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder={
                    subcategoria === 'outros_bens' && tipo !== 'exclusividade'
                      ? 'Ex: Compra e Venda Toyota Corolla XEi 2024 - Placa QEZ-8A90'
                      : 'Ex: Compra e Venda Lote 14 Quadra 08 - Loteamento Tapajós'
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
                />
              </div>

              {/* RENDERIZAÇÃO CONDICIONAL: EXCLUSIVIDADE vs IMÓVEL vs OUTROS BENS */}
              {tipo === 'exclusividade' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo do Imóvel
                    </label>
                    <input
                      type="text"
                      value={imovel.tipoImovel || ''}
                      onChange={(e) => setImovel({ ...imovel, tipoImovel: e.target.value })}
                      placeholder="Ex: Terreno urbano, Casa, Apartamento, Sala comercial"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden uppercase"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Condições de Pagamento (para venda futura do imóvel)
                    </label>
                    <input
                      type="text"
                      value={condicoesPagamento}
                      onChange={(e) => setCondicoesPagamento(e.target.value)}
                      placeholder="Ex: À vista, em moeda corrente nacional, via PIX ou transferência bancária"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
                    />
                  </div>
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden uppercase"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden uppercase"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden uppercase"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-hidden"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Metragens e Confrontações apenas se for Imóvel */}
            {(subcategoria === 'imovel' || tipo === 'exclusividade') && (
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
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-1.5 text-xs border border-green-300 bg-green-50/50 font-bold text-green-900 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('vendedor')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar: {tipo === 'exclusividade' ? 'Contratante' : 'Vendedor'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('financeiro')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                Próximo: Condições Financeiras
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ABA: PARTES CONTRATANTES */}
        {activeTab === 'vendedor' && (
          <div className="space-y-6">
            {/* 1. PROMITENTE VENDEDOR(A) */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">1</span>
                  {tipo === 'exclusividade' ? 'PROPRIETÁRIO / CONTRATANTE' : 'PROMITENTE VENDEDOR(A)'}
                </h2>
                <span className="text-[11px] font-medium text-slate-500">Dados do Transmitente / Vendedor</span>
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="cpf"
                    value={vendedor.cpfCnpj}
                    onChange={(val) => setVendedor({ ...vendedor, cpfCnpj: val })}
                    label="CPF"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nacionalidade
                  </label>
                  <input
                    type="text"
                    value={vendedor.nacionalidade}
                    onChange={(e) => setVendedor({ ...vendedor, nacionalidade: e.target.value })}
                    placeholder="brasileiro(a)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <EstadoCivilSelect
                    value={vendedor.estadoCivil}
                    onChange={(val) => setVendedor({ ...vendedor, estadoCivil: val })}
                    genero={vendedor.genero || ''}
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="rg"
                    value={vendedor.rg}
                    onChange={(val) => setVendedor({ ...vendedor, rg: val })}
                    label="RG nº"
                    placeholder="Ex: 3456789"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Órgão Emissor
                  </label>
                  <input
                    type="text"
                    value={vendedor.rgOrgao}
                    onChange={(e) => setVendedor({ ...vendedor, rgOrgao: e.target.value })}
                    placeholder="SSP/PA"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="phone"
                    value={vendedor.telefone}
                    onChange={(val) => setVendedor({ ...vendedor, telefone: val })}
                    label="Telefone / WhatsApp"
                    placeholder="(93) 99122-3344"
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-2/3 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      value={vendedor.uf}
                      onChange={(e) => setVendedor({ ...vendedor, uf: e.target.value.toUpperCase() })}
                      placeholder="PA"
                      maxLength={2}
                      className="w-1/3 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('comprador')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar: {tipo === 'exclusividade' ? 'Contratado' : 'Comprador'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('imovel')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                Próximo: {subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? 'Bem / Veículo' : 'Imóvel'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'comprador' && (
          <div className="space-y-6">
            {/* 2. PROMITENTE COMPRADOR(A) */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center justify-center">2</span>
                  {tipo === 'exclusividade' ? 'CORRETOR / CONTRATADO' : 'PROMITENTE COMPRADOR(A)'}
                </h2>
                <span className="text-[11px] font-medium text-slate-500">Dados do Adquirente / Beneficiário</span>
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="cpf"
                    value={comprador.cpfCnpj}
                    onChange={(val) => setComprador({ ...comprador, cpfCnpj: val })}
                    label="CPF"
                    placeholder="000.000.000-00"
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nacionalidade
                  </label>
                  <input
                    type="text"
                    value={comprador.nacionalidade}
                    onChange={(e) => setComprador({ ...comprador, nacionalidade: e.target.value })}
                    placeholder="brasileiro(a)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <EstadoCivilSelect
                    value={comprador.estadoCivil}
                    onChange={(val) => setComprador({ ...comprador, estadoCivil: val })}
                    genero={comprador.genero || ''}
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="rg"
                    value={comprador.rg}
                    onChange={(val) => setComprador({ ...comprador, rg: val })}
                    label="RG nº"
                    placeholder="Ex: 4567890"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Órgão Emissor
                  </label>
                  <input
                    type="text"
                    value={comprador.rgOrgao}
                    onChange={(e) => setComprador({ ...comprador, rgOrgao: e.target.value })}
                    placeholder="SSP/PA"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <ValidatedInput
                    validationType="phone"
                    value={comprador.telefone}
                    onChange={(val) => setComprador({ ...comprador, telefone: val })}
                    label="Telefone / WhatsApp"
                    placeholder="(93) 98400-5566"
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                      className="w-2/3 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      value={comprador.uf}
                      onChange={(e) => setComprador({ ...comprador, uf: e.target.value.toUpperCase() })}
                      placeholder="PA"
                      maxLength={2}
                      className="w-1/3 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('vendedor')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                Próximo: {tipo === 'exclusividade' ? 'Contratante' : 'Vendedor'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ABA: FINANCEIRO & PAGAMENTO */}
        {activeTab === 'financeiro' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-600" />
                3. Condições Financeiras e Pagamento
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Definição de preço, valores por extenso, quitação e prazos de liquidação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor Total da Negociação (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={valorTotal}
                    onChange={(e) => handleValorTotalChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Exibição formatada: <strong className="text-amber-700">R$ {formatDecimalNumber(valorTotal)}</strong>
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
                  placeholder="cento e oitenta mil reais"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Formatado automaticamente em conformidade jurídica.
                </span>
              </div>
            </div>

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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="PIX">PIX</option>
                      <option value="TED/DOC">TED / Transferência Bancária</option>
                      <option value="Dinheiro">Dinheiro em Espécie</option>
                      <option value="Cheque">Cheque Administrativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Dados Bancários / Chave PIX</label>
                    <input
                      type="text"
                      value={dadosBancariosRecebedor}
                      onChange={(e) => setDadosBancariosRecebedor(e.target.value)}
                      placeholder="Ex: Chave PIX (CPF): 234.567.890-12 (Banco do Brasil)"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Condições Específicas: Venda Parcelada */}
            {tipo === 'venda_parcelada' && (
              <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-lg space-y-3">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Entrada & Condições de Parcelamento
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Valor da Entrada (R$)</label>
                    <input
                      type="number"
                      value={valorEntrada}
                      onChange={(e) => setValorEntrada(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Qtd de Parcelas</label>
                    <input
                      type="number"
                      min="1"
                      value={numeroParcelas}
                      onChange={(e) => setNumeroParcelas(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Forma de Cobrança</label>
                    <select
                      value={formaPagamentoParcelas}
                      onChange={(e) => setFormaPagamentoParcelas(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Boleto Bancário">Boleto Bancário</option>
                      <option value="PIX Recorrente">PIX</option>
                      <option value="Transferência">Transferência Bancária</option>
                      <option value="Promissórias">Notas Promissórias</option>
                    </select>
                  </div>
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
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-lg space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Parâmetros de Exclusividade & Comissão
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Data Início</label>
                    <input
                      type="date"
                      value={dataInicioExcl}
                      onChange={(e) => setDataInicioExcl(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Prazo de Duração</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={prazoMesesOuDias}
                        onChange={(e) => setPrazoMesesOuDias(parseInt(e.target.value, 10) || 30)}
                        className="w-1/2 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <select
                        value={unidadePrazo}
                        onChange={(e) => setUnidadePrazo(e.target.value as any)}
                        className="w-1/2 px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="dias">Dias</option>
                        <option value="meses">Meses</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Comissão de Venda (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={percentualComissao}
                      onChange={(e) => setPercentualComissao(parseFloat(e.target.value) || 6)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('imovel')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar: Imóvel
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('foro')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
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
                4. Foro de Eleição e Datação
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase"
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase"
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
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
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('financeiro')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar: Condições Financeiras
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('revisao')}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
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
                  Conferência e Emissão do Instrumento
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Revise o resumo das informações antes de gerar o documento e iniciar a assinatura.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vendedor Resumo */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>1. {tipo === 'exclusividade' ? 'Contratante' : 'Vendedor'}</span>
                  <span className="text-[10px] text-amber-600 font-semibold">{tipo === 'exclusividade' ? 'Proprietário' : 'Transmitente'}</span>
                </h3>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <p><span className="font-semibold text-slate-500">Nome:</span> {vendedor.nome || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-500">CPF/CNPJ:</span> {vendedor.cpfCnpj || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-500">RG:</span> {vendedor.rg} {vendedor.rgOrgao}</p>
                  <p><span className="font-semibold text-slate-500">Endereço:</span> {vendedor.endereco}, nº {vendedor.numero} - {vendedor.bairro}, {vendedor.cidade}/{vendedor.uf}</p>
                </div>
              </div>

              {/* Comprador Resumo */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>2. {tipo === 'exclusividade' ? 'Contratado' : 'Comprador'}</span>
                  <span className="text-[10px] text-amber-600 font-semibold">{tipo === 'exclusividade' ? 'Corretor' : 'Adquirente'}</span>
                </h3>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <p><span className="font-semibold text-slate-500">Nome:</span> {comprador.nome || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-500">CPF/CNPJ:</span> {comprador.cpfCnpj || 'Não informado'}</p>
                  <p><span className="font-semibold text-slate-500">RG:</span> {comprador.rg} {comprador.rgOrgao}</p>
                  <p><span className="font-semibold text-slate-500">Endereço:</span> {comprador.endereco}, nº {comprador.numero} - {comprador.bairro}, {comprador.cidade}/{comprador.uf}</p>
                </div>
              </div>

              {/* Objeto Resumo (Imóvel ou Bem Móvel) */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>3. {subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? 'Objeto / Bem Móvel' : 'Objeto Imobiliário'}</span>
                  <span className="text-[10px] text-amber-600 font-semibold">
                    {subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? 'Bem / Veículo' : 'Imóvel'}
                  </span>
                </h3>
                {subcategoria === 'outros_bens' && tipo !== 'exclusividade' ? (
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

              {/* Financeiro e Foro Resumo */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  4. Condições e Assinatura
                </h3>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <p><span className="font-semibold text-slate-500">Valor Negociado:</span> <strong className="text-amber-700">R$ {formatDecimalNumber(valorTotal)}</strong></p>
                  <p className="text-[11px] text-slate-500">({valorTotalExtenso})</p>
                  <p><span className="font-semibold text-slate-500">Foro Eleito:</span> Comarca de {cidadeForo}/{ufForo}</p>
                  <p><span className="font-semibold text-slate-500">Datação:</span> {cidadeAssinatura}/{ufAssinatura}, {diaAssinatura} de {mesExtensoAssinatura} de {anoAssinatura}</p>
                </div>
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

        {/* Botão Fixo Inferior de Ação */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            title="Salva o que já foi preenchido no Supabase, sem exigir os campos obrigatórios - continue depois em outro dispositivo"
            className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 border border-amber-200 rounded-lg transition-colors cursor-pointer text-center"
          >
            {draftSaved ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
            ) : (
              <FileText className="w-4 h-4 shrink-0" />
            )}
            <span>{savingDraft ? 'Salvando...' : draftSaved ? 'Rascunho salvo!' : 'Salvar Rascunho'}</span>
          </button>
          {activeTab === 'revisao' && (
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px] flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 shadow-md rounded-lg transition-all cursor-pointer text-center"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-950" />
              <span>Salvar & Gerar Contrato</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
