import React from 'react';
import { Landmark } from 'lucide-react';

interface OrgaoEmissorInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: boolean;
  ufDefault?: string;
  className?: string;
}

const COMMON_ORGAOS = [
  { sigla: 'SSP', desc: 'Secretaria de Segurança Pública' },
  { sigla: 'PC', desc: 'Polícia Civil' },
  { sigla: 'DETRAN', desc: 'Departamento de Trânsito' },
  { sigla: 'PF', desc: 'Polícia Federal' },
  { sigla: 'PM', desc: 'Polícia Militar' },
  { sigla: 'CBM', desc: 'Corpo de Bombeiros Militar' },
  { sigla: 'SESP', desc: 'Secretaria de Estado de Seg. Pública' },
  { sigla: 'SEJUSP', desc: 'Sec. de Estado de Justiça e Seg. Pública' },
  { sigla: 'ITEP', desc: 'Inst. Técnico-Científico de Perícia' },
  { sigla: 'IGP', desc: 'Instituto Geral de Perícias' },
  { sigla: 'OAB', desc: 'Ordem dos Advogados do Brasil' },
  { sigla: 'CRECI', desc: 'Conselho Regional de Corretores' },
  { sigla: 'CRM', desc: 'Conselho Regional de Medicina' },
  { sigla: 'CREA', desc: 'Conselho Regional de Engenharia' },
  { sigla: 'CRC', desc: 'Conselho Regional de Contabilidade' },
  { sigla: 'COREN', desc: 'Conselho Regional de Enfermagem' },
  { sigla: 'CRO', desc: 'Conselho Regional de Odontologia' },
  { sigla: 'CRF', desc: 'Conselho Regional de Farmácia' },
  { sigla: 'CRP', desc: 'Conselho Regional de Psicologia' },
  { sigla: 'CRA', desc: 'Conselho Regional de Administração' },
  { sigla: 'CAU', desc: 'Conselho de Arquitetura e Urbanismo' },
  { sigla: 'EB', desc: 'Exército Brasileiro' },
  { sigla: 'FAB', desc: 'Força Aérea Brasileira' },
  { sigla: 'MB', desc: 'Marinha do Brasil' },
];

export const OrgaoEmissorInput: React.FC<OrgaoEmissorInputProps> = ({
  value,
  onChange,
  label = 'Órgão Emissor',
  error = false,
  className = '',
}) => {
  const datalistId = React.useId();

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5 text-slate-500" />
          <span>{label}</span>
        </span>
        <span className="text-[10px] font-normal text-slate-400">ex: SSP/PA, PC/SP, PF</span>
      </label>

      <div className="relative">
        <input
          type="text"
          list={datalistId}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Ex: SSP/PA"
          className={`w-full px-3 py-2.5 text-xs font-semibold uppercase border-2 rounded-xl bg-white text-slate-800
            focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all shadow-2xs ${
              error ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 hover:border-slate-400'
            }`}
        />

        <datalist id={datalistId}>
          {COMMON_ORGAOS.map((o) => (
            <option key={o.sigla} value={o.sigla}>
              {o.desc}
            </option>
          ))}
        </datalist>
      </div>

      {/* Sugestões Rápidas mais usadas em 1 clique */}
      <div className="flex items-center gap-1 overflow-x-auto pt-0.5 pb-0.5">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight shrink-0 mr-0.5">
          Rápido:
        </span>
        {['SSP', 'PC', 'DETRAN', 'PF', 'CRECI', 'OAB'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              // Se já tem uma UF informada no campo (ex: /PA), preserva
              const ufMatch = value.match(/\/([A-Z]{2})/);
              const suffix = ufMatch ? `/${ufMatch[1]}` : '';
              onChange(`${item}${suffix}`);
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
              value.startsWith(item)
                ? 'bg-yellow-400 text-slate-950 shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};
