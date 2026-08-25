import React, { useEffect, useState } from 'react';
import { X, Trash2, RotateCcw, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { ContractData } from '../types/contract';
import { formatCurrency } from '../utils/contractGenerators';
import {
  fetchTrashedContracts,
  restoreContract,
  permanentlyDeleteContract,
  TrashedContract,
} from '../utils/contractsRepository';
import { deleteContractDocuments } from '../utils/contractDocumentsStorage';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Chamado depois de restaurar um contrato, pra lista principal (fora
  // deste modal) recarregar e mostrar ele de volta.
  onContractRestored: (contract: ContractData) => void;
}

const DIAS_ATE_EXPURGO = 30;

function diasRestantes(deletedAt: string): number {
  const excluidoEm = new Date(deletedAt).getTime();
  const limite = excluidoEm + DIAS_ATE_EXPURGO * 24 * 60 * 60 * 1000;
  const restante = Math.ceil((limite - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, restante);
}

function nomeDoContrato(contract: ContractData): string {
  const isExcl = contract.tipo === 'exclusividade';
  return (isExcl ? contract.vendedor?.nome : contract.comprador?.nome) || contract.titulo || 'Contrato sem nome';
}

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose, onContractRestored }) => {
  const [items, setItems] = useState<TrashedContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmPermanentId, setConfirmPermanentId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrashedContracts();
      setItems(data);
    } catch (e: any) {
      setError(e.message || 'Falha ao carregar a lixeira.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestore = async (item: TrashedContract) => {
    setBusyId(item.contract.id);
    try {
      await restoreContract(item.contract.id);
      setItems((prev) => prev.filter((i) => i.contract.id !== item.contract.id));
      onContractRestored(item.contract);
    } catch (e: any) {
      setError(e.message || 'Falha ao restaurar.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (item: TrashedContract) => {
    setBusyId(item.contract.id);
    try {
      await permanentlyDeleteContract(item.contract.id);
      await deleteContractDocuments(item.contract.id);
      setItems((prev) => prev.filter((i) => i.contract.id !== item.contract.id));
    } catch (e: any) {
      setError(e.message || 'Falha ao excluir definitivamente.');
    } finally {
      setBusyId(null);
      setConfirmPermanentId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-slate-700" />
            <h2 className="font-bold text-slate-900">Lixeira</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100">
          <p className="text-xs text-amber-950">
            Contratos excluídos ficam aqui por {DIAS_ATE_EXPURGO} dias e podem ser restaurados a qualquer momento
            nesse período. Depois disso são apagados para sempre, automaticamente.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando...
            </div>
          )}

          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-10">A lixeira está vazia.</p>
          )}

          {items.map((item) => {
            const restantes = diasRestantes(item.deletedAt);
            const isBusy = busyId === item.contract.id;
            return (
              <div key={item.contract.id} className="border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{nomeDoContrato(item.contract)}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(item.contract.valorTotal || 0)} · excluído há{' '}
                      {Math.max(0, DIAS_ATE_EXPURGO - restantes)} dia(s) ·{' '}
                      <span className={restantes <= 5 ? 'text-red-600 font-semibold' : ''}>
                        {restantes > 0 ? `some para sempre em ${restantes} dia(s)` : 'será apagado em breve'}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={isBusy}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      title="Restaurar contrato"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Restaurar
                    </button>
                    <button
                      onClick={() => setConfirmPermanentId(item.contract.id)}
                      disabled={isBusy}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                      title="Excluir definitivamente agora"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {confirmPermanentId === item.contract.id && (
                  <div className="mt-3 pt-3 border-t border-red-100 bg-red-50 -mx-3 -mb-3 px-3 pb-3 rounded-b-xl">
                    <p className="text-xs font-bold text-red-800 mb-2">
                      Excluir "{nomeDoContrato(item.contract)}" para sempre agora, sem esperar os {DIAS_ATE_EXPURGO}{' '}
                      dias? Essa ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmPermanentId(null)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Sim, excluir para sempre
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          A limpeza automática dos 30 dias roda sozinha no servidor, mesmo sem ninguém abrir esta tela.
        </div>
      </div>
    </div>
  );
};
