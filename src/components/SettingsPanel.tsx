import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, RotateCcw, AlertCircle, CheckCircle2, Loader2, UserPlus, BookUser } from 'lucide-react';
import { ContractData, SavedParty } from '../types/contract';
import { supabase } from '../utils/supabaseClient';
import { fetchSavedParties, deleteSavedParty } from '../utils/savedPartiesRepository';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: ContractData[];
  onDeleteAllContracts: () => Promise<void>;
  isAdmin?: boolean;
}

type Tab = 'backup' | 'contatos' | 'usuarios' | 'danger';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  contracts,
  onDeleteAllContracts,
  isAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('backup');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Formulário de criação de usuário (aba "Usuários", somente admin)
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Lista de usuários existentes (aba "Usuários", somente admin)
  const [existingUsers, setExistingUsers] = useState<
    {
      id: string;
      email: string | null;
      nome: string | null;
      criadoEm: string;
      ultimoLogin: string | null;
      role: string;
      permissions: Record<string, boolean>;
    }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Painel de "o que ele vê ou não" (permissões) por usuário
  const [permsTargetId, setPermsTargetId] = useState<string | null>(null);
  const [permsDraft, setPermsDraft] = useState<Record<string, boolean>>({});
  const [isSavingPerms, setIsSavingPerms] = useState(false);
  const [permsFeedback, setPermsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const PERMISSION_LABELS: { key: string; label: string; hint: string }[] = [
    { key: 'ver_financeiro', label: 'Ver valores financeiros', hint: 'Valor total, entrada e parcelas dos contratos' },
    { key: 'excluir_contratos', label: 'Excluir contratos', hint: 'Enviar contratos para a Lixeira' },
    { key: 'gerenciar_templates', label: 'Gerenciar Templates', hint: 'Enviar, baixar e excluir modelos .docx' },
    { key: 'gerenciar_usuarios', label: 'Gerenciar Usuários', hint: 'Criar usuários e editar permissões de outros' },
  ];

  const handleSavePermissions = async (userId: string) => {
    setIsSavingPerms(true);
    setPermsFeedback(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const { data, error } = await supabase.functions.invoke('admin-update-user-permissions', {
      body: { userId, permissions: permsDraft },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    setIsSavingPerms(false);

    if (error || data?.error) {
      setPermsFeedback({ type: 'error', message: data?.error || error?.message || 'Falha ao salvar permissões.' });
      return;
    }

    setExistingUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, permissions: { ...u.permissions, ...permsDraft } } : u))
    );
    setPermsFeedback({ type: 'success', message: 'Permissões atualizadas.' });
    setTimeout(() => {
      setPermsTargetId(null);
      setPermsFeedback(null);
    }, 1200);
  };

  const formatUltimoAcesso = (iso: string | null) => {
    if (!iso) return 'Nunca acessou';
    return new Date(iso).toLocaleString('pt-BR', { hour12: true, timeZone: 'America/Sao_Paulo' });
  };

  // Contatos salvos (Contratado/Vendedor) reutilizáveis
  const [savedParties, setSavedParties] = useState<SavedParty[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || activeTab !== 'contatos') return;
    setLoadingParties(true);
    fetchSavedParties()
      .then(setSavedParties)
      .catch(() => setMessage({ type: 'error', text: 'Erro ao carregar contatos salvos.' }))
      .finally(() => setLoadingParties(false));
  }, [isOpen, activeTab]);

  const fetchExistingUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const { data, error } = await supabase.functions.invoke('admin-list-users', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    setLoadingUsers(false);

    if (error || data?.error) {
      setUsersError(data?.error || error?.message || 'Falha ao carregar usuários.');
      return;
    }
    setExistingUsers(data?.users || []);
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'usuarios' || !isAdmin) return;
    fetchExistingUsers();
  }, [isOpen, activeTab, isAdmin]);

  const handleResetPassword = async (userId: string) => {
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      setResetFeedback({ type: 'error', message: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }
    setIsResettingPassword(true);
    setResetFeedback(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { userId, newPassword: resetPasswordValue },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    setIsResettingPassword(false);

    if (error || data?.error) {
      setResetFeedback({ type: 'error', message: data?.error || error?.message || 'Falha ao redefinir senha.' });
      return;
    }

    setResetFeedback({ type: 'success', message: 'Senha redefinida com sucesso.' });
    setResetPasswordValue('');
    setTimeout(() => {
      setResetTargetId(null);
      setResetFeedback(null);
    }, 1500);
  };

  const handleDeleteParty = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSavedParty(id);
      setSavedParties((prev) => prev.filter((p) => p.id !== id));
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao excluir contato: ${error.message}` });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  // Exportar como JSON
  const handleExportJSON = () => {
    setLoading(true);
    try {
      const dataToExport = {
        exportDate: new Date().toISOString(),
        totalContracts: contracts.length,
        contracts: contracts,
      };

      const json = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_contratos_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `📋 Backup JSON exportado (${contracts.length} contratos)` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao exportar: ${error.message}` });
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
        'Tipo',
        'Vendedor',
        'Comprador',
        'Valor Total',
        'Data Criação',
        'Status',
      ];

      const rows = contracts.map((c) => [
        c.numeroContrato,
        c.tipo,
        c.vendedor.nome,
        c.comprador.nome,
        c.valorTotal || '',
        c.dataCriacao || '',
        c.statusAssinatura?.statusGeral || 'Pendente',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contratos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `📋 Backup CSV exportado (${contracts.length} contratos)` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao exportar: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Deletar todos os contratos
  const handleDeleteAll = async () => {
    setLoading(true);
    try {
      await onDeleteAllContracts();
      setMessage({ type: 'success', text: '📋 Todos os contratos foram deletados' });
      setConfirmDelete(false);
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao deletar: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Criar novo usuário (via Edge Function admin-create-user, somente admin)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setUserFeedback(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { nome: novoNome, email: novoEmail, password: novaSenha },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    setIsCreatingUser(false);

    if (error || data?.error) {
      setUserFeedback({ type: 'error', message: data?.error || error?.message || 'Falha ao criar usuário.' });
      return;
    }

    setUserFeedback({ type: 'success', message: `Usuário "${novoEmail}" criado com sucesso.` });
    setNovoNome('');
    setNovoEmail('');
    setNovaSenha('');
    fetchExistingUsers();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">⚙ Configurações</h2>
            <p className="text-xs text-slate-600 mt-1">Backup, exportação e gerenciamento de dados</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-3 font-bold text-sm transition-all border-b-2 cursor-pointer ${
              activeTab === 'backup'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
             Backup & Exportação
          </button>
          <button
            onClick={() => setActiveTab('contatos')}
            className={`px-4 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'contatos'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookUser className="w-4 h-4" />
            Contatos
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`px-4 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'usuarios'
                  ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Usuários
            </button>
          )}
          <button
            onClick={() => setActiveTab('danger')}
            className={`px-4 py-3 font-bold text-sm transition-all border-b-2 cursor-pointer ${
              activeTab === 'danger'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚠ Zona de Risco
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg flex gap-2 text-sm ${
                message.type === 'success'
                  ? 'bg-amber-50 border border-amber-200 text-amber-950'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              {message.text}
            </div>
          )}

          {/* CONTATOS TAB */}
          {activeTab === 'contatos' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/70 rounded-lg p-4">
                <p className="text-sm text-amber-950">
                  Contatos de <strong>Contratado</strong> e <strong>Vendedor</strong> salvos a partir dos contratos.
                  Eles aparecem na barra suspensa "Contatos salvos" ao criar um novo contrato.
                </p>
              </div>

              {loadingParties ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-8">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando contatos...
                </div>
              ) : savedParties.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-8 border border-dashed border-slate-200 rounded-lg">
                  Nenhum contato salvo ainda. Use o botão "Salvar contato" ao preencher um Contratado ou Vendedor.
                </div>
              ) : (
                <div className="space-y-2">
                  {savedParties.map((party) => (
                    <div
                      key={party.id}
                      className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{party.nome}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {party.cpfCnpj || 'CPF/CNPJ não informado'}
                          {party.data?.telefone ? ` • ${party.data.telefone}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteParty(party.id)}
                        disabled={deletingId === party.id}
                        title="Excluir contato salvo"
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        {deletingId === party.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BACKUP TAB */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/70 rounded-lg p-4">
                <p className="text-sm text-amber-950">
                   Total de contratos: <strong>{contracts.length}</strong>
                </p>
              </div>

              {/* Export JSON */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-600" />
                    Exportar como JSON
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Formato completo com todos os dados dos contratos. Pode ser reimportado.
                  </p>
                </div>
                <button
                  onClick={handleExportJSON}
                  disabled={loading || contracts.length === 0}
                  className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Baixar JSON
                    </>
                  )}
                </button>
              </div>

              {/* Export CSV */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4 text-slate-700" />
                    Exportar como CSV
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Formato tabular para Excel/Sheets. Resumo dos contratos.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={loading || contracts.length === 0}
                  className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Baixar CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* USUÁRIOS TAB (somente admin) */}
          {activeTab === 'usuarios' && isAdmin && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200/70 rounded-lg p-4">
                <p className="text-sm text-amber-950">
                  Por segurança, o sistema nunca guarda senhas em texto legível — só é possível
                  ver o e-mail de cada usuário e definir uma nova senha, não visualizar a atual.
                </p>
              </div>

              {/* Lista de usuários existentes */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <BookUser className="w-4 h-4 text-slate-700" />
                  Usuários com acesso
                </h3>

                {loadingUsers && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando usuários...
                  </div>
                )}

                {usersError && (
                  <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {usersError}
                  </div>
                )}

                {!loadingUsers && !usersError && existingUsers.length === 0 && (
                  <p className="text-xs text-slate-500">Nenhum usuário encontrado.</p>
                )}

                <div className="space-y-2">
                  {existingUsers.map((u) => (
                    <div key={u.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{u.email}</p>
                          {u.nome && <p className="text-xs text-slate-500 truncate">{u.nome}</p>}
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Último acesso: {formatUltimoAcesso(u.ultimoLogin)}
                            {u.role === 'admin' && <span className="ml-2 text-amber-700 font-semibold">Admin</span>}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setResetTargetId(resetTargetId === u.id ? null : u.id);
                              setResetPasswordValue('');
                              setResetFeedback(null);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            {resetTargetId === u.id ? 'Cancelar' : 'Redefinir senha'}
                          </button>
                          <button
                            onClick={() => {
                              if (permsTargetId === u.id) {
                                setPermsTargetId(null);
                              } else {
                                setPermsTargetId(u.id);
                                setPermsDraft(u.permissions || {});
                                setPermsFeedback(null);
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            {permsTargetId === u.id ? 'Cancelar' : 'O que ele vê'}
                          </button>
                        </div>
                      </div>

                      {permsTargetId === u.id && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                          {PERMISSION_LABELS.map((p) => (
                            <label key={p.key} className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!permsDraft[p.key]}
                                onChange={(e) => setPermsDraft({ ...permsDraft, [p.key]: e.target.checked })}
                                className="mt-0.5 w-4 h-4 accent-amber-500 cursor-pointer"
                              />
                              <span>
                                <span className="block text-xs font-semibold text-slate-800">{p.label}</span>
                                <span className="block text-[11px] text-slate-500">{p.hint}</span>
                              </span>
                            </label>
                          ))}
                          {permsFeedback && (
                            <div
                              className={`text-xs font-semibold rounded-lg px-3 py-2 flex items-center gap-2 ${
                                permsFeedback.type === 'success'
                                  ? 'text-amber-950 bg-amber-50 border border-amber-200'
                                  : 'text-red-600 bg-red-50 border border-red-100'
                              }`}
                            >
                              {permsFeedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4" />
                              )}
                              {permsFeedback.message}
                            </div>
                          )}
                          <button
                            onClick={() => handleSavePermissions(u.id)}
                            disabled={isSavingPerms}
                            className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-slate-950 font-bold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isSavingPerms && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Salvar permissões
                          </button>
                        </div>
                      )}

                      {resetTargetId === u.id && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                          <label className="text-xs font-semibold text-slate-600 block">Nova senha</label>
                          <input
                            type="text"
                            minLength={6}
                            value={resetPasswordValue}
                            onChange={(e) => setResetPasswordValue(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                          {resetFeedback && (
                            <div
                              className={`text-xs font-semibold rounded-lg px-3 py-2 flex items-center gap-2 ${
                                resetFeedback.type === 'success'
                                  ? 'text-amber-950 bg-amber-50 border border-amber-200'
                                  : 'text-red-600 bg-red-50 border border-red-100'
                              }`}
                            >
                              {resetFeedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4" />
                              )}
                              {resetFeedback.message}
                            </div>
                          )}
                          <button
                            onClick={() => handleResetPassword(u.id)}
                            disabled={isResettingPassword}
                            className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-slate-950 font-bold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isResettingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Salvar nova senha
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="border border-slate-200 rounded-lg p-4 space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-slate-700" />
                  Criar novo usuário
                </h3>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Nome</label>
                  <input
                    type="text"
                    required
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">E-mail</label>
                  <input
                    type="email"
                    required
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Senha provisória</label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {userFeedback && (
                  <div
                    className={`text-xs font-semibold rounded-lg px-3 py-2 flex items-center gap-2 ${
                      userFeedback.type === 'success'
                        ? 'text-amber-950 bg-amber-50 border border-amber-200'
                        : 'text-red-600 bg-red-50 border border-red-100'
                    }`}
                  >
                    {userFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {userFeedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-slate-950 font-bold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {isCreatingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                  <UserPlus className="w-4 h-4" />
                  Criar Usuário
                </button>
              </form>
            </div>
          )}

          {/* DANGER TAB */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-900 font-bold">
                  ⚠ ATENÇÃO: Ações nesta seção são IRREVERSÍVEIS!
                </p>
              </div>

              {/* Delete All Contracts */}
              <div className="border-2 border-red-200 rounded-lg p-4 space-y-3 bg-red-50">
                <div>
                  <h3 className="font-bold text-red-900 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Deletar Todos os Contratos
                  </h3>
                  <p className="text-xs text-red-700 mt-1">
                    Remove permanentemente {contracts.length} contrato(s) do sistema.
                  </p>
                </div>

                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={loading || contracts.length === 0}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar Tudo
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-red-900">
                      Confirmar exclusão de {contracts.length} contrato(s)?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 font-bold text-sm rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDeleteAll}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deletando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            SIM, DELETAR
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

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
