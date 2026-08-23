import React from 'react';
import {
  formatCPF,
  isValidCPF,
  formatRG,
  isValidRG,
  formatPhone,
  isValidPhone,
  formatCNPJ,
  isValidCNPJ,
  formatCEP,
  isValidCEP,
} from '../utils/validators';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export type ValidationType = 'cpf' | 'cnpj' | 'rg' | 'phone' | 'cep' | 'text';

interface ValidatedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  validationType?: ValidationType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  showValidation?: boolean;
}

const validators: Record<ValidationType, { format: (v: string) => string; validate: (v: string) => boolean }> = {
  cpf: { format: formatCPF, validate: isValidCPF },
  cnpj: { format: formatCNPJ, validate: isValidCNPJ },
  rg: { format: formatRG, validate: isValidRG },
  phone: { format: formatPhone, validate: isValidPhone },
  cep: { format: formatCEP, validate: isValidCEP },
  text: { format: (v) => v, validate: (v) => !!v.trim() },
};

const placeholders: Record<ValidationType, string> = {
  cpf: '000.000.000-00',
  cnpj: '00.000.000/0000-00',
  rg: '00.000.000-00',
  phone: '(00) 00000-0000',
  cep: '00000-000',
  text: '',
};

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  value,
  onChange,
  validationType = 'text',
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  className = '',
  showValidation = true,
}) => {
  const validator = validators[validationType];
  const isValid = value.trim() === '' ? !required : validator.validate(value);
  const isEmpty = value.trim() === '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    if (validationType !== 'text') {
      newValue = validator.format(newValue);
    }
    onChange(newValue);
  };

  const getMaxLength = () => {
    if (maxLength) return maxLength;
    switch (validationType) {
      case 'cpf':
        return 14; // 000.000.000-00
      case 'cnpj':
        return 18; // 00.000.000/0000-00
      case 'rg':
        return 12; // 00.000.000-00
      case 'phone':
        return 15; // (00) 00000-0000
      case 'cep':
        return 9; // 00000-000
      default:
        return undefined;
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder || placeholders[validationType]}
          disabled={disabled}
          maxLength={getMaxLength()}
          className={`w-full px-3 py-2.5 border rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm
            focus:outline-none focus:ring-2 focus:border-transparent
            transition-colors
            disabled:bg-slate-100 disabled:cursor-not-allowed
            ${className}
            ${
              isEmpty
                ? 'border-slate-300 focus:ring-slate-400'
                : isValid
                  ? 'border-green-300 focus:ring-green-500'
                  : 'border-red-300 focus:ring-red-500'
            }`}
        />

        {showValidation && !isEmpty && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {showValidation && !isEmpty && !isValid && (
        <p className="text-xs text-red-600">
          {validationType === 'cpf' && 'CPF inválido'}
          {validationType === 'cnpj' && 'CNPJ inválido'}
          {validationType === 'rg' && 'RG deve ter 7-9 dígitos'}
          {validationType === 'phone' && 'Telefone deve ter 10-11 dígitos'}
          {validationType === 'cep' && 'CEP deve ter 8 dígitos'}
        </p>
      )}
    </div>
  );
};
