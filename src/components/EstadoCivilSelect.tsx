import React from 'react';
import { ChevronDown, Scale } from 'lucide-react';
import { getEstadoCivilOptions } from '../utils/civilStatus';

interface EstadoCivilSelectProps {
  value: string;
  onChange: (value: string) => void;
  genero: string;
  label?: string;
  required?: boolean;
  error?: boolean;
}

export const EstadoCivilSelect: React.FC<EstadoCivilSelectProps> = ({
  value,
  onChange,
  genero,
  label = 'Estado Civil',
  required = false,
  error = false,
}) => {
  const options = getEstadoCivilOptions(genero);

  // Garante que o valor atual apareça na lista mesmo que seja um texto customizado
  const hasCurrentValue = value && options.some((opt) => opt.value === value);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-700 block flex items-center gap-1">
        <Scale className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-red-600">*</span>}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none px-3 py-2.5 pr-8 text-xs font-bold border-2 rounded-lg bg-white
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all cursor-pointer ${
              error ? 'border-red-500' : 'border-slate-300'
            }`}
        >
          {!value && <option value="">Selecione...</option>}
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
