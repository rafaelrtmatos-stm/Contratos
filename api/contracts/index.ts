// Endpoint de dados de contratos - substitui o acesso direto do
// front-end a `supabase.auth.getSession()` + `supabase.from('contracts')`
// (ver comentário em src/utils/authContext.tsx). Usa a service role key
// (bypassa RLS) e autoriza via JWT do login local, no mesmo padrão de
// api/auth/_shared.ts.
//
// GET    /api/contracts        - lista contratos ativos (com assinaturas)
// POST   /api/contracts        - cria/atualiza um contrato (upsert)
// DELETE /api/contracts?id=... - soft-delete (envia pra lixeira)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminClient, requireAuth, requirePermission } from '../_shared.js';
import { toRow, fromRow } from './_mapping.js';
import type { ContractData } from '../../src/types/contract.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return handleList(req, res);
  if (req.method === 'POST') return handleSave(req, res);
  if (req.method === 'DELETE') return handleSoftDelete(req, res);
  res.status(405).json({ error: 'Método não permitido.' });
}

async function handleList(req: VercelRequest, res: VercelResponse) {
  const payload = requireAuth(req, res);
  if (!payload) return;

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const contracts = (data ?? []).map(fromRow);

    // Carrega as assinaturas reais de cada contrato (senão o selo digital
    // fica sempre "pendente" no front, mesmo já assinado - ver
    // comentário original em contractsRepository.ts).
    if (contracts.length > 0) {
      const { data: allSignatures, error: sigError } = await supabase
        .from('contract_signatures')
        .select('*')
        .in('contract_id', contracts.map((c) => c.id))
        .order('assinado_em', { ascending: true });

      if (!sigError && allSignatures) {
        const byContract = new Map<string, ContractData['assinaturas']>();
        for (const row of allSignatures as any[]) {
          const sig = {
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
          };
          const list = byContract.get(row.contract_id) ?? [];
          list.push(sig);
          byContract.set(row.contract_id, list);
        }
        for (const c of contracts) {
          c.assinaturas = byContract.get(c.id) ?? [];
        }
      }
    }

    res.status(200).json({ contracts });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}

async function handleSave(req: VercelRequest, res: VercelResponse) {
  const payload = await requirePermission(req, res, 'gerenciar_contratos');
  if (!payload) return;

  try {
    const contract = (req.body ?? {}) as ContractData;
    if (!contract.id) {
      res.status(400).json({ error: 'Contrato sem id.' });
      return;
    }

    const supabase = getAdminClient();
    // ATENÇÃO: owner_id historicamente guardava o auth.uid() de uma sessão
    // real do Supabase Auth (usado por RLS em várias tabelas/políticas de
    // Storage - ver sql/migrations/storage_rls_per_user.sql e
    // create_contract_documents.sql). payload.sub é o id de app_users
    // (login local), um UUID de outra tabela - gravá-lo aqui como se fosse
    // um auth.uid() quebraria qualquer política que compare owner_id com
    // auth.uid() (inclusive checagem de admin por public.profiles). Por
    // ora deixo owner_id como estava (não sobrescrevo) até essa modelagem
    // de "dono do contrato" ser revista para o novo sistema de login -
    // ver observação que mandei sobre isso na resposta.
    const row = toRow(contract);

    const { data, error } = await supabase.from('contracts').upsert(row, { onConflict: 'id' }).select().single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    // Sincroniza parcelas (venda parcelada)
    if (contract.vendaParcelada?.parcelas?.length) {
      await supabase.from('contract_installments').delete().eq('contract_id', contract.id);
      const { error: instError } = await supabase.from('contract_installments').insert(
        contract.vendaParcelada.parcelas.map((p) => ({
          contract_id: contract.id,
          numero: p.numero,
          valor: p.valor,
          data_vencimento: p.dataVencimento,
        }))
      );
      if (instError) {
        res.status(500).json({ error: instError.message });
        return;
      }
    }

    const persisted = fromRow(data);
    // Mesmo BUG CORRIGIDO documentado no contractsRepository.ts original:
    // fromRow() sempre devolve assinaturas: [] (carregadas à parte). Sem
    // isso, o corretor "perdia" a assinatura recém-registrada em memória
    // até recarregar a página.
    persisted.assinaturas = contract.assinaturas ?? [];

    res.status(200).json({ contract: persisted });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}

async function handleSoftDelete(req: VercelRequest, res: VercelResponse) {
  const payload = await requirePermission(req, res, 'excluir_contratos');
  if (!payload) return;

  const { id } = (req.query ?? {}) as { id?: string };
  if (!id) {
    res.status(400).json({ error: 'id é obrigatório.' });
    return;
  }

  try {
    const supabase = getAdminClient();
    const { error: softError } = await supabase
      .from('contracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    // Se a coluna deleted_at não existir ou falhar por schema, faz hard
    // delete direto como fallback (mesmo comportamento do repository
    // original no front-end).
    if (softError) {
      console.warn('Soft delete falhou, tentando exclusão direta:', softError);
      const { error: hardError } = await supabase.from('contracts').delete().eq('id', id);
      if (hardError) {
        res.status(500).json({ error: hardError.message });
        return;
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro interno.' });
  }
}
