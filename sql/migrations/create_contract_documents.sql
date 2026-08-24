-- Tabela para registrar cópias de contratos salvos no Supabase Storage
CREATE TABLE IF NOT EXISTS contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  storage_path VARCHAR NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  size_bytes BIGINT,
  tipo_contrato VARCHAR,
  vendedor_nome VARCHAR,
  comprador_nome VARCHAR,
  valor_contrato DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id 
  ON contract_documents(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_documents_created_at 
  ON contract_documents(created_at DESC);

-- Policy: Usuários veem apenas seus próprios documentos
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem documentos de seus contratos"
  ON contract_documents
  FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM contracts WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem inserir documentos de seus contratos"
  ON contract_documents
  FOR INSERT
  WITH CHECK (
    contract_id IN (
      SELECT id FROM contracts WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar documentos de seus contratos"
  ON contract_documents
  FOR DELETE
  USING (
    contract_id IN (
      SELECT id FROM contracts WHERE owner_id = auth.uid()
    )
  );

-- Tabela contracts: adicionar coluna documento_url (se não existir)
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS documento_url TEXT,
ADD COLUMN IF NOT EXISTS documento_salvo_em TIMESTAMP;

-- Bucket público para armazenar documentos
-- (executar via Dashboard do Supabase se necessário)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('contract-documents', 'contract-documents', true, 104857600, 
--   ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
-- ON CONFLICT (id) DO NOTHING;
