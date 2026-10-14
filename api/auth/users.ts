import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getAdminClient, requireAdmin, toPublicUser, type AppUserRow } from '../_shared.js';

// Gerenciamento de usuários do sistema de login local (app_users).
// Só admins podem listar ou criar novos usuários - diferente de
// /api/auth/setup, que existe apenas para o primeiro admin e se
// autobloqueia depois disso.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const supabase = getAdminClient();

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        res.status(500).json({ error: 'Erro ao listar usuários.' });
        return;
      }

      res.status(200).json({ users: (data as AppUserRow[]).map(toPublicUser) });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { email, password, nome, is_admin, permissions } = (req.body ?? {}) as {
        email?: string;
        password?: string;
        nome?: string;
        is_admin?: boolean;
        permissions?: Record<string, boolean>;
      };

      if (!email || !password) {
        res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from('app_users')
        .select('id')
        .ilike('email', email.trim())
        .maybeSingle();

      if (existingError) {
        res.status(500).json({ error: 'Erro ao verificar e-mail existente.' });
        return;
      }
      if (existing) {
        res.status(409).json({ error: 'Já existe um usuário com esse e-mail.' });
        return;
      }

      const password_hash = await bcrypt.hash(password, 10);

      const { data: created, error: insertError } = await supabase
        .from('app_users')
        .insert({
          email: email.trim(),
          password_hash,
          is_admin: Boolean(is_admin),
          permissions: permissions ?? {},
          profile: nome ? { nome } : {},
        })
        .select('*')
        .single();

      if (insertError || !created) {
        res.status(500).json({ error: insertError?.message || 'Falha ao criar usuário.' });
        return;
      }

      res.status(201).json({ user: toPublicUser(created as AppUserRow) });
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
      if (id === payload.sub) {
        res.status(400).json({ error: 'Você não pode excluir seu próprio usuário.' });
        return;
      }

      const { error: deleteError } = await supabase.from('app_users').delete().eq('id', id);
      if (deleteError) {
        res.status(500).json({ error: 'Falha ao excluir usuário.' });
        return;
      }

      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
    }
    return;
  }

  if (req.method === 'PATCH') {
    try {
      const body = (req.body ?? {}) as {
        id?: string;
        action?: 'rename' | 'permissions' | 'password';
        nome?: string;
        permissions?: Record<string, boolean>;
        newPassword?: string;
      };
      const { id, action } = body;

      if (!id || !action) {
        res.status(400).json({ error: 'id e action são obrigatórios.' });
        return;
      }

      const { data: target, error: targetError } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', id)
        .maybeSingle<AppUserRow>();

      if (targetError) {
        res.status(500).json({ error: 'Erro ao buscar usuário.' });
        return;
      }
      if (!target) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }

      if (action === 'rename') {
        const nome = body.nome?.trim();
        if (!nome) {
          res.status(400).json({ error: 'O nome não pode ficar vazio.' });
          return;
        }
        const { error } = await supabase
          .from('app_users')
          .update({ profile: { ...(target.profile ?? {}), nome } })
          .eq('id', id);
        if (error) {
          res.status(500).json({ error: 'Falha ao renomear usuário.' });
          return;
        }
        res.status(200).json({ ok: true });
        return;
      }

      if (action === 'permissions') {
        if (!body.permissions || typeof body.permissions !== 'object') {
          res.status(400).json({ error: 'permissions é obrigatório.' });
          return;
        }
        const { error } = await supabase
          .from('app_users')
          .update({ permissions: { ...(target.permissions ?? {}), ...body.permissions } })
          .eq('id', id);
        if (error) {
          res.status(500).json({ error: 'Falha ao salvar permissões.' });
          return;
        }
        res.status(200).json({ ok: true });
        return;
      }

      if (action === 'password') {
        if (!body.newPassword || body.newPassword.length < 6) {
          res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
          return;
        }
        const password_hash = await bcrypt.hash(body.newPassword, 10);
        const { error } = await supabase.from('app_users').update({ password_hash }).eq('id', id);
        if (error) {
          res.status(500).json({ error: 'Falha ao redefinir senha.' });
          return;
        }
        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: 'action inválida.' });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
    }
    return;
  }

  res.status(405).json({ error: 'Método não permitido.' });
}
