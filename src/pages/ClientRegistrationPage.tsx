import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Sparkles,
  ShieldCheck,
  Globe,
  Scale,
  Landmark,
  Copy,
  ExternalLink,
  Info,
  KeyRound,
  HeartHandshake,
} from 'lucide-react';
import {
  ClientRegistrationData,
  fetchContractSummaryForRegistration,
  saveClientSelfRegistration,
  buildWhatsAppNotificationMessage,
  createWhatsAppUrl,
  getSavedBrokerPhone,
} from '../utils/clientRegistrationRepository';
import {
  isValidCPF,
  isValidCNPJ,
  isValidRG,
  isValidPhone,
  isValidCEP,
  formatCPF,
  formatCNPJ,
  formatRG,
  formatPhone,
  formatCEP,
  fetchAddressByCEP,
} from '../utils/validators';
import { EstadoCivilSelect } from '../components/EstadoCivilSelect';
import { GenderSelect } from '../components/GenderSelect';
import { NacionalidadeSelect } from '../components/NacionalidadeSelect';
import { OrgaoEmissorInput } from '../components/OrgaoEmissorInput';
import { CEPSearch } from '../components/CEPSearch';

export const ClientRegistrationPage: React.FC = () => {
  const { id: routeContractId } = useParams();
  const [searchParams] = useSearchParams();
  const contractId = routeContractId || searchParams.get('c') || '';
  const roleParam = searchParams.get('r') || 'comprador';
  const brokerPhoneParam = searchParams.get('tel') || '';
  const contractNumberParam = searchParams.get('num') || '';

  const [contractInfo, setContractInfo] = useState<{
    id: string;
    titulo: string;
    numeroContrato: string;
    tipo: string;
    subcategoria?: string;
  } | null>(null);

  const [loadingContract, setLoadingContract] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [whatsAppUrl, setWhatsAppUrl] = useState('');
  const [savedToDb, setSavedToDb] = useState(false);

  // Form State
  const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF');
  const [nome, setNome] = useState('');
  const [genero, setGenero] = useState('M');
  const [nacionalidade, setNacionalidade] = useState('brasileiro(a)');
  const [estadoCivil, setEstadoCivil] = useState('solteiro(a)');
  const [profissao, setProfissao] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [rg, setRg] = useState('');
  const [rgOrgao, setRgOrgao] = useState('SSP');
  const [telefone, setTelefone] = useState('');
  const [telefone2, setTelefone2] = useState('');
  const [creci, setCreci] = useState('');

  // Endereço
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  // Cônjuge
  const [possuiConjuge, setPossuiConjuge] = useState(false);
  const [conjugeNome, setConjugeNome] = useState('');
  const [conjugeCpf, setConjugeCpf] = useState('');
  const [conjugeRg, setConjugeRg] = useState('');
  const [conjugeRgOrgao, setConjugeRgOrgao] = useState('SSP');
  const [conjugeProfissao, setConjugeProfissao] = useState('');

  // Validação em tempo real
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Carregar dados do contrato se fornecido
  useEffect(() => {
    if (contractId) {
      setLoadingContract(true);
      fetchContractSummaryForRegistration(contractId)
        .then((data) => {
          if (data) setContractInfo(data);
        })
        .finally(() => setLoadingContract(false));
    }
  }, [contractId]);

  const isMarried =
    estadoCivil.toLowerCase().includes('casad') ||
    estadoCivil.toLowerCase().includes('união estável') ||
    estadoCivil.toLowerCase().includes('uniao estavel');

  const roleLabel =
    roleParam === 'vendedor'
      ? 'Vendedor(a) / Proprietário(a)'
      : roleParam === 'locatario'
      ? 'Locatário(a) / Inquilino(a)'
      : roleParam === 'locador'
      ? 'Locador(a) / Proprietário(a)'
      : roleParam === 'contratante'
      ? 'Contratante / Proprietário(a)'
      : roleParam === 'fiador'
      ? 'Fiador(a)'
      : 'Comprador(a)';

  // Validações
  const isCpfValid = tipoPessoa === 'PF' ? isValidCPF(cpfCnpj) : isValidCNPJ(cpfCnpj);
  const isRgValid = !rg || isValidRG(rg);
  const isPhoneValid = isValidPhone(telefone);
  const isCepValid = isValidCEP(cep);
  const isConjugeCpfValid = !isMarried || !possuiConjuge || !conjugeCpf || isValidCPF(conjugeCpf);

  const handleCpfChange = (val: string) => {
    if (tipoPessoa === 'PJ') {
      setCpfCnpj(formatCNPJ(val));
    } else {
      setCpfCnpj(formatCPF(val));
    }
  };

  const handlePhoneChange = (val: string) => {
    setTelefone(formatPhone(val));
  };

  const handlePhone2Change = (val: string) => {
    setTelefone2(formatPhone(val));
  };

  const handleRgChange = (val: string) => {
    setRg(formatRG(val));
  };

  const handleConjugeCpfChange = (val: string) => {
    setConjugeCpf(formatCPF(val));
  };

  const handleConjugeRgChange = (val: string) => {
    setConjugeRg(formatRG(val));
  };

  const handleCepSearchData = (data: { endereco: string; bairro: string; cidade: string; uf: string }) => {
    if (data.endereco) setEndereco(data.endereco);
    if (data.bairro) setBairro(data.bairro);
    if (data.cidade) setCidade(data.cidade);
    if (data.uf) setUf(data.uf);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Marcar todos como tocados
    setTouched({
      nome: true,
      cpfCnpj: true,
      telefone: true,
      cep: true,
      endereco: true,
      numero: true,
      bairro: true,
      cidade: true,
      uf: true,
      conjugeNome: isMarried && possuiConjuge,
      conjugeCpf: isMarried && possuiConjuge,
    });

    if (!nome.trim()) {
      setSubmitError('Por favor, preencha o Nome Completo.');
      return;
    }

    if (!isCpfValid) {
      setSubmitError(`Por favor, informe um ${tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'} válido.`);
      return;
    }

    if (!isPhoneValid) {
      setSubmitError('Por favor, informe um número de WhatsApp/Telefone celular válido com DDD.');
      return;
    }

    if (!isCepValid) {
      setSubmitError('Por favor, informe um CEP válido.');
      return;
    }

    if (!endereco.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !uf.trim()) {
      setSubmitError('Por favor, complete todos os campos de endereço (Rua, Número, Bairro, Cidade e UF).');
      return;
    }

    if (isMarried && possuiConjuge && conjugeCpf && !isConjugeCpfValid) {
      setSubmitError('O CPF do cônjuge informado é inválido.');
      return;
    }

    setSubmitting(true);

    const registrationData: ClientRegistrationData = {
      tipoPessoa,
      nome: nome.trim(),
      genero,
      nacionalidade,
      estadoCivil,
      profissao: profissao.trim(),
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      rg: rg.trim(),
      rgOrgao: rgOrgao.trim(),
      telefone: telefone.replace(/\D/g, ''),
      telefone2: telefone2 ? telefone2.replace(/\D/g, '') : undefined,
      creci: creci.trim() || undefined,
      cep: cep.replace(/\D/g, ''),
      endereco: endereco.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf: uf.trim(),
      conjuge: isMarried && possuiConjuge && conjugeNome.trim() ? {
        nome: conjugeNome.trim(),
        cpf: conjugeCpf ? conjugeCpf.replace(/\D/g, '') : undefined,
        rg: conjugeRg.trim() || undefined,
        rgOrgao: conjugeRgOrgao.trim() || undefined,
        profissao: conjugeProfissao.trim() || undefined,
      } : undefined,
    };

    try {
      const res = await saveClientSelfRegistration({
        registration: registrationData,
        contractId: contractId || undefined,
        role: roleParam,
      });

      setSavedToDb(res.savedToSupabase);

      // Gerar a mensagem e o link do WhatsApp para notificar o corretor
      const brokerPhone = brokerPhoneParam || getSavedBrokerPhone();
      const message = buildWhatsAppNotificationMessage({
        registration: registrationData,
        contractNumber: contractInfo?.numeroContrato || contractNumberParam,
        contractTitle: contractInfo?.titulo,
        roleLabel,
      });

      const url = createWhatsAppUrl(brokerPhone, message);
      setWhatsAppUrl(url);
      setSubmitSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Tentar abrir o WhatsApp automaticamente após 1 segundo
      setTimeout(() => {
        try {
          window.open(url, '_blank');
        } catch {
          // Ignora se o bloqueador de popup impedir
        }
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao salvar auto-cadastro:', err);
      setSubmitError(err.message || 'Erro ao processar cadastro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopySummary = async () => {
    const registrationData: ClientRegistrationData = {
      tipoPessoa,
      nome: nome.trim(),
      genero,
      nacionalidade,
      estadoCivil,
      profissao: profissao.trim(),
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      rg: rg.trim(),
      rgOrgao: rgOrgao.trim(),
      telefone: telefone.replace(/\D/g, ''),
      telefone2: telefone2 ? telefone2.replace(/\D/g, '') : undefined,
      creci: creci.trim() || undefined,
      cep: cep.replace(/\D/g, ''),
      endereco: endereco.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf: uf.trim(),
      conjuge: isMarried && possuiConjuge && conjugeNome.trim() ? {
        nome: conjugeNome.trim(),
        cpf: conjugeCpf ? conjugeCpf.replace(/\D/g, '') : undefined,
        rg: conjugeRg.trim() || undefined,
        rgOrgao: conjugeRgOrgao.trim() || undefined,
        profissao: conjugeProfissao.trim() || undefined,
      } : undefined,
    };

    const text = buildWhatsAppNotificationMessage({
      registration: registrationData,
      contractNumber: contractInfo?.numeroContrato || contractNumberParam,
      contractTitle: contractInfo?.titulo,
      roleLabel,
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Cabeçalho do Formulário */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Cadastro Seguro para Contratos</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Ficha Cadastral do Cliente
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Preencha seus dados com atenção. As informações serão salvas com segurança e utilizadas para redigir o contrato.
          </p>

          {/* Card com Informações do Contrato Vinculado (se houver) */}
          {(contractInfo || contractNumberParam) && (
            <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-yellow-400/30 text-left flex items-start gap-3 shadow-lg shadow-black/40">
              <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/30">
                    {contractInfo?.numeroContrato || contractNumberParam}
                  </span>
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {roleLabel}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white mt-1 truncate">
                  {contractInfo?.titulo || 'Contrato Imobiliário'}
                </h3>
              </div>
            </div>
          )}
        </header>

        {/* TELA DE SUCESSO */}
        {submitSuccess ? (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-300 space-y-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gravado diretamente no banco de dados Supabase</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                Cadastro Concluído com Sucesso!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Seus dados cadastrais foram salvos no banco de dados e vinculados ao contrato. Agora, envie a confirmação ao corretor pelo WhatsApp.
              </p>
            </div>

            {/* Ações do WhatsApp */}
            <div className="space-y-3 pt-2 max-w-md mx-auto">
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/30 active:scale-98 transition-all cursor-pointer"
              >
                <Send className="w-5 h-5" />
                <span>Abrir WhatsApp e Avisar Corretor</span>
              </a>

              <button
                type="button"
                onClick={handleCopySummary}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedSummary ? 'Copiado para a área de transferência!' : 'Copiar Resumo dos Dados'}</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 text-slate-400 text-xs flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Ambiente seguro e protegido</span>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO PRINCIPAL */
          <form
            onSubmit={handleSubmit}
            className="bg-white text-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200/90 space-y-6"
          >
            {/* Mensagem de Erro Geral */}
            {submitError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* SEÇÃO 1: TIPO DE PESSOA */}
            <div className="space-y-3 pb-2 border-b border-slate-100">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                Tipo de Pessoa / Cadastro:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTipoPessoa('PF');
                    setCpfCnpj('');
                  }}
                  className={`p-3.5 rounded-2xl border text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    tipoPessoa === 'PF'
                      ? 'bg-yellow-50/80 border-yellow-400 ring-2 ring-yellow-400/40 text-slate-950 font-extrabold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <User className="w-4 h-4 text-yellow-600" />
                  <span>Pessoa Física (CPF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipoPessoa('PJ');
                    setCpfCnpj('');
                  }}
                  className={`p-3.5 rounded-2xl border text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    tipoPessoa === 'PJ'
                      ? 'bg-yellow-50/80 border-yellow-400 ring-2 ring-yellow-400/40 text-slate-950 font-extrabold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-yellow-600" />
                  <span>Pessoa Jurídica (CNPJ)</span>
                </button>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS PESSOAIS / IDENTIFICAÇÃO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-yellow-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  1. Identificação e Documentos
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {tipoPessoa === 'PJ' ? 'Razão Social / Nome da Empresa' : 'Nome Completo'} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder={tipoPessoa === 'PJ' ? 'Ex: IMOBILIÁRIA BRASIL LTDA' : 'Ex: JOÃO PAULO DA SILVA'}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 uppercase tracking-tight"
                  />
                </div>

                {/* CPF ou CNPJ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'} <span className="text-rose-600">*</span></span>
                    {cpfCnpj && (
                      <span className={`text-[10px] font-bold ${isCpfValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isCpfValid ? '✓ Válido' : '✗ Inválido'}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={cpfCnpj}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    maxLength={tipoPessoa === 'PJ' ? 18 : 14}
                    placeholder={tipoPessoa === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                      cpfCnpj && !isCpfValid
                        ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-400'
                        : 'border-slate-300 focus:ring-yellow-400 focus:border-yellow-400'
                    }`}
                  />
                </div>

                {/* RG */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{tipoPessoa === 'PJ' ? 'Inscrição Estadual' : 'RG (Registro Geral)'}</span>
                    {rg && (
                      <span className={`text-[10px] font-bold ${isRgValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isRgValid ? '✓ Válido' : '✗ Inválido'}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={rg}
                    onChange={(e) => handleRgChange(e.target.value)}
                    placeholder="00.000.000-0"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </div>

                {/* Órgão Emissor */}
                <div>
                  <OrgaoEmissorInput
                    value={rgOrgao}
                    onChange={setRgOrgao}
                    label="Órgão Emissor do RG"
                  />
                </div>

                {/* Gênero e Estado Civil (se PF) */}
                {tipoPessoa === 'PF' && (
                  <>
                    <div>
                      <GenderSelect
                        value={genero}
                        onChange={setGenero}
                        label="Gênero"
                      />
                    </div>

                    <div>
                      <EstadoCivilSelect
                        value={estadoCivil}
                        onChange={setEstadoCivil}
                        genero={genero}
                        label="Estado Civil"
                      />
                    </div>

                    <div>
                      <NacionalidadeSelect
                        value={nacionalidade}
                        onChange={setNacionalidade}
                        genero={genero}
                        label="Nacionalidade"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        Profissão
                      </label>
                      <input
                        type="text"
                        value={profissao}
                        onChange={(e) => setProfissao(e.target.value)}
                        placeholder="Ex: Engenheiro(a) Civil, Empresário(a)..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 uppercase"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SEÇÃO 3: CÔNJUGE (SE CASADO / UNIÃO ESTÁVEL) */}
            {tipoPessoa === 'PF' && isMarried && (
              <div className="space-y-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                <div className="flex items-center gap-2 text-slate-900">
                  <HeartHandshake className="w-4 h-4 text-amber-600" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wide text-amber-950">
                    Cônjuge / Companheiro(a)
                  </h3>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Possui cônjuge / companheiro(a) a ser incluído(a) no contrato?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPossuiConjuge(false)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        !possuiConjuge
                          ? 'bg-white border-amber-500 text-amber-950 shadow-sm ring-2 ring-amber-400/30'
                          : 'bg-amber-100/50 border-amber-200 text-amber-800 hover:bg-white'
                      }`}
                    >
                      ✕ Não possui / Não incluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setPossuiConjuge(true)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        possuiConjuge
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-400/30'
                          : 'bg-amber-100/50 border-amber-200 text-amber-800 hover:bg-white'
                      }`}
                    >
                      ✓ Sim, incluir cônjuge
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800/80">
                    {!possuiConjuge
                      ? 'Nenhum dado de cônjuge será exigido ou adicionado ao contrato.'
                      : 'Preencha abaixo os dados do cônjuge que constará na qualificação.'}
                  </p>
                </div>

                {possuiConjuge && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-amber-200/80">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        Nome Completo do Cônjuge
                      </label>
                      <input
                        type="text"
                        value={conjugeNome}
                        onChange={(e) => setConjugeNome(e.target.value)}
                        placeholder="Ex: MARIA HELENA DOS SANTOS"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>CPF do Cônjuge</span>
                        {conjugeCpf && (
                          <span className={`text-[10px] font-bold ${isConjugeCpfValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isConjugeCpfValid ? '✓ Válido' : '✗ Inválido'}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={conjugeCpf}
                        onChange={(e) => handleConjugeCpfChange(e.target.value)}
                        maxLength={14}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        RG do Cônjuge
                      </label>
                      <input
                        type="text"
                        value={conjugeRg}
                        onChange={(e) => handleConjugeRgChange(e.target.value)}
                        placeholder="00.000.000-0"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>

                    <div>
                      <OrgaoEmissorInput
                        value={conjugeRgOrgao}
                        onChange={setConjugeRgOrgao}
                        label="Órgão Emissor (Cônjuge)"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SEÇÃO 4: ENDEREÇO COM BUSCA DE CEP */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
                <MapPin className="w-4 h-4 text-yellow-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  2. Endereço Completo
                </h3>
              </div>

              {/* Componente de Busca CEP */}
              <div className="space-y-4">
                <CEPSearch
                  cep={cep}
                  onCEPChange={(newCep) => setCep(formatCEP(newCep))}
                  onAddressChange={handleCepSearchData}
                  label="CEP"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Logradouro (Rua / Av / Travessa) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Ex: AV. NAZARÉ"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Número <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="123 ou S/N"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Complemento (Apt, Bloco...)
                    </label>
                    <input
                      type="text"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      placeholder="Ex: Apto 402, Bloco B"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Bairro <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Ex: CENTRO"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Cidade / UF <span className="text-rose-600">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Cidade"
                        className="col-span-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase"
                      />
                      <input
                        type="text"
                        required
                        value={uf}
                        maxLength={2}
                        onChange={(e) => setUf(e.target.value.toUpperCase())}
                        placeholder="UF"
                        className="col-span-1 px-2.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 5: CONTATO & COMUNICAÇÃO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
                <Phone className="w-4 h-4 text-yellow-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  3. Contatos para Notificações
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>WhatsApp / Celular <span className="text-rose-600">*</span></span>
                    {telefone && (
                      <span className={`text-[10px] font-bold ${isPhoneValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPhoneValid ? '✓ Válido' : '✗ Incompleto'}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={telefone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Telefone Secundário */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Telefone Secundário / Fixo
                  </label>
                  <input
                    type="text"
                    value={telefone2}
                    onChange={(e) => handlePhone2Change(e.target.value)}
                    maxLength={15}
                    placeholder="(00) 0000-0000"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
            </div>

            {/* BOTÃO DE ENVIO */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl shadow-yellow-500/25 hover:shadow-yellow-500/40 active:scale-98 transition-all cursor-pointer disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Salvando dados...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 stroke-[2.5]" />
                    <span>Concluir Cadastro e Enviar ao Corretor</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400 font-medium">
                Ao clicar em concluir, seus dados serão gravados com segurança e você será direcionado para enviar a notificação no WhatsApp.
              </p>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
