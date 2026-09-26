import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient, requireAuth, toPublicUser, type AppUserRow } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  try {
    const supabase = getAdminClient();
    const { data: user, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', payload.sub)
      .maybeSingle<AppUserRow>();

    if (error || !user) {
      res.status(401).json({ error: 'Sessão inválida.' });
      return;
    }

    res.status(200).json({ user: toPublicUser(user) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}
