-- ============================================================
-- RPCs públicas para o fluxo de assinatura via link do cliente
-- Rodar no SQL Editor do Supabase (projeto do app "contratos")
-- Depende de: contracts, contract_signatures, contract_signature_links
-- (contract_signature_links criada em create_signature_links.sql)
-- ============================================================

-- Retorna os dados públicos do contrato + link, validando token/validade/status.
-- SECURITY DEFINER: contorna RLS de `contracts` (que normalmente restringe por owner_id),
-- pois o cliente que assina não está autenticado.
CREATE OR REPLACE FUNCTION get_contract_for_signature_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link contract_signature_links%ROWTYPE;
  v_contract contracts%ROWTYPE;
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

  IF v_link.status = 'signed' THEN
    RETURN jsonb_build_object('erro', 'ja_assinado');
  END IF;

  SELECT * INTO v_contract FROM contracts WHERE id = v_link.contract_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'contrato_nao_encontrado');
  END IF;

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
    'contrato', to_jsonb(v_contract)
  );

  RETURN v_result;
END;
$$;

-- Valida os 4 últimos dígitos do CPF do cliente para o token informado.
CREATE OR REPLACE FUNCTION validate_signature_link_cpf(p_token TEXT, p_cpf_last4 TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contract_signature_links
    WHERE token = p_token
      AND cliente_cpf_last_4 = p_cpf_last4
      AND validade > NOW()
      AND status <> 'signed'
  );
$$;

-- Confirma a assinatura do cliente: valida OTP, grava em contract_signatures,
-- marca o link como assinado e atualiza o status do contrato se ambas as partes já assinaram.
CREATE OR REPLACE FUNCTION sign_contract_via_link(
  p_token TEXT,
  p_otp TEXT,
  p_nome_signatario TEXT,
  p_documento_signatario TEXT,
  p_hash_autenticacao TEXT,
  p_ip TEXT
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
    hash_autenticacao, ip_assinatura
  ) VALUES (
    v_link.contract_id, 'comprador', p_nome_signatario, p_documento_signatario,
    p_hash_autenticacao, p_ip
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

GRANT EXECUTE ON FUNCTION get_contract_for_signature_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_signature_link_cpf(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sign_contract_via_link(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
