-- ============================================================
-- Trava, no BANCO (não só na tela), contra assinar duas vezes pela
-- mesma parte via link.
--
-- Bug relatado: um cliente que já tinha assinado, ao receber um NOVO
-- link/código gerado depois (ex: corretor clicou "Gerar Link para
-- Cliente" de novo sem perceber que ele já tinha assinado), conseguia
-- assinar de novo - criando uma segunda entrada duplicada em
-- contract_signatures/manifesto de auditoria.
--
-- A trava de UI (jaAssinado em signatureLinksRepository.ts) já resolve
-- o caminho normal, mas o banco em si não impedia o INSERT duplicado -
-- essa migração fecha a brecha no servidor também (defesa em
-- profundidade: mesmo um link antigo reaberto, ou qualquer chamada
-- direta na RPC, não consegue mais duplicar a assinatura de uma parte
-- que já assinou aquele contrato).
--
-- Rodar no SQL Editor do projeto do app de contratos.
-- ============================================================

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
  v_tipo_contrato TEXT;
  v_role_cliente TEXT;
  v_role_corretor TEXT;
  v_corretor_assinou BOOLEAN;
  v_cliente_ja_assinou BOOLEAN;
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

  SELECT tipo INTO v_tipo_contrato FROM contracts WHERE id = v_link.contract_id;

  -- Mesma convenção usada no resto do app: na exclusividade o cliente
  -- (contratante) é 'vendedor' e o corretor é 'comprador'; nos demais
  -- tipos é o padrão normal.
  IF v_tipo_contrato = 'exclusividade' THEN
    v_role_cliente := 'vendedor';
    v_role_corretor := 'comprador';
  ELSE
    v_role_cliente := 'comprador';
    v_role_corretor := 'vendedor';
  END IF;

  -- TRAVA NOVA: essa parte (o cliente que assina por link) já tem
  -- assinatura registrada para este contrato? Bloqueia antes de inserir.
  SELECT EXISTS (
    SELECT 1 FROM contract_signatures
    WHERE contract_id = v_link.contract_id AND role = v_role_cliente
  ) INTO v_cliente_ja_assinou;

  IF v_cliente_ja_assinou THEN
    -- Alinha o link com a realidade (evita ele ficar 'pending' pra
    -- sempre e permitir novas tentativas) e devolve o mesmo erro que a
    -- tela já trata como "reabrir link já assinado".
    UPDATE contract_signature_links
    SET status = 'signed', updated_at = NOW()
    WHERE token = p_token;
    RETURN jsonb_build_object('sucesso', false, 'erro', 'ja_assinado');
  END IF;

  INSERT INTO contract_signatures (
    contract_id, role, nome_signatario, documento_signatario,
    hash_autenticacao, ip_assinatura, meio_autenticacao
  ) VALUES (
    v_link.contract_id, v_role_cliente, p_nome_signatario, p_documento_signatario,
    p_hash_autenticacao, p_ip, 'Link de assinatura: CPF (4 últimos dígitos) + código OTP'
  )
  RETURNING assinado_em INTO v_assinado_em;

  UPDATE contract_signature_links
  SET status = 'signed', signed_at = NOW(), cliente_name = p_nome_signatario, updated_at = NOW()
  WHERE token = p_token;

  SELECT EXISTS (
    SELECT 1 FROM contract_signatures
    WHERE contract_id = v_link.contract_id AND role = v_role_corretor
  ) INTO v_corretor_assinou;

  UPDATE contracts
  SET status = CASE WHEN v_corretor_assinou THEN 'assinado_total' ELSE 'assinado_parcial' END
  WHERE id = v_link.contract_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'contractId', v_link.contract_id,
    'assinadoEm', v_assinado_em
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sign_contract_via_link(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
