// =====================
// NACIONALIDADE — sensível ao gênero
// =====================

// Raiz de cada nacionalidade, com a forma para cada gênero.
// 'neutro' é usado quando o gênero ainda não foi selecionado ou é 'O' (outro).
const NATIONALITY_ROOTS: { M: string; F: string; neutro: string }[] = [
  { M: 'brasileiro', F: 'brasileira', neutro: 'brasileiro(a)' },
  { M: 'português', F: 'portuguesa', neutro: 'português(a)' },
  { M: 'americano', F: 'americana', neutro: 'americano(a)' },
  { M: 'italiano', F: 'italiana', neutro: 'italiano(a)' },
  { M: 'espanhol', F: 'espanhola', neutro: 'espanhol(a)' },
  { M: 'alemão', F: 'alemã', neutro: 'alemão/alemã' },
  { M: 'francês', F: 'francesa', neutro: 'francês(a)' },
  { M: 'inglês', F: 'inglesa', neutro: 'inglês(a)' },
  { M: 'chinês', F: 'chinesa', neutro: 'chinês(a)' },
  { M: 'japonês', F: 'japonesa', neutro: 'japonês(a)' },
  { M: 'holandês', F: 'holandesa', neutro: 'holandês(a)' },
  { M: 'libanês', F: 'libanesa', neutro: 'libanês(a)' },
  { M: 'argentino', F: 'argentina', neutro: 'argentino(a)' },
  { M: 'uruguaio', F: 'uruguaia', neutro: 'uruguaio(a)' },
  { M: 'paraguaio', F: 'paraguaia', neutro: 'paraguaio(a)' },
  { M: 'boliviano', F: 'boliviana', neutro: 'boliviano(a)' },
  { M: 'chileno', F: 'chilena', neutro: 'chileno(a)' },
  { M: 'colombiano', F: 'colombiana', neutro: 'colombiano(a)' },
  { M: 'peruano', F: 'peruana', neutro: 'peruano(a)' },
  { M: 'venezuelano', F: 'venezuelana', neutro: 'venezuelano(a)' },
  { M: 'equatoriano', F: 'equatoriana', neutro: 'equatoriano(a)' },
  { M: 'mexicano', F: 'mexicana', neutro: 'mexicano(a)' },
  { M: 'cubano', F: 'cubana', neutro: 'cubano(a)' },
  { M: 'dominicano', F: 'dominicana', neutro: 'dominicano(a)' },
  { M: 'russo', F: 'russa', neutro: 'russo(a)' },
  { M: 'sueco', F: 'sueca', neutro: 'sueco(a)' },
  { M: 'austríaco', F: 'austríaca', neutro: 'austríaco(a)' },
  { M: 'grego', F: 'grega', neutro: 'grego(a)' },
  { M: 'turco', F: 'turca', neutro: 'turco(a)' },
  { M: 'indiano', F: 'indiana', neutro: 'indiano(a)' },
  { M: 'coreano', F: 'coreana', neutro: 'coreano(a)' },
  { M: 'sul-coreano', F: 'sul-coreana', neutro: 'sul-coreano(a)' },
  { M: 'iraniano', F: 'iraniana', neutro: 'iraniano(a)' },
  { M: 'sírio', F: 'síria', neutro: 'sírio(a)' },
  { M: 'australiano', F: 'australiana', neutro: 'australiano(a)' },
  { M: 'angolano', F: 'angolana', neutro: 'angolano(a)' },
  { M: 'moçambicano', F: 'moçambicana', neutro: 'moçambicano(a)' },
  { M: 'cabo-verdiano', F: 'cabo-verdiana', neutro: 'cabo-verdiano(a)' },
  { M: 'sul-africano', F: 'sul-africana', neutro: 'sul-africano(a)' },
];

// Nacionalidades que não variam por gênero
const INVARIANT_NATIONALITIES = [
  'canadense',
  'israelense',
  'indiense',
  'nicaraguense',
  'guianense',
  'costarriquenho',
];

export interface NationalityOption {
  value: string;
  label: string;
}

/**
 * Retorna sugestões de nacionalidade de acordo com o gênero selecionado.
 * genero: 'M' | 'F' | 'O' | ''
 */
export function getNacionalidadeOptions(genero: string): NationalityOption[] {
  const key: 'M' | 'F' | 'neutro' = genero === 'M' ? 'M' : genero === 'F' ? 'F' : 'neutro';

  const options: NationalityOption[] = NATIONALITY_ROOTS.map((item) => {
    const label = item[key];
    return { value: label, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });

  INVARIANT_NATIONALITIES.forEach((nat) => {
    options.push({ value: nat, label: nat.charAt(0).toUpperCase() + nat.slice(1) });
  });

  return options;
}

/**
 * Dado um valor de nacionalidade já preenchido (possivelmente na forma errada de gênero,
 * ou neutra "brasileiro(a)"), converte para a forma correspondente ao novo gênero.
 * Se o valor não corresponder a nenhuma raiz conhecida, retorna o valor original.
 */
export function convertNacionalidadeToGenero(currentValue: string, genero: string): string {
  if (!currentValue) return currentValue;

  const normalized = currentValue.trim().toLowerCase();
  const key: 'M' | 'F' | 'neutro' = genero === 'M' ? 'M' : genero === 'F' ? 'F' : 'neutro';

  for (const item of NATIONALITY_ROOTS) {
    const candidates = [item.M, item.F, item.neutro].map((v) => v.toLowerCase());
    if (candidates.includes(normalized)) {
      return item[key];
    }
  }

  // Nacionalidade invariável ou texto customizado não reconhecido
  return currentValue;
}
