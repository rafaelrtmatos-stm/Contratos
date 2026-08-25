/**
 * Simulação de progresso do download de PDF, compartilhada por todos os
 * botões que baixam PDF no app (ContractViewer, SignatureLink, Dashboard,
 * DigitalSignatureFlowModal). A lib de geração de PDF não expõe eventos
 * reais de andamento, então simulamos em 10 degraus graduais ao longo de
 * ~5s - a barra nunca fecha em 100% sozinha, só quando a geração de fato
 * terminar (ver `finish`/`cancel` abaixo).
 */

export const PDF_PROGRESS_STEPS: { alvo: number; base: number }[] = [
  { alvo: 15, base: 500 },
  { alvo: 28, base: 500 },
  { alvo: 40, base: 500 },
  { alvo: 52, base: 500 },
  { alvo: 63, base: 500 },
  { alvo: 73, base: 500 },
  { alvo: 82, base: 500 },
  { alvo: 90, base: 500 },
  { alvo: 96, base: 500 },
  { alvo: 99, base: 500 },
];

/**
 * Começa a avançar `setProgress` sozinho pelos degraus acima. Devolve uma
 * função `cancel()` - chamar assim que a geração REAL do PDF terminar
 * (sucesso ou erro), pra parar a simulação nesse instante em vez de
 * continuar avançando por conta própria.
 */
export function startSimulatedPdfProgress(setProgress: (n: number) => void): () => void {
  let cancelado = false;

  (async () => {
    for (const { alvo, base } of PDF_PROGRESS_STEPS) {
      const variacao = base * (0.8 + Math.random() * 0.4); // ±20%
      await new Promise((r) => setTimeout(r, variacao));
      if (cancelado) return;
      setProgress(alvo);
    }
  })();

  return () => {
    cancelado = true;
  };
}
