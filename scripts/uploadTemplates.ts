/**
 * Script para fazer upload de todos os 9 templates para Supabase Storage
 * 
 * Uso:
 * npx tsx scripts/uploadTemplates.ts
 * 
 * Certifique-se que o bucket 'contract-templates' existe no Supabase!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key para upload

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const TEMPLATES_BUCKET = 'contract-templates';

// Resolver __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lista de todos os 9 templates a fazer upload
 */
const TEMPLATES = [
  // VENDA À VISTA - arquivo mestre único (digital/manual/mista no mesmo .docx,
  // ver templateResolver.ts e src/utils/witnessBlockProcessor.ts)
  'venda_vista_master.docx',

  // VENDA PARCELADA - idem, arquivo mestre único
  'venda_parcelada_master.docx',

  // EXCLUSIVIDADE - idem, arquivo mestre único (nenhum contrato tem cláusula
  // de cônjuge, então não há mais variante "sem_conjuge" separada)
  'exclusividade_master.docx',
];

/**
 * Fazer upload de um arquivo
 */
async function uploadFile(fileName: string): Promise<boolean> {
  try {
    const filePath = path.join(__dirname, '..', 'templates', fileName);

    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Arquivo não encontrado: ${filePath}`);
      return false;
    }

    // Ler arquivo
    const fileBuffer = fs.readFileSync(filePath);

    // Upload para Supabase
    const { data, error } = await supabase.storage
      .from(TEMPLATES_BUCKET)
      .upload(fileName, fileBuffer, {
        upsert: true,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

    if (error) {
      console.error(`❌ Erro ao fazer upload de ${fileName}:`, error.message);
      return false;
    }

    console.log(`✅ ${fileName} (${(fileBuffer.length / 1024).toFixed(2)}KB)`);
    return true;
  } catch (err) {
    console.error(`❌ Erro ao fazer upload de ${fileName}:`, String(err));
    return false;
  }
}

/**
 * Executar upload de todos os templates
 */
async function uploadAllTemplates() {
  console.log(`\n📦 Iniciando upload de ${TEMPLATES.length} templates para Supabase...\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const template of TEMPLATES) {
    const success = await uploadFile(template);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(`\n📊 Resultado:`);
  console.log(`   ✅ Sucesso: ${successCount}/${TEMPLATES.length}`);
  if (failureCount > 0) {
    console.log(`   ❌ Falhas: ${failureCount}/${TEMPLATES.length}`);
  }

  if (failureCount === 0) {
    console.log(`\n🎉 Todos os templates foram enviados com sucesso!\n`);
  } else {
    console.log(`\n⚠️ Alguns templates falharam. Verifique os erros acima.\n`);
    process.exit(1);
  }
}

// Executar
uploadAllTemplates().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
