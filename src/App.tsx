import React, { useState, useEffect } from 'react';
import { ContractData, ContractType } from './types/contract';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ContractForm } from './components/ContractForm';
import { ContractViewer } from './components/ContractViewer';
import { DigitalSignatureModal } from './components/DigitalSignatureModal';
import { WordTemplateModal } from './components/WordTemplateModal';
import { fetchContracts, saveContract, deleteContract, saveSignature } from './utils/contractsRepository';

export default function App() {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'dashboard' | 'form' | 'viewer'>('dashboard');
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [formDefaultType, setFormDefaultType] = useState<ContractType>('venda_vista');
  
  // Modal de modelos Word
  const [isWordTemplateModalOpen, setIsWordTemplateModalOpen] = useState(false);

  // Modal de assinatura rápida acionada diretamente pelo dashboard
  const [quickSignContract, setQuickSignContract] = useState<ContractData | null>(null);

  // Carregar contratos do Supabase ao iniciar
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await fetchContracts();
        setContracts(data);
        setLoadError(null);
      } catch (e: any) {
        console.error('Falha ao carregar contratos do Supabase', e);
        setLoadError(e.message || 'Falha ao carregar contratos.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleCreateNewContract = (type: ContractType = 'venda_vista') => {
    setSelectedContract(null);
    setFormDefaultType(type);
    setCurrentView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditContract = () => {
    setCurrentView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveContractFromForm = async (savedContract: ContractData) => {
    try {
      const persisted = await saveContract(savedContract);
      setContracts((prev) => {
        const existsIndex = prev.findIndex((c) => c.id === persisted.id);
        if (existsIndex >= 0) {
          const next = [...prev];
          next[existsIndex] = persisted;
          return next;
        }
        return [persisted, ...prev];
      });
      setSelectedContract(persisted);
      setCurrentView('viewer');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      console.error('Falha ao salvar contrato no Supabase', e);
      alert(e.message || 'Falha ao salvar contrato.');
    }
  };

  const handleUpdateContractFromViewer = async (updatedContract: ContractData) => {
    try {
      const persisted = await saveContract(updatedContract);
      setContracts((prev) =>
        prev.map((c) => (c.id === persisted.id ? persisted : c))
      );
      setSelectedContract(persisted);
    } catch (e: any) {
      console.error('Falha ao atualizar contrato no Supabase', e);
      alert(e.message || 'Falha ao atualizar contrato.');
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    try {
      await deleteContract(contractId);
      setContracts((prev) => prev.filter((c) => c.id !== contractId));
      if (selectedContract?.id === contractId) {
        setSelectedContract(null);
        setCurrentView('dashboard');
      }
    } catch (e: any) {
      console.error('Falha ao excluir contrato no Supabase', e);
      alert(e.message || 'Falha ao excluir contrato.');
    }
  };

  const handleSelectContractToView = (contract: ContractData) => {
    setSelectedContract(contract);
    setCurrentView('viewer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickSignConfirm = async (signature: any) => {
    if (!quickSignContract) return;

    const filtered = quickSignContract.assinaturas.filter((a) => a.role !== signature.role);
    const updatedSignatures = [...filtered, signature];

    const isFullySigned =
      updatedSignatures.some((a) => a.role === 'vendedor') &&
      updatedSignatures.some((a) => a.role === 'comprador');

    const updatedContract: ContractData = {
      ...quickSignContract,
      assinaturas: updatedSignatures,
      status: isFullySigned ? 'assinado_total' : 'assinado_parcial',
    };

    try {
      await saveSignature(quickSignContract.id, signature);
      await handleUpdateContractFromViewer(updatedContract);
    } catch (e: any) {
      console.error('Falha ao registrar assinatura no Supabase', e);
      alert(e.message || 'Falha ao registrar assinatura.');
    }
    setQuickSignContract(null);
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] text-slate-900 font-sans flex flex-col antialiased">
      {/* Barra de Navegação */}
      <Navbar
        currentView={currentView}
        onNavigateDashboard={() => {
          setCurrentView('dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNewContract={handleCreateNewContract}
        onOpenWordTemplates={() => setIsWordTemplateModalOpen(true)}
        contractCount={contracts.length}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {isLoading && (
          <div className="text-center text-slate-500 py-20">Carregando contratos...</div>
        )}

        {!isLoading && loadError && (
          <div className="text-center text-red-600 py-20">{loadError}</div>
        )}

        {!isLoading && !loadError && currentView === 'dashboard' && (
          <Dashboard
            contracts={contracts}
            onSelectContract={handleSelectContractToView}
            onNewContract={handleCreateNewContract}
            onDeleteContract={handleDeleteContract}
            onSignContractDirect={(contract) => setQuickSignContract(contract)}
            onOpenWordTemplates={() => setIsWordTemplateModalOpen(true)}
          />
        )}

        {!isLoading && !loadError && currentView === 'form' && (
          <ContractForm
            initialData={selectedContract}
            defaultType={formDefaultType}
            onSave={handleSaveContractFromForm}
            onCancel={() => {
              if (selectedContract) {
                setCurrentView('viewer');
              } else {
                setCurrentView('dashboard');
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {!isLoading && !loadError && currentView === 'viewer' && selectedContract && (
          <ContractViewer
            contract={selectedContract}
            onBack={() => {
              setCurrentView('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onEdit={handleEditContract}
            onUpdateContract={handleUpdateContractFromViewer}
          />
        )}
      </main>

      {/* Modal Global de Modelos Word (.docx) */}
      {isWordTemplateModalOpen && (
        <WordTemplateModal
          isOpen={isWordTemplateModalOpen}
          initialType={selectedContract?.tipo || formDefaultType || 'venda_vista'}
          onClose={() => setIsWordTemplateModalOpen(false)}
        />
      )}

      {/* Modal de Assinatura Rápida Direta do Dashboard */}
      {quickSignContract && (
        <DigitalSignatureModal
          contract={quickSignContract}
          isOpen={true}
          onClose={() => setQuickSignContract(null)}
          onSign={handleQuickSignConfirm}
        />
      )}
    </div>
  );
}
