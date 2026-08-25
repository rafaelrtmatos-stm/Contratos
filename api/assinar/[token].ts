// Vercel Serverless Function - injeta o NOME DO CLIENTE no <title> e nas
// meta tags og:title/og:description do index.html ANTES de servir, pra
// quando o corretor cola o link no WhatsApp (ou qualquer app que gera
// prévia de link), a prévia mostre o nome do cliente em vez do título
// genérico "Contratos".
//
// Necessário porque WhatsApp/redes sociais leem o HTML puro (não rodam
// JavaScript), então mudar o título via React não afeta a prévia - só
// alterando o HTML antes de sair do servidor resolve.
//
// Rota pública continua sendo /assinar/:token (ver vercel.json) - só a
// resposta passa por aqui antes de ir pro navegador; o app React
// continua carregando normalmente depois (mesmo JS/CSS do build).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';

  let clienteNome = '';
  let objetoContrato = '';

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY as string;

    if (supabaseUrl && supabaseKey && token) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase.rpc('get_contract_for_signature_token', { p_token: token });

      if (data && !data.erro && data.contrato) {
        const contrato = data.contrato;
        // Exclusividade: cliente = vendedor (contratante/proprietário).
        // Venda à vista / parcelada: cliente = comprador.
        const isExcl = contrato.tipo === 'exclusividade';
        clienteNome = (isExcl ? contrato.vendedor?.nome : contrato.comprador?.nome) || '';

        // Objeto do contrato: nome do empreendimento + lote/quadra quando
        // existir (venda à vista/parcelada de lote), senão a descrição
        // livre do bem (bemOutros/objetoDescricao), senão cai pro título
        // genérico do contrato (ex: "Contrato de Exclusividade").
        const imovel = contrato.imovel;
        if (imovel?.nomeEmpreendimento) {
          const partes = [imovel.nomeEmpreendimento];
          if (imovel.numeroLote) partes.push(`Lote ${imovel.numeroLote}`);
          if (imovel.numeroQuadra) partes.push(`Quadra ${imovel.numeroQuadra}`);
          objetoContrato = partes.join(' - ');
        } else if (contrato.bemOutros?.descricao) {
          objetoContrato = contrato.bemOutros.descricao;
        } else if (contrato.objetoDescricao) {
          objetoContrato = contrato.objetoDescricao;
        } else if (contrato.titulo) {
          objetoContrato = contrato.titulo;
        }
      }
    }
  } catch {
    // Se der qualquer erro (token inválido, expirado, Supabase fora do ar),
    // segue com o título genérico - não bloqueia o carregamento da página.
  }

  const title = clienteNome ? `Contrato - ${clienteNome}` : 'Assinatura de Contrato';
  const description = clienteNome
    ? objetoContrato
      ? `${clienteNome}, você tem um contrato aguardando revisão e assinatura: ${objetoContrato}.`
      : `${clienteNome}, você tem um contrato aguardando revisão e assinatura.`
    : 'Revise e assine seu contrato com segurança.';

  let html: string;
  try {
    const indexPath = join(process.cwd(), 'dist', 'index.html');
    html = readFileSync(indexPath, 'utf-8');
  } catch {
    // dist/index.html não encontrado (ambiente de build diferente do
    // esperado) - devolve erro simples em vez de quebrar sem resposta.
    res.status(500).send('Erro ao carregar a página.');
    return;
  }

  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(
    /<meta property="og:title" content=".*?"/,
    `<meta property="og:title" content="${escapeHtml(title)}"`
  );
  html = html.replace(
    /<meta property="og:description" content=".*?"/,
    `<meta property="og:description" content="${escapeHtml(description)}"`
  );
  html = html.replace(
    /<meta name="description" content=".*?"/,
    `<meta name="description" content="${escapeHtml(description)}"`
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
