import React, { useState, useEffect } from 'react';
import { fetchAddressByCEP, formatCEP, isValidCEP, fetchAddressByStreet, CEPData } from '../utils/validators';
import { Search, AlertCircle, CheckCircle2, Loader, X, MapPin } from 'lucide-react';

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

  // Modal para buscar por rua/cidade
  const [showModal, setShowModal] = useState(false);
  const [rua, setRua] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUF] = useState('');
  const [results, setResults] = useState<CEPData[]>([]);
  const [loadingStreet, setLoadingStreet] = useState(false);
  const [errorStreet, setErrorStreet] = useState<string | null>(null);

  // Busca automática quando CEP está completo
  useEffect(() => {
    if (cep && isValidCEP(cep)) {
      handleSearchByCEP(cep);
    }
  }, [cep]);

  const handleSearchByCEP = async (cepValue: string) => {
    setError(null);
    setSuccess(false);

    const cleanCEP = cepValue.replace(/\D/g, '');
    if (!isValidCEP(cleanCEP)) {
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Buscando CEP:', cleanCEP);
      const result = await fetchAddressByCEP(cleanCEP);
      
      if (result) {
        console.log('✅ CEP encontrado:', result);
        onAddressFound({
          cep: result.cep,
          logradouro: result.logradouro || '',
          bairro: result.bairro || '',
          localidade: result.localidade || '',
          uf: result.uf || '',
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError('CEP não encontrado');
      }
    } catch (err: any) {
      console.error('❌ Erro ao buscar CEP:', err);
      setError(err.message || 'Erro ao buscar CEP');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByStreet = async () => {
    setErrorStreet(null);
    setResults([]);

    if (!rua.trim() || !cidade.trim() || !uf.trim()) {
      setErrorStreet('Preencha rua, cidade e UF');
      return;
    }

    setLoadingStreet(true);
    try {
      console.log('🔍 Buscando por rua/cidade:', rua, cidade, uf);
      const endericos = await fetchAddressByStreet(rua, cidade, uf);
      
      if (endericos.length > 0) {
        console.log('✅ Endereços encontrados:', endericos.length);
        setResults(endericos);
      } else {
        setErrorStreet('Nenhum endereço encontrado para essa busca');
      }
    } catch (err: any) {
      console.error('❌ Erro ao buscar:', err);
      setErrorStreet(err.message || 'Erro ao buscar endereço');
    } finally {
      setLoadingStreet(false);
    }
  };

  const handleSelectAddress = (address: CEPData) => {
    const cepFormatado = address.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    setCEP(cepFormatado);
    onAddressFound({
      cep: address.cep,
      logradouro: address.logradouro,
      bairro: address.bairro,
      localidade: address.localidade,
      uf: address.uf,
    });
    setShowModal(false);
    setResults([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchByStreet();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        CEP
      </label>

      {/* Input CEP + Botão discreto de busca por rua/cidade */}
      <div className="flex gap-2">
        <input
          type="text"
          value={cep}
          onChange={(e) => setCEP(formatCEP(e.target.value))}
          placeholder="00000-000"
          maxLength={9}
          disabled={loading}
          className="flex-1 px-3 py-2.5 border-2 border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm font-bold
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
            disabled:bg-slate-100 disabled:cursor-not-allowed transition-all"
        />

        {/* Botão discreto para buscar por rua/cidade */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          title="Buscar CEP por rua/cidade"
        >
          {loading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mensagens de feedback */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-700">CEP encontrado!</p>
        </div>
      )}

      {/* MODAL: Buscar por rua/cidade */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-slate-600" />
                Buscar CEP por Rua/Cidade
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={rua}
                onChange={(e) => setRua(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Rua/Avenida"
                disabled={loadingStreet}
                className="w-full px-3 py-2.5 border-2 border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                  disabled:bg-slate-100 disabled:cursor-not-allowed"
              />

              <div className="flex gap-2">
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Cidade"
                  disabled={loadingStreet}
                  className="flex-1 px-3 py-2.5 border-2 border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                    disabled:bg-slate-100 disabled:cursor-not-allowed"
                />

                <input
                  type="text"
                  value={uf}
                  onChange={(e) => setUF(e.target.value.toUpperCase().slice(0, 2))}
                  onKeyPress={handleKeyPress}
                  placeholder="UF"
                  maxLength={2}
                  disabled={loadingStreet}
                  className="w-16 px-3 py-2.5 border-2 border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm uppercase font-bold
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                    disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>

              <button
                type="button"
                onClick={handleSearchByStreet}
                disabled={loadingStreet}
                className="w-full px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white text-sm font-bold rounded-lg
                  transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingStreet ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Buscar
                  </>
                )}
              </button>

              {errorStreet && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{errorStreet}</p>
                </div>
              )}

              {/* Resultados */}
              {results.length > 0 && (
                <div className="space-y-1.5 max-h-60 overflow-y-auto border-t border-slate-200 pt-3">
                  <p className="text-xs font-bold text-slate-700">{results.length} resultado(s):</p>
                  {results.map((address, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectAddress(address)}
                      className="w-full text-left p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-bold text-blue-900">{address.logradouro}</p>
                      <p className="text-xs text-blue-700">{address.bairro}</p>
                      <p className="text-xs text-blue-600">{address.localidade}/{address.uf}</p>
                      <p className="text-xs font-mono text-blue-500 mt-1">{address.cep}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
