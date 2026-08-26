// Edge Function: admin-edit-user
// Só pode ser chamada por um usuário autenticado com role = 'admin'.
// Duas ações: 'rename' (edita o nome exibido) e 'delete' (remove o
// usuário por completo - Auth + linha em profiles). Não mexe em senha
// (admin-reset-password) nem em permissões (admin-update-user-permissions).

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

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem editar usuários.' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const { action, userId, nome } = await req.json();
    if (!action || !userId) {
      return new Response(JSON.stringify({ error: 'Ação e usuário são obrigatórios.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // Nunca deixa o admin apagar/rebaixar a própria conta por engano -
    // ficaria sem nenhum admin no sistema.
    if (userId === userData.user.id && action === 'delete') {
      return new Response(JSON.stringify({ error: 'Você não pode excluir sua própria conta.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === 'rename') {
      if (!nome || !nome.trim()) {
        return new Response(JSON.stringify({ error: 'Nome não pode ficar vazio.' }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      // Atualiza nos dois lugares: user_metadata (Auth) e profiles (banco) -
      // o app lê de profiles.nome, mas o metadata do Auth também guarda uma
      // cópia (usada em algumas telas antigas) - mantém os dois em sincronia.
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { nome: nome.trim() },
      });
      if (authUpdateError) {
        return new Response(JSON.stringify({ error: authUpdateError.message }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const { error: profileUpdateError } = await adminClient
        .from('profiles')
        .update({ nome: nome.trim() })
        .eq('id', userId);
      if (profileUpdateError) {
        return new Response(JSON.stringify({ error: profileUpdateError.message }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    }

    if (action === 'delete') {
      // Remove primeiro a linha em profiles (evita ficar um perfil órfão
      // se por algum motivo a exclusão do Auth falhar no meio do caminho),
      // depois a conta de fato no Auth.
      const { error: profileDeleteError } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (profileDeleteError) {
        return new Response(JSON.stringify({ error: profileDeleteError.message }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        return new Response(JSON.stringify({ error: authDeleteError.message }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: 'Ação desconhecida.' }), {
      status: 400,
      headers: jsonHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
