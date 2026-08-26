import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ContractData, ContractType } from './types/contract';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ContractForm } from './components/ContractForm';
import { ContractViewer } from './components/ContractViewer';
import { DigitalSignatureFlowModal } from './components/DigitalSignatureFlowModal';
import { AuditStamp } from './utils/signatureOtpUtils';

import { WordTemplateModal } from './components/WordTemplateModal';
import { TrashModal } from './components/TrashModal';
import { SettingsPanel } from './components/SettingsPanel';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth, hasPermission } from './utils/authContext';
import { fetchContracts, saveContract, deleteContract, saveSignature } from './utils/contractsRepository';
import { SignatureLink } from './pages/SignatureLink';
import { ValidatePage } from './pages/ValidatePage';

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Rota pública: cliente assina o contrato sem precisar de login */}
        <Route path="/assinar/:token" element={<SignatureLink />} />
        {/* Rota pública: qualquer um valida um código de assinatura (QR/selo) */}
        <Route path="/validar" element={<ValidatePage />} />
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
      <div className="min-h-screen bg-black flex items-center justify-center text-neutral-400 text-sm">
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
  
  // Modal de gestão de templates Word (.docx) e nuvem
  const [isWordTemplateModalOpen, setIsWordTemplateModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
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
    if (!hasPermission(profile, 'gerenciar_contratos')) {
      alert('Você não tem permissão para criar contratos. Fale com um administrador.');
      return;
    }
    setSelectedContract(null);
    setFormDefaultType(type);
    setCurrentView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditContract = () => {
    if (!hasPermission(profile, 'gerenciar_contratos')) {
      alert('Você não tem permissão para editar contratos. Fale com um administrador.');
      return;
    }
    // Regra de integridade: um contrato que já tem QUALQUER assinatura
    // (parcial ou total) nunca pode ser sobrescrito por uma edição - o
    // hash/selo gravado na assinatura foi calculado em cima do texto
    // como estava NAQUELE momento; editar o mesmo registro deixaria a
    // assinatura "pendurada" em um conteúdo que não é mais o que foi
    // de fato assinado. Em vez disso, "Editar" nesse caso cria uma
    // CÓPIA nova (id novo, sem assinaturas, status voltando a
    // rascunho) e o contrato assinado original permanece intocado.
    if (selectedContract && (selectedContract.assinaturas?.length || 0) > 0) {
      const confirmado = window.confirm(
        'Este contrato já tem assinatura registrada e não pode ser alterado diretamente.\n\n' +
          'Vou criar uma CÓPIA nova com os mesmos dados, sem nenhuma assinatura, para você editar. ' +
          'O contrato original assinado permanece salvo e inalterado.\n\nContinuar?'
      );
      if (!confirmado) return;

      const { id, numeroContrato, assinaturas, status, documentoUrl, documentoStoragePath, ...resto } = selectedContract;
      setSelectedContract({
        ...resto,
        id: '',
        numeroContrato: '',
        assinaturas: [],
        status: 'rascunho',
      } as ContractData);
    }

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

  // Salvar Rascunho: persiste no Supabase (mesma tabela/lógica de sempre),
  // mas NÃO navega pra outra tela - o usuário continua no formulário,
  // podendo terminar de preencher depois em outro dispositivo.
  const handleSaveDraftFromForm = async (savedContract: ContractData) => {
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
    } catch (e: any) {
      console.error('Falha ao salvar rascunho no Supabase', e);
      alert(e.message || 'Falha ao salvar rascunho.');
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
      // Agora é soft-delete (fica na Lixeira por 30 dias, restaurável) -
      // por isso os arquivos do Storage (docx/pdf) NÃO são apagados aqui.
      // Eles só são removidos de fato quando o contrato é excluído
      // definitivamente (na Lixeira) ou expurgado automaticamente.
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

  const handleContractRestored = (contract: ContractData) => {
    setContracts((prev) => (prev.some((c) => c.id === contract.id) ? prev : [contract, ...prev]));
  };

  const handleDeleteAllContracts = async () => {
    try {
      // Mesma lógica do delete individual: agora é soft-delete, então vai
      // tudo pra Lixeira (restaurável por 30 dias) em vez de apagar os
      // arquivos na hora.
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

    // Mesmo mapeamento usado em ContractViewer.tsx: em contratos de
    // EXCLUSIVIDADE os campos são invertidos (vendedor = Contratante/
    // proprietário, comprador = Contratado/corretor). Sem isso, o "quick
    // sign" gravava a assinatura do corretor com o nome/CPF do
    // Contratante (campo vendedor) e com role:'vendedor' - o que também
    // fazia o painel de detalhe (que já procura role:'comprador' nesse
    // tipo de contrato) nunca reconhecer que o corretor já tinha assinado.
    const isExclSig = quickSignContract.tipo === 'exclusividade';
    const dadosCorretorSig = isExclSig ? quickSignContract.comprador : quickSignContract.vendedor;
    const roleCorretorSig: 'vendedor' | 'comprador' = isExclSig ? 'comprador' : 'vendedor';

    const signature = {
      role: quickSignParte === 'usuario' ? roleCorretorSig : 'comprador',
      nomeSignatario: quickSignParte === 'usuario' ? dadosCorretorSig.nome : quickSignContract.comprador.nome,
      documentoSignatario: quickSignParte === 'usuario' ? dadosCorretorSig.cpfCnpj : quickSignContract.comprador.cpfCnpj,
      assinaturaDataUrl: auditStamp.signatureId,
      assinadoEm: auditStamp.dataAssinatura,
      hashAutenticacao: auditStamp.hashDocumento,
      ipAssinatura: auditStamp.ipAssinatura,
      metadadosNavegador: auditStamp.userAgent || navigator.userAgent,
      meioAutenticacao: 'Login e senha (revalidação via Supabase Auth)',
    };

    const filtered = quickSignContract.assinaturas.filter((a) => a.role !== signature.role);
    const updatedSignatures = [...filtered, signature];

    const isFullySigned = quickSignContract.modalidadeAssinatura === 'digital' && updatedSignatures.length >= 2;

    const updatedContract: ContractData = {
      ...quickSignContract,
      assinaturas: updatedSignatures,
      status: isFullySigned ? 'assinado_total' : 'assinado_parcial',
    };

    try {
      const assinadoEmServidor = await saveSignature(quickSignContract.id, signature);
      // Horário do dispositivo (auditStamp.dataAssinatura) é só um provisório
      // até aqui; o que vale para PDF/manifesto/log é o do servidor.
      signature.assinadoEm = assinadoEmServidor;
      const idx = updatedContract.assinaturas.findIndex((a) => a === signature);
      if (idx !== -1) updatedContract.assinaturas[idx] = { ...signature };
      await handleUpdateContractFromViewer(updatedContract);
      setQuickSignContract(null);
    } catch (e: any) {
      console.error('Falha ao registrar assinatura no Supabase', e);
      // Propaga o erro para o DigitalSignatureFlowModal: ele precisa saber
      // que a assinatura NÃO foi salva para não avançar para a tela de
      // "sucesso" (que libera o download do PDF com um selo inexistente
      // no banco). Mantém quickSignContract aberto para o usuário tentar de novo.
      throw e;
    }
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
        onOpenSettings={() => setIsSettingsPanelOpen(true)}
        onOpenWordTemplates={() => setIsWordTemplateModalOpen(true)}
        onOpenTrash={() => setIsTrashModalOpen(true)}
        contractCount={contracts.length}
        onSignOut={signOut}
        userEmail={profile?.email}
        userName={profile?.nome}
        canManageTemplates={hasPermission(profile, 'gerenciar_templates')}
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
              // Mesmo ajuste de handleQuickSignConfirm: em EXCLUSIVIDADE o
              // corretor assina com role:'comprador', não 'vendedor'.
              const roleCorretorAtual = contract.tipo === 'exclusividade' ? 'comprador' : 'vendedor';
              const corretorAssinou = contract.assinaturas?.some((a) => a.role === roleCorretorAtual);
              const compradorAssinou = contract.assinaturas?.some((a) => a.role === 'comprador');
              setQuickSignParte(corretorAssinou && !compradorAssinou ? 'comprador' : 'usuario');
              setQuickSignContract(contract);
            }}
            onOpenWordTemplates={() => setIsWordTemplateModalOpen(true)}
            canDeleteContracts={hasPermission(profile, 'excluir_contratos')}
            canViewFinanceiro={hasPermission(profile, 'ver_financeiro')}
          />
        )}

        {!isLoading && !loadError && currentView === 'form' && (
          <ContractForm
            initialData={selectedContract}
            defaultType={formDefaultType}
            onSave={handleSaveContractFromForm}
            onSaveDraft={handleSaveDraftFromForm}
            onCancel={() => {
              // selectedContract sem id acontece quando "Editar" criou uma
              // cópia (contrato original já assinado) e o usuário cancelou
              // antes de salvar - não há nada pra visualizar ainda, então
              // volta pro dashboard em vez de uma tela de viewer vazia.
              if (selectedContract?.id) {
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
            onDelete={handleDeleteContract}
          />
        )}
      </main>

      {/* Modal Unificado de Modelos Contratuais Word (.docx) & Nuvem */}
      {isWordTemplateModalOpen && (
        <WordTemplateModal
          isOpen={isWordTemplateModalOpen}
          onClose={() => setIsWordTemplateModalOpen(false)}
        />
      )}

      {/* Lixeira - contratos excluídos, restauráveis por 30 dias */}
      {isTrashModalOpen && (
        <TrashModal
          isOpen={isTrashModalOpen}
          onClose={() => setIsTrashModalOpen(false)}
          onContractRestored={handleContractRestored}
        />
      )}

      {/* Painel de Configurações */}
      {isSettingsPanelOpen && (
        <SettingsPanel
          isOpen={isSettingsPanelOpen}
          onClose={() => setIsSettingsPanelOpen(false)}
          contracts={contracts}
          onDeleteAllContracts={handleDeleteAllContracts}
          isAdmin={hasPermission(profile, 'gerenciar_usuarios')}
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
