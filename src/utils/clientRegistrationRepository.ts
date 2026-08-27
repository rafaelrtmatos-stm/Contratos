import { supabase } from './supabaseClient';
import { ContractData, PartyDetailedInfo, SavedParty } from '../types/contract';
import { isValidCPF, isValidCNPJ, isValidCEP, isValidPhone, formatCPF, formatCNPJ, formatCEP, formatPhone, formatRG, toUpperCase } from './validators';

export interface ClientRegistrationData {
  tipoPessoa: 'PF' | 'PJ';
  nome: string;
  genero: string;
  nacionalidade: string;
  estadoCivil: string;
  profissao: string;
  cpfCnpj: string;
  rg: string;
  rgOrgao: string;
  telefone: string;
  telefone2?: string;
  email?: string;
  creci?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  conjuge?: {
    nome: string;
    cpf: string;
    rg: string;
    rgOrgao?: string;
    profissao?: string;
  };
  // Dados de Pessoa Jurídica (se aplicável)
  razaoSocial?: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  representanteLegal?: {
    nome: string;
    cpf: string;
    rg: string;
    cargo?: string;
  };
  observacoes?: string;
}

const LOCAL_STORAGE_SAVED_PARTIES_KEY = 'saved_parties_local_backup';
const LOCAL_STORAGE_BROKER_PHONE_KEY = 'corretor_whatsapp_phone';

/**
 * Recupera o WhatsApp do corretor salvo localmente
 */
export function getSavedBrokerPhone(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_BROKER_PHONE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Salva o WhatsApp do corretor localmente
 */
export function setSavedBrokerPhone(phone: string): void {
  try {
    const clean = phone.replace(/\D/g, '');
    localStorage.setItem(LOCAL_STORAGE_BROKER_PHONE_KEY, clean);
  } catch {
    // Ignore
  }
}

/**
 * Converte os dados do formulário de auto-cadastro para a estrutura PartyDetailedInfo
 */
export function registrationToPartyInfo(reg: ClientRegistrationData): PartyDetailedInfo {
  const fullAddress = reg.complemento && reg.complemento.trim()
    ? `${reg.endereco.trim()} - ${reg.complemento.trim()}`
    : reg.endereco.trim();

  const party: PartyDetailedInfo = {
    nome: toUpperCase(reg.nome.trim()),
    genero: reg.genero || 'M',
    nacionalidade: toUpperCase(reg.nacionalidade || 'brasileiro(a)'),
    estadoCivil: reg.estadoCivil || 'solteiro(a)',
    rg: reg.rg ? formatRG(reg.rg) : '',
    rgOrgao: toUpperCase(reg.rgOrgao || 'SSP'),
    cpfCnpj: reg.tipoPessoa === 'PJ' ? formatCNPJ(reg.cpfCnpj) : formatCPF(reg.cpfCnpj),
    endereco: toUpperCase(fullAddress),
    numero: reg.numero.trim() || 'S/N',
    bairro: toUpperCase(reg.bairro.trim()),
    cep: formatCEP(reg.cep),
    cidade: toUpperCase(reg.cidade.trim()),
    uf: toUpperCase(reg.uf.trim()),
    telefone: formatPhone(reg.telefone),
    telefone2: reg.telefone2 ? formatPhone(reg.telefone2) : undefined,
    email: reg.email ? reg.email.trim().toLowerCase() : undefined,
    creci: reg.creci ? toUpperCase(reg.creci.trim()) : undefined,
  };

  if (reg.conjuge && reg.conjuge.nome && reg.conjuge.nome.trim()) {
    party.conjuge = {
      nome: toUpperCase(reg.conjuge.nome.trim()),
      cpf: reg.conjuge.cpf ? formatCPF(reg.conjuge.cpf) : '',
      rg: reg.conjuge.rg
        ? `${formatRG(reg.conjuge.rg)}${reg.conjuge.rgOrgao ? ` ${toUpperCase(reg.conjuge.rgOrgao)}` : ''}`
        : '',
    };
  }

  return party;
}

/**
 * Busca detalhes de um contrato por ID para exibir no formulário de auto-cadastro
 */
export async function fetchContractSummaryForRegistration(contractId: string): Promise<{
  id: string;
  titulo: string;
  numeroContrato: string;
  tipo: string;
  subcategoria?: string;
  vendedorNome?: string;
  compradorNome?: string;
} | null> {
  if (!contractId) return null;

  try {
    // 1. Tentar ler do Supabase
    const { data, error } = await supabase
      .from('contracts')
      .select('id, titulo, numero_contrato, tipo, subcategoria, vendedor, comprador')
      .eq('id', contractId)
      .single();

    if (!error && data) {
      return {
        id: data.id,
        titulo: data.titulo,
        numeroContrato: data.numero_contrato,
        tipo: data.tipo,
        subcategoria: data.subcategoria ?? undefined,
        vendedorNome: (data.vendedor as any)?.nome,
        compradorNome: (data.comprador as any)?.nome,
      };
    }
  } catch (e) {
    console.warn('Erro ao buscar contrato no Supabase para auto-cadastro:', e);
  }

  // 2. Fallback: procurar no cache de contratos do localStorage
  try {
    const raw = localStorage.getItem('contracts_cache');
    if (raw) {
      const parsed: ContractData[] = JSON.parse(raw);
      const found = parsed.find((c) => c.id === contractId);
      if (found) {
        return {
          id: found.id,
          titulo: found.titulo,
          numeroContrato: found.numeroContrato,
          tipo: found.tipo,
          subcategoria: found.subcategoria,
          vendedorNome: found.vendedor?.nome,
          compradorNome: found.comprador?.nome,
        };
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Salva o auto-cadastro do cliente diretamente no Supabase:
 * 1. Executa a RPC ou grava na tabela `client_registrations`
 * 2. Salva nos contatos reutilizáveis (`saved_parties`)
 * 3. Se vinculado a um contrato, atualiza os dados da parte no contrato (`contracts`)
 */
export async function saveClientSelfRegistration(params: {
  registration: ClientRegistrationData;
  contractId?: string;
  role?: 'comprador' | 'vendedor' | 'locatario' | 'locador' | 'contratante' | string;
}): Promise<{ sucesso: boolean; party: PartyDetailedInfo; savedToSupabase: boolean; mensagem?: string }> {
  const party = registrationToPartyInfo(params.registration);
  const now = new Date().toISOString();
  let savedToSupabase = false;
  let supabaseMessage = '';

  // 1. Tentar salvar via RPC dedicada no Supabase (que possui SECURITY DEFINER para permitir escrita anônima de clientes)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('save_client_registration_direct', {
      p_registration: party,
      p_contract_id: params.contractId || null,
      p_role: params.role || 'comprador',
    });

    if (!rpcError && rpcData) {
      savedToSupabase = true;
      supabaseMessage = 'Salvo no Supabase via RPC';
      console.log('[Supabase] Auto-cadastro salvo com sucesso via RPC:', rpcData);
    } else if (rpcError) {
      console.warn('[Supabase] RPC save_client_registration_direct indisponível ou falhou, tentando escrita direta nas tabelas:', rpcError.message);
    }
  } catch (rpcErr) {
    console.warn('[Supabase] Erro ao invocar RPC save_client_registration_direct:', rpcErr);
  }

  // 2. Se a RPC não foi executada, tentar escrita direta nas tabelas do Supabase
  if (!savedToSupabase) {
    // 2.1 Gravar na tabela `client_registrations`
    try {
      const regPayload = {
        contract_id: params.contractId || null,
        role: params.role || 'comprador',
        tipo_pessoa: params.registration.tipoPessoa || 'PF',
        nome: party.nome,
        genero: party.genero || null,
        nacionalidade: party.nacionalidade || null,
        estado_civil: party.estadoCivil || null,
        profissao: params.registration.profissao || null,
        cpf_cnpj: party.cpfCnpj,
        rg: party.rg || null,
        rg_orgao: party.rgOrgao || null,
        telefone: party.telefone,
        telefone2: party.telefone2 || null,
        email: party.email || null,
        creci: party.creci || null,
        cep: party.cep,
        endereco: party.endereco,
        numero: party.numero,
        complemento: params.registration.complemento || null,
        bairro: party.bairro,
        cidade: party.cidade,
        uf: party.uf,
        conjuge: party.conjuge || null,
        dados_completos: party,
        created_at: now,
        updated_at: now,
      };

      const { error: regErr } = await supabase.from('client_registrations').insert(regPayload);
      if (!regErr) {
        savedToSupabase = true;
        supabaseMessage = 'Salvo na tabela client_registrations do Supabase';
      }
    } catch (e) {
      console.warn('[Supabase] Erro ao gravar em client_registrations:', e);
    }

    // 2.2 Gravar em `saved_parties` no Supabase (no mesmo campo/tabela de Contatos Salvos)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let ownerId = sessionData.session?.user?.id || null;

      // Se for cliente anônimo preenchendo pelo link, buscar o proprietário do contrato
      if (!ownerId && params.contractId) {
        try {
          const { data: cData } = await supabase
            .from('contracts')
            .select('owner_id')
            .eq('id', params.contractId)
            .single();
          if (cData?.owner_id) {
            ownerId = cData.owner_id;
          }
        } catch {
          // Ignorar se não puder ler o owner_id
        }
      }

      // Verificar se já existe contato com esse CPF no saved_parties
      let existingId: string | null = null;
      if (party.cpfCnpj) {
        let query = supabase.from('saved_parties').select('id').eq('cpf_cnpj', party.cpfCnpj);
        if (ownerId) {
          query = query.eq('owner_id', ownerId);
        }
        const { data: existingList } = await query.limit(1);
        if (existingList && existingList.length > 0) {
          existingId = existingList[0].id;
        }
      }

      if (existingId) {
        const { error: updatePartyErr } = await supabase
          .from('saved_parties')
          .update({
            nome: party.nome,
            data: party,
            updated_at: now,
          })
          .eq('id', existingId);

        if (!updatePartyErr) {
          savedToSupabase = true;
          console.log('[Supabase] Contato atualizado com sucesso em saved_parties:', party.nome);
        }
      } else {
        const { error: partyErr } = await supabase.from('saved_parties').insert({
          owner_id: ownerId,
          nome: party.nome,
          cpf_cnpj: party.cpfCnpj || null,
          data: party,
          created_at: now,
          updated_at: now,
        });

        if (!partyErr) {
          savedToSupabase = true;
          console.log('[Supabase] Novo contato inserido com sucesso em saved_parties:', party.nome);
        }
      }
    } catch (e) {
      console.warn('[Supabase] Erro ao gravar em saved_parties:', e);
    }

    // 2.3 Se houver contractId, atualizar o contrato no Supabase
    if (params.contractId) {
      try {
        const role = params.role || 'comprador';

        // Carregar contrato existente
        const { data: contractRow, error: fetchErr } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', params.contractId)
          .single();

        if (!fetchErr && contractRow) {
          const updatePayload: Record<string, any> = {
            updated_at: now,
          };

          const tipo = contractRow.tipo;

          // Determinar qual coluna atualizar com base no papel e tipo de contrato
          if (tipo === 'exclusividade') {
            if (role === 'contratante' || role === 'vendedor' || role === 'proprietario') {
              updatePayload.vendedor = party;
            } else {
              updatePayload.comprador = party;
            }
          } else if (tipo === 'locacao') {
            if (role === 'locador' || role === 'vendedor') {
              updatePayload.vendedor = party;
            } else {
              updatePayload.comprador = party;
            }
          } else {
            // Venda à vista ou parcelada
            if (role === 'vendedor') {
              updatePayload.vendedor = party;
            } else {
              updatePayload.comprador = party;
            }
          }

          const { error: updateErr } = await supabase
            .from('contracts')
            .update(updatePayload)
            .eq('id', params.contractId);

          if (!updateErr) {
            savedToSupabase = true;
          }
        }
      } catch (e) {
        console.warn('[Supabase] Erro ao atualizar contrato com auto-cadastro:', e);
      }
    }
  }

  // Backup em localStorage de saved_parties para cache local imediato
  try {
    const rawSaved = localStorage.getItem(LOCAL_STORAGE_SAVED_PARTIES_KEY);
    const list: SavedParty[] = rawSaved ? JSON.parse(rawSaved) : [];
    const newSaved: SavedParty = {
      id: crypto.randomUUID(),
      nome: party.nome,
      cpfCnpj: party.cpfCnpj,
      data: party,
      criadoEm: now,
    };
    list.unshift(newSaved);
    localStorage.setItem(LOCAL_STORAGE_SAVED_PARTIES_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // Ignore
  }

  // Atualizar também no cache de contratos do localStorage se existir
  if (params.contractId) {
    try {
      const rawCache = localStorage.getItem('contracts_cache');
      if (rawCache) {
        const contracts: ContractData[] = JSON.parse(rawCache);
        const idx = contracts.findIndex((c) => c.id === params.contractId);
        if (idx !== -1) {
          const c = contracts[idx];
          const role = params.role || 'comprador';
          if (c.tipo === 'exclusividade') {
            if (role === 'contratante' || role === 'vendedor' || role === 'proprietario') {
              c.vendedor = party;
            } else {
              c.comprador = party;
            }
          } else if (c.tipo === 'locacao') {
            if (role === 'locador' || role === 'vendedor') {
              c.vendedor = party;
            } else {
              c.comprador = party;
            }
          } else {
            if (role === 'vendedor') {
              c.vendedor = party;
            } else {
              c.comprador = party;
            }
          }
          localStorage.setItem('contracts_cache', JSON.stringify(contracts));
        }
      }
    } catch {
      // Ignore
    }
  }

  return {
    sucesso: true,
    party,
    savedToSupabase,
    mensagem: supabaseMessage || (savedToSupabase ? 'Dados salvos no Supabase com sucesso' : 'Salvo localmente'),
  };
}

/**
 * Busca todos os auto-cadastros de clientes direto do Supabase
 */
export async function fetchClientRegistrationsFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('client_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Erro ao buscar client_registrations:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('[Supabase] Exceção ao buscar client_registrations:', e);
    return [];
  }
}

/**
 * Gera a mensagem formatada para envio no WhatsApp do corretor/imobiliária
 */
export function buildWhatsAppNotificationMessage(params: {
  registration: ClientRegistrationData;
  contractNumber?: string;
  contractTitle?: string;
  roleLabel?: string;
}): string {
  const reg = params.registration;
  const docLabel = reg.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF';
  const docValue = reg.tipoPessoa === 'PJ' ? formatCNPJ(reg.cpfCnpj) : formatCPF(reg.cpfCnpj);
  
  let lines: string[] = [
    `✅ *NOVO AUTO-CADASTRO CONCLUÍDO!*`,
    ``,
    `Olá! Acabei de preencher meus dados cadastrais no sistema para o contrato:`,
    ``,
    `👤 *Nome:* ${toUpperCase(reg.nome)}`,
    `📄 *${docLabel}:* ${docValue}`,
    `🪪 *RG:* ${reg.rg ? `${formatRG(reg.rg)} (${toUpperCase(reg.rgOrgao || 'SSP')})` : 'Não informado'}`,
    `💍 *Estado Civil:* ${toUpperCase(reg.estadoCivil || 'Solteiro(a)')}`,
    `💼 *Profissão:* ${toUpperCase(reg.profissao || 'Não informada')}`,
    `📱 *WhatsApp:* ${formatPhone(reg.telefone)}`,
  ];

  if (reg.email) {
    lines.push(`✉️ *E-mail:* ${reg.email.toLowerCase().trim()}`);
  }

  lines.push(
    `🏠 *Endereço:* ${toUpperCase(reg.endereco)}, Nº ${reg.numero || 'S/N'}${reg.complemento ? ` - ${reg.complemento}` : ''}`,
    `📍 *Bairro/Cidade:* ${toUpperCase(reg.bairro)} - ${toUpperCase(reg.cidade)}/${toUpperCase(reg.uf)} (CEP: ${formatCEP(reg.cep)})`
  );

  if (reg.conjuge && reg.conjuge.nome && reg.conjuge.nome.trim()) {
    lines.push(
      ``,
      `💍 *Cônjuge:* ${toUpperCase(reg.conjuge.nome)} (CPF: ${formatCPF(reg.conjuge.cpf || '')})`
    );
  }

  if (params.contractNumber || params.contractTitle) {
    lines.push(
      ``,
      `📋 *Contrato:* ${params.contractNumber || ''} ${params.contractTitle ? `- ${params.contractTitle}` : ''}`,
      `📌 *Papel:* ${params.roleLabel || 'Cliente'}`
    );
  }

  lines.push(
    ``,
    `_Os dados foram salvos no sistema e já estão prontos para o contrato._`
  );

  return lines.join('\n');
}

/**
 * Cria a URL do WhatsApp para abertura direta
 */
export function createWhatsAppUrl(targetPhone: string, messageText: string): string {
  const cleanPhone = targetPhone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(messageText);

  if (cleanPhone) {
    // Se o número não começar com código do país (55), adiciona 55
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullPhone}?text=${encodedText}`;
  }

  // Fallback se não tiver telefone do corretor definido: abre WhatsApp geral para escolher contato
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Gera a URL completa para o link de auto-cadastro do cliente
 */
export function generateClientRegistrationLink(params: {
  contractId?: string;
  role?: string;
  brokerPhone?: string;
  contractNumber?: string;
}): string {
  const origin = window.location.origin;
  const searchParams = new URLSearchParams();

  if (params.contractId) searchParams.set('c', params.contractId);
  if (params.role) searchParams.set('r', params.role);
  if (params.brokerPhone) {
    const clean = params.brokerPhone.replace(/\D/g, '');
    if (clean) searchParams.set('tel', clean);
  }
  if (params.contractNumber) searchParams.set('num', params.contractNumber);

  const query = searchParams.toString();
  return `${origin}/cadastro-cliente${query ? `?${query}` : ''}`;
}
