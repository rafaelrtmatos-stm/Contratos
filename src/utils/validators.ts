/**
 * Validadores e formatadores de dados
 */

// =====================
// UUID Generator
// =====================
export function generateUUID(): string {
  return crypto.randomUUID();
}

// =====================
// VALIDAÇÃO DE CPF
// =====================
export function formatCPF(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

export function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false; // Todos os dígitos iguais
  
  let sum = 0;
  let remainder;
  
  // Validar primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10))) return false;
  
  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11))) return false;
  
  return true;
}

// =====================
// VALIDAÇÃO DE RG
// =====================
export function formatRG(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}-${clean.slice(8)}`;
}

export function isValidRG(rg: string): boolean {
  const clean = rg.replace(/\D/g, '');
  return clean.length >= 7 && clean.length <= 9;
}

// =====================
// VALIDAÇÃO DE TELEFONE
// =====================
export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 2) return clean;
  if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
}

export function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '');
  return clean.length >= 10 && clean.length <= 11;
}

// =====================
// VALIDAÇÃO DE CEP
// =====================
export function formatCEP(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
}

export function isValidCEP(cep: string): boolean {
  const clean = cep.replace(/\D/g, '');
  return clean.length === 8;
}

// =====================
// BUSCA POR CEP (ViaCEP API)
// =====================
export interface CEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export async function fetchAddressByCEP(cep: string): Promise<CEPData | null> {
  try {
    const clean = cep.replace(/\D/g, '');
    if (!isValidCEP(clean)) {
      throw new Error('CEP inválido');
    }

    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!response.ok) {
      throw new Error('Erro ao buscar CEP');
    }

    const data = await response.json();
    
    if (data.erro) {
      throw new Error('CEP não encontrado');
    }

    return data;
  } catch (error) {
    console.error('Erro na busca de CEP:', error);
    return null;
  }
}

/**
 * Busca CEP(s) por rua e cidade/UF
 * Retorna array de endereços encontrados
 */
export async function fetchAddressByStreet(
  rua: string,
  cidade: string,
  uf: string
): Promise<CEPData[]> {
  try {
    if (!rua.trim() || !cidade.trim() || !uf.trim()) {
      throw new Error('Preencha rua, cidade e UF');
    }

    const ruaLimpa = rua.replace(/\s+/g, '%20').trim();
    const cidadeLimpa = cidade.replace(/\s+/g, '%20').trim();
    const ufLimpa = uf.toUpperCase().trim();

    const response = await fetch(
      `https://viacep.com.br/ws/${ufLimpa}/${cidadeLimpa}/${ruaLimpa}/json/`
    );
    
    if (!response.ok) {
      throw new Error('Erro ao buscar endereço');
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      return data;
    } else if (data.erro) {
      throw new Error('Nenhum endereço encontrado para essa busca');
    }

    return [];
  } catch (error) {
    console.error('Erro na busca por rua/cidade:', error);
    throw error;
  }
}

// =====================
// CONVERSÃO PARA MAIÚSCULA
// =====================
export function toUpperCase(value: string | undefined | null): string {
  if (!value) return '';
  return value.toUpperCase().trim();
}

export function toUpperCaseObject<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = { ...obj };
  
  // Lista de campos de texto que devem ser maiúsculos
  const textFields = [
    'nome', 'sobrenome', 'nomeCompleto',
    'rua', 'avenida', 'logradouro', 'endereco',
    'bairro', 'cidade', 'municipio',
    'nomeEmpreendimento', 'empreendimento',
    'nomeLote', 'nomeQuadra',
    'nacionalidade',
    'titulo',
  ];

  Object.keys(result).forEach((key) => {
    if (textFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      if (typeof result[key] === 'string') {
        result[key] = toUpperCase(result[key]);
      }
    }
  });

  return result as T;
}

// =====================
// VALIDAÇÃO DE CNPJ
// =====================
export function formatCNPJ(value: string): string {
  const clean = value.replace(/\D/g, '');
  if (clean.length === 0) return '';
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

export function isValidCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false; // Todos os dígitos iguais
  
  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  let digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}
