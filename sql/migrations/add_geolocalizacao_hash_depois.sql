-- ============================================================
-- Etapa 3/6 do checklist de conformidade (assinatura eletrônica):
-- 1. Geolocalização da assinatura (GPS best-effort + fallback por IP)
-- 2. Par de hashes SHA-256 "antes/depois" (prova de integridade real,
--    não só um hash único no momento da assinatura)
-- Rodar no SQL Editor do Supabase (projeto do app "contratos")
-- Depende de: contract_signatures (já existente)
-- ============================================================

-- 1) Novas colunas em contract_signatures
ALTER TABLE contract_signatures
  ADD COLUMN IF NOT EXISTS geolocalizacao TEXT,
  ADD COLUMN IF NOT EXISTS hash_autenticacao_depois TEXT;

COMMENT ON COLUMN contract_signatures.geolocalizacao IS
  'Localização capturada no momento da assinatura (GPS do navegador com permissão do usuário, ou aproximada por IP como fallback). Texto pronto pra exibição, ex: "Santarém, PA, Brasil (-2.43810, -54.70830) — GPS".';
COMMENT ON COLUMN contract_signatures.hash_autenticacao_depois IS
  'SHA-256 do documento já COM esta assinatura embutida (par com hash_autenticacao, que é o hash ANTES). Permite reconferir o documento final assinado e provar que nada foi alterado depois.';

-- 2) Recria a RPC pública sign_contract_via_link (fluxo do cliente via
-- link) para aceitar e gravar os 2 novos campos. DROP explícito porque
-- estamos mudando a lista de parâmetros (novo overload não é o que
-- queremos - o antigo de 6 parâmetros deve deixar de existir).
DROP FUNCTION IF EXISTS sign_contract_via_link(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION sign_contract_via_link(
  p_token TEXT,
  p_otp TEXT,
  p_nome_signatario TEXT,
  p_documento_signatario TEXT,
  p_hash_autenticacao TEXT,
  p_ip TEXT,
  p_hash_autenticacao_depois TEXT DEFAULT NULL,
  p_geolocalizacao TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link contract_signature_links%ROWTYPE;
  v_vendedor_assinou BOOLEAN;
BEGIN
  SELECT * INTO v_link
  FROM contract_signature_links
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'link_nao_encontrado');
  END IF;

  IF v_link.status = 'signed' THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'ja_assinado');
  END IF;

  IF v_link.validade < NOW() THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'link_expirado');
  END IF;

  IF v_link.otp_code <> p_otp THEN
    RETURN jsonb_build_object('sucesso', false, 'erro', 'otp_invalido');
  END IF;

  INSERT INTO contract_signatures (
    contract_id, role, nome_signatario, documento_signatario,
    hash_autenticacao, ip_assinatura, hash_autenticacao_depois, geolocalizacao
  ) VALUES (
    v_link.contract_id, 'comprador', p_nome_signatario, p_documento_signatario,
    p_hash_autenticacao, p_ip, p_hash_autenticacao_depois, p_geolocalizacao
  );

  UPDATE contract_signature_links
  SET status = 'signed', signed_at = NOW(), cliente_name = p_nome_signatario, updated_at = NOW()
  WHERE token = p_token;

  SELECT EXISTS (
    SELECT 1 FROM contract_signatures
    WHERE contract_id = v_link.contract_id AND role = 'vendedor'
  ) INTO v_vendedor_assinou;

  UPDATE contracts
  SET status = CASE WHEN v_vendedor_assinou THEN 'assinado_total' ELSE 'assinado_parcial' END
  WHERE id = v_link.contract_id;

  RETURN jsonb_build_object('sucesso', true, 'contractId', v_link.contract_id);
END;
$$;

GRANT EXECUTE ON FUNCTION sign_contract_via_link(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 3) get_contract_for_signature_token também precisa devolver os 2 novos
-- campos dentro do array "assinaturas" (usado pelo cliente pra ver o
-- selo de quem já assinou antes dele, ex: o corretor).
CREATE OR REPLACE FUNCTION get_contract_for_signature_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link contract_signature_links%ROWTYPE;
  v_contract contracts%ROWTYPE;
  v_assinaturas JSONB;
  v_result JSONB;
BEGIN
  SELECT * INTO v_link
  FROM contract_signature_links
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'link_nao_encontrado');
  END IF;

  IF v_link.validade < NOW() THEN
    RETURN jsonb_build_object('erro', 'link_expirado');
  END IF;

  SELECT * INTO v_contract FROM contracts WHERE id = v_link.contract_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'contrato_nao_encontrado');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'role', role,
      'signerIndex', signer_index,
      'nomeSignatario', nome_signatario,
      'documentoSignatario', documento_signatario,
      'assinaturaDataUrl', assinatura_url,
      'assinadoEm', assinado_em,
      'hashAutenticacao', hash_autenticacao,
      'hashAutenticacaoDepois', hash_autenticacao_depois,
      'ipAssinatura', ip_assinatura,
      'geolocalizacao', geolocalizacao,
      'metadadosNavegador', metadados_navegador
    )
    ORDER BY assinado_em ASC
  ), '[]'::jsonb)
  INTO v_assinaturas
  FROM contract_signatures
  WHERE contract_id = v_link.contract_id;

  v_result := jsonb_build_object(
    'link', jsonb_build_object(
      'token', v_link.token,
      'otpCode', v_link.otp_code,
      'vendedorNome', v_link.vendedor_name,
      'clienteCpfLast4', v_link.cliente_cpf_last_4,
      'clienteNome', v_link.cliente_name,
      'validade', v_link.validade,
      'status', v_link.status
    ),
    'contrato', to_jsonb(v_contract),
    'assinaturas', v_assinaturas
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_contract_for_signature_token(TEXT) TO anon, authenticated;
