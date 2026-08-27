import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  CheckCircle2,
  UserPlus,
  ExternalLink,
  Smartphone,
  FileText,
} from 'lucide-react';
import { ContractData } from '../types/contract';
import {
  generateClientRegistrationLink,
  getSavedBrokerPhone,
  setSavedBrokerPhone,
} from '../utils/clientRegistrationRepository';
import { formatPhone } from '../utils/validators';

interface ShareClientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: ContractData | null;
  defaultRole?: 'comprador' | 'vendedor' | 'locatario' | 'locador' | 'contratante' | string;
}

export const ShareClientRegistrationModal: React.FC<ShareClientRegistrationModalProps> = ({
  isOpen,
  onClose,
  contract,
  defaultRole = 'comprador',
}) => {
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [brokerPhone, setBrokerPhone] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBrokerPhone(getSavedBrokerPhone());
      setSelectedRole(defaultRole || 'comprador');
      setCopiedLink(false);
      setCopiedMessage(false);
    }
  }, [isOpen, defaultRole]);

  if (!isOpen) return null;

  const handleBrokerPhoneChange = (val: string) => {
    const formatted = formatPhone(val);
    setBrokerPhone(formatted);
    setSavedBrokerPhone(val);
  };

  const generatedLink = generateClientRegistrationLink({
    contractId: contract?.id,
    role: selectedRole,
    brokerPhone,
    contractNumber: contract?.numeroContrato,
  });

  const roleNameMap: Record<string, string> = {
    comprador: 'Comprador',
    vendedor: 'Vendedor / Proprietário',
    locatario: 'Locatário / Inquilino',
    locador: 'Locador / Proprietário',
    contratante: 'Contratante / Proprietário',
    fiador: 'Fiador',
  };

  const clientRoleLabel = roleNameMap[selectedRole] || 'Cliente';

  // Mensagem pronta para enviar ao cliente
  const clientInviteMessage = `Olá! 🤝\n\nPor favor, acesse o link seguro abaixo para preencher seus dados cadastrais para o nosso contrato imobiliário (*${contract?.numeroContrato || 'Contrato'}*):\n\n🔗 ${generatedLink}\n\nO preenchimento leva apenas 2 minutos com busca rápida de CEP e validação de documentos. Assim que concluir, o sistema já me avisa por aqui!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignore
    }
  };

  const handleCopyInviteMessage = async () => {
    try {
      await navigator.clipboard.writeText(clientInviteMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-yellow-400/20 text-yellow-700">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                Link de Auto-Cadastro de Cliente
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Envie o link para o cliente preencher os próprios dados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Card do Contrato */}
          {contract && (
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-left flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-md">
                    {contract.numeroContrato}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-800">
                    {contract.tipo}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">
                  {contract.titulo}
                </h4>
              </div>
            </div>
          )}

          {/* Seleção do Papel a Preencher */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Qual parte irá preencher este cadastro?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'comprador', label: 'Comprador' },
                { id: 'vendedor', label: 'Vendedor' },
                { id: 'locatario', label: 'Locatário (Inquilino)' },
                { id: 'locador', label: 'Locador' },
                { id: 'contratante', label: 'Contratante' },
                { id: 'fiador', label: 'Fiador' },
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`p-2.5 text-xs rounded-xl font-bold border transition-all text-center cursor-pointer ${
                    selectedRole === role.id
                      ? 'bg-yellow-400/20 border-yellow-400 ring-1 ring-yellow-400 text-slate-950 font-black'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Configuração do WhatsApp do Corretor */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Seu WhatsApp (para receber o aviso ao final):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Fica salvo</span>
            </label>
            <input
              type="text"
              value={brokerPhone}
              onChange={(e) => handleBrokerPhoneChange(e.target.value)}
              placeholder="Ex: (91) 98765-4321"
              maxLength={15}
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <p className="text-[10px] text-slate-500">
              Quando o cliente terminar o preenchimento, o WhatsApp dele abrirá automaticamente enviando o aviso para este número.
            </p>
          </div>

          {/* Link Gerado com Ações */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Link de Auto-Cadastro Gerado:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 px-3 py-2.5 text-xs font-mono text-slate-700 bg-slate-100 border border-slate-200 rounded-xl select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Ações Rápidas de Cópia e Teste */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleCopyInviteMessage}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedMessage ? 'Mensagem de convite copiada!' : 'Copiar mensagem completa de convite'}</span>
              </button>

              <a
                href={generatedLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-colors py-1.5 px-2"
              >
                <span>Testar formulário</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              Você pode colar o link direto ou a mensagem pronta no WhatsApp, e-mail ou onde preferir conversar com o cliente.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
