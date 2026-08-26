import { supabase } from './supabaseClient';
import { ContractData } from '../types/contract';

// ============================================================
// Retry com backoff para falhas transitórias de rede
// (ex.: ERR_CONNECTION_TIMED_OUT / "Failed to fetch")
// ============================================================

function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /failed to fetch|network|timed out|timeout|err_connection/i.test(msg);
}

async function withRetry<T>(fn: () => PromiseLike<T>, retries = 3, baseDelayMs = 800): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === retries;
      if (!isNetworkError(err) || isLast) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

// ============================================================
// Mapeamento ContractData (app) <-> linha da tabela `contracts`
// ============================================================

const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

function toRow(contract: ContractData) {
  return {
    id: contract.id,
    tipo: contract.tipo,
    subcategoria: contract.subcategoria ?? null,
    titulo: contract.titulo,
    numero_contrato: contract.numeroContrato,
    status: contract.status,

    cidade_foro: contract.cidadeForo,
    uf_foro: contract.ufForo,
    cidade_assinatura: contract.cidadeAssinatura,
    uf_assinatura: contract.ufAssinatura,

    vendedor: contract.vendedor,
    comprador: contract.comprador,
    compradores_adicionais: contract.compradoresAdicionais ?? null,

    imovel: contract.imovel ?? null,
    bem_outros: contract.bemOutros ?? null,
    objeto_descricao: contract.objetoDescricao ?? null,

    valor_total: contract.valorTotal,
    valor_total_extenso: contract.valorTotalExtenso ?? null,
    venda_vista: contract.vendaVista ?? null,
    venda_parcelada: contract.vendaParcelada ?? null,
    exclusividade: contract.exclusividade ?? null,

    clausulas_extras: contract.clausulasExtras ?? null,
    modalidade_assinatura: contract.modalidadeAssinatura ?? null,
    testemunhas: {
      testemunha1: contract.testemunha1 ?? null,
      testemunha2: contract.testemunha2 ?? null,
      testemunha3: contract.testemunha3 ?? null,
    },
  };
}

function fromRow(row: any): ContractData {
  const dataBase = row.data_criacao || row.created_at;
  let diaAss: string | undefined = row.dia_assinatura;
  let mesAss: string | undefined = row.mes_extenso_assinatura;
  let anoAss: string | undefined = row.ano_assinatura;

  if ((!diaAss || !mesAss || !anoAss) && dataBase) {
    try {
      const d = new Date(dataBase);
      if (!isNaN(d.getTime())) {
        diaAss = diaAss || String(d.getDate()).padStart(2, '0');
        mesAss = mesAss || MONTH_NAMES_PT[d.getMonth()];
        anoAss = anoAss || String(d.getFullYear());
      }
    } catch {
      // fallback ignore
    }
  }

  return {
    id: row.id,
    tipo: row.tipo,
    subcategoria: row.subcategoria ?? undefined,
    titulo: row.titulo,
    numeroContrato: row.numero_contrato,
    dataCriacao: row.created_at,
    status: row.status,

    cidadeForo: row.cidade_foro,
    ufForo: row.uf_foro,
    cidadeAssinatura: row.cidade_assinatura,
    ufAssinatura: row.uf_assinatura,
    diaAssinatura: diaAss,
    mesExtensoAssinatura: mesAss,
    anoAssinatura: anoAss,

    vendedor: row.vendedor,
    comprador: row.comprador,
    compradoresAdicionais: row.compradores_adicionais ?? undefined,
    temMaisCompradores: !!(row.compradores_adicionais && row.compradores_adicionais.length),

    imovel: row.imovel ?? undefined,
    bemOutros: row.bem_outros ?? undefined,
    objetoDescricao: row.objeto_descricao ?? undefined,
    objetoIdentificacao: row.objeto_identificacao ?? undefined,
    objetoEstadoConservacao: row.objeto_estado_conservacao ?? undefined,

    valorTotal: Number(row.valor_total),
    valorTotalExtenso: row.valor_total_extenso ?? undefined,
    vendaVista: row.venda_vista ?? undefined,
    vendaParcelada: row.venda_parcelada ?? undefined,
    exclusividade: row.exclusividade ?? undefined,
    varianteExclusividade: row.variante_exclusividade ?? (row.exclusividade ? 'sem_conjuge' : undefined),

    clausulasExtras: row.clausulas_extras ?? undefined,
    modalidadeAssinatura: row.modalidade_assinatura ?? undefined,
    testemunha1: row.testemunhas?.testemunha1 ?? undefined,
    testemunha2: row.testemunhas?.testemunha2 ?? undefined,
    testemunha3: row.testemunhas?.testemunha3 ?? undefined,

    documentoStoragePath: row.documento_storage_path ?? undefined,
    documentoUrl: row.documento_url ?? undefined,

    assinaturas: [], // carregadas separadamente via fetchSignatures
  };
}

// ============================================================
// Sessão do usuário autenticado (login real via LoginScreen)
// ============================================================
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }
  return data.session;
}

// ============================================================
// CRUD de contratos
// ============================================================

export async function fetchContracts(): Promise<ContractData[]> {
  await getSession();
  const { data, error } = await withRetry(() =>
    supabase
      .from('contracts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
  );

  if (error) throw error;
  const contracts = (data ?? []).map(fromRow);

  // Carrega as assinaturas reais de cada contrato (senão o selo digital
  // fica sempre "pendente" ao recarregar/reabrir, mesmo já assinado).
  if (contracts.length > 0) {
    const { data: allSignatures, error: sigError } = await withRetry(() =>
      supabase
        .from('contract_signatures')
        .select('*')
        .in('contract_id', contracts.map((c) => c.id))
        .order('assinado_em', { ascending: true })
    );
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

  return contracts;
}

export async function saveContract(contract: ContractData): Promise<ContractData> {
  const session = await getSession();
  const row = { ...toRow(contract), owner_id: session?.user.id };

  const { data, error } = await withRetry(() =>
    supabase
      .from('contracts')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single()
  );

  if (error) throw error;

  // Sincroniza parcelas (venda parcelada)
  if (contract.vendaParcelada?.parcelas?.length) {
    await withRetry(() => supabase.from('contract_installments').delete().eq('contract_id', contract.id));
    await withRetry(() =>
      supabase.from('contract_installments').insert(
        contract.vendaParcelada!.parcelas.map((p) => ({
          contract_id: contract.id,
          numero: p.numero,
          valor: p.valor,
          data_vencimento: p.dataVencimento,
        }))
      )
    );
  }

  const persisted = fromRow(data);
  // BUG CORRIGIDO: fromRow() sempre devolve assinaturas: [] (são carregadas
  // à parte, só em fetchContracts()). Sem isso, assim que alguém assinava
  // digitalmente pelo app, o contrato em memória "esquecia" a assinatura
  // recém-registrada (mesmo já salva em contract_signatures) até a página
  // ser recarregada - por isso o PDF baixado logo em seguida mostrava
  // "Pendente de Autenticação Digital" mesmo já assinado.
  persisted.assinaturas = contract.assinaturas ?? [];
  return persisted;
}

// ============================================================
// Lixeira: exclusão só marca deleted_at (soft-delete). O contrato some
// da lista normal (fetchContracts já filtra deleted_at IS NULL), mas
// continua recuperável por até 30 dias - depois disso, o expurgo
// automático (purge_expired_trashed_contracts, agendado via pg_cron e
// também disparado de forma preguiçosa em fetchTrashedContracts) apaga
// definitivamente.
// ============================================================

export async function deleteContract(contractId: string): Promise<void> {
  await getSession();
  // Tenta soft-delete atualizando deleted_at
  const { error: softError } = await withRetry(() =>
    supabase.from('contracts').update({ deleted_at: new Date().toISOString() }).eq('id', contractId)
  );

  // Se a coluna deleted_at não existir ou falhar por schema, faz hard delete direto como fallback
  if (softError) {
    console.warn('Soft delete falhou, tentando exclusão direta:', softError);
    const { error: hardError } = await withRetry(() =>
      supabase.from('contracts').delete().eq('id', contractId)
    );
    if (hardError) throw hardError;
  }
}

export interface TrashedContract {
  contract: ContractData;
  deletedAt: string;
}

export async function fetchTrashedContracts(): Promise<TrashedContract[]> {
  await getSession();

  // Expurgo preguiçoso: aproveita a visita à lixeira pra descartar de
  // vez o que já passou de 30 dias. Não é problema se isso falhar (ex:
  // função ainda não existe no banco) - só não limpa dessa vez.
  try {
    await supabase.rpc('purge_expired_trashed_contracts');
  } catch {
    // segue mesmo assim
  }

  const { data, error } = await withRetry(() =>
    supabase.from('contracts').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
  );
  if (error) throw error;

  return (data ?? []).map((row: any) => ({ contract: fromRow(row), deletedAt: row.deleted_at }));
}

export async function restoreContract(contractId: string): Promise<void> {
  await getSession();
  const { error } = await withRetry(() =>
    supabase.from('contracts').update({ deleted_at: null }).eq('id', contractId)
  );
  if (error) throw error;
}

export async function permanentlyDeleteContract(contractId: string): Promise<void> {
  await getSession();
  const { error } = await withRetry(() => supabase.from('contracts').delete().eq('id', contractId));
  if (error) throw error;
}

// ============================================================
// Assinaturas digitais
// ============================================================

/**
 * Persiste a assinatura e retorna o `assinadoEm` REAL gravado pelo banco
 * (coluna com DEFAULT NOW() / trigger no servidor - ver
 * fix_assinado_em_server_authoritative.sql). Isso propositalmente ignora
 * qualquer `assinadoEm` que já exista no objeto `signature` recebido:
 * o horário do dispositivo de quem assina não é confiável (relógio local
 * pode ser alterado), então o servidor é sempre quem manda no timestamp
 * que acaba aparecendo no PDF/manifesto/log de evidências.
 */
export async function saveSignature(
  contractId: string,
  signature: ContractData['assinaturas'][number]
): Promise<string> {
  await getSession();
  const { data, error } = await supabase
    .from('contract_signatures')
    .insert({
      contract_id: contractId,
      role: signature.role,
      signer_index: signature.signerIndex ?? null,
      nome_signatario: signature.nomeSignatario,
      documento_signatario: signature.documentoSignatario,
      assinatura_url: signature.assinaturaDataUrl, // recomendado migrar para Storage futuramente
      hash_autenticacao: signature.hashAutenticacao,
      ip_assinatura: signature.ipAssinatura ?? null,
      metadados_navegador: signature.metadadosNavegador,
      meio_autenticacao: signature.meioAutenticacao ?? null,
    })
    .select('assinado_em')
    .single();
  if (error) throw error;
  return data.assinado_em;
}

export async function fetchSignatures(contractId: string): Promise<ContractData['assinaturas']> {
  await getSession();
  const { data, error } = await withRetry(() =>
    supabase
      .from('contract_signatures')
      .select('*')
      .eq('contract_id', contractId)
      .order('assinado_em', { ascending: true })
  );
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
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
}
