import { createClient } from '@supabase/supabase-js';

function isValidHttpUrl(stringToTest: string): boolean {
  try {
    const url = new URL(stringToTest);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function resolveSupabaseUrl(): { url: string; isConfigured: boolean } {
  let rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();

  if (!rawUrl) {
    return { url: 'https://placeholder.supabase.co', isConfigured: false };
  }

  // If user provided domain without protocol, e.g. "xyz.supabase.co"
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `https://${rawUrl}`;
  }

  if (isValidHttpUrl(rawUrl)) {
    return { url: rawUrl, isConfigured: true };
  }

  return { url: 'https://placeholder.supabase.co', isConfigured: false };
}

function resolveSupabaseAnonKey(): { key: string; isConfigured: boolean } {
  const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (rawKey && rawKey.length > 10 && rawKey !== 'placeholder-anon-key') {
    return { key: rawKey, isConfigured: true };
  }
  return { key: 'placeholder-anon-key', isConfigured: false };
}

const resolvedUrl = resolveSupabaseUrl();
const resolvedKey = resolveSupabaseAnonKey();

export const isSupabaseConfigured = resolvedUrl.isConfigured && resolvedKey.isConfigured;

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas ou inválidas. Configure-as no arquivo .env ou no menu Settings.'
  );
}

export const supabase = createClient(resolvedUrl.url, resolvedKey.key, {
  global: {
    headers: {
      'Accept': 'application/json',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});


