-- ============================================================
-- Corrige sign_contract_via_link para gravar o role correto do
-- cliente conforme o tipo do contrato.
--
-- Bug: a função sempre gravava role='comprador' pro cliente que
-- assina pelo link, não importa o tipo de contrato. Isso está certo
-- para venda à vista/parcelada, mas ERRADO para exclusividade - lá a
-- convenção (já usada em ContractViewer.tsx no fluxo do corretor, e
-- em signatureLinksRepository.ts na criação do link) é invertida:
--   - role 'comprador' = o CORRETOR
--   - role 'vendedor'  = o CONTRATANTE (cliente real, que assina pelo link)
--
-- Como as duas assinaturas (corretor e cliente) acabavam com o MESMO
-- role 'comprador' em contratos de exclusividade, o sistema nunca
-- reconhecia que o cliente tinha assinado: o contrato ficava preso em
-- "assinado_parcial", o selo do cliente não aparecia (o código busca
-- por role='vendedor') e o template baixado continuava exigindo
-- testemunhas (porque compradorModalidade nunca virava 'digital').
--
-- Fix: a função agora consulta o tipo do contrato e decide o role
-- corretamente - não depende de nenhum input do cliente, então é
-- seguro calcular aqui dentro em vez de confiar em parâmetro.
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
