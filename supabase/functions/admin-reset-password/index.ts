// Edge Function: admin-reset-password
// Só pode ser chamada por um usuário autenticado com role = 'admin'.
// Define uma NOVA senha para outro usuário (o hash antigo é substituído -
// não existe "ver" a senha atual, só sobrescrever por uma nova).

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
      return new Response(JSON.stringify({ error: 'Apenas administradores podem redefinir senhas.' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const { userId, newPassword } = await req.json();
    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ error: 'Usuário e nova senha são obrigatórios.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (String(newPassword).length < 6) {
      return new Response(JSON.stringify({ error: 'A senha precisa ter pelo menos 6 caracteres.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
