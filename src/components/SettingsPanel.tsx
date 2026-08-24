import React, { useState } from 'react';
import { X, Download, Trash2, RotateCcw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { ContractData } from '../types/contract';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: ContractData[];
  onDeleteAllContracts: () => Promise<void>;
}

type Tab = 'backup' | 'danger';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  contracts,
  onDeleteAllContracts,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('backup');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

      setMessage({ type: 'success', text: `✅ Backup JSON exportado (${contracts.length} contratos)` });
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

      setMessage({ type: 'success', text: `✅ Backup CSV exportado (${contracts.length} contratos)` });
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
      setMessage({ type: 'success', text: '✅ Todos os contratos foram deletados' });
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">⚙️ Configurações</h2>
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
        <div className="border-b border-slate-200 bg-slate-50 px-6 flex gap-2">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-3 font-bold text-sm transition-all border-b-2 ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            💾 Backup & Exportação
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`px-4 py-3 font-bold text-sm transition-all border-b-2 ${
              activeTab === 'danger'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚠️ Zona de Risco
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg flex gap-2 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              {message.text}
            </div>
          )}

          {/* BACKUP TAB */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  📊 Total de contratos: <strong>{contracts.length}</strong>
                </p>
              </div>

              {/* Export JSON */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Exportar como JSON
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Formato completo com todos os dados dos contratos. Pode ser reimportado.
                  </p>
                </div>
                <button
                  onClick={handleExportJSON}
                  disabled={loading || contracts.length === 0}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
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
                    <Download className="w-4 h-4" />
                    Exportar como CSV
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Formato tabular para Excel/Sheets. Resumo dos contratos.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={loading || contracts.length === 0}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
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

          {/* DANGER TAB */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-900 font-bold">
                  ⚠️ ATENÇÃO: Ações nesta seção são IRREVERSÍVEIS!
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
