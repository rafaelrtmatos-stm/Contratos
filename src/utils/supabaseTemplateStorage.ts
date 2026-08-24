import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEMPLATES_BUCKET = 'contract-templates';

/**
 * Upload de um template para Supabase Storage
 * @param arquivoNome Nome do arquivo (ex: venda_vista_assinatura_digital.docx)
 * @param arquivo Arquivo binário (Blob ou File)
 */
export async function uploadTemplate(
  arquivoNome: string,
  arquivo: File | Blob
): Promise<{ sucesso: boolean; url?: string; erro?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(TEMPLATES_BUCKET)
      .upload(arquivoNome, arquivo, {
        upsert: true, // Sobrescreve se já existe
      });

    if (error) {
      return { sucesso: false, erro: error.message };
    }

    // Gerar URL pública
    const { data: urlData } = supabase.storage
      .from(TEMPLATES_BUCKET)
      .getPublicUrl(arquivoNome);

    return { sucesso: true, url: urlData.publicUrl };
  } catch (err) {
    return { sucesso: false, erro: String(err) };
  }
}

/**
 * Download de um template do Supabase Storage
 * @param arquivoNome Nome do arquivo a recuperar
 */
export async function downloadTemplate(
  arquivoNome: string
): Promise<{ sucesso: boolean; blob?: Blob; erro?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(TEMPLATES_BUCKET)
      .download(arquivoNome);

    if (error) {
      return { sucesso: false, erro: error.message };
    }

    return { sucesso: true, blob: data as Blob };
  } catch (err) {
    return { sucesso: false, erro: String(err) };
  }
}

/**
 * Listar todos os templates disponíveis no Supabase
 */
export async function listTemplates(): Promise<{
  sucesso: boolean;
  templates?: string[];
  erro?: string;
}> {
  try {
    const { data, error } = await supabase.storage
      .from(TEMPLATES_BUCKET)
      .list();

    if (error) {
      return { sucesso: false, erro: error.message };
    }

    const templates = data.map((file) => file.name);
    return { sucesso: true, templates };
  } catch (err) {
    return { sucesso: false, erro: String(err) };
  }
}

/**
 * Deletar um template do Supabase
 */
export async function deleteTemplate(
  arquivoNome: string
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const { error } = await supabase.storage
      .from(TEMPLATES_BUCKET)
      .remove([arquivoNome]);

    if (error) {
      return { sucesso: false, erro: error.message };
    }

    return { sucesso: true };
  } catch (err) {
    return { sucesso: false, erro: String(err) };
  }
}

/**
 * Obter URL pública de um template
 */
export function getTemplateUrl(arquivoNome: string): string {
  const { data } = supabase.storage
    .from(TEMPLATES_BUCKET)
    .getPublicUrl(arquivoNome);
  return data.publicUrl;
}

/**
 * Cache local de templates para evitar múltiplos downloads
 * (usado em desenvolvimento/testing)
 */
const templateCache = new Map<string, Blob>();

/**
 * Download de template com cache
 */
export async function downloadTemplateWithCache(
  arquivoNome: string
): Promise<{ sucesso: boolean; blob?: Blob; erro?: string }> {
  // Verificar cache
  if (templateCache.has(arquivoNome)) {
    return { sucesso: true, blob: templateCache.get(arquivoNome) };
  }

  // Fazer download
  const result = await downloadTemplate(arquivoNome);

  if (result.sucesso && result.blob) {
    // Armazenar em cache
    templateCache.set(arquivoNome, result.blob);
  }

  return result;
}

/**
 * Limpar cache de templates
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}
