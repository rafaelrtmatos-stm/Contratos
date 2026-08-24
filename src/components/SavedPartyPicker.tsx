import React, { useState } from 'react';
import { BookUser, Save, ChevronDown, Check } from 'lucide-react';
import { SavedParty, PartyDetailedInfo } from '../types/contract';

interface SavedPartyPickerProps {
  savedParties: SavedParty[];
  loading?: boolean;
  currentParty: PartyDetailedInfo;
  onSelect: (party: PartyDetailedInfo) => void;
  onSaveContact: () => Promise<void>;
}

// Barra suspensa (dropdown) para reaproveitar um Contratado/Vendedor já
// salvo, e botão para salvar os dados atualmente preenchidos como um
// novo contato reutilizável. Nada nos campos do formulário vem
// pré-preenchido por padrão — só o que o usuário escolher aqui.
export const SavedPartyPicker: React.FC<SavedPartyPickerProps> = ({
  savedParties,
  loading = false,
  currentParty,
  onSelect,
  onSaveContact,
}) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSelect = (id: string) => {
    if (!id) return;
    const party = savedParties.find((p) => p.id === id);
    if (party) onSelect(party.data);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveContact();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!currentParty.nome && !!currentParty.cpfCnpj;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-blue-50/60 border border-blue-100 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 shrink-0">
        <BookUser className="w-3.5 h-3.5" />
        Contatos salvos
      </div>

      <div className="relative flex-1 min-w-0">
        <select
          defaultValue=""
          disabled={loading || savedParties.length === 0}
          onChange={(e) => {
            handleSelect(e.target.value);
            e.target.value = '';
          }}
          className="w-full appearance-none px-3 py-2 pr-8 text-xs font-medium border border-blue-200 rounded-lg bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          <option value="">
            {loading
              ? 'Carregando...'
              : savedParties.length === 0
              ? 'Nenhum contato salvo ainda'
              : 'Selecionar contato salvo...'}
          </option>
          {savedParties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}{p.cpfCnpj ? ` — ${p.cpfCnpj}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 pointer-events-none" />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave || saving}
        title={canSave ? 'Salvar estes dados como contato reutilizável' : 'Preencha nome e CPF/CNPJ para salvar'}
        className={`flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg border transition-colors shrink-0 ${
          saved
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar contato'}
      </button>
    </div>
  );
};
