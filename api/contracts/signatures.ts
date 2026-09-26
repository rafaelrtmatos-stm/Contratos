// Assinaturas digitais registradas DENTRO do app (corretor autenticado
// assinando pelo ContractViewer/quick-sign). Não confundir com o fluxo
// público de assinatura por link (/assinar/:token, api/assinar/[token].ts,
// src/utils/signatureLinksRepository.ts) - esse é anônimo e passa por
// RPCs do Supabase (SECURITY DEFINER), não por aqui.
//
// GET  /api/contracts/signatures?contractId=... - lista assinaturas do contrato
// POST /api/contracts/signatures?contractId=...  - grava uma assinatura

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient, requireAuth } from '../_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return handleFetch(req, res);
  if (req.method === 'POST') return handleSave(req, res);
  res.status(405).json({ error: 'Método não permitido.' });
}

async function handleFetch(req: VercelRequest, res: VercelResponse) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { contractId } = (req.query ?? {}) as { contractId?: string };
  if (!contractId) {
    res.status(400).json({ error: 'contractId é obrigatório.' });
    return;
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('contract_id', contractId)
      .order('assinado_em', { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const signatures = (data ?? []).map((row: any) => ({
      role: row.role,
      signerIndex: row.signer_index ?? undefined,
      nomeSignatario: row.nome_signatario,
      documentoSignatario: row.documento_signatario,
      assinaturaDataUrl: row.assinatura_url,
      assinadoEm: row.assinado_em,
      hashAutenticacao: row.hash_autenticacao,
      ipAssinatura: row.ip_assinatura ?? undefined,
      metadadosNavegador: row.metadados_navegador,
      meioAutenticacao: row.meio_autenticacao ?? undefined,
    }));

    res.status(200).json({ signatures });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}

async function handleSave(req: VercelRequest, res: VercelResponse) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { contractId } = (req.query ?? {}) as { contractId?: string };
  if (!contractId) {
    res.status(400).json({ error: 'contractId é obrigatório.' });
    return;
  }

  try {
    const signature = (req.body ?? {}) as Record<string, any>;
    const supabase = getAdminClient();

    // O `assinado_em` REAL gravado é o do banco (DEFAULT NOW() / trigger
    // no servidor - ver fix_assinado_em_server_authoritative.sql), nunca
    // um timestamp vindo do dispositivo de quem assina (relógio local não
    // é confiável). Por isso `assinadoEm`, se vier no payload, é ignorado.
    const { data, error } = await supabase
      .from('contract_signatures')
      .insert({
        contract_id: contractId,
        role: signature.role,
        signer_index: signature.signerIndex ?? null,
        nome_signatario: signature.nomeSignatario,
        documento_signatario: signature.documentoSignatario,
        assinatura_url: signature.assinaturaDataUrl,
        hash_autenticacao: signature.hashAutenticacao,
        ip_assinatura: signature.ipAssinatura ?? null,
        metadados_navegador: signature.metadadosNavegador,
        meio_autenticacao: signature.meioAutenticacao ?? null,
      })
      .select('assinado_em')
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ assinadoEm: data.assinado_em });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}
