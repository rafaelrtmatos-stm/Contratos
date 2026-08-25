-- Complementa add_meio_autenticacao_column.sql: expõe o novo campo também
-- na página pública de validação (/validar), já que é justamente o tipo
-- de prova que alguém de fora do sistema (ex.: um cartório, um advogado
-- da outra parte) precisaria consultar.

CREATE OR REPLACE FUNCTION validate_signature_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_sig RECORD;
BEGIN
  v_clean := lower(regexp_replace(p_code, '[^a-fA-F0-9]', '', 'g'));

  IF length(v_clean) < 16 THEN
    RETURN jsonb_build_object('encontrado', false, 'erro', 'codigo_invalido');
  END IF;

  SELECT cs.nome_signatario, cs.role, cs.assinado_em, cs.hash_autenticacao,
         cs.meio_autenticacao, c.numero_contrato, c.tipo
  INTO v_sig
  FROM contract_signatures cs
  JOIN contracts c ON c.id = cs.contract_id
  WHERE cs.hash_autenticacao LIKE (substring(v_clean from 1 for 16) || '%')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('encontrado', false, 'erro', 'nao_encontrado');
  END IF;

  RETURN jsonb_build_object(
    'encontrado', true,
    'nomeSignatario', v_sig.nome_signatario,
    'papel', v_sig.role,
    'assinadoEm', v_sig.assinado_em,
    'numeroContrato', v_sig.numero_contrato,
    'tipoContrato', v_sig.tipo,
    'hashCompleto', v_sig.hash_autenticacao,
    'meioAutenticacao', v_sig.meio_autenticacao
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_signature_code(TEXT) TO anon, authenticated;
