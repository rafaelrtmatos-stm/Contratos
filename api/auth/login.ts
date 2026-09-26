import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getAdminClient, signToken, toPublicUser, type AppUserRow } from './_shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      return;
    }

    const supabase = getAdminClient();
    const { data: user, error } = await supabase
      .from('app_users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle<AppUserRow>();

    if (error) {
      res.status(500).json({ error: 'Erro ao consultar usuário.' });
      return;
    }

    // Mensagem genérica em ambos os casos (usuário inexistente / senha
    // errada) para não vazar quais e-mails existem na base.
    const invalidCreds = () => res.status(401).json({ error: 'E-mail ou senha inválidos.' });

    if (!user) {
      invalidCreds();
      return;
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      invalidCreds();
      return;
    }

    const token = signToken({ sub: user.id, email: user.email, is_admin: user.is_admin });
    res.status(200).json({ token, user: toPublicUser(user) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}
