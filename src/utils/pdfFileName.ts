/**
 * Nome de arquivo padrão para qualquer PDF de contrato baixado no sistema:
 * nome do cliente (sem acentos/espaços) + data + hora do momento do download.
 * Centralizado aqui pra não divergir entre os vários pontos de download
 * (visualização, dashboard, fluxo de assinatura, link público de assinatura).
 */
export function buildPdfFileName(nomeCliente: string | undefined | null): string {
  const base = nomeCliente || 'contrato';
  const semAcentos = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const slug =
    semAcentos
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'contrato';

  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR').replace(/\//g, '-');
  const hora = agora
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h');

  return `${slug}_${data}_${hora}.pdf`;
}
