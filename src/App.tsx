import React, { useState, useEffect } from 'react';
import { ContractData, ContractType } from './types/contract';
import { INITIAL_SAMPLE_CONTRACTS } from './utils/contractGenerators';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ContractForm } from './components/ContractForm';
import { ContractViewer } from './components/ContractViewer';
import { DigitalSignatureModal } from './components/DigitalSignatureModal';
import { WordTemplateModal } from './components/WordTemplateModal';

const STORAGE_KEY = 'contratos_app_data_v1';

export default function App() {
  const [contracts, setContracts] = useState<ContractData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_SAMPLE_CONTRACTS;
  });

  const [currentView, setCurrentView] = useState<'dashboard' | 'form' | 'viewer'>('dashboard');
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [formDefaultType, setFormDefaultType] = useState<ContractType>('venda_vista');
  
  // Modal de modelos Word
  const [isWordTemplateModalOpen, setIsWordTemplateModalOpen] = useState(false);

  // Modal de assinatura rápida acionada diretamente pelo dashboard
  const [quickSignContract, setQuickSignContract] = useState<ContractData | null>(null);

  // Salvar no localStorage sempre que contracts mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
    } catch (e) {
      console.error('Falha ao salvar contratos no storage', e);
    }
  }, [contracts]);

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

  const handleSaveContractFromForm = (savedContract: ContractData) => {
    setContracts((prev) => {
      const existsIndex = prev.findIndex((c) => c.id === savedContract.id);
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = savedContract;
        return next;
      }
      return [savedContract, ...prev];
    });

    setSelectedContract(savedContract);
    setCurrentView('viewer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateContractFromViewer = (updatedContract: ContractData) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === updatedContract.id ? updatedContract : c))
    );
    setSelectedContract(updatedContract);
  };

  const handleDeleteContract = (contractId: string) => {
    setContracts((prev) => prev.filter((c) => c.id !== contractId));
    if (selectedContract?.id === contractId) {
      setSelectedContract(null);
      setCurrentView('dashboard');
    }
  };

  const handleSelectContractToView = (contract: ContractData) => {
    setSelectedContract(contract);
    setCurrentView('viewer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickSignConfirm = (signature: any) => {
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

    handleUpdateContractFromViewer(updatedContract);
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
        {currentView === 'dashboard' && (
          <Dashboard
            contracts={contracts}
            onSelectContract={handleSelectContractToView}
            onNewContract={handleCreateNewContract}
            onDeleteContract={handleDeleteContract}
            onSignContractDirect={(contract) => setQuickSignContract(contract)}
            onOpenWordTemplates={() => setIsWordTemplateModalOpen(true)}
          />
        )}

        {currentView === 'form' && (
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

        {currentView === 'viewer' && selectedContract && (
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
