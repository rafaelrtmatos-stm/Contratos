import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ENV_ADMIN_ID, getAdminClient, requireAuth, toPublicUser, type AppUserRow } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  // Sessão do admin de emergência (env) - o token já foi validado acima
  // via JWT_SECRET, não precisa (nem consegue) consultar o Supabase.
  if (payload.sub === ENV_ADMIN_ID) {
    res.status(200).json({
      user: toPublicUser({
        id: ENV_ADMIN_ID,
        email: payload.email,
        password_hash: '',
        is_admin: true,
        permissions: {
          ver_financeiro: true,
          gerenciar_contratos: true,
          excluir_contratos: true,
          gerenciar_templates: true,
          gerenciar_usuarios: true,
        },
        profile: { nome: 'Administrador (acesso de emergência)' },
        created_at: new Date().toISOString(),
      }),
    });
    return;
  }

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
