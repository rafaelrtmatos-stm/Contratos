-- Criar tabela para armazenar links de assinatura compartilháveis
CREATE TABLE IF NOT EXISTS contract_signature_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  otp_code VARCHAR(20) NOT NULL,
  vendedor_id UUID NOT NULL,
  vendedor_name VARCHAR(255) NOT NULL,
  cliente_cpf_last_4 VARCHAR(4) NOT NULL,
  cliente_name VARCHAR(255),
  validade TIMESTAMP NOT NULL,
  signed_at TIMESTAMP,
  pdf_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_token CHECK (length(token) > 10)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_contract_signature_links_contract_id 
  ON contract_signature_links(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_signature_links_token 
  ON contract_signature_links(token);

CREATE INDEX IF NOT EXISTS idx_contract_signature_links_validade 
  ON contract_signature_links(validade);

CREATE INDEX IF NOT EXISTS idx_contract_signature_links_status 
  ON contract_signature_links(status);

-- Habilitar RLS
ALTER TABLE contract_signature_links ENABLE ROW LEVEL SECURITY;

-- Politica: Vendedor pode ver seus proprios links
CREATE POLICY IF NOT EXISTS vendedor_view_own_links ON contract_signature_links
  FOR SELECT
  USING (auth.uid() = vendedor_id);

-- Politica: Vendedor pode criar links
CREATE POLICY IF NOT EXISTS vendedor_create_links ON contract_signature_links
  FOR INSERT
  WITH CHECK (auth.uid() = vendedor_id);

-- Politica: Vendedor pode atualizar seus links
CREATE POLICY IF NOT EXISTS vendedor_update_own_links ON contract_signature_links
  FOR UPDATE
  USING (auth.uid() = vendedor_id)
  WITH CHECK (auth.uid() = vendedor_id);

-- Politica: Anonimo pode ver link especifico para assinar
CREATE POLICY IF NOT EXISTS anonymous_view_link_for_signature ON contract_signature_links
  FOR SELECT
  USING (true);

-- Politica: Anonimo pode atualizar link apos assinar
CREATE POLICY IF NOT EXISTS anonymous_sign_link ON contract_signature_links
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
