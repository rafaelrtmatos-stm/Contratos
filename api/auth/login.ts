import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { checkEnvAdmin, getAdminClient, signToken, toPublicUser, type AppUserRow } from './_shared.js';

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

    // Mensagem genérica em ambos os casos (usuário inexistente / senha
    // errada) para não vazar quais e-mails existem na base.
    const invalidCreds = () => res.status(401).json({ error: 'E-mail ou senha inválidos.' });

    // Caminho 1: admin de emergência via ADMIN_EMAIL/ADMIN_PASSWORD (env
    // da Vercel). Não depende do Supabase estar configurado ou no ar -
    // é o equivalente ao fallback do app "rumo-ao-milhao", só que sem
    // gravar nada em disco (aqui não há disco persistente).
    const envAdmin = checkEnvAdmin(email, password);
    if (envAdmin) {
      const token = signToken({ sub: envAdmin.id, email: envAdmin.email, is_admin: true });
      res.status(200).json({ token, user: toPublicUser(envAdmin) });
      return;
    }

    // Caminho 2: usuários cadastrados na tabela app_users (Supabase).
    // Se o Supabase não estiver configurado/alcançável, isso não deve
    // derrubar o login para quem usa o admin de emergência acima -
    // por isso fica isolado no seu próprio try/catch.
    try {
      const supabase = getAdminClient();
      const { data: user, error } = await supabase
        .from('app_users')
        .select('*')
        .ilike('email', email.trim())
        .maybeSingle<AppUserRow>();

      if (error || !user) {
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
    } catch (supabaseError) {
      console.warn('[Auth] Supabase indisponível no login:', supabaseError);
      invalidCreds();
    }
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}
