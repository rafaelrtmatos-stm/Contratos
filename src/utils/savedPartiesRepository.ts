import { supabase } from './supabaseClient';
import { PartyDetailedInfo, SavedParty } from '../types/contract';
import { getSession } from './contractsRepository';

// ============================================================
// Contatos salvos (Contratado / Vendedor), reutilizáveis entre
// contratos. Gerenciados em Configurações e selecionáveis via
// dropdown ao criar/editar um contrato.
// ============================================================

function fromRow(row: any): SavedParty {
  return {
    id: row.id,
    nome: row.nome,
    cpfCnpj: row.cpf_cnpj ?? undefined,
    data: row.data as PartyDetailedInfo,
    criadoEm: row.created_at,
  };
}

export async function fetchSavedParties(): Promise<SavedParty[]> {
  await getSession();
  const { data, error } = await supabase
    .from('saved_parties')
    .select('*')
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function saveParty(party: PartyDetailedInfo, id?: string): Promise<SavedParty> {
  const session = await getSession();
  const row = {
    ...(id ? { id } : {}),
    owner_id: session.user.id,
    nome: party.nome,
    cpf_cnpj: party.cpfCnpj || null,
    data: party,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('saved_parties')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return fromRow(data);
}

export async function deleteSavedParty(id: string): Promise<void> {
  await getSession();
  const { error } = await supabase.from('saved_parties').delete().eq('id', id);
  if (error) throw error;
}
