// Utilitários compartilhados pelas funções serverless de autenticação
// local (login/setup/user/users). Nunca é importado pelo front-end -
// só roda no servidor (Vercel), onde SUPABASE_SERVICE_ROLE_KEY e
// JWT_SECRET existem como variáveis de ambiente privadas.

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export function getAdminClient() {
  const url = process.env.VITE_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_URL não configurados no ambiente da Vercel.'
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface AppUserRow {
  id: string;
  email: string;
  password_hash: string;
  is_admin: boolean;
  permissions: Record<string, boolean>;
  profile: Record<string, unknown>;
  created_at: string;
}

export interface AuthTokenPayload {
  sub: string; // app_users.id
  email: string;
  is_admin: boolean;
}

const TOKEN_TTL = '30d';

export function signToken(payload: AuthTokenPayload): string {
  const secret = process.env.JWT_SECRET as string;
  if (!secret) throw new Error('JWT_SECRET não configurado no ambiente da Vercel.');
  return jwt.sign(payload, secret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  const secret = process.env.JWT_SECRET as string;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): AuthTokenPayload | null {
  const token = getBearerToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'Não autenticado.' });
    return null;
  }
  return payload;
}

export function requireAdmin(
  req: VercelRequest,
  res: VercelResponse
): AuthTokenPayload | null {
  const payload = requireAuth(req, res);
  if (!payload) return null;
  if (!payload.is_admin) {
    res.status(403).json({ error: 'Apenas administradores podem fazer isso.' });
    return null;
  }
  return payload;
}

// Formato exposto ao front-end: nunca inclui password_hash.
export function toPublicUser(row: AppUserRow) {
  return {
    id: row.id,
    email: row.email,
    is_admin: row.is_admin,
    permissions: row.permissions ?? {},
    profile: row.profile ?? {},
  };
}
