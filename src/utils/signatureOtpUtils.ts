/**
 * Sistema de OTP para assinatura digital de contratos
 * Adaptado do fluxo do CRM: https://github.com/rafaelrtmatos-stm/crm
 * 
 * Fluxo:
 * 1. Gera código OTP de 6 dígitos
 * 2. Valida identidade (4 últimos dígitos do CPF/CNPJ)
 * 3. Usuário digita o OTP
 * 4. Validamos o código
 * 5. Geramos ID único de assinatura
 * 6. Criamos carimbo de auditoria
 * 7. Inserimos carimbo no DOCX
 * 8. Salvamos no Supabase
 */

import { supabase } from './supabaseClient';

const CODE_TTL_MINUTES = 30; // Código válido por 30 minutos
const MAX_ATTEMPTS = 5; // Máximo de tentativas erradas

/**
 * Gera um código OTP de 6 dígitos (ex: "482913")
 */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * SHA-256 em hex de qualquer texto
 */
export async function sha256Hex(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Gera um ID EXCLUSIVO de assinatura (XXXX-XXXX-XXXX-XXXX em hex maiúsculo)
 * Usado no carimbo digital e nunca reutilizado
 */
export function generateSignatureId(): string {
  const bytes = new Uint8Array(8);
  window.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  return hex.match(/.{1,4}/g)!.join('-');
}

export interface GeneratedOtp {
  code: string; // Código em texto puro (mostrar ao operador)
  expiresAt: string;
  contractId: string;
}

/**
 * Gera novo OTP para um contrato
 * Invalida códigos anteriores ainda ativos
 */
export async function createVerificationCode(
  contractId: string,
  ttlMinutes: number = CODE_TTL_MINUTES
): Promise<GeneratedOtp> {
  // Invalidar códigos anteriores não utilizados (ignora se a tabela não existir)
  try {
    await supabase
      .from('verification_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('contract_id', contractId)
      .eq('is_used', false);
  } catch {
    // Tabela pode não existir ainda - segue o fluxo mesmo assim
  }

  const code = generateOtpCode();
  const codeHash = await sha256Hex(code);
  const safeTtl = ttlMinutes > 0 ? ttlMinutes : CODE_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + safeTtl * 60 * 1000).toISOString();

  // Salvar hash do código (não o código em texto puro!)
  try {
    const { error } = await supabase.from('verification_codes').insert({
      contract_id: contractId,
      code_hash: codeHash,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      is_used: false,
      attempts: 0,
    });

    if (error && error.code !== 'PGRST301') throw error; // Ignorar erro de tabela não existente
  } catch (err: any) {
    if (err?.code && err.code !== 'PGRST301') throw err;
  }

  return { code, expiresAt, contractId };
}

export type OtpValidationResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_used' | 'wrong_code' | 'too_many_attempts' };

/**
 * Valida o código digitado pelo usuário
 * Retorna { ok: true } se válido
 */
export async function validateVerificationCode(contractId: string, inputCode: string): Promise<OtpValidationResult> {
  try {
    let pending: any = null;
    try {
      const result = await supabase
        .from('verification_codes')
        .select('*')
        .eq('contract_id', contractId)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      pending = result.data;
    } catch {
      pending = null;
    }

    if (!pending) return { ok: false, reason: 'not_found' };

    if ((pending.attempts || 0) >= MAX_ATTEMPTS) {
      return { ok: false, reason: 'too_many_attempts' };
    }

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      return { ok: false, reason: 'expired' };
    }

    const inputHash = await sha256Hex(inputCode);
    if (inputHash !== pending.code_hash) {
      try {
        await supabase
          .from('verification_codes')
          .update({ attempts: (pending.attempts || 0) + 1 })
          .eq('id', pending.id);
      } catch {
        // Ignora falha ao registrar tentativa
      }
      return { ok: false, reason: 'wrong_code' };
    }

    // Código correto - marcar como usado
    try {
      await supabase
        .from('verification_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', pending.id);
    } catch {
      // Ignora falha ao marcar como usado
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Erro ao validar código OTP:', error);
    return { ok: false, reason: 'not_found' };
  }
}

/**
 * Valida os 4 últimos dígitos do CPF/CNPJ do usuário
 * Segunda camada de segurança antes de permitir digitação do OTP
 */
export function validateDocumentLastDigits(cpfCnpj: string, providedDigits: string): boolean {
  // Remover pontuação
  const clean = cpfCnpj.replace(/\D/g, '');
  
  if (clean.length < 4) return false;
  
  const lastFour = clean.slice(-4);
  return lastFour === providedDigits;
}

/**
 * Carimbo de auditoria digital (dados que serão impressos no DOCX)
 */
export interface AuditStamp {
  signatureId: string; // ID EXCLUSIVO da assinatura
  nomeAssinante: string;
  cpfCnpj: string;
  dataAssinatura: string; // ISO string
  horaAssinatura: string; // HH:mm:ss
  hashDocumento: string; // SHA-256 do documento ANTES desta assinatura (conteúdo que o signatário leu/aceitou) - é este valor que fica salvo como hashAutenticacao
  hashDocumentoDepois?: string; // SHA-256 do documento já COM esta assinatura embutida - permite reconferir o documento final baixado/assinado e provar que nada foi alterado depois
  ipAssinatura: string;
  geolocalizacao?: string; // texto pronto pra exibir, ex: "Santarém, PA, Brasil (-2.43810, -54.70830) — aprox. por IP"
  userAgent?: string;
  meioAutenticacao?: string; // ex: "Login e senha (revalidados via Supabase Auth)"
}

/**
 * Cria um carimbo de auditoria com dados da assinatura
 *
 * @param documentText Texto do documento ANTES desta assinatura (o que o signatário está de fato aceitando) - vira hashDocumento
 * @param documentTextDepois Opcional: texto do documento já COM esta assinatura embutida - vira hashDocumentoDepois (par antes/depois)
 */
export async function createAuditStamp(
  nomeAssinante: string,
  cpfCnpj: string,
  documentText: string,
  ipAssinatura?: string,
  userAgent?: string,
  meioAutenticacao?: string,
  geolocalizacao?: string,
  documentTextDepois?: string
): Promise<AuditStamp> {
  const signatureId = generateSignatureId();
  const hashDocumento = await sha256Hex(documentText);
  const hashDocumentoDepois = documentTextDepois ? await sha256Hex(documentTextDepois) : undefined;
  const now = new Date();

  return {
    signatureId,
    nomeAssinante,
    cpfCnpj,
    dataAssinatura: now.toISOString(),
    horaAssinatura: now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }),
    hashDocumento,
    hashDocumentoDepois,
    ipAssinatura: ipAssinatura || 'N/A',
    geolocalizacao,
    userAgent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
    meioAutenticacao,
  };
}

/**
 * Obtém IP público do cliente (melhor esforço)
 */
export async function getClientIpAddress(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'N/A';
  } catch (error) {
    console.warn('Erro ao obter IP do cliente:', error);
    return 'N/A';
  }
}

/**
 * Geolocalização capturada no momento da assinatura (melhor esforço)
 */
export interface GeoLocationInfo {
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  cidade?: string;
  regiao?: string;
  pais?: string;
  fonte: 'gps' | 'ip' | 'indisponivel';
}

/**
 * Tenta o GPS do navegador (precisa de permissão do usuário). Nunca lança
 * erro nem trava o fluxo de assinatura - se negar ou demorar, resolve null
 * e quem chamou cai pro fallback por IP.
 */
function tryBrowserGeolocation(): Promise<GeoLocationInfo | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (result: GeoLocationInfo | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    // Timeout curto pra não segurar a assinatura esperando o usuário
    // decidir a permissão - se demorar, segue pro fallback por IP.
    const timeoutId = setTimeout(() => finish(null), 4000);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeoutId);
          finish({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : undefined,
            fonte: 'gps',
          });
        },
        () => {
          clearTimeout(timeoutId);
          finish(null); // permissão negada ou erro - segue pro fallback
        },
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
      );
    } catch {
      clearTimeout(timeoutId);
      finish(null);
    }
  });
}

/**
 * Fallback: geolocalização aproximada a partir do IP público (sem precisar
 * de permissão do usuário). Serviço gratuito, sem chave de API.
 */
async function tryIpGeolocation(): Promise<GeoLocationInfo> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    if (data?.error) throw new Error(data.reason || 'Erro no serviço de geolocalização por IP');
    return {
      latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
      longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
      cidade: data.city || undefined,
      regiao: data.region || undefined,
      pais: data.country_name || undefined,
      fonte: 'ip',
    };
  } catch (error) {
    console.warn('Erro ao obter geolocalização por IP:', error);
    return { fonte: 'indisponivel' };
  }
}

/**
 * Geolocalização da assinatura: tenta GPS do navegador primeiro (mais
 * preciso, requer permissão), e cai pra geolocalização aproximada por IP
 * se o usuário negar/não responder. Nunca lança erro - pior caso, retorna
 * fonte: 'indisponivel'.
 */
export async function getClientGeolocation(): Promise<GeoLocationInfo> {
  const gps = await tryBrowserGeolocation();
  if (gps) return gps;
  return tryIpGeolocation();
}

/**
 * Formata a geolocalização pra exibição no Log de Evidências / carimbo.
 * Ex: "Santarém, PA, Brasil (-2.43810, -54.70830) — GPS"
 */
export function formatGeoLocation(geo: GeoLocationInfo | null | undefined): string {
  if (!geo || geo.fonte === 'indisponivel') return 'Localização não capturada';

  const partesLocal = [geo.cidade, geo.regiao, geo.pais].filter(Boolean);
  const local = partesLocal.length > 0 ? partesLocal.join(', ') : null;
  const coords =
    geo.latitude != null && geo.longitude != null
      ? `${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)}`
      : null;
  const origem = geo.fonte === 'gps' ? 'GPS' : 'aprox. por IP';

  if (local && coords) return `${local} (${coords}) — ${origem}`;
  if (coords) return `${coords} — ${origem}`;
  if (local) return `${local} — ${origem}`;
  return 'Localização não capturada';
}

/**
 * Formata carimbo para texto exibível no DOCX
 * Exemplo: "Assinado digitalmente por: João Silva (CPF 123.456.789-00) em 24/08/2026 às
 * 14:30:00 (IP: 192.168.1.1) via Login e senha (ID: ABCD-1234-EF56-7890)"
 */
export function formatAuditStampText(stamp: AuditStamp): string {
  const dataFormatada = new Date(stamp.dataAssinatura).toLocaleDateString('pt-BR');
  const meio = stamp.meioAutenticacao ? ` via ${stamp.meioAutenticacao}` : '';
  return `Assinado digitalmente por: ${stamp.nomeAssinante} (${stamp.cpfCnpj}) em ${dataFormatada} às ${stamp.horaAssinatura}${meio} (ID: ${stamp.signatureId})`;
}

export interface SignatureValidationResult {
  encontrado: boolean;
  erro?: string;
  nomeSignatario?: string;
  papel?: string;
  assinadoEm?: string;
  numeroContrato?: string;
  tipoContrato?: string;
  hashCompleto?: string;
}

/**
 * Valida publicamente um código de assinatura (o ID de 16 caracteres
 * impresso no selo/QR Code do documento). Usado pela página pública
 * /validar - qualquer pessoa com o código pode conferir autenticidade,
 * sem precisar estar logada.
 */
export async function validateSignatureCode(code: string): Promise<SignatureValidationResult> {
  try {
    const { data, error } = await supabase.rpc('validate_signature_code', { p_code: code });
    if (error || !data) {
      return { encontrado: false, erro: 'erro_consulta' };
    }
    return data as SignatureValidationResult;
  } catch {
    return { encontrado: false, erro: 'erro_consulta' };
  }
}
