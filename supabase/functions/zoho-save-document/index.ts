// Edge Function: zoho-save-document
// Endpoint PUBLICO (a Zoho chama direto, sem o token de login do app) -
// por isso a validacao de seguranca aqui e o "secret" que a gente mesmo
// gerou e mandou junto na hora de abrir o documento (zoho-open-document),
// conferido contra o mesmo valor guardado no Vault. Sem o secret batendo,
// a requisicao e recusada.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TEMPLATES_BUCKET = 'contract-templates';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Metodo nao permitido.' }), { status: 405, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const formData = await req.formData();
    const secretRecebido = formData.get('secret');
    const arquivo = formData.get('arquivo');
    const content = formData.get('content');

    const { data: secretEsperado } = await adminClient.rpc('get_vault_secret', {
      secret_name: 'zoho_save_callback_secret',
    });

    if (!secretEsperado || secretRecebido !== secretEsperado) {
      return new Response(JSON.stringify({ error: 'Assinatura invalida.' }), { status: 403, headers: corsHeaders });
    }

    if (!arquivo || typeof arquivo !== 'string') {
      return new Response(JSON.stringify({ error: 'Nome do arquivo ausente.' }), { status: 400, headers: corsHeaders });
    }

    if (!(content instanceof File) && !(content instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'Conteudo do documento ausente.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { error: uploadError } = await adminClient.storage
      .from(TEMPLATES_BUCKET)
      .upload(arquivo, content, {
        upsert: true,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
