-- ============================================================
-- Item 3 do checklist de conformidade: meio de autenticação como
-- campo próprio, consultável, em vez de texto embutido/ausente.
--
-- Antes: a informação de COMO o signatário foi autenticado (senha de
-- login vs. link + OTP) não tinha nenhum lugar próprio no banco -
-- ficava, na melhor das hipóteses, concatenada dentro de texto livre
-- de user-agent em um componente que nem chegou a ser usado em
-- produção. Nos dois fluxos reais de assinatura, essa informação
-- simplesmente não era persistida.
-- ============================================================

ALTER TABLE contract_signatures
  ADD COLUMN IF NOT EXISTS meio_autenticacao VARCHAR;

COMMENT ON COLUMN contract_signatures.meio_autenticacao IS
  'Meio usado para autenticar o signatário no momento da assinatura. '
  'Ex.: "Login e senha (Supabase Auth)" para o fluxo interno do corretor, '
  '"Link de assinatura: CPF (4 últimos dígitos) + código OTP" para o '
  'fluxo do cliente via link.';

-- Atualiza a RPC de assinatura por link para gravar o meio de autenticação
-- (já sabemos que é sempre "link + OTP" nesse fluxo - não depende de input
-- do cliente, então é seguro fixar aqui em vez de aceitar por parâmetro).
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
    hash_autenticacao, ip_assinatura, meio_autenticacao
  ) VALUES (
    v_link.contract_id, 'comprador', p_nome_signatario, p_documento_signatario,
    p_hash_autenticacao, p_ip, 'Link de assinatura: CPF (4 últimos dígitos) + código OTP'
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
