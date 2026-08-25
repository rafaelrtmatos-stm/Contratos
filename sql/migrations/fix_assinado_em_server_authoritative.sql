-- ============================================================
-- Item 2 do checklist de conformidade: timestamp de servidor confiável
--
-- Problema: `assinado_em` nunca é enviado pelo cliente nos inserts
-- (contractsRepository.saveSignature / RPC sign_contract_via_link),
-- então já depende do DEFAULT da coluna. Esta migração garante
-- explicitamente esse default e faz a RPC devolver o valor real
-- gravado no banco, para que o front-end pare de usar `new Date()`
-- do dispositivo como fonte de verdade em qualquer lugar (PDF,
-- manifesto, EvidenceLogModal).
-- ============================================================

ALTER TABLE contract_signatures
  ALTER COLUMN assinado_em SET DEFAULT NOW();

-- Trava extra: mesmo que algum código futuro tente enviar assinado_em
-- no INSERT, o servidor sobrescreve com o horário real do banco.
CREATE OR REPLACE FUNCTION enforce_server_assinado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.assinado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_server_assinado_em ON contract_signatures;
CREATE TRIGGER trg_enforce_server_assinado_em
  BEFORE INSERT ON contract_signatures
  FOR EACH ROW
  EXECUTE FUNCTION enforce_server_assinado_em();

-- Atualiza a RPC do fluxo de assinatura por link para devolver o
-- assinado_em gravado pelo servidor (antes só retornava sucesso/contractId).
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
  v_assinado_em TIMESTAMP;
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
  )
  RETURNING assinado_em INTO v_assinado_em;

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

  RETURN jsonb_build_object(
    'sucesso', true,
    'contractId', v_link.contract_id,
    'assinadoEm', v_assinado_em
  );
END;
$$;
