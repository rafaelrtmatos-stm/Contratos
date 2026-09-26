// Contatos salvos (Contratado/Vendedor reutilizáveis). Migrado pelo
// mesmo motivo de api/contracts/*.ts - ver comentário lá.
//
// GET    /api/saved-parties        - lista
// POST   /api/saved-parties        - cria/atualiza (upsert)
// DELETE /api/saved-parties?id=... - remove

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient, requireAuth } from './_shared.js';

function fromRow(row: any) {
  return {
    id: row.id,
    nome: row.nome,
    cpfCnpj: row.cpf_cnpj ?? undefined,
    data: row.data,
    criadoEm: row.created_at,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const supabase = getAdminClient();

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('saved_parties').select('*').order('nome', { ascending: true });
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(200).json({ parties: (data ?? []).map(fromRow) });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { id, party } = (req.body ?? {}) as { id?: string; party?: Record<string, any> };
      if (!party) {
        res.status(400).json({ error: 'party é obrigatório.' });
        return;
      }

      // owner_id: mesma observação de api/contracts/index.ts - payload.sub
      // (app_users.id, login local) não é um auth.uid() válido, então não
      // é gravado aqui como se fosse. Não afeta o app hoje porque nenhuma
      // tela filtra saved_parties por dono.
      const row = {
        ...(id ? { id } : {}),
        nome: party.nome,
        cpf_cnpj: party.cpfCnpj || null,
        data: party,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('saved_parties').upsert(row, { onConflict: 'id' }).select().single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(200).json({ party: fromRow(data) });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = (req.query ?? {}) as { id?: string };
      if (!id) {
        res.status(400).json({ error: 'id é obrigatório.' });
        return;
      }
      const { error } = await supabase.from('saved_parties').delete().eq('id', id);
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
    }
    return;
  }

  res.status(405).json({ error: 'Método não permitido.' });
}
