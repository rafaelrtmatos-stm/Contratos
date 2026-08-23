// Conversor de valores numéricos em moeda (BRL) para texto por extenso em Português Brasileiro

const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'
];

const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'
];

const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'
];

function converterCentena(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  const partes: string[] = [];

  if (c > 0) {
    partes.push(CENTENAS[c]);
  }

  const resto = n % 100;
  if (resto > 0) {
    if (resto < 20) {
      partes.push(UNIDADES[resto]);
    } else {
      partes.push(DEZENAS[d]);
      if (u > 0) {
        partes.push(UNIDADES[u]);
      }
    }
  }

  return partes.join(' e ');
}

export function numeroPorExtensoReais(valor: number): string {
  if (isNaN(valor) || valor === 0) return 'zero reais';

  const valorAbsoluto = Math.abs(valor);
  const parteInteira = Math.floor(valorAbsoluto);
  const centavos = Math.round((valorAbsoluto - parteInteira) * 100);

  if (parteInteira === 0 && centavos > 0) {
    const centavosExtenso = converterCentena(centavos);
    return `${centavosExtenso} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }

  const bilhoes = Math.floor(parteInteira / 1_000_000_000);
  const milhoes = Math.floor((parteInteira % 1_000_000_000) / 1_000_000);
  const milhares = Math.floor((parteInteira % 1_000_000) / 1_000);
  const unidades = parteInteira % 1_000;

  const partes: string[] = [];

  if (bilhoes > 0) {
    const txt = converterCentena(bilhoes);
    partes.push(`${txt} ${bilhoes === 1 ? 'bilhão' : 'bilhões'}`);
  }

  if (milhoes > 0) {
    const txt = converterCentena(milhoes);
    partes.push(`${txt} ${milhoes === 1 ? 'milhão' : 'milhões'}`);
  }

  if (milhares > 0) {
    if (milhares === 1) {
      partes.push('mil');
    } else {
      partes.push(`${converterCentena(milhares)} mil`);
    }
  }

  if (unidades > 0) {
    partes.push(converterCentena(unidades));
  }

  let textoReais = partes.join(' e ');
  if (parteInteira === 1) {
    textoReais += ' real';
  } else if (parteInteira > 0) {
    // Se terminar em milhão/bilhão sem unidades/milhares, adiciona "de reais"
    if ((milhoes > 0 || bilhoes > 0) && milhares === 0 && unidades === 0) {
      textoReais += ' de reais';
    } else {
      textoReais += ' reais';
    }
  }

  if (centavos > 0) {
    const centavosExtenso = converterCentena(centavos);
    const labelCentavos = centavos === 1 ? 'centavo' : 'centavos';
    if (parteInteira > 0) {
      textoReais += ` e ${centavosExtenso} ${labelCentavos}`;
    } else {
      textoReais = `${centavosExtenso} ${labelCentavos}`;
    }
  }

  return textoReais;
}

export function numeroPorExtensoInteiro(n: number): string {
  if (isNaN(n) || n === 0) return 'zero';
  const num = Math.floor(Math.abs(n));
  if (num < 1000) {
    return converterCentena(num) || 'zero';
  }
  const milhares = Math.floor(num / 1000);
  const resto = num % 1000;
  const partes: string[] = [];
  if (milhares === 1) {
    partes.push('mil');
  } else {
    partes.push(`${converterCentena(milhares)} mil`);
  }
  if (resto > 0) {
    partes.push(converterCentena(resto));
  }
  return partes.join(' e ');
}

export function percentualPorExtenso(pct: number): string {
  if (isNaN(pct) || pct === 0) return 'zero por cento';
  const inteira = Math.floor(pct);
  const decimal = Math.round((pct - inteira) * 10);
  if (decimal > 0) {
    return `${numeroPorExtensoInteiro(inteira)} vírgula ${numeroPorExtensoInteiro(decimal)} por cento`;
  }
  return `${numeroPorExtensoInteiro(inteira)} por cento`;
}
