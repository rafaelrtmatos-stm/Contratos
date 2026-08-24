/**
 * Sistema de salvamento de contratos em DOCX no Supabase Storage
 * Cada contrato salvo = cópia com dados + assinatura/carimbo
 */

import { supabase } from './supabaseClient';
import { ContractData } from '../types/contract';

const DOCUMENTS_BUCKET = 'contract-documents';
// Documento .docx salvo pelo corretor (download depois de assinar)
const BROKER_FOLDER = 'contratos';
// PDF salvo automaticamente quando o CLIENTE assina pelo link
const CLIENT_FOLDER = 'clientes';

interface SavedDocument {
  id: string;
  contractId: string;
  fileName: string;
  url: string;
  size: number;
  savedAt: string;
}

/**
 * Faz upload do DOCX preenchido e registra no Supabase
 */
export async function saveContractDocumentToSupabase(
  contractId: string,
  fileName: string,
  docxBuffer: ArrayBuffer,
  metadata?: {
    tipo?: string;
    vendedor?: string;
    comprador?: string;
    valor?: number;
  }
): Promise<SavedDocument> {
  try {
    // 1. Validar buffer
    if (!docxBuffer || docxBuffer.byteLength === 0) {
      throw new Error('DOCX buffer vazio');
    }

    // 2. Definir path no storage
    // Formato: contratos/{contractId}/{timestamp}_{fileName}
    const timestamp = Date.now();
    const filePath = `${BROKER_FOLDER}/${contractId}/${timestamp}_${fileName}`;

    console.log(`📤 Fazendo upload para Supabase: ${filePath}`);

    // 3. Upload DOCX
    const { data, error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filePath, new Blob([docxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }), {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    console.log(`✅ Upload concluído: ${data.path}`);

    // 4. Gerar link assinado (temporário, seguro) - o bucket é PRIVADO
    // desde a trava de RLS por usuário, então getPublicUrl() não serve mais
    // (URL pública de bucket privado sempre retorna acesso negado). Guardamos
    // o CAMINHO do arquivo e geramos um link assinado válido por 7 dias;
    // outros pontos do app (ex: link de assinatura do cliente) geram um
    // novo link assinado na hora, sob demanda, em vez de depender deste.
    const { data: signedUrlData } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    const signedUrl = signedUrlData?.signedUrl || '';

    // 5. Registrar na tabela de documentos (opcional, para auditoria)
    const { error: dbError } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: contractId,
        file_name: fileName,
        storage_path: filePath,
        public_url: signedUrl,
        size_bytes: docxBuffer.byteLength,
        tipo_contrato: metadata?.tipo,
        vendedor_nome: metadata?.vendedor,
        comprador_nome: metadata?.comprador,
        valor_contrato: metadata?.valor,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.warn('Aviso: DOCX uploaded mas não registrado na tabela:', dbError.message);
    }

    // 6. Atualizar contrato com o CAMINHO do documento (não a URL, que
    // expira) - quem for baixar gera um link assinado novo na hora.
    await supabase
      .from('contracts')
      .update({
        documento_url: signedUrl,
        documento_storage_path: filePath,
        documento_salvo_em: new Date().toISOString(),
      })
      .eq('id', contractId);

    const result: SavedDocument = {
      id: filePath,
      contractId,
      fileName,
      url: signedUrl,
      size: docxBuffer.byteLength,
      savedAt: new Date().toISOString(),
    };

    console.log('📋 Documento salvo com sucesso:', result);
    return result;

  } catch (error: any) {
    console.error('❌ Erro ao salvar documento:', error.message);
    throw error;
  }
}

/**
 * Lista todos os documentos salvos de um contrato
 */
export async function listContractDocuments(
  contractId: string
): Promise<SavedDocument[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list(`${BROKER_FOLDER}/${contractId}`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;

    if (!files) return [];

    // Mapear para SavedDocument - gera link assinado pra cada um (bucket
    // privado desde a trava de RLS por usuário, getPublicUrl() não serve mais)
    const documents = await Promise.all(
      files.map(async (file) => {
        const filePath = `${BROKER_FOLDER}/${contractId}/${file.name}`;
        const { data: urlData } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(filePath, 60 * 10);

        return {
          id: filePath,
          contractId,
          fileName: file.name,
          url: urlData?.signedUrl || '',
          size: file.metadata?.size || 0,
          savedAt: file.created_at || new Date().toISOString(),
        };
      })
    );

    return documents;
  } catch (error: any) {
    console.error('Erro ao listar documentos:', error.message);
    return [];
  }
}

/**
 * Download de documento do Supabase
 */
export async function downloadContractDocument(
  contractId: string,
  fileName: string
): Promise<Blob> {
  try {
    const filePath = `${BROKER_FOLDER}/${contractId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(filePath);

    if (error) throw error;
    if (!data) throw new Error('Nenhum dado retornado');

    return data;
  } catch (error: any) {
    console.error('Erro ao fazer download:', error.message);
    throw error;
  }
}

/**
 * Salva automaticamente o PDF do contrato assinado quando o CLIENTE
 * finaliza a assinatura pelo link (pasta separada da do corretor, já
 * em PDF, não .docx).
 */
export async function saveClientSignedPdfToSupabase(
  contractId: string,
  pdfBlob: Blob
): Promise<void> {
  try {
    const timestamp = Date.now();
    const filePath = `${CLIENT_FOLDER}/${contractId}/${timestamp}_contrato.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filePath, pdfBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload do PDF do cliente: ${uploadError.message}`);
    }

    console.log(`✅ PDF do cliente salvo: ${filePath}`);
  } catch (error: any) {
    // Não bloqueia o fluxo de assinatura do cliente se o salvamento falhar -
    // a assinatura em si já foi registrada no banco antes desta chamada.
    console.warn('Aviso: PDF do cliente não foi salvo no Storage:', error.message);
  }
}

/**
 * Deleta TODOS os documentos salvos de um contrato - tanto os .docx do
 * corretor quanto os PDFs salvos automaticamente quando o cliente assina.
 * Chamar sempre que o contrato for excluído do painel, pra não deixar
 * arquivo órfão no bucket.
 */
export async function deleteContractDocuments(contractId: string): Promise<void> {
  for (const folder of [BROKER_FOLDER, CLIENT_FOLDER]) {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .list(`${folder}/${contractId}`);

      if (listError) {
        console.warn(`Erro ao listar documentos (${folder}):`, listError.message);
        continue;
      }

      if (!files || files.length === 0) continue;

      const filesToDelete = files.map((f) => `${folder}/${contractId}/${f.name}`);

      const { error: deleteError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove(filesToDelete);

      if (deleteError) {
        console.warn(`Erro ao deletar documentos (${folder}):`, deleteError.message);
        continue;
      }

      console.log(`🗑️ ${filesToDelete.length} documento(s) deletado(s) de ${folder}/${contractId}`);
    } catch (error: any) {
      console.warn(`Erro ao deletar documentos (${folder}):`, error.message);
    }
  }
}

/**
 * Gera um link assinado (temporário) para o documento salvo no Storage,
 * a partir do caminho guardado em contract.documentoStoragePath. O bucket
 * é privado (RLS por dono/admin, ou por link de assinatura ativo no caso
 * do cliente), então não existe mais "URL pública fixa" que funcione -
 * cada download deve gerar seu próprio link, sob demanda.
 */
export async function getSignedDocumentUrl(
  storagePath: string,
  expiresInSeconds: number = 60 * 10
): Promise<string | null> {
  if (!storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('Não foi possível gerar link assinado do documento:', error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err: any) {
    console.warn('Erro ao gerar link assinado do documento:', err.message);
    return null;
  }
}

