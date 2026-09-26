import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGetCurrentUser, apiLogin, getStoredToken, setStoredToken, type AppUser } from './authFetch';

// Sistema de login LOCAL (tabela app_users via /api/auth/*), independente
// do Supabase Auth. Motivo: o Supabase Auth deste projeto está sofrendo
// alguma restrição que bloqueia supabase.auth.signInWithPassword() para
// este app - ver sql/migrations/create_app_users_local_auth.sql.
//
// IMPORTANTE: isso resolve só o LOGIN. Leitura/gravação de dados
// (contracts, templates, contract_signature_links etc.) ainda depende
// de RLS baseada em auth.uid() do Supabase Auth - migrar isso é um
// trabalho separado, ainda não feito.

export interface Profile {
  id: string;
  email: string;
  nome: string | null;
  role: 'admin' | 'user';
  permissions: {
    ver_financeiro?: boolean;
    gerenciar_contratos?: boolean;
    excluir_contratos?: boolean;
    gerenciar_templates?: boolean;
    gerenciar_usuarios?: boolean;
  };
}

/**
 * Confere uma permissão do usuário logado - admin sempre tem acesso a
 * tudo, independente do que estiver salvo em permissions (evita o
 * próprio admin se trancar fora de uma tela por engano).
 */
export function hasPermission(
  profile: Profile | null,
  key: keyof NonNullable<Profile['permissions']>
): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  return !!profile.permissions?.[key];
}

function toProfile(user: AppUser): Profile {
  const nome = typeof user.profile?.nome === 'string' ? (user.profile.nome as string) : null;
  return {
    id: user.id,
    email: user.email,
    nome,
    role: user.is_admin ? 'admin' : 'user',
    permissions: user.permissions ?? {},
  };
}

interface AuthContextValue {
  session: string | null; // token de sessão (ou null se deslogado)
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const token = getStoredToken();
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      const { data, error } = await apiGetCurrentUser();
      if (!isMounted) return;

      if (error || !data?.user) {
        // Token expirado/inválido - limpa e volta pro login
        setStoredToken(null);
        setSession(null);
        setProfile(null);
      } else {
        setSession(token);
        setProfile(toProfile(data.user));
      }
      setIsLoading(false);
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await apiLogin(email, password);
    if (error || !data) {
      return { error: error || 'E-mail ou senha inválidos.' };
    }
    setStoredToken(data.token);
    setSession(data.token);
    setProfile(toProfile(data.user));
    return { error: null };
  };

  const signOut = async () => {
    setStoredToken(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
