import React from 'react';
import { Users } from 'lucide-react';

interface GenderSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

export const GenderSelect: React.FC<GenderSelectProps> = ({
  value,
  onChange,
  label = 'Gênero',
  required = false,
}) => {
  const options = [
    { value: 'M', label: 'Masculino', emoji: '♂️' },
    { value: 'F', label: 'Feminino', emoji: '♀️' },
    { value: 'O', label: 'Outro', emoji: '⚪' },
  ];

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 block flex items-center gap-1">
        <Users className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-red-600">*</span>}
      </label>

      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
              value === option.value
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            <span className="mr-1">{option.emoji}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};
