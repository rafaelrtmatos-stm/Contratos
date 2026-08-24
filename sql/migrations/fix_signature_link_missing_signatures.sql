-- ============================================================
-- Duas correções no fluxo de assinatura via link do cliente:
--
-- 1) O cliente que abre o link não via os selos de quem já tinha
--    assinado (ex: o corretor assina primeiro, depois o cliente
--    abre o link pra assinar e via só a própria assinatura, nunca
--    a do corretor). Causa: a função só devolvia to_jsonb(v_contract)
--    - a linha crua da tabela `contracts`, que NÃO tem as
--    assinaturas (ficam em `contract_signatures`, tabela separada).
--
-- 2) Depois de assinado, reabrir o MESMO link sempre dava erro
--    "já assinado" e travava o acesso - o cliente não conseguia
--    mais rever nem baixar o contrato pelo link que já tinha.
--
-- Rodar no SQL Editor do projeto do app de contratos.
-- ============================================================

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

  -- Não bloqueia mais quando já assinado: o cliente pode reabrir o
  -- mesmo link depois de assinar para rever/baixar o contrato quantas
  -- vezes quiser. O front-end decide o que mostrar com base em
  -- v_link.status (retornado dentro de 'link').

  SELECT * INTO v_contract FROM contracts WHERE id = v_link.contract_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'contrato_nao_encontrado');
  END IF;

  -- Busca as assinaturas já registradas para este contrato (ex: o
  -- corretor já pode ter assinado antes do cliente abrir o link)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'role', role,
      'signerIndex', signer_index,
      'nomeSignatario', nome_signatario,
      'documentoSignatario', documento_signatario,
      'assinaturaDataUrl', assinatura_url,
      'assinadoEm', assinado_em,
      'hashAutenticacao', hash_autenticacao,
      'ipAssinatura', ip_assinatura,
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

-- ============================================================
-- validate_signature_link_cpf também não pode mais exigir
-- status <> 'signed' - senão o cliente nunca consegue validar o
-- CPF de novo pra rever o contrato já assinado (a confirmação de
-- identidade continua acontecendo, só não bloqueia mais o acesso
-- de visualização pós-assinatura).
-- ============================================================

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
  );
$$;

GRANT EXECUTE ON FUNCTION validate_signature_link_cpf(TEXT, TEXT) TO anon, authenticated;

