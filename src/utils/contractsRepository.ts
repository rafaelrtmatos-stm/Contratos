import { ContractData } from '../types/contract';
import { apiFetch } from './apiClient';

// ============================================================
// Acesso a contratos - migrado de supabase.auth.getSession() +
// supabase.from('contracts') direto no front-end para os endpoints
// /api/contracts/* (ver api/contracts/index.ts, trash.ts, signatures.ts).
//
// Motivo: o login deste app é local (JWT próprio via /api/auth/*, ver
// src/utils/authContext.tsx) porque supabase.auth.signInWithPassword()
// está bloqueado para o app - então nunca existe uma sessão real do
// Supabase Auth aqui. Como o RLS das tabelas (contracts,
// contract_signatures etc.) depende de auth.uid(), qualquer leitura
// direta pelo front-end caía sempre em "Sessão expirada", mesmo com o
// usuário logado. Os novos endpoints usam a service role key no servidor
// (bypassa RLS) e autorizam via o mesmo JWT local que já protege
// /api/auth/*.
//
// As assinaturas das funções abaixo continuam as mesmas de propósito -
// nenhuma tela que já as chama (App.tsx, ContractViewer.tsx,
// Dashboard.tsx, TrashModal.tsx, SettingsPanel.tsx) precisou mudar.
// ============================================================

// getSession() foi removido: não existe mais um "session" do Supabase pra
// devolver. Nada mais neste arquivo depende dela - se algum outro
// arquivo ainda importar `getSession` daqui, é sinal de que também
// depende do mesmo supabase.auth.getSession() quebrado e precisa migrar
// (ver savedPartiesRepository.ts, que hoje importa essa função).

// ============================================================
// CRUD de contratos
// ============================================================

export async function fetchContracts(): Promise<ContractData[]> {
  const { contracts } = await apiFetch<{ contracts: ContractData[] }>('contracts');
  return contracts;
}

export async function saveContract(contract: ContractData): Promise<ContractData> {
  const { contract: persisted } = await apiFetch<{ contract: ContractData }>('contracts', {
    method: 'POST',
    body: JSON.stringify(contract),
  });
  return persisted;
}

// ============================================================
// Lixeira: exclusão só marca deleted_at (soft-delete). O contrato some
// da lista normal, mas continua recuperável por até 30 dias - depois
// disso, o expurgo automático (purge_expired_trashed_contracts, agendado
// via pg_cron e também disparado de forma preguiçosa em
// fetchTrashedContracts) apaga definitivamente.
// ============================================================

export async function deleteContract(contractId: string): Promise<void> {
  await apiFetch<{ ok: true }>(`contracts?id=${encodeURIComponent(contractId)}`, { method: 'DELETE' });
}

export interface TrashedContract {
  contract: ContractData;
  deletedAt: string;
}

export async function fetchTrashedContracts(): Promise<TrashedContract[]> {
  const { trashed } = await apiFetch<{ trashed: TrashedContract[] }>('contracts/trash');
  return trashed;
}

export async function restoreContract(contractId: string): Promise<void> {
  await apiFetch<{ ok: true }>(`contracts/trash?id=${encodeURIComponent(contractId)}&action=restore`, {
    method: 'POST',
  });
}

export async function permanentlyDeleteContract(contractId: string): Promise<void> {
  await apiFetch<{ ok: true }>(`contracts/trash?id=${encodeURIComponent(contractId)}`, { method: 'DELETE' });
}

// ============================================================
// Assinaturas digitais
// ============================================================

/**
 * Persiste a assinatura e retorna o `assinadoEm` REAL gravado pelo banco
 * (coluna com DEFAULT NOW() / trigger no servidor - ver
 * fix_assinado_em_server_authoritative.sql). Isso propositalmente ignora
 * qualquer `assinadoEm` que já exista no objeto `signature` recebido: o
 * horário do dispositivo de quem assina não é confiável (relógio local
 * pode ser alterado), então o servidor é sempre quem manda no timestamp
 * que acaba aparecendo no PDF/manifesto/log de evidências.
 */
export async function saveSignature(
  contractId: string,
  signature: ContractData['assinaturas'][number]
): Promise<string> {
  const { assinadoEm } = await apiFetch<{ assinadoEm: string }>(
    `contracts/signatures?contractId=${encodeURIComponent(contractId)}`,
    { method: 'POST', body: JSON.stringify(signature) }
  );
  return assinadoEm;
}

export async function fetchSignatures(contractId: string): Promise<ContractData['assinaturas']> {
  const { signatures } = await apiFetch<{ signatures: ContractData['assinaturas'] }>(
    `contracts/signatures?contractId=${encodeURIComponent(contractId)}`
  );
  return signatures;
}
