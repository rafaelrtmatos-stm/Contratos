// Lixeira de contratos (soft-delete). O soft-delete em si (marcar
// deleted_at) é feito em DELETE /api/contracts?id=... - aqui só o que
// acontece DEPOIS: listar, restaurar ou apagar de vez.
//
// GET    /api/contracts/trash                 - lista contratos na lixeira (+ expurgo preguiçoso)
// POST   /api/contracts/trash?id=...&action=restore - restaura um contrato
// DELETE /api/contracts/trash?id=...           - apaga definitivamente

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient, requireAuth, requirePermission } from '../_shared.js';
import { fromRow } from './_mapping.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return handleList(req, res);
  if (req.method === 'POST') return handleRestore(req, res);
  if (req.method === 'DELETE') return handlePermanentDelete(req, res);
  res.status(405).json({ error: 'Método não permitido.' });
}

async function handleList(req: VercelRequest, res: VercelResponse) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  try {
    const supabase = getAdminClient();

    // Expurgo preguiçoso: aproveita a visita à lixeira pra descartar de
    // vez o que já passou de 30 dias. Não é problema se isso falhar (ex:
    // função ainda não existe no banco) - só não limpa dessa vez.
    try {
      await supabase.rpc('purge_expired_trashed_contracts');
    } catch {
      // segue mesmo assim
    }

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const trashed = (data ?? []).map((row: any) => ({ contract: fromRow(row), deletedAt: row.deleted_at }));
    res.status(200).json({ trashed });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}

async function handleRestore(req: VercelRequest, res: VercelResponse) {
  const payload = await requirePermission(req, res, 'excluir_contratos');
  if (!payload) return;

  const { id } = (req.query ?? {}) as { id?: string };
  if (!id) {
    res.status(400).json({ error: 'id é obrigatório.' });
    return;
  }

  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from('contracts').update({ deleted_at: null }).eq('id', id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}

async function handlePermanentDelete(req: VercelRequest, res: VercelResponse) {
  const payload = await requirePermission(req, res, 'excluir_contratos');
  if (!payload) return;

  const { id } = (req.query ?? {}) as { id?: string };
  if (!id) {
    res.status(400).json({ error: 'id é obrigatório.' });
    return;
  }

  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}
