// Cliente HTTP fino para falar com /api/auth/* (login local, independente
// do Supabase Auth). O token fica em localStorage e é anexado em todo
// request feito por aqui.

const TOKEN_KEY = 'contratos_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage indisponível (modo privado, etc.) - segue sem persistir
  }
}

export interface AppUser {
  id: string;
  email: string;
  is_admin: boolean;
  permissions: Record<string, boolean>;
  profile: Record<string, unknown>;
}

interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

async function callAuthApi<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api/auth/${path}`, { ...init, headers });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return { data: null, error: body?.error || `Erro ${res.status}` };
    }
    return { data: body as T, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Falha de rede.' };
  }
}

export async function apiLogin(email: string, password: string) {
  return callAuthApi<{ token: string; user: AppUser }>('login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetCurrentUser() {
  return callAuthApi<{ user: AppUser }>('user', { method: 'GET' });
}
