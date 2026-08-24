/**
 * Tratamento (rótulo) de cada papel contratual, respeitando o gênero
 * selecionado (masculino/feminino) - em vez de deixar sempre a forma
 * genérica com sufixo "(A)" (ex: "CONTRATADO(A)"), que aparecia igual
 * pra todo mundo independente do gênero informado no formulário.
 *
 * genero: 'M' | 'F' | 'O' | '' | undefined - 'O' e vazio caem no
 * neutro com "(A)", igual ao comportamento anterior.
 */
export type PapelContratual = 'contratado' | 'contratante' | 'vendedor' | 'comprador';

const ROTULOS: Record<PapelContratual, { M: string; F: string; neutro: string }> = {
  contratado: { M: 'CONTRATADO', F: 'CONTRATADA', neutro: 'CONTRATADO(A)' },
  contratante: { M: 'CONTRATANTE', F: 'CONTRATANTE', neutro: 'CONTRATANTE' },
  vendedor: { M: 'VENDEDOR', F: 'VENDEDORA', neutro: 'VENDEDOR(A)' },
  comprador: { M: 'COMPRADOR', F: 'COMPRADORA', neutro: 'COMPRADOR(A)' },
};

export function getTratamento(papel: PapelContratual, genero?: string): string {
  const item = ROTULOS[papel];
  if (genero === 'M') return item.M;
  if (genero === 'F') return item.F;
  return item.neutro;
}
