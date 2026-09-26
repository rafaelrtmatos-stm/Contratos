// Cliente HTTP genérico para qualquer endpoint /api/* que exija o token
// do login local (mesmo token de src/utils/authFetch.ts, que fica restrito
// a /api/auth/*). Usado pelos repositories que migraram de acesso direto
// ao Supabase (supabase.auth.getSession(), que nunca existe no login
// local - ver src/utils/authContext.tsx) para endpoints de backend.

import { getStoredToken } from './authFetch';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> | undefined),
  };

  let res: Response;
  try {
    res = await fetch(`/api/${path}`, { ...init, headers });
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Falha de rede.');
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // 401 aqui é sempre sessão local expirada/inválida (o token não
    // passou em requireAuth no backend) - mesma mensagem que o resto do
    // app já usa, pra não mudar o que o usuário vê.
    const message = res.status === 401 ? 'Sessão expirada. Faça login novamente.' : body?.error || `Erro ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}
