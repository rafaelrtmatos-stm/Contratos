import { PartyDetailedInfo, SavedParty } from '../types/contract';
import { apiFetch } from './apiClient';

// ============================================================
// Contatos salvos (Contratado / Vendedor), reutilizáveis entre
// contratos. Gerenciados em Configurações e selecionáveis via dropdown
// ao criar/editar um contrato.
//
// Migrado de supabase.auth.getSession() + supabase.from('saved_parties')
// direto para /api/saved-parties - mesmo motivo de contractsRepository.ts
// (login local não gera sessão real do Supabase Auth).
// ============================================================

export async function fetchSavedParties(): Promise<SavedParty[]> {
  const { parties } = await apiFetch<{ parties: SavedParty[] }>('saved-parties');
  return parties;
}

export async function saveParty(party: PartyDetailedInfo, id?: string): Promise<SavedParty> {
  const { party: saved } = await apiFetch<{ party: SavedParty }>('saved-parties', {
    method: 'POST',
    body: JSON.stringify({ id, party }),
  });
  return saved;
}

export async function deleteSavedParty(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`saved-parties?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}
