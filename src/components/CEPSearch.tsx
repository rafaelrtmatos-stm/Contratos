import React, { useState } from 'react';
import { fetchAddressByCEP, formatCEP, isValidCEP, fetchAddressByStreet } from '../utils/validators';
import { Search, AlertCircle, CheckCircle2, Loader, MapPin } from 'lucide-react';

interface CEPData {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

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
  const [mode, setMode] = useState<'cep' | 'street'>('cep');
  
  // Estado para modo CEP
  const [cep, setCEP] = useState(initialCEP);
  
  // Estado para modo Rua/Cidade
  const [rua, setRua] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUF] = useState('');
  const [results, setResults] = useState<CEPData[]>([]);
  
  // Estado comum
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSearchByCEP = async () => {
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

  const handleSearchByStreet = async () => {
    setError(null);
    setSuccess(false);
    setResults([]);

    if (!rua.trim() || !cidade.trim() || !uf.trim()) {
      setError('Preencha rua, cidade e UF');
      return;
    }

    setLoading(true);
    try {
      const endericos = await fetchAddressByStreet(rua, cidade, uf);
      if (endericos.length > 0) {
        setResults(endericos);
        setSuccess(true);
      } else {
        setError('Nenhum endereço encontrado para essa busca');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar endereço');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = (address: CEPData) => {
    onAddressFound({
      cep: address.cep,
      logradouro: address.logradouro,
      bairro: address.bairro,
      localidade: address.localidade,
      uf: address.uf,
    });
    setResults([]);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'cep') {
        handleSearchByCEP();
      } else {
        handleSearchByStreet();
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          🔍 Buscar Endereço
        </label>
        
        {/* Toggle de modo */}
        <div className="flex gap-1 ml-auto bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => { setMode('cep'); setResults([]); setError(null); }}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
              mode === 'cep'
                ? 'bg-green-500 text-white'
                : 'bg-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            CEP
          </button>
          <button
            type="button"
            onClick={() => { setMode('street'); setResults([]); setError(null); }}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
              mode === 'street'
                ? 'bg-green-500 text-white'
                : 'bg-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3 h-3" />
            Rua/Cidade
          </button>
        </div>
      </div>

      {/* Modo: Buscar por CEP */}
      {mode === 'cep' && (
        <div className="space-y-2">
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
              onClick={handleSearchByCEP}
              disabled={loading}
              className="px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg
                transition-colors flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Buscando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Buscar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modo: Buscar por Rua/Cidade */}
      {mode === 'street' && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={rua}
              onChange={(e) => setRua(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Rua/Avenida"
              disabled={loading}
              className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Cidade"
              disabled={loading}
              className="px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            
            <div className="flex gap-2">
              <input
                type="text"
                value={uf}
                onChange={(e) => setUF(e.target.value.toUpperCase().slice(0, 2))}
                onKeyPress={handleKeyPress}
                placeholder="UF"
                maxLength={2}
                disabled={loading}
                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm uppercase
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                  disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              
              <button
                type="button"
                onClick={handleSearchByStreet}
                disabled={loading}
                className="px-3 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg
                  transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagens de erro e sucesso */}
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

      {/* Resultados da busca por rua/cidade */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-700">{results.length} resultado(s) encontrado(s):</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {results.map((address, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectAddress(address)}
                className="w-full text-left p-2.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-blue-900">{address.logradouro}</p>
                <p className="text-xs text-blue-700">{address.bairro} - {address.localidade}/{address.uf}</p>
                <p className="text-xs text-blue-600 font-mono">{address.cep}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
