import { supabase } from './supabaseClient';

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
        // Forçar o mimetype correto de .docx: sem isso, o Supabase usa o
        // `type` que o navegador atribuiu ao File/Blob de origem, que às
        // vezes vem errado (ex: text/plain) dependendo de como o arquivo
        // foi selecionado/gerado - foi o que corrompeu o mimetype de
        // venda_vista_assinatura_manual_2_testemunhas.docx no bucket.
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Sem isso, o Supabase (e o navegador) mantinham o Cache-Control
        // padrão de 1h no objeto - um corretor reenviava um template
        // corrigido (ex: bloco de testemunhas), via "sucesso!" na tela, mas
        // o PRÓXIMO download (mesmo depois de clearTemplateCache() limpar o
        // cache em memória do app) ainda vinha com os bytes ANTIGOS do
        // arquivo, porque o navegador servia a resposta HTTP cacheada em
        // vez de baixar de novo. cacheControl: '0' garante que toda
        // atualização de matriz fica visível imediatamente.
        cacheControl: '0',
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
  // Busca pela URL pública com "cache buster" + cache: 'no-store': garante
  // que uma matriz reenviada (ex: correção do bloco de testemunhas) aparece
  // no PRÓXIMO download, mesmo que o navegador já tenha cacheado a resposta
  // HTTP de uma tentativa anterior no mesmo dia. O bucket é público (ver
  // UPLOAD_TEMPLATES_GUIDE.md), então dá pra usar a URL pública direto em
  // vez do método autenticado do SDK, que não expõe opção de bypass de cache.
  try {
    const { data: urlData } = supabase.storage.from(TEMPLATES_BUCKET).getPublicUrl(arquivoNome);
    const bustedUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    const res = await fetch(bustedUrl, { cache: 'no-store' });
    if (res.ok) {
      return { sucesso: true, blob: await res.blob() };
    }
  } catch (err) {
    console.warn(`Download direto (cache-busted) de ${arquivoNome} falhou, tentando SDK...`, err);
  }

  try {
    const { data, error } = await supabase.storage
      .from(TEMPLATES_BUCKET)
      .download(arquivoNome);

    if (!error && data) {
      return { sucesso: true, blob: data as Blob };
    }
  } catch (err) {
    console.warn(`Tentativa de carregar template ${arquivoNome} do Supabase falhou, buscando localmente...`, err);
  }

  // Fallback local: busca da pasta /templates/ servida estaticamente
  try {
    const localRes = await fetch(`/templates/${encodeURIComponent(arquivoNome)}`);
    if (localRes.ok) {
      const blob = await localRes.blob();
      return { sucesso: true, blob };
    }
  } catch (localErr) {
    console.error(`Erro ao carregar template local ${arquivoNome}:`, localErr);
  }

  return { sucesso: false, erro: `Template ${arquivoNome} não encontrado no Supabase nem localmente.` };
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
