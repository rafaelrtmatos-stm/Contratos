// Edge Function: admin-update-user-permissions
// Só pode ser chamada por um usuário autenticado com role = 'admin'.
// Atualiza as permissões (o que o usuário pode ver/fazer no sistema) e,
// opcionalmente, o papel (role) de outro usuário. Nunca mexe em senha
// ou e-mail - isso é responsabilidade de admin-reset-password.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const PERMISSION_KEYS = [
  'ver_financeiro',
  'gerenciar_contratos',
  'excluir_contratos',
  'gerenciar_templates',
  'gerenciar_usuarios',
];

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
      return new Response(JSON.stringify({ error: 'Apenas administradores podem editar permissões.' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const { userId, permissions, role } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Usuário é obrigatório.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // Nunca deixa o próprio admin se rebaixar sem querer (evita ficar sem
    // nenhum admin no sistema por engano).
    if (userId === userData.user.id && role && role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Você não pode remover seu próprio acesso de administrador.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const update: Record<string, unknown> = {};
    if (permissions && typeof permissions === 'object') {
      const sanitized: Record<string, boolean> = {};
      for (const key of PERMISSION_KEYS) {
        if (key in permissions) sanitized[key] = !!permissions[key];
      }
      update.permissions = sanitized;
    }
    if (role === 'admin' || role === 'user') {
      update.role = role;
    }

    if (Object.keys(update).length === 0) {
      return new Response(JSON.stringify({ error: 'Nada para atualizar.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Faz merge com as permissões já existentes (não sobrescreve chaves
    // que não vieram no pedido).
    if (update.permissions) {
      const { data: current } = await adminClient
        .from('profiles')
        .select('permissions')
        .eq('id', userId)
        .single();
      update.permissions = { ...(current?.permissions || {}), ...(update.permissions as object) };
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update(update)
      .eq('id', userId);

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
