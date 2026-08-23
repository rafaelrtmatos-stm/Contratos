import React, { useState } from 'react';
import { fetchAddressByCEP, formatCEP, isValidCEP } from '../utils/validators';
import { Search, AlertCircle, CheckCircle2, Loader } from 'lucide-react';

interface CEPSearchProps {
  initialCEP?: string;
  onAddressFound: (data: {
    cep: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  }) => void;
}

export const CEPSearch: React.FC<CEPSearchProps> = ({ initialCEP = '', onAddressFound }) => {
  const [cep, setCEP] = useState(initialCEP);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSearch = async () => {
    setError(null);
    setSuccess(false);

    if (!cep.trim()) {
      setError('Digite um CEP');
      return;
    }

    if (!isValidCEP(cep)) {
      setError('CEP deve ter 8 dígitos');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchAddressByCEP(cep);
      if (result) {
        onAddressFound({
          cep: result.cep,
          logradouro: result.logradouro,
          bairro: result.bairro,
          localidade: result.localidade,
          uf: result.uf,
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('CEP não encontrado');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar CEP');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        🔍 Buscar Endereço por CEP
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          value={cep}
          onChange={(e) => setCEP(formatCEP(e.target.value))}
          onKeyPress={handleKeyPress}
          placeholder="00000-000"
          maxLength={9}
          disabled={loading}
          className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
            disabled:bg-slate-100 disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg
            transition-colors flex items-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Buscar</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-700">Endereço encontrado e preenchido!</p>
        </div>
      )}
    </div>
  );
};
