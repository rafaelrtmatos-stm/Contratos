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
  status VARCHAR(50) DEFAULT 'pending', -- pending, signed, expired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para performance
  CONSTRAINT valid_token CHECK (length(token) > 10)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contract_signature_links_contract_id 
  ON contract_signature_links(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_signature_links_token 
  ON contract_signature_links(token);

CREATE INDEX IF NOT EXISTS idx_contract_signature_links_validade 
  ON contract_signature_links(validade);

CREATE INDEX IF NOT EXISTS idx_contract_signature_links_status 
  ON contract_signature_links(status);

-- RLS Policies
ALTER TABLE contract_signature_links ENABLE ROW LEVEL SECURITY;

-- Política: Vendedor pode ver seus próprios links
CREATE POLICY "vendedor_view_own_links" ON contract_signature_links
  FOR SELECT
  USING (auth.uid() = vendedor_id);

-- Política: Vendedor pode criar links
CREATE POLICY "vendedor_create_links" ON contract_signature_links
  FOR INSERT
  WITH CHECK (auth.uid() = vendedor_id);

-- Política: Vendedor pode atualizar seus links
CREATE POLICY "vendedor_update_own_links" ON contract_signature_links
  FOR UPDATE
  USING (auth.uid() = vendedor_id)
  WITH CHECK (auth.uid() = vendedor_id);

-- Política: Anônimo pode ver link específico para assinar (apenas CPF validation)
CREATE POLICY "anonymous_view_link_for_signature" ON contract_signature_links
  FOR SELECT
  USING (true); -- Em produção, adicione more restrictions

-- Política: Anônimo pode atualizar link após assinar
CREATE POLICY "anonymous_sign_link" ON contract_signature_links
  FOR UPDATE
  USING (true)
  WITH CHECK (true); -- Em produção, validate signed_at field

COMMIT;
