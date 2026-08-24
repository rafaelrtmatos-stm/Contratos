// Edge Function: convert-docx-to-pdf
// Converte um .docx (já preenchido com os dados do contrato) em PDF usando
// o serviço externo iLoveAPI (Office to PDF), que preserva fielmente fonte,
// espaçamento, indentação e layout de tabela do template Word original —
// ao contrário da rota antiga (mammoth -> HTML -> jsPDF), que descartava
// a maior parte da formatação.
//
// Chave da API fica só aqui no servidor (Supabase secret), nunca no frontend.
// Configurar com: supabase secrets set ILOVEAPI_PUBLIC_KEY=xxxx

const ILOVEAPI_BASE = 'https://api.ilovepdf.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

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

    const publicKey = Deno.env.get('ILOVEAPI_PUBLIC_KEY');
    if (!publicKey) {
      return new Response(JSON.stringify({ error: 'ILOVEAPI_PUBLIC_KEY não configurada no servidor.' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const { docxBase64, filename } = await req.json();
    if (!docxBase64) {
      return new Response(JSON.stringify({ error: 'docxBase64 é obrigatório.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    const safeFilename = (filename || 'contrato.docx').replace(/[^\w.\-]/g, '_');

    // 1) Autenticar (JWT self-signed a partir da public_key)
    const authRes = await fetch(`${ILOVEAPI_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_key: publicKey }),
    });
    if (!authRes.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao autenticar no iLoveAPI.' }), {
        status: 502,
        headers: jsonHeaders,
      });
    }
    const { token } = await authRes.json();

    // 2) Start task (ferramenta officepdf: Word/Excel/PowerPoint -> PDF)
    const startRes = await fetch(`${ILOVEAPI_BASE}/start/officepdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!startRes.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao iniciar tarefa no iLoveAPI.' }), {
        status: 502,
        headers: jsonHeaders,
      });
    }
    const { server, task } = await startRes.json();

    // 3) Upload do arquivo
    const docxBytes = base64ToUint8Array(docxBase64);
    const uploadForm = new FormData();
    uploadForm.append('task', task);
    uploadForm.append(
      'file',
      new Blob([docxBytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      safeFilename
    );

    const uploadRes = await fetch(`https://${server}/v1/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: uploadForm,
    });
    if (!uploadRes.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao enviar o arquivo ao iLoveAPI.' }), {
        status: 502,
        headers: jsonHeaders,
      });
    }
    const { server_filename } = await uploadRes.json();

    // 4) Processar (converter para PDF)
    const processRes = await fetch(`https://${server}/v1/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        tool: 'officepdf',
        files: [{ server_filename, filename: safeFilename }],
      }),
    });
    if (!processRes.ok) {
      const errBody = await processRes.text();
      return new Response(JSON.stringify({ error: `Falha ao converter no iLoveAPI: ${errBody}` }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    // 5) Download do PDF resultante
    const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!downloadRes.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao baixar o PDF do iLoveAPI.' }), {
        status: 502,
        headers: jsonHeaders,
      });
    }
    const pdfBytes = new Uint8Array(await downloadRes.arrayBuffer());

    return new Response(JSON.stringify({ pdfBase64: uint8ArrayToBase64(pdfBytes) }), {
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
