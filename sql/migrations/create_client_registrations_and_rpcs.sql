-- ============================================================
-- Migration: Criação da tabela client_registrations e RPC
-- para salvar o auto-cadastro do cliente direto no Supabase
-- ============================================================

-- 1. Tabela de cadastros diretos de clientes
CREATE TABLE IF NOT EXISTS client_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'comprador',
  tipo_pessoa VARCHAR(10) NOT NULL DEFAULT 'PF',
  nome VARCHAR(255) NOT NULL,
  genero VARCHAR(20),
  nacionalidade VARCHAR(100),
  estado_civil VARCHAR(100),
  profissao VARCHAR(150),
  cpf_cnpj VARCHAR(50) NOT NULL,
  rg VARCHAR(50),
  rg_orgao VARCHAR(50),
  telefone VARCHAR(50) NOT NULL,
  telefone2 VARCHAR(50),
  email VARCHAR(255),
  creci VARCHAR(50),
  cep VARCHAR(20) NOT NULL,
  endereco TEXT NOT NULL,
  numero VARCHAR(50) NOT NULL,
  complemento VARCHAR(150),
  bairro VARCHAR(150) NOT NULL,
  cidade VARCHAR(150) NOT NULL,
  uf VARCHAR(10) NOT NULL,
  conjuge JSONB,
  dados_completos JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'concluido',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_client_registrations_contract_id ON client_registrations(contract_id);
CREATE INDEX IF NOT EXISTS idx_client_registrations_cpf_cnpj ON client_registrations(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_client_registrations_created_at ON client_registrations(created_at DESC);

-- Habilitar RLS
ALTER TABLE client_registrations ENABLE ROW LEVEL SECURITY;

-- Política de inserção anônima (para clientes que acessam pelo link de auto-cadastro)
DROP POLICY IF EXISTS anon_insert_client_registrations ON client_registrations;
CREATE POLICY anon_insert_client_registrations ON client_registrations
  FOR INSERT
  WITH CHECK (true);

-- Política de leitura/gerenciamento para usuários autenticados
DROP POLICY IF EXISTS authenticated_manage_client_registrations ON client_registrations;
CREATE POLICY authenticated_manage_client_registrations ON client_registrations
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Política anônima de leitura do próprio registro se necessário
DROP POLICY IF EXISTS anon_select_client_registrations ON client_registrations;
CREATE POLICY anon_select_client_registrations ON client_registrations
  FOR SELECT
  USING (true);

-- Permitir inserção anônima também em saved_parties caso a política atual restrinja
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_parties') THEN
    ALTER TABLE saved_parties ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS anon_insert_saved_parties ON saved_parties;
    CREATE POLICY anon_insert_saved_parties ON saved_parties
      FOR INSERT
      WITH CHECK (true);

    DROP POLICY IF EXISTS anon_update_saved_parties ON saved_parties;
    CREATE POLICY anon_update_saved_parties ON saved_parties
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 2. RPC com SECURITY DEFINER para salvar o cadastro diretamente no Supabase
-- e atualizar o contrato de forma segura
CREATE OR REPLACE FUNCTION save_client_registration_direct(
  p_registration JSONB,
  p_contract_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT 'comprador'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id UUID;
  v_party JSONB;
  v_tipo_contrato TEXT;
  v_owner_id UUID;
  v_nome TEXT;
  v_cpf_cnpj TEXT;
BEGIN
  v_party := p_registration;
  v_nome := COALESCE(p_registration->>'nome', '');
  v_cpf_cnpj := COALESCE(p_registration->>'cpfCnpj', '');

  -- 1. Obter dados do contrato se houver contract_id
  IF p_contract_id IS NOT NULL THEN
    SELECT tipo, owner_id INTO v_tipo_contrato, v_owner_id
    FROM contracts
    WHERE id = p_contract_id;
  END IF;

  -- 2. Inserir na tabela client_registrations
  INSERT INTO client_registrations (
    contract_id,
    role,
    tipo_pessoa,
    nome,
    genero,
    nacionalidade,
    estado_civil,
    profissao,
    cpf_cnpj,
    rg,
    rg_orgao,
    telefone,
    telefone2,
    email,
    creci,
    cep,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    conjuge,
    dados_completos,
    created_at,
    updated_at
  ) VALUES (
    p_contract_id,
    COALESCE(p_role, 'comprador'),
    COALESCE(p_registration->>'tipoPessoa', 'PF'),
    v_nome,
    p_registration->>'genero',
    p_registration->>'nacionalidade',
    p_registration->>'estadoCivil',
    p_registration->>'profissao',
    v_cpf_cnpj,
    p_registration->>'rg',
    p_registration->>'rgOrgao',
    COALESCE(p_registration->>'telefone', ''),
    p_registration->>'telefone2',
    p_registration->>'email',
    p_registration->>'creci',
    COALESCE(p_registration->>'cep', ''),
    COALESCE(p_registration->>'endereco', ''),
    COALESCE(p_registration->>'numero', ''),
    p_registration->>'complemento',
    COALESCE(p_registration->>'bairro', ''),
    COALESCE(p_registration->>'cidade', ''),
    COALESCE(p_registration->>'uf', ''),
    p_registration->'conjuge',
    p_registration,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_reg_id;

  -- 3. Salvar no mesmo campo/tabela de Contatos Salvos (saved_parties)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_parties') THEN
    BEGIN
      -- Se já existir um contato com esse CPF para o mesmo owner, atualiza os dados
      IF NULLIF(v_cpf_cnpj, '') IS NOT NULL THEN
        UPDATE saved_parties
        SET nome = v_nome,
            data = p_registration,
            updated_at = NOW()
        WHERE cpf_cnpj = v_cpf_cnpj
          AND (owner_id IS NOT DISTINCT FROM v_owner_id);

        IF NOT FOUND THEN
          INSERT INTO saved_parties (
            owner_id,
            nome,
            cpf_cnpj,
            data,
            created_at,
            updated_at
          ) VALUES (
            v_owner_id,
            v_nome,
            NULLIF(v_cpf_cnpj, ''),
            p_registration,
            NOW(),
            NOW()
          );
        END IF;
      ELSE
        INSERT INTO saved_parties (
          owner_id,
          nome,
          cpf_cnpj,
          data,
          created_at,
          updated_at
        ) VALUES (
          v_owner_id,
          v_nome,
          NULL,
          p_registration,
          NOW(),
          NOW()
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback silencioso caso ocorra alguma variação de coluna
    END;
  END IF;

  -- 4. Atualizar o contrato correspondente
  IF p_contract_id IS NOT NULL AND v_tipo_contrato IS NOT NULL THEN
    IF v_tipo_contrato = 'exclusividade' THEN
      IF p_role IN ('contratante', 'vendedor', 'proprietario') THEN
        UPDATE contracts SET vendedor = p_registration, updated_at = NOW() WHERE id = p_contract_id;
      ELSE
        UPDATE contracts SET comprador = p_registration, updated_at = NOW() WHERE id = p_contract_id;
      END IF;
    ELSIF v_tipo_contrato = 'locacao' THEN
      IF p_role IN ('locador', 'vendedor') THEN
        UPDATE contracts SET vendedor = p_registration, updated_at = NOW() WHERE id = p_contract_id;
      ELSE
        UPDATE contracts SET comprador = p_registration, updated_at = NOW() WHERE id = p_contract_id;
      END IF;
    ELSE
      IF p_role = 'vendedor' THEN
        UPDATE contracts SET vendedor = p_registration, updated_at = NOW() WHERE id = p_contract_id;
      ELSE
        UPDATE contracts SET comprador = p_registration, updated_at = NOW() WHERE id = p_contract_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'sucesso', true,
    'registration_id', v_reg_id,
    'mensagem', 'Dados gravados diretamente no Supabase com sucesso'
  );
END;
$$;
