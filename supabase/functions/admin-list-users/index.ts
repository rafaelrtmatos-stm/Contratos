// Edge Function: admin-list-users
// Só pode ser chamada por um usuário autenticado com role = 'admin'.
// Usa a service_role key (nunca exposta ao frontend) para listar os
// usuários via Admin API. Nunca retorna senha - o Supabase Auth só guarda
// o hash da senha, então "ver a senha" de alguém não é possível em
// nenhuma hipótese; o que existe é redefinir (função admin-reset-password).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const { data: profile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem ver a lista de usuários.' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Pagina até 200 usuários (suficiente para o porte do sistema; ajustar
    // se um dia o número de contas passar disso)
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const users = listData.users.map((u) => ({
      id: u.id,
      email: u.email,
      nome: (u.user_metadata as any)?.nome || null,
      criadoEm: u.created_at,
      ultimoLogin: u.last_sign_in_at,
    }));

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
