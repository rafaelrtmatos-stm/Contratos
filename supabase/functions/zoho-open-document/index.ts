// Edge Function: zoho-open-document
// Chamada pelo app (autenticado) quando o corretor clica em "Editar" num
// modelo. Pede pra Zoho Office Integrator abrir aquele .docx (já público
// no bucket contract-templates) pra edição completa (fonte, negrito,
// parágrafos, tudo) - e devolve a URL do editor pra abrir num iframe.
//
// A chave de API da Zoho fica só no Vault do banco (nunca em código/env
// em texto puro) - só essa função (via service role) consegue ler.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const TEMPLATES_BUCKET = 'contract-templates';

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

    const { arquivo } = await req.json();
    if (!arquivo || typeof arquivo !== 'string') {
      return new Response(JSON.stringify({ error: 'Nome do arquivo é obrigatório.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: apikey } = await adminClient.rpc('get_vault_secret', {
      secret_name: 'zoho_office_integrator_apikey',
    });
    const { data: callbackSecret } = await adminClient.rpc('get_vault_secret', {
      secret_name: 'zoho_save_callback_secret',
    });

    if (!apikey || !callbackSecret) {
      return new Response(JSON.stringify({ error: 'Credenciais da Zoho não configuradas.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    // O bucket contract-templates é PRIVADO - getPublicUrl geraria uma URL
    // que a Zoho não conseguiria de fato baixar. Uma URL ASSINADA (válida
    // por tempo limitado) resolve isso sem precisar tornar o bucket inteiro
    // público.
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from(TEMPLATES_BUCKET)
      .createSignedUrl(arquivo, 600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: signedUrlError?.message || 'Falha ao gerar link temporário do arquivo.' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const documentUrl = signedUrlData.signedUrl;

    const saveCallbackUrl = `${supabaseUrl}/functions/v1/zoho-save-document`;

    const form = new FormData();
    form.append('apikey', apikey);
    form.append('url', documentUrl);
    form.append(
      'document_info',
      JSON.stringify({ document_id: arquivo, document_name: arquivo })
    );
    form.append(
      'user_info',
      JSON.stringify({ user_id: userData.user.id, display_name: userData.user.email || 'Corretor' })
    );
    form.append(
      'permissions',
      JSON.stringify({
        'document.export': true,
        'document.print': true,
        'document.edit': true,
        'review.comment': false,
        'review.changes.resolve': false,
        'collab.chat': false,
      })
    );
    form.append('editor_settings', JSON.stringify({ unit: 'in', language: 'pt-BR', view: 'pageview' }));
    form.append(
      'callback_settings',
      JSON.stringify({
        save_format: 'docx',
        save_url: saveCallbackUrl,
        http_method_type: 'post',
        retries: 2,
        timeout: 30000,
        save_url_params: {
          content: '$content',
          filename: '$filename',
          arquivo,
          secret: callbackSecret,
        },
      })
    );
    form.append(
      'ui_options',
      JSON.stringify({ save_button: 'show', chat_panel: 'hide', dark_mode: 'hide', file_menu: 'show' })
    );

    const zohoResponse = await fetch('https://api.office-integrator.com/writer/officeapi/v1/documents', {
      method: 'POST',
      body: form,
    });

    const zohoData = await zohoResponse.json();

    if (!zohoResponse.ok || !zohoData.document_url) {
      return new Response(
        JSON.stringify({ error: zohoData.message || zohoData.error || 'Falha ao abrir o editor da Zoho.' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    return new Response(JSON.stringify({ document_url: zohoData.document_url }), {
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
