import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getAdminClient, signToken, toPublicUser } from '../_shared.js';

// Cria o PRIMEIRO admin do sistema de login local. Só funciona enquanto
// a tabela app_users estiver vazia - depois disso, sempre retorna 403.
// Assim não vira uma rota de cadastro aberta ao público.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const { email, password, nome } = (req.body ?? {}) as {
      email?: string;
      password?: string;
      nome?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
      return;
    }

    const supabase = getAdminClient();

    const { count, error: countError } = await supabase
      .from('app_users')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      res.status(500).json({ error: 'Erro ao verificar usuários existentes.' });
      return;
    }

    if ((count ?? 0) > 0) {
      res.status(403).json({
        error: 'Setup já foi concluído. Peça a um administrador para criar seu acesso.',
      });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: created, error: insertError } = await supabase
      .from('app_users')
      .insert({
        email: email.trim(),
        password_hash,
        is_admin: true,
        permissions: {
          ver_financeiro: true,
          gerenciar_contratos: true,
          excluir_contratos: true,
          gerenciar_templates: true,
          gerenciar_usuarios: true,
        },
        profile: nome ? { nome } : {},
      })
      .select('*')
      .single();

    if (insertError || !created) {
      res.status(500).json({ error: insertError?.message || 'Falha ao criar admin.' });
      return;
    }

    const token = signToken({ sub: created.id, email: created.email, is_admin: true });
    res.status(200).json({ token, user: toPublicUser(created) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}
