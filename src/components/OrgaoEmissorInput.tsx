import React, { useState } from 'react';
import { Landmark, ChevronDown, Edit3 } from 'lucide-react';

interface OrgaoEmissorInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: boolean;
  ufDefault?: string;
  className?: string;
}

interface OrgaoOption {
  value: string;
  label: string;
}

const COMMON_UF_COMBOS: OrgaoOption[] = [
  { value: 'SSP/PA', label: 'SSP/PA - Sec. Segurança Pública (Pará)' },
  { value: 'SSP/SP', label: 'SSP/SP - Sec. Segurança Pública (São Paulo)' },
  { value: 'SSP/MA', label: 'SSP/MA - Sec. Segurança Pública (Maranhão)' },
  { value: 'SSP/RJ', label: 'SSP/RJ - Sec. Segurança Pública (Rio de Janeiro)' },
  { value: 'SSP/MG', label: 'SSP/MG - Sec. Segurança Pública (Minas Gerais)' },
  { value: 'SSP/GO', label: 'SSP/GO - Sec. Segurança Pública (Goiás)' },
  { value: 'SSP/DF', label: 'SSP/DF - Sec. Segurança Pública (Distrito Federal)' },
  { value: 'SSP/CE', label: 'SSP/CE - Sec. Segurança Pública (Ceará)' },
  { value: 'SSP/BA', label: 'SSP/BA - Sec. Segurança Pública (Bahia)' },
  { value: 'SSP/PR', label: 'SSP/PR - Sec. Segurança Pública (Paraná)' },
  { value: 'SSP/SC', label: 'SSP/SC - Sec. Segurança Pública (Santa Catarina)' },
  { value: 'SSP/RS', label: 'SSP/RS - Sec. Segurança Pública (Rio Grande do Sul)' },
  { value: 'SSP/AM', label: 'SSP/AM - Sec. Segurança Pública (Amazonas)' },
  { value: 'SSP/AP', label: 'SSP/AP - Sec. Segurança Pública (Amapá)' },
  { value: 'SSP/TO', label: 'SSP/TO - Sec. Segurança Pública (Tocantins)' },
  { value: 'SSP/MT', label: 'SSP/MT - Sec. Segurança Pública (Mato Grosso)' },
  { value: 'SSP/MS', label: 'SSP/MS - Sec. Segurança Pública (Mato Grosso do Sul)' },
  { value: 'SSP/PE', label: 'SSP/PE - Sec. Segurança Pública (Pernambuco)' },
  { value: 'SSP/RN', label: 'SSP/RN - Sec. Segurança Pública (Rio Grande do Norte)' },
  { value: 'SSP/PB', label: 'SSP/PB - Sec. Segurança Pública (Paraíba)' },
  { value: 'SSP/AL', label: 'SSP/AL - Sec. Segurança Pública (Alagoas)' },
  { value: 'SSP/SE', label: 'SSP/SE - Sec. Segurança Pública (Sergipe)' },
  { value: 'SSP/PI', label: 'SSP/PI - Sec. Segurança Pública (Piauí)' },
  { value: 'SSP/RO', label: 'SSP/RO - Sec. Segurança Pública (Rondônia)' },
  { value: 'SSP/AC', label: 'SSP/AC - Sec. Segurança Pública (Acre)' },
  { value: 'SSP/RR', label: 'SSP/RR - Sec. Segurança Pública (Roraima)' },
  { value: 'SSP/ES', label: 'SSP/ES - Sec. Segurança Pública (Espírito Santo)' },
];

const SEGURANCA_ORGAOS: OrgaoOption[] = [
  { value: 'SSP', label: 'SSP - Secretaria de Segurança Pública' },
  { value: 'PC', label: 'PC - Polícia Civil' },
  { value: 'DETRAN', label: 'DETRAN - Departamento de Trânsito' },
  { value: 'PF', label: 'PF - Polícia Federal' },
  { value: 'PM', label: 'PM - Polícia Militar' },
  { value: 'CBM', label: 'CBM - Corpo de Bombeiros Militar' },
  { value: 'SESP', label: 'SESP - Secretaria de Estado de Seg. Pública' },
  { value: 'SEJUSP', label: 'SEJUSP - Sec. de Estado de Justiça e Seg. Pública' },
  { value: 'ITEP', label: 'ITEP - Inst. Técnico-Científico de Perícia' },
  { value: 'IGP', label: 'IGP - Instituto Geral de Perícias' },
  { value: 'SPTC', label: 'SPTC - Polícia Técnico-Científica' },
  { value: 'DIC', label: 'DIC - Diretoria de Identificação Civil' },
  { value: 'CARTORIO', label: 'CARTÓRIO - Cartório de Registro Civil' },
];

const CONSELHOS_ORGAOS: OrgaoOption[] = [
  { value: 'CRECI', label: 'CRECI - Conselho Regional de Corretores de Imóveis' },
  { value: 'OAB', label: 'OAB - Ordem dos Advogados do Brasil' },
  { value: 'CRM', label: 'CRM - Conselho Regional de Medicina' },
  { value: 'CREA', label: 'CREA - Conselho Regional de Engenharia' },
  { value: 'CRC', label: 'CRC - Conselho Regional de Contabilidade' },
  { value: 'COREN', label: 'COREN - Conselho Regional de Enfermagem' },
  { value: 'CRO', label: 'CRO - Conselho Regional de Odontologia' },
  { value: 'CRF', label: 'CRF - Conselho Regional de Farmácia' },
  { value: 'CRP', label: 'CRP - Conselho Regional de Psicologia' },
  { value: 'CRA', label: 'CRA - Conselho Regional de Administração' },
  { value: 'CAU', label: 'CAU - Conselho de Arquitetura e Urbanismo' },
];

const FORCAS_ARMADAS: OrgaoOption[] = [
  { value: 'EB', label: 'EB - Exército Brasileiro' },
  { value: 'FAB', label: 'FAB - Força Aérea Brasileira' },
  { value: 'MB', label: 'MB - Marinha do Brasil' },
];

export const OrgaoEmissorInput: React.FC<OrgaoEmissorInputProps> = ({
  value,
  onChange,
  label = 'Órgão Emissor',
  error = false,
  className = '',
}) => {
  const [isCustom, setIsCustom] = useState(false);

  const allKnownValues = [
    ...COMMON_UF_COMBOS.map((o) => o.value),
    ...SEGURANCA_ORGAOS.map((o) => o.value),
    ...CONSELHOS_ORGAOS.map((o) => o.value),
    ...FORCAS_ARMADAS.map((o) => o.value),
  ];

  const isKnown = allKnownValues.includes(value);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === 'OUTRO') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      onChange(selected);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5 text-slate-500" />
          <span>{label}</span>
        </span>
        <button
          type="button"
          onClick={() => setIsCustom(!isCustom)}
          className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          <span>{isCustom ? 'Escolher da lista' : 'Digitar manual'}</span>
        </button>
      </label>

      {!isCustom ? (
        <div className="relative">
          <select
            value={isKnown ? value : (value ? 'CUSTOM_VAL' : '')}
            onChange={handleSelectChange}
            className={`w-full appearance-none px-3 py-2.5 pr-8 text-xs font-bold uppercase border-2 rounded-xl bg-white text-slate-800
              focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all shadow-2xs cursor-pointer ${
                error ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300 hover:border-slate-400'
              }`}
          >
            <option value="">Selecione o Órgão Emissor...</option>

            {!isKnown && value && (
              <option value="CUSTOM_VAL">{value} (Atual)</option>
            )}

            <optgroup label="Mais Usados (com Estado / UF)">
              {COMMON_UF_COMBOS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>

            <optgroup label="Segurança Pública & Trânsito">
              {SEGURANCA_ORGAOS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>

            <optgroup label="Conselhos Profissionais">
              {CONSELHOS_ORGAOS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>

            <optgroup label="Forças Armadas">
              {FORCAS_ARMADAS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>

            <option value="OUTRO">✎ Outro / Digitar manualmente...</option>
          </select>

          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      ) : (
        <div className="flex gap-2 animate-in fade-in">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="Ex: SSP/PA, PC/SP, DIC, etc."
            autoFocus
            className={`w-full px-3 py-2.5 text-xs font-bold uppercase border-2 rounded-xl bg-white text-slate-800
              focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all shadow-2xs ${
                error ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
              }`}
          />
          <button
            type="button"
            onClick={() => setIsCustom(false)}
            className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Lista
          </button>
        </div>
      )}

      {/* Sugestões Rápidas mais usadas em 1 clique */}
      <div className="flex items-center gap-1 overflow-x-auto pt-0.5 pb-0.5 scrollbar-none">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight shrink-0 mr-0.5">
          Rápido:
        </span>
        {['SSP/PA', 'SSP/SP', 'SSP/MA', 'PC', 'DETRAN', 'PF', 'CRECI', 'OAB'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setIsCustom(false);
              onChange(item);
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
              value === item
                ? 'bg-amber-400 text-slate-950 shadow-2xs font-extrabold'
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

