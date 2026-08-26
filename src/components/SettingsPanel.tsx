import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  UserPlus,
  BookUser,
  Database,
  FileJson,
  FileSpreadsheet,
  Users,
  Shield,
  KeyRound,
  RefreshCw,
  Search,
  Check,
  Info,
  HardDrive,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ContractData, SavedParty } from '../types/contract';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { fetchSavedParties, deleteSavedParty } from '../utils/savedPartiesRepository';
import { saveContract } from '../utils/contractsRepository';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: ContractData[];
  onDeleteAllContracts: () => Promise<void>;
  isAdmin?: boolean;
}

type Tab = 'backup' | 'contatos' | 'ilovepdf' | 'usuarios' | 'danger';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  contracts,
  onDeleteAllContracts,
  isAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('backup');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // iLovePDF status e teste de conexão
  const [testingIlovepdf, setTestingIlovepdf] = useState(false);
  const [ilovepdfStatus, setIlovepdfStatus] = useState<{
    tested: boolean;
    success?: boolean;
    title?: string;
    message?: string;
    details?: string;
  }>({ tested: false });

  // Filtro de exportação
  const [exportFilter, setExportFilter] = useState<'all' | 'signed' | 'pending'>('all');

  // Importação de Backup JSON
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Contatos salvos
  const [savedParties, setSavedParties] = useState<SavedParty[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState('');

  // Usuários do sistema (somente admin)
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [existingUsers, setExistingUsers] = useState<
    { id: string; email: string | null; nome: string | null; criadoEm: string; ultimoLogin: string | null }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Zona de Risco
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');

  // Carregar contatos
  useEffect(() => {
    if (!isOpen || activeTab !== 'contatos') return;
    setLoadingParties(true);
    fetchSavedParties()
      .then(setSavedParties)
      .catch(() => setMessage({ type: 'error', text: 'Erro ao carregar contatos salvos.' }))
      .finally(() => setLoadingParties(false));
  }, [isOpen, activeTab]);

  // Carregar usuários
  const fetchExistingUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke('admin-list-users', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error || data?.error) {
        setUsersError(data?.error || error?.message || 'Falha ao carregar usuários.');
        return;
      }
      setExistingUsers(data?.users || []);
    } catch (err: any) {
      setUsersError(err.message || 'Erro inesperado ao consultar usuários.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'usuarios' || !isAdmin) return;
    fetchExistingUsers();
  }, [isOpen, activeTab, isAdmin]);

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const total = contracts.length;
    const signed = contracts.filter((c) => c.statusAssinatura?.statusGeral === 'Concluído').length;
    const pending = total - signed;
    return { total, signed, pending };
  }, [contracts]);

  // Contratos filtrados para exportação
  const filteredContracts = useMemo(() => {
    if (exportFilter === 'signed') {
      return contracts.filter((c) => c.statusAssinatura?.statusGeral === 'Concluído');
    }
    if (exportFilter === 'pending') {
      return contracts.filter((c) => c.statusAssinatura?.statusGeral !== 'Concluído');
    }
    return contracts;
  }, [contracts, exportFilter]);

  // Contatos filtrados por busca
  const filteredParties = useMemo(() => {
    if (!contactSearch.trim()) return savedParties;
    const q = contactSearch.toLowerCase();
    return savedParties.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.cpfCnpj && p.cpfCnpj.toLowerCase().includes(q)) ||
        (p.data?.email && p.data.email.toLowerCase().includes(q))
    );
  }, [savedParties, contactSearch]);

  // Exportar como JSON
  const handleExportJSON = () => {
    setLoading(true);
    try {
      const dataToExport = {
        app: 'Gerenciador de Contratos Imobiliários',
        version: '2.0',
        exportDate: new Date().toISOString(),
        totalContracts: filteredContracts.length,
        filterApplied: exportFilter,
        contracts: filteredContracts,
      };

      const json = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_contratos_${exportFilter}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `Backup JSON exportado com sucesso (${filteredContracts.length} contratos).` });
      setTimeout(() => setMessage(null), 4000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao exportar JSON: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Exportar como CSV
  const handleExportCSV = () => {
    setLoading(true);
    try {
      const headers = [
        'Número',
        'Tipo de Contrato',
        'Vendedor/Contratante',
        'CPF/CNPJ Vendedor',
        'Comprador/Contratado',
        'CPF/CNPJ Comprador',
        'Valor Total (R$)',
        'Data de Criação',
        'Cidade/UF',
        'Modalidade',
        'Status da Assinatura',
      ];

      const rows = filteredContracts.map((c) => [
        c.numeroContrato || '',
        c.tipo === 'venda_vista'
          ? 'Venda à Vista'
          : c.tipo === 'venda_parcelada'
          ? 'Venda Parcelada'
          : 'Exclusividade de Venda',
        c.vendedor.nome || '',
        c.vendedor.cpfCnpj || '',
        c.comprador.nome || '',
        c.comprador.cpfCnpj || '',
        c.valorTotal ? c.valorTotal.toFixed(2) : '0.00',
        c.dataCriacao || '',
        `${c.cidadeAssinatura || c.cidadeForo || ''}/${c.ufAssinatura || c.ufForo || ''}`,
        c.modalidadeAssinatura === 'digital' ? 'Assinatura Eletrônica' : 'Assinatura Manual',
        c.statusAssinatura?.statusGeral || 'Pendente',
      ]);

      const csvContent = [
        '\uFEFF' + headers.join(';'), // Adiciona BOM para UTF-8 no Excel
        ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_contratos_${exportFilter}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `Planilha CSV exportada com sucesso (${filteredContracts.length} contratos).` });
      setTimeout(() => setMessage(null), 4000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao exportar CSV: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Testar conexão com a Edge Function / iLovePDF API
  const handleTestIlovepdf = async () => {
    setTestingIlovepdf(true);
    setIlovepdfStatus({ tested: false });
    try {
      // 1. Verificar se as credenciais do Supabase estão configuradas no client
      if (!isSupabaseConfigured) {
        setIlovepdfStatus({
          tested: true,
          success: false,
          title: 'Supabase não conectado na aplicação',
          message: 'As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão configuradas no projeto.',
          details: 'Preencha o arquivo .env com a URL e ANON_KEY do seu projeto Supabase.',
        });
        return;
      }

      // 2. Chamar a Edge Function convert-docx-to-pdf
      const { data, error } = await supabase.functions.invoke('convert-docx-to-pdf', {
        body: { docxBase64: '', filename: 'teste.docx' },
      });

      let serverErrorMsg = error?.message || data?.error || '';
      if (error && 'context' in (error as any)) {
        try {
          const res = (error as any).context as Response;
          if (res && typeof res.json === 'function') {
            const errJson = await res.json();
            if (errJson?.error) {
              serverErrorMsg = errJson.error;
            }
          }
        } catch {
          // ignore
        }
      }

      if (serverErrorMsg.includes('Failed to send a request to the Edge Function') || error?.message?.includes('Failed to send a request')) {
        setIlovepdfStatus({
          tested: true,
          success: false,
          title: 'Edge Function ainda não foi implantada (Deploy)',
          message: 'O Supabase não conseguiu encontrar a Edge Function "convert-docx-to-pdf" no servidor.',
          details: 'Você precisa fazer o deploy da função pelo terminal usando o comando: supabase functions deploy convert-docx-to-pdf --no-verify-jwt',
        });
      } else if (serverErrorMsg.includes('ILOVEAPI_PUBLIC_KEY não configurada')) {
        setIlovepdfStatus({
          tested: true,
          success: false,
          title: 'Falta configurar a chave nos Secrets',
          message: 'A Edge Function está implantada, mas a chave ILOVEAPI_PUBLIC_KEY não foi salva no Supabase.',
          details: 'Execute: supabase secrets set ILOVEAPI_PUBLIC_KEY="project_public_sua_chave"',
        });
      } else if (serverErrorMsg.includes('Falha ao autenticar no iLoveAPI') || serverErrorMsg.includes('Unauthorized') || serverErrorMsg.includes('401')) {
        setIlovepdfStatus({
          tested: true,
          success: false,
          title: 'Chave iLovePDF recusada',
          message: 'A chave configurada foi recusada pelo iLovePDF API.',
          details: 'Verifique se você copiou exatamente a Public Key em developer.ilovepdf.com > My Projects.',
        });
      } else if (serverErrorMsg.includes('docxBase64 é obrigatório') || data?.pdfBase64) {
        setIlovepdfStatus({
          tested: true,
          success: true,
          title: 'Conexão e Chave Validadas com Sucesso!',
          message: 'A Edge Function e a chave iLovePDF estão ativas e funcionando perfeitamente.',
          details: 'Todos os downloads de contratos serão convertidos automaticamente com 100% de fidelidade de layout.',
        });
      } else {
        setIlovepdfStatus({
          tested: true,
          success: false,
          title: 'Resposta do Servidor',
          message: serverErrorMsg || 'Resposta inesperada ao invocar a função.',
          details: 'Verifique se a função convert-docx-to-pdf está ativa no painel do Supabase.',
        });
      }
    } catch (err: any) {
      const isDeployError = err?.message?.includes('Failed to send a request') || err?.name === 'FunctionsFetchError';
      setIlovepdfStatus({
        tested: true,
        success: false,
        title: isDeployError ? 'Edge Function não encontrada no Supabase' : 'Erro de Comunicação',
        message: isDeployError
          ? 'A Edge Function "convert-docx-to-pdf" ainda não foi publicada no seu projeto Supabase.'
          : `Erro ao chamar Edge Function: ${err.message}`,
        details: isDeployError
          ? 'Para publicar, abra o terminal e rode: supabase functions deploy convert-docx-to-pdf --no-verify-jwt'
          : undefined,
      });
    } finally {
      setTestingIlovepdf(false);
    }
  };

  // Importar Backup JSON
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let contractsToImport: ContractData[] = [];
      if (Array.isArray(data)) {
        contractsToImport = data;
      } else if (data.contracts && Array.isArray(data.contracts)) {
        contractsToImport = data.contracts;
      } else {
        throw new Error('Arquivo JSON inválido. Formato de backup não reconhecido.');
      }

      if (contractsToImport.length === 0) {
        throw new Error('O arquivo não contém nenhum contrato para importar.');
      }

      let importedCount = 0;
      for (const contract of contractsToImport) {
        if (contract && contract.tipo && contract.vendedor && contract.comprador) {
          await saveContract(contract);
          importedCount++;
        }
      }

      setMessage({
        type: 'success',
        text: `Importação concluída! ${importedCount} contrato(s) restaurados/atualizados com sucesso. Recarregue para sincronizar.`,
      });

      // Limpa o input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setMessage({ type: 'error', text: `Falha na importação: ${err.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  // Redefinir senha de usuário (Admin)
  const handleResetPassword = async (userId: string) => {
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      setResetFeedback({ type: 'error', message: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    setIsResettingPassword(true);
    setResetFeedback(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId, newPassword: resetPasswordValue },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error || data?.error) {
        setResetFeedback({ type: 'error', message: data?.error || error?.message || 'Falha ao redefinir senha.' });
        return;
      }

      setResetFeedback({ type: 'success', message: 'Senha redefinida com sucesso!' });
      setResetPasswordValue('');
      setTimeout(() => {
        setResetTargetId(null);
        setResetFeedback(null);
      }, 1800);
    } catch (err: any) {
      setResetFeedback({ type: 'error', message: err.message || 'Erro ao redefinir senha.' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Excluir contato salvo
  const handleDeleteParty = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSavedParty(id);
      setSavedParties((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: 'success', text: 'Contato excluído com sucesso.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao excluir contato: ${error.message}` });
    } finally {
      setDeletingId(null);
    }
  };

  // Criar novo usuário (Admin)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setUserFeedback(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { nome: novoNome, email: novoEmail, password: novaSenha },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error || data?.error) {
        setUserFeedback({ type: 'error', message: data?.error || error?.message || 'Falha ao criar usuário.' });
        return;
      }

      setUserFeedback({ type: 'success', message: `Usuário "${novoEmail}" criado com sucesso!` });
      setNovoNome('');
      setNovoEmail('');
      setNovaSenha('');
      fetchExistingUsers();
    } catch (err: any) {
      setUserFeedback({ type: 'error', message: err.message || 'Erro ao criar usuário.' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Deletar todos os contratos
  const handleDeleteAll = async () => {
    if (typedConfirmation !== 'DELETAR') {
      setMessage({ type: 'error', text: 'Digite exatamente "DELETAR" para confirmar.' });
      return;
    }

    setLoading(true);
    try {
      await onDeleteAllContracts();
      setMessage({ type: 'success', text: 'Todos os contratos foram movidos para a Lixeira (restauráveis por 30 dias).' });
      setConfirmDelete(false);
      setTypedConfirmation('');
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 2200);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao deletar: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header com Visual Refinado */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Painel de Controle
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                Configurações do Sistema
              </h2>
              <p className="text-xs text-slate-300">
                Backup, exportação de relatórios, contatos e gestão de dados
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar configurações"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Navegação por Abas */}
        <div className="border-b border-slate-200 bg-slate-50/90 px-4 sm:px-6 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-3.5 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'backup'
                ? 'border-amber-500 text-amber-900 bg-amber-50/70'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <HardDrive className="w-4 h-4 text-amber-600" />
            <span>Backup & Exportação</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('contatos')}
            className={`px-4 py-3.5 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'contatos'
                ? 'border-amber-500 text-amber-900 bg-amber-50/70'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <BookUser className="w-4 h-4 text-amber-600" />
            <span>Contatos Salvos</span>
            {savedParties.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {savedParties.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ilovepdf')}
            className={`px-4 py-3.5 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'ilovepdf'
                ? 'border-yellow-400 text-slate-950 bg-yellow-50/80 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>iLoveAPI / PDF</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`px-4 py-3.5 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'usuarios'
                  ? 'border-amber-500 text-amber-900 bg-amber-50/70'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Users className="w-4 h-4 text-amber-600" />
              <span>Usuários & Acesso</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('danger')}
            className={`px-4 py-3.5 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'danger'
                ? 'border-red-600 text-red-700 bg-red-50/70'
                : 'border-transparent text-slate-600 hover:text-red-600 hover:bg-red-50/40'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>Zona de Risco</span>
          </button>
        </div>

        {/* Conteúdo com Rolagem Suave */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Mensagens de Feedback Global */}
          {message && (
            <div
              className={`p-4 rounded-2xl flex items-start gap-3 text-sm animate-in fade-in duration-200 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                  : message.type === 'info'
                  ? 'bg-amber-50 border border-amber-200 text-amber-950'
                  : 'bg-red-50 border border-red-200 text-red-950'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              ) : message.type === 'info' ? (
                <Info className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{message.text}</div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 1: BACKUP, EXPORTAÇÃO E GERENCIAMENTO DE DADOS                        */}
          {/* ========================================================================= */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Card de Resumo de Dados e Nuvem */}
              <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200/80 rounded-2xl p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                      Status da Base de Dados
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {stats.total} Contratos Cadastrados
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Armazenamento em nuvem no Supabase com sincronização automática e backups criptografados.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-white px-3 py-2 rounded-xl border border-amber-200 text-center shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Assinados</span>
                      <strong className="text-sm font-bold text-emerald-700">{stats.signed}</strong>
                    </div>
                    <div className="bg-white px-3 py-2 rounded-xl border border-amber-200 text-center shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Pendentes</span>
                      <strong className="text-sm font-bold text-amber-700">{stats.pending}</strong>
                    </div>
                  </div>
                </div>

                {/* Filtro Rápido de Exportação */}
                <div className="mt-4 pt-4 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-700">
                    Filtrar contratos para exportar:
                  </span>
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-200/80">
                    <button
                      type="button"
                      onClick={() => setExportFilter('all')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        exportFilter === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todos ({stats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFilter('signed')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        exportFilter === 'signed'
                          ? 'bg-amber-500 text-slate-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Assinados ({stats.signed})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFilter('pending')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        exportFilter === 'pending'
                          ? 'bg-amber-500 text-slate-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pendentes ({stats.pending})
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid de Opções de Exportação e Importação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opção 1: Exportar Backup JSON */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-amber-300 transition-all shadow-2xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Backup Completo em JSON
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Arquivo estruturado com todos os dados dos contratos, cláusulas, dados das partes, imóveis e assinaturas registradas. Ideal para segurança e restauração.
                    </p>
                  </div>

                  <button
                    onClick={handleExportJSON}
                    disabled={loading || filteredContracts.length === 0}
                    className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Exportando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Baixar Backup JSON ({filteredContracts.length})</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Opção 2: Exportar Planilha CSV */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-400 transition-all shadow-2xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Relatório Tabular em CSV / Excel
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Exportação em formato de planilha compatível com Microsoft Excel, Google Planilhas e LibreOffice para controle financeiro e auditoria gerencial.
                    </p>
                  </div>

                  <button
                    onClick={handleExportCSV}
                    disabled={loading || filteredContracts.length === 0}
                    className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Exportando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Baixar Relatório CSV ({filteredContracts.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Bloco de Restauração / Importação de Backup */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Restaurar Contratos de Backup (.json)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Selecione um arquivo de backup previamente gerado por este sistema para sincronizar e restaurar os registros.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportJSON}
                    className="hidden"
                    id="backup-file-input"
                  />
                  <label
                    htmlFor="backup-file-input"
                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        <span>Restaurando dados...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-slate-600" />
                        <span>Selecionar Arquivo de Backup</span>
                      </>
                    )}
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Aceita apenas backups válidos no formato JSON.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: CONTATOS SALVOS REUTILIZÁVEIS                                      */}
          {/* ========================================================================= */}
          {activeTab === 'contatos' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-950">
                    Contatos Salvos do Sistema
                  </h3>
                  <p className="text-xs text-amber-900/80 mt-0.5">
                    Dados de corretores, contratados e vendedores salvos para preenchimento automático em novos contratos.
                  </p>
                </div>
                <div className="relative shrink-0 w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Buscar por nome, CPF/CNPJ..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {loadingParties ? (
                <div className="flex flex-col items-center justify-center gap-2 text-xs text-slate-500 py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span>Carregando contatos salvos...</span>
                </div>
              ) : filteredParties.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                  <BookUser className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700">
                    {contactSearch ? 'Nenhum contato encontrado para a busca.' : 'Nenhum contato salvo ainda.'}
                  </p>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    Ao preencher os dados de um Contratado ou Vendedor no formulário, clique em "Salvar este contato" para reutilizá-lo sempre que precisar.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredParties.map((party) => (
                    <div
                      key={party.id}
                      className="flex flex-col justify-between border border-slate-200 rounded-2xl p-4 bg-white hover:border-slate-300 hover:shadow-2xs transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {party.nome}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            {party.cpfCnpj || 'Documento não informado'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteParty(party.id)}
                          disabled={deletingId === party.id}
                          title="Excluir contato salvo"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                          {deletingId === party.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {party.data?.profissao && (
                          <p className="truncate">
                            <span className="font-semibold text-slate-500">Profissão:</span> {party.data.profissao}
                          </p>
                        )}
                        {party.data?.telefone && (
                          <p className="truncate">
                            <span className="font-semibold text-slate-500">Telefone:</span> {party.data.telefone}
                          </p>
                        )}
                        {party.data?.cidade && (
                          <p className="truncate">
                            <span className="font-semibold text-slate-500">Local:</span> {party.data.cidade}/{party.data.uf}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: GERENCIAMENTO DE USUÁRIOS (SOMENTE ADMINISTRADOR)                  */}
          {/* ========================================================================= */}
          {activeTab === 'usuarios' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 space-y-1 leading-relaxed">
                  <p className="font-bold">Controle Seguro de Acesso</p>
                  <p>
                    Gerencie os corretores e operadores da sua imobiliária. Por razões de privacidade e criptografia, as senhas não podem ser visualizadas, apenas redefinidas.
                  </p>
                </div>
              </div>

              {/* Lista de Usuários Existentes */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-700" />
                    Usuários Cadastrados ({existingUsers.length})
                  </h3>
                  <button
                    onClick={fetchExistingUsers}
                    disabled={loadingUsers}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="Atualizar lista"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                    <span>Atualizar</span>
                  </button>
                </div>

                {loadingUsers && (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span>Carregando lista de usuários...</span>
                  </div>
                )}

                {usersError && (
                  <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{usersError}</span>
                  </div>
                )}

                {!loadingUsers && !usersError && existingUsers.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Nenhum outro usuário encontrado.</p>
                )}

                <div className="space-y-2.5">
                  {existingUsers.map((u) => (
                    <div key={u.id} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 truncate">{u.email}</span>
                            {u.nome && (
                              <span className="text-xs text-slate-500 truncate">({u.nome})</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Cadastrado em {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                            {u.ultimoLogin ? ` • Último login: ${new Date(u.ultimoLogin).toLocaleDateString('pt-BR')}` : ''}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setResetTargetId(resetTargetId === u.id ? null : u.id);
                            setResetPasswordValue('');
                            setResetFeedback(null);
                          }}
                          className="shrink-0 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>{resetTargetId === u.id ? 'Fechar' : 'Redefinir Senha'}</span>
                        </button>
                      </div>

                      {/* Caixa de Redefinição de Senha */}
                      {resetTargetId === u.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 bg-white p-3 rounded-xl border">
                          <label className="text-xs font-bold text-slate-700 block">
                            Definir Nova Senha para {u.email}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              minLength={6}
                              value={resetPasswordValue}
                              onChange={(e) => setResetPasswordValue(e.target.value)}
                              placeholder="Nova senha (mínimo 6 caracteres)"
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <button
                              onClick={() => handleResetPassword(u.id)}
                              disabled={isResettingPassword}
                              className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              {isResettingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              <span>Salvar</span>
                            </button>
                          </div>

                          {resetFeedback && (
                            <div
                              className={`text-xs font-semibold rounded-lg px-3 py-2 flex items-center gap-2 ${
                                resetFeedback.type === 'success'
                                  ? 'text-emerald-950 bg-emerald-50 border border-emerald-200'
                                  : 'text-red-600 bg-red-50 border border-red-100'
                              }`}
                            >
                              {resetFeedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4" />
                              )}
                              {resetFeedback.message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulário de Criação de Usuário */}
              <form onSubmit={handleCreateUser} className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-2xs">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-slate-700" />
                  Cadastrar Novo Usuário na Imobiliária
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">E-mail de Login</label>
                    <input
                      type="email"
                      required
                      value={novoEmail}
                      onChange={(e) => setNovoEmail(e.target.value)}
                      placeholder="joao@imobiliaria.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Senha Inicial</label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {userFeedback && (
                  <div
                    className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 flex items-center gap-2 ${
                      userFeedback.type === 'success'
                        ? 'text-emerald-950 bg-emerald-50 border border-emerald-200'
                        : 'text-red-600 bg-red-50 border border-red-100'
                    }`}
                  >
                    {userFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {userFeedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {isCreatingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar Usuário</span>
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA: CONFIGURAÇÃO E DIAGNÓSTICO DO iLovePDF API                           */}
          {/* ========================================================================= */}
          {activeTab === 'ilovepdf' && (
            <div className="space-y-5">
              {/* Card Informativo Principal */}
              <div className="bg-gradient-to-br from-yellow-50/70 via-white to-amber-50/50 border border-yellow-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 text-yellow-400 border border-slate-800 flex items-center justify-center font-black text-sm shadow-xs tracking-tight">
                    PDF
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Motor de Conversão iLovePDF API (Office to PDF)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Geração de PDF com 100% de fidelidade ao layout do documento Word (.docx)
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  O sistema converte o documento Word preenchido em PDF utilizando a <strong>iLoveAPI (iLovePDF)</strong> através de uma Edge Function no Supabase (<code className="bg-yellow-100 text-yellow-900 px-1.5 py-0.5 rounded font-mono text-[11px]">convert-docx-to-pdf</code>).
                </p>
              </div>

              {/* Status e Teste de Conexão */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Diagnóstico de Conexão e Chave
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verifique se a Edge Function e o secret <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">ILOVEAPI_PUBLIC_KEY</code> estão operacionais.
                    </p>
                  </div>

                  <button
                    onClick={handleTestIlovepdf}
                    disabled={testingIlovepdf}
                    className="px-4 py-2.5 btn-gold text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0 disabled:opacity-60"
                  >
                    {testingIlovepdf ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <RefreshCw className="w-4 h-4 text-slate-950" />}
                    <span>{testingIlovepdf ? 'Testando Conexão...' : 'Testar Conexão iLovePDF'}</span>
                  </button>
                </div>

                {ilovepdfStatus.tested && (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-200 ${
                      ilovepdfStatus.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    {ilovepdfStatus.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <span className="font-bold text-sm block">
                        {ilovepdfStatus.title || (ilovepdfStatus.success ? 'Conexão Bem-Sucedida!' : 'Atenção')}
                      </span>
                      <p>{ilovepdfStatus.message}</p>
                      {ilovepdfStatus.details && (
                        <div className="mt-2 p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] select-all overflow-x-auto">
                          {ilovepdfStatus.details}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Guia Completo Passo a Passo: Deploy da Edge Function e Chave */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/70">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  Passo a Passo: Como Resolver o Erro e Ativar a iLoveAPI
                </h4>

                <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">1. Obter a Chave Pública (Public Key):</p>
                    <p>
                      Acesse{' '}
                      <a
                        href="https://developer.ilovepdf.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-rose-600 hover:underline"
                      >
                        developer.ilovepdf.com
                      </a>
                      , entre na sua conta e copie a <strong>Public Key</strong> do seu projeto (formato: <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">project_public_...</code>).
                    </p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">2. Salvar a Chave nos Secrets do Supabase:</p>
                    <p>Execute no terminal do seu projeto:</p>
                    <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] select-all overflow-x-auto">
                      supabase secrets set ILOVEAPI_PUBLIC_KEY="project_public_sua_chave_aqui"
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Ou adicione pelo Painel Web do Supabase em <strong>Project Settings &gt; Edge Functions &gt; Secrets</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">3. Fazer o Deploy da Edge Function no Supabase (Corrige "Failed to send a request"):</p>
                    <p>
                      O erro <em>"Failed to send a request to the Edge Function"</em> acontece quando a função ainda não foi publicada no seu projeto Supabase. Para publicar, execute:
                    </p>
                    <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] select-all overflow-x-auto">
                      supabase functions deploy convert-docx-to-pdf --no-verify-jwt
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: ZONA DE RISCO (GERENCIAMENTO CRÍTICO E EXCLUSÃO)                   */}
          {/* ========================================================================= */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-950 space-y-1">
                  <p className="font-bold">Atenção às operações de limpeza de dados</p>
                  <p>
                    A exclusão em lote moverá todos os contratos atuais para a <strong>Lixeira</strong>. Os itens permanecerão restauráveis por até 30 dias antes do expurgo definitivo.
                  </p>
                </div>
              </div>

              {/* Caixa de Exclusão de Todos os Contratos */}
              <div className="border border-red-200 rounded-2xl p-5 space-y-4 bg-white shadow-2xs">
                <div>
                  <h3 className="font-bold text-red-900 text-sm flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    Limpar Base de Contratos Ativos
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Remove todos os <strong>{contracts.length}</strong> contratos da visualização principal.
                  </p>
                </div>

                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={loading || contracts.length === 0}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Iniciar Exclusão em Lote</span>
                  </button>
                ) : (
                  <div className="space-y-3 p-4 bg-red-50/60 border border-red-200 rounded-xl">
                    <p className="text-xs font-bold text-red-950">
                      Para confirmar, digite <span className="font-mono bg-red-200 px-1.5 py-0.5 rounded text-red-900">DELETAR</span> abaixo:
                    </p>
                    <input
                      type="text"
                      value={typedConfirmation}
                      onChange={(e) => setTypedConfirmation(e.target.value)}
                      placeholder="Digite DELETAR"
                      className="w-full max-w-xs px-3 py-2 bg-white border border-red-300 rounded-xl text-xs font-bold text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setConfirmDelete(false);
                          setTypedConfirmation('');
                        }}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDeleteAll}
                        disabled={loading || typedConfirmation !== 'DELETAR'}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processando...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            <span>Confirmar Exclusão de {contracts.length} Contrato(s)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Sessão autenticada via Supabase
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

