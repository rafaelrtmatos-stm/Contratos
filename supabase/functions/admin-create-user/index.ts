// Edge Function: admin-create-user
// Só pode ser chamada por um usuário autenticado com role = 'admin'.
// Usa a service_role key (variável de ambiente do Supabase, nunca exposta ao frontend)
// para criar o novo usuário via Admin API.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  // O navegador manda um preflight OPTIONS antes do POST real sempre que a
  // chamada é cross-origin (ex: contratos.rafaeltavarescorretor.com.br
  // chamando *.supabase.co). Sem responder esse preflight com os headers
  // de CORS, o navegador bloqueia a requisição real antes dela sair -
  // é exatamente o erro "No 'Access-Control-Allow-Origin' header".
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
        status: 405,
        headers: jsonHeaders,
      });
    }

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

    // Cliente com o token de quem está chamando, só para checar se é admin
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
      return new Response(JSON.stringify({ error: 'Apenas administradores podem adicionar usuários.' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const { email, password, nome } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'E-mail e senha são obrigatórios.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // Cliente admin, com privilégio total (service_role) — só existe aqui, no servidor
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_meta_data: { nome },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ user: created.user }), {
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
