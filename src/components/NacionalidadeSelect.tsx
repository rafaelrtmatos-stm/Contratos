import React from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { getNacionalidadeOptions } from '../utils/nacionalidade';

interface NacionalidadeSelectProps {
  value: string;
  onChange: (value: string) => void;
  genero: string;
  label?: string;
  required?: boolean;
  error?: boolean;
  className?: string;
}

export const NacionalidadeSelect: React.FC<NacionalidadeSelectProps> = ({
  value,
  onChange,
  genero,
  label = 'Nacionalidade',
  required = false,
  error = false,
  className = '',
}) => {
  const options = getNacionalidadeOptions(genero);

  // Normalização para comparar valores sem case-sensitive
  const normalizedValue = value ? value.trim().toLowerCase() : '';
  const hasCurrentValue = normalizedValue && options.some((opt) => opt.value.toLowerCase() === normalizedValue);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-slate-500" />
        <span>{label}</span>
        {required && <span className="text-rose-600 font-black">*</span>}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none px-3 py-2.5 pr-8 text-xs font-semibold border-2 rounded-xl bg-white text-slate-800
            focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all cursor-pointer shadow-2xs ${
              error ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 hover:border-slate-400'
            }`}
        >
          {!value && <option value="">Selecione a nacionalidade...</option>}
          {!hasCurrentValue && value && <option value={value}>{value}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
};
