/**
 * Sistema de salvamento de contratos em DOCX no Supabase Storage
 * Cada contrato salvo = cópia com dados + assinatura/carimbo
 */

import { supabase } from './supabaseClient';
import { ContractData } from '../types/contract';

const DOCUMENTS_BUCKET = 'contract-documents';

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
    const filePath = `contratos/${contractId}/${timestamp}_${fileName}`;

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

    // 4. Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // 5. Registrar na tabela de documentos (opcional, para auditoria)
    const { error: dbError } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: contractId,
        file_name: fileName,
        storage_path: filePath,
        public_url: publicUrl,
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

    // 6. Atualizar contrato com URL do documento
    await supabase
      .from('contracts')
      .update({
        documento_url: publicUrl,
        documento_salvo_em: new Date().toISOString(),
      })
      .eq('id', contractId);

    const result: SavedDocument = {
      id: filePath,
      contractId,
      fileName,
      url: publicUrl,
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
      .list(`contratos/${contractId}`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;

    if (!files) return [];

    // Mapear para SavedDocument
    const documents = files.map((file) => {
      const filePath = `contratos/${contractId}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from(DOCUMENTS_BUCKET)
        .getPublicUrl(filePath);

      return {
        id: filePath,
        contractId,
        fileName: file.name,
        url: urlData.publicUrl,
        size: file.metadata?.size || 0,
        savedAt: file.created_at || new Date().toISOString(),
      };
    });

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
    const filePath = `contratos/${contractId}/${fileName}`;

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
 * Deleta documentos salvos de um contrato
 */
export async function deleteContractDocuments(contractId: string): Promise<void> {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list(`contratos/${contractId}`);

    if (listError) throw listError;

    if (!files || files.length === 0) return;

    // Deletar cada arquivo
    const filesToDelete = files.map((f) => `contratos/${contractId}/${f.name}`);

    const { error: deleteError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove(filesToDelete);

    if (deleteError) throw deleteError;

    console.log(`🗑️ ${filesToDelete.length} documento(s) deletado(s)`);
  } catch (error: any) {
    console.error('Erro ao deletar documentos:', error.message);
  }
}
