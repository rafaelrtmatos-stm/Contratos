// =====================
// ESTADO CIVIL — opções sensíveis ao gênero
// =====================

export interface CivilStatusOption {
  value: string;
  label: string;
}

// Raiz de cada estado civil, com a forma para cada gênero.
// 'neutro' é usado quando o gênero ainda não foi selecionado (M/F) ou é 'O' (outro).
const CIVIL_STATUS_ROOTS: { root: string; M: string; F: string; neutro: string }[] = [
  { root: 'solteiro', M: 'solteiro', F: 'solteira', neutro: 'solteiro(a)' },
  { root: 'casado', M: 'casado', F: 'casada', neutro: 'casado(a)' },
  { root: 'divorciado', M: 'divorciado', F: 'divorciada', neutro: 'divorciado(a)' },
  { root: 'viúvo', M: 'viúvo', F: 'viúva', neutro: 'viúvo(a)' },
  { root: 'separado', M: 'separado judicialmente', F: 'separada judicialmente', neutro: 'separado(a) judicialmente' },
];

// Termos que não variam por gênero
const INVARIANT_STATUSES = ['União Estável', 'Pessoa Jurídica'];

/**
 * Retorna as opções de estado civil de acordo com o gênero selecionado.
 * genero: 'M' | 'F' | 'O' | ''
 */
export function getEstadoCivilOptions(genero: string): CivilStatusOption[] {
  const key: 'M' | 'F' | 'neutro' = genero === 'M' ? 'M' : genero === 'F' ? 'F' : 'neutro';

  const options: CivilStatusOption[] = CIVIL_STATUS_ROOTS.map((item) => {
    const label = item[key];
    return { value: label, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });

  INVARIANT_STATUSES.forEach((status) => {
    options.push({ value: status, label: status });
  });

  return options;
}

/**
 * Dado um valor de estado civil já preenchido (possivelmente na forma errada de gênero,
 * ou neutra "solteiro(a)"), converte para a forma correspondente ao novo gênero.
 * Se o valor não corresponder a nenhuma raiz conhecida, retorna o valor original.
 */
export function convertEstadoCivilToGenero(currentValue: string, genero: string): string {
  if (!currentValue) return currentValue;

  const normalized = currentValue.trim().toLowerCase();
  const key: 'M' | 'F' | 'neutro' = genero === 'M' ? 'M' : genero === 'F' ? 'F' : 'neutro';

  for (const item of CIVIL_STATUS_ROOTS) {
    const candidates = [item.M, item.F, item.neutro].map((v) => v.toLowerCase());
    if (candidates.includes(normalized)) {
      return item[key];
    }
  }

  // Não é um estado civil reconhecido (ex: já é "União Estável" ou texto customizado)
  return currentValue;
}
