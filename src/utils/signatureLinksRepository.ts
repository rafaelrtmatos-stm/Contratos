import { supabase } from './supabaseClient';
import { ContractData } from '../types/contract';
import { generateOtpCode } from './signatureOtpUtils';

export interface CreatedSignatureLink {
  token: string;
  link: string;
  otpCode: string;
  validade: string;
}

function generateToken(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Vendedor (autenticado) gera um link de assinatura para o cliente.
 */
export async function createSignatureLink(
  contract: ContractData,
  validadeMs: number
): Promise<CreatedSignatureLink> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');

  const cpfCliente = (contract.comprador?.cpfCnpj || '').replace(/\D/g, '');
  if (cpfCliente.length < 4) {
    throw new Error('CPF/CNPJ do cliente não cadastrado no contrato.');
  }
  const clienteCpfLast4 = cpfCliente.slice(-4);

  const token = generateToken();
  const otpCode = generateOtpCode();
  const validade = new Date(Date.now() + validadeMs).toISOString();

  const { error } = await supabase.from('contract_signature_links').insert({
    contract_id: contract.id,
    token,
    otp_code: otpCode,
    vendedor_id: user.id,
    vendedor_name: contract.vendedor?.nome || user.email || 'Vendedor',
    cliente_cpf_last_4: clienteCpfLast4,
    validade,
    status: 'pending',
  });

  if (error) throw error;

  const link = `${window.location.origin}/assinar/${token}`;
  return { token, link, otpCode, validade };
}

/**
 * Cliente (anônimo) carrega o contrato através do token do link.
 */
export async function fetchContractForSignatureToken(token: string): Promise<{
  contrato: ContractData;
  clienteCpfLast4: string;
  otpCode: string;
  vendedorNome: string;
}> {
  const { data, error } = await supabase.rpc('get_contract_for_signature_token', {
    p_token: token,
  });

  if (error) throw error;
  if (!data || data.erro) {
    const mensagens: Record<string, string> = {
      link_nao_encontrado: 'Este link não foi encontrado.',
      link_expirado: 'Este link expirou. Solicite um novo ao vendedor.',
      ja_assinado: 'Este contrato já foi assinado.',
      contrato_nao_encontrado: 'Contrato não encontrado.',
    };
    throw new Error((data && mensagens[data.erro]) || 'Não foi possível carregar o contrato.');
  }

  const row = data.contrato;
  const contrato: ContractData = {
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
    vendedor: row.vendedor,
    comprador: row.comprador,
    compradoresAdicionais: row.compradores_adicionais ?? undefined,
    temMaisCompradores: !!(row.compradores_adicionais && row.compradores_adicionais.length),
    imovel: row.imovel ?? undefined,
    bemOutros: row.bem_outros ?? undefined,
    objetoDescricao: row.objeto_descricao ?? undefined,
    valorTotal: Number(row.valor_total),
    valorTotalExtenso: row.valor_total_extenso ?? undefined,
    vendaVista: row.venda_vista ?? undefined,
    vendaParcelada: row.venda_parcelada ?? undefined,
    exclusividade: row.exclusividade ?? undefined,
    clausulasExtras: row.clausulas_extras ?? undefined,
    modalidadeAssinatura: row.modalidade_assinatura ?? undefined,
    testemunha1: row.testemunhas?.testemunha1 ?? undefined,
    testemunha2: row.testemunhas?.testemunha2 ?? undefined,
    testemunha3: row.testemunhas?.testemunha3 ?? undefined,
    assinaturas: [],
  };

  return {
    contrato,
    clienteCpfLast4: data.link.clienteCpfLast4,
    otpCode: data.link.otpCode,
    vendedorNome: data.link.vendedorNome,
  };
}

/**
 * Valida os últimos 4 dígitos do CPF informados pelo cliente.
 */
export async function validateSignatureLinkCpf(token: string, cpfLast4: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('validate_signature_link_cpf', {
    p_token: token,
    p_cpf_last4: cpfLast4,
  });
  if (error) throw error;
  return !!data;
}

/**
 * Cliente confirma a assinatura digitando/colando o OTP exibido.
 */
export async function signContractViaLink(params: {
  token: string;
  otp: string;
  nomeSignatario: string;
  documentoSignatario: string;
  hashAutenticacao: string;
  ip: string;
}): Promise<{ sucesso: boolean; contractId?: string; erro?: string }> {
  const { data, error } = await supabase.rpc('sign_contract_via_link', {
    p_token: params.token,
    p_otp: params.otp,
    p_nome_signatario: params.nomeSignatario,
    p_documento_signatario: params.documentoSignatario,
    p_hash_autenticacao: params.hashAutenticacao,
    p_ip: params.ip,
  });

  if (error) throw error;
  return data;
}
