import React from 'react';
import { User, Users, UserPlus, ChevronDown } from 'lucide-react';

interface GenderSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
}

export const GenderSelect: React.FC<GenderSelectProps> = ({
  value,
  onChange,
  label = 'Gênero',
  required = false,
  error = false,
}) => {
  const options = [
    { value: 'M', label: 'Masculino', icon: User, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    { value: 'F', label: 'Feminino', icon: User, bgColor: 'bg-pink-100', textColor: 'text-pink-700' },
    { value: 'O', label: 'Outro', icon: UserPlus, bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  ];

  const selectedOption = options.find(opt => opt.value === value);
  const SelectedIcon = selectedOption?.icon || User;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
        <Users className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-red-600">*</span>}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none pl-11 pr-8 py-2.5 text-sm font-bold border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all cursor-pointer bg-white ${
            error ? 'border-red-500' : 'border-slate-300'
          }`}
        >
          <option value="">Selecione...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Ícone colorido estilo clipart à ESQUERDA */}
        {selectedOption && (
          <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${selectedOption.bgColor} rounded-full p-1.5 pointer-events-none shadow-sm`}>
            <SelectedIcon className={`w-4 h-4 ${selectedOption.textColor}`} />
          </div>
        )}

        {/* Chevron à DIREITA */}
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
};
