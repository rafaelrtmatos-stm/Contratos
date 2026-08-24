import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ContractData, ContractType } from './types/contract';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ContractForm } from './components/ContractForm';
import { ContractViewer } from './components/ContractViewer';
import { DigitalSignatureFlowModal } from './components/DigitalSignatureFlowModal';
import { AuditStamp } from './utils/signatureOtpUtils';

import { TemplateManagerModal } from './components/TemplateManagerModal';
import { WordTemplateModal } from './components/WordTemplateModal';
import { SettingsPanel } from './components/SettingsPanel';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth } from './utils/authContext';
import { fetchContracts, saveContract, deleteContract, saveSignature } from './utils/contractsRepository';
import { SignatureLink } from './pages/SignatureLink';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública: cliente assina o contrato sem precisar de login */}
        <Route path="/assinar/:token" element={<SignatureLink />} />
        <Route
          path="*"
          element={
            <AuthProvider>
              <AuthGate />
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function AuthGate() {
  const { session, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return <MainApp />;
}

function MainApp() {
  const { profile, signOut } = useAuth();
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<'dashboard' | 'form' | 'viewer'>('dashboard');
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [formDefaultType, setFormDefaultType] = useState<ContractType>('venda_vista');
  
  // Modal de gestão de templates
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isWordTemplateModalOpen, setIsWordTemplateModalOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  // Modal de assinatura rápida acionada diretamente pelo dashboard
  const [quickSignContract, setQuickSignContract] = useState<ContractData | null>(null);
  const [quickSignParte, setQuickSignParte] = useState<'usuario' | 'comprador'>('usuario');

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

  const handleDeleteAllContracts = async () => {
    try {
      for (const contract of contracts) {
        await deleteContract(contract.id);
      }
      setContracts([]);
      setSelectedContract(null);
      
      // 🧹 Limpar cache do localStorage
      localStorage.removeItem('contracts_cache');
      localStorage.removeItem('contracts_last_updated');
      
      setCurrentView('dashboard');
    } catch (e: any) {
      console.error('Falha ao excluir contratos', e);
      throw new Error(e.message || 'Falha ao excluir contratos.');
    }
  };

  const handleSelectContractToView = (contract: ContractData) => {
    setSelectedContract(contract);
    setCurrentView('viewer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickSignConfirm = async (auditStamp: AuditStamp) => {
    if (!quickSignContract) return;

    const signature = {
      role: quickSignParte === 'usuario' ? 'vendedor' : 'comprador',
      nomeSignatario: quickSignParte === 'usuario' ? quickSignContract.vendedor.nome : quickSignContract.comprador.nome,
      documentoSignatario: quickSignParte === 'usuario' ? quickSignContract.vendedor.cpfCnpj : quickSignContract.comprador.cpfCnpj,
      assinaturaDataUrl: auditStamp.signatureId,
      assinadoEm: auditStamp.dataAssinatura,
      hashAutenticacao: auditStamp.hashDocumento,
      ipAssinatura: auditStamp.ipAssinatura,
      metadadosNavegador: auditStamp.userAgent || navigator.userAgent,
    };

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
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col antialiased">
      {/* Barra de Navegação */}
      <Navbar
        currentView={currentView}
        onNavigateDashboard={() => {
          setCurrentView('dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNewContract={handleCreateNewContract}
        onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
        onOpenSettings={() => setIsSettingsPanelOpen(true)}
        onOpenWordTemplates={() => setIsWordTemplateModalOpen(true)}
        contractCount={contracts.length}
        onSignOut={signOut}
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
            onSignContractDirect={(contract) => {
              const vendedorAssinou = contract.assinaturas?.some((a) => a.role === 'vendedor');
              const compradorAssinou = contract.assinaturas?.some((a) => a.role === 'comprador');
              setQuickSignParte(vendedorAssinou && !compradorAssinou ? 'comprador' : 'usuario');
              setQuickSignContract(contract);
            }}
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

      {/* Modal de Gestão de Templates (Padrões do Supabase) */}
      {isTemplateManagerOpen && (
        <TemplateManagerModal
          isOpen={isTemplateManagerOpen}
          onClose={() => setIsTemplateManagerOpen(false)}
        />
      )}

      {/* Modal de Gerenciamento de Modelos Word (.docx) */}
      {isWordTemplateModalOpen && (
        <WordTemplateModal
          isOpen={isWordTemplateModalOpen}
          onClose={() => setIsWordTemplateModalOpen(false)}
        />
      )}

      {/* Painel de Configurações */}
      {isSettingsPanelOpen && (
        <SettingsPanel
          isOpen={isSettingsPanelOpen}
          onClose={() => setIsSettingsPanelOpen(false)}
          contracts={contracts}
          onDeleteAllContracts={handleDeleteAllContracts}
          isAdmin={profile?.role === 'admin'}
        />
      )}

      {/* Modal de Assinatura Rápida Direta do Dashboard */}
      {quickSignContract && (
        <DigitalSignatureFlowModal
          contract={quickSignContract}
          parte={quickSignParte}
          onClose={() => setQuickSignContract(null)}
          onSignatureRegistered={handleQuickSignConfirm}
        />
      )}
    </div>
  );
}
