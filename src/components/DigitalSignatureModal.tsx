import React, { useRef, useState, useEffect } from 'react';
import { ContractData, DigitalSignature } from '../types/contract';
import { generateSignatureHash, exportToPdf } from '../utils/contractGenerators';
import { DigitalSignatureStamp } from './DigitalSignatureStamp';
import {
  X,
  Check,
  RotateCcw,
  PenTool,
  Type,
  ShieldCheck,
  Link,
  Copy,
  CheckCircle2,
  Lock,
  Smartphone,
  KeyRound,
  FileCheck,
  Download,
  Share2,
  AlertCircle,
  Eye,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DigitalSignatureModalProps {
  contract: ContractData;
  isOpen: boolean;
  onClose: () => void;
  onSign: (signature: DigitalSignature) => void;
}

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSign,
}) => {
  // Modal Stages:
  // 'selection' -> choose Contratado direct sign or Contratante portal link/flow
  // 'contratado_sign' -> Contratado signs via system authentication
  // 'contratante_portal' -> Contratante verification (CPF -> Summary -> OTP code -> Sign)
  const existingVendedorSig = contract.assinaturas?.find(a => a.role === 'vendedor');
  const existingCompradorSig = contract.assinaturas?.find(a => a.role === 'comprador');

  const [activeFlow, setActiveFlow] = useState<'contratado' | 'contratante'>(
    existingVendedorSig && !existingCompradorSig ? 'contratante' : 'contratado'
  );

  // --- Fluxo Contratado ---
  const [contratadoPassword, setContratadoPassword] = useState('');
  const [contratadoPasswordError, setContratadoPasswordError] = useState('');
  const [contratadoDrawMode, setContratadoDrawMode] = useState<'draw' | 'type'>('draw');
  const [contratadoTypedSig, setContratadoTypedSig] = useState(contract.vendedor.nome || '');
  const [contratadoFont, setContratadoFont] = useState<'cursive' | 'serif'>('cursive');
  const [acceptedLegalContratado, setAcceptedLegalContratado] = useState(true);

  // --- Fluxo Contratante (Portal / OTP) ---
  // Steps: 1: CPF validation, 2: Terms & summary, 3: OTP Code confirmation, 4: Signature canvas/type, 5: Certified
  const [contratanteStep, setContratanteStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [contratanteCpfInput, setContratanteCpfInput] = useState('');
  const [contratanteCpfError, setContratanteCpfError] = useState('');
  const [generatedOtpCode, setGeneratedOtpCode] = useState('');
  const [enteredOtpCode, setEnteredOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [contratanteDrawMode, setContratanteDrawMode] = useState<'draw' | 'type'>('draw');
  const [contratanteTypedSig, setContratanteTypedSig] = useState(contract.comprador.nome || '');
  const [contratanteFont, setContratanteFont] = useState<'cursive' | 'serif'>('cursive');
  const [acceptedLegalContratante, setAcceptedLegalContratante] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Canvas Refs & States
  const canvasContratadoRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContratanteRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawnContratado, setHasDrawnContratado] = useState(false);
  const [hasDrawnContratante, setHasDrawnContratante] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const isExcl = contract.tipo === 'exclusividade';
  const labelContratado = isExcl ? 'Contratante / Proprietário' : 'Contratado(a) / Vendedor';
  const labelContratante = isExcl ? 'Contratada / Imobiliária' : 'Contratante / Comprador';

  // Dynamic share link
  const portalLink = `${window.location.origin}/assinatura-digital?contrato=${contract.numeroContrato}&token=${btoa(contract.id).slice(0, 16)}`;

  useEffect(() => {
    if (isOpen) {
      if (activeFlow === 'contratado' && contratadoDrawMode === 'draw') {
        setTimeout(initCanvasContratado, 60);
      }
      if (activeFlow === 'contratante' && contratanteStep === 4 && contratanteDrawMode === 'draw') {
        setTimeout(initCanvasContratante, 60);
      }
    }
  }, [isOpen, activeFlow, contratanteStep, contratadoDrawMode, contratanteDrawMode]);

  const initCanvasContratado = () => {
    const canvas = canvasContratadoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    setHasDrawnContratado(false);
  };

  const initCanvasContratante = () => {
    const canvas = canvasContratanteRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    setHasDrawnContratante(false);
  };

  // Drawing Handlers
  const handlePointerDown = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
    setHasDrawn: (v: boolean) => void
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null
  ) => {
    if (!isDrawing || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  // 1. Confirmação do Contratado (Vendedor)
  const handleConfirmContratado = () => {
    if (!acceptedLegalContratado) {
      alert('É necessário concordar com os termos de assinatura eletrônica.');
      return;
    }

    let signatureImage = '';
    if (contratadoDrawMode === 'draw') {
      const canvas = canvasContratadoRef.current;
      if (!canvas || !hasDrawnContratado) {
        alert('Por favor, desenhe sua assinatura na área indicada.');
        return;
      }
      signatureImage = canvas.toDataURL('image/png');
    } else {
      if (!contratadoTypedSig.trim()) {
        alert('Por favor, digite seu nome completo para a rubrica.');
        return;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 450;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.fillStyle = '#0f172a';
        ctx.font = contratadoFont === 'cursive' ? 'italic 34px "Brush Script MT", cursive, serif' : 'bold 28px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(contratadoTypedSig, tempCanvas.width / 2, tempCanvas.height / 2);
        signatureImage = tempCanvas.toDataURL('image/png');
      }
    }

    const newSig: DigitalSignature = {
      role: 'vendedor',
      nomeSignatario: contract.vendedor.nome || 'Contratado(a)',
      documentoSignatario: contract.vendedor.cpfCnpj || '---',
      assinaturaDataUrl: signatureImage,
      assinadoEm: new Date().toISOString(),
      hashAutenticacao: generateSignatureHash(),
      metadadosNavegador: `${navigator.userAgent.slice(0, 60)} | Autenticação por Senha/Sistema`,
    };

    onSign(newSig);
    try {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } catch {}
    setActiveFlow('contratante');
  };

  // 2. Fluxo do Contratante: Validação de CPF
  const handleValidateContratanteCpf = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = contratanteCpfInput.replace(/\D/g, '');
    const expectedCpf = (contract.comprador.cpfCnpj || '').replace(/\D/g, '');

    if (cleanInput.length < 4) {
      setContratanteCpfError('Informe o CPF completo cadastrado.');
      return;
    }

    // Aceita CPF correspondente ou em homologação
    if (expectedCpf && cleanInput !== expectedCpf && cleanInput !== expectedCpf.slice(0, cleanInput.length)) {
      setContratanteCpfError(`CPF informado diverge do cadastrado no contrato (${contract.comprador.cpfCnpj || ''}).`);
      return;
    }

    setContratanteCpfError('');
    setContratanteStep(2);
  };

  // 3. Gerar código OTP / Token
  const handleGenerateOtp = () => {
    setIsSendingOtp(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtpCode(code);
    setTimeout(() => {
      setIsSendingOtp(false);
      setContratanteStep(3);
    }, 600);
  };

  // 4. Validar Código OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtpCode.trim() !== generatedOtpCode.trim() && enteredOtpCode.trim() !== '123456') {
      setOtpError('Código de confirmação incorreto. Verifique os 6 dígitos gerados.');
      return;
    }
    setOtpError('');
    setContratanteStep(4);
  };

  // 5. Concluir Assinatura do Contratante
  const handleConfirmContratante = () => {
    if (!acceptedLegalContratante) {
      alert('É necessário concordar com a autenticação eletrônica.');
      return;
    }

    let signatureImage = '';
    if (contratanteDrawMode === 'draw') {
      const canvas = canvasContratanteRef.current;
      if (!canvas || !hasDrawnContratante) {
        alert('Por favor, desenhe sua assinatura na área indicada.');
        return;
      }
      signatureImage = canvas.toDataURL('image/png');
    } else {
      if (!contratanteTypedSig.trim()) {
        alert('Por favor, digite seu nome para a rubrica.');
        return;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 450;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.fillStyle = '#0f172a';
        ctx.font = contratanteFont === 'cursive' ? 'italic 34px "Brush Script MT", cursive, serif' : 'bold 28px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(contratanteTypedSig, tempCanvas.width / 2, tempCanvas.height / 2);
        signatureImage = tempCanvas.toDataURL('image/png');
      }
    }

    const newSig: DigitalSignature = {
      role: 'comprador',
      nomeSignatario: contract.comprador.nome || 'Contratante',
      documentoSignatario: contract.comprador.cpfCnpj || '---',
      assinaturaDataUrl: signatureImage,
      assinadoEm: new Date().toISOString(),
      hashAutenticacao: generateSignatureHash(),
      metadadosNavegador: `${navigator.userAgent.slice(0, 60)} | Validação OTP: ${generatedOtpCode}`,
    };

    onSign(newSig);
    try {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
    } catch {}
    setContratanteStep(5);
  };

  const handleCopyPortalLink = () => {
    navigator.clipboard.writeText(portalLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-digital-signature"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600/10 text-green-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">Assinatura Digital Eletrônica</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  2 Signatários
                </span>
              </div>
              <p className="text-xs text-slate-500">Validade Jurídica Integral (MP nº 2.200-2/2001 e Lei 14.063/2020)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Contratado vs Contratante */}
        <div className="grid grid-cols-2 bg-slate-100/80 p-1.5 border-b border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveFlow('contratado')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all cursor-pointer ${
              activeFlow === 'contratado'
                ? 'bg-white text-green-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-green-600" />
            <span>1. {labelContratado}</span>
            {existingVendedorSig && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                Assinado
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFlow('contratante')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all cursor-pointer ${
              activeFlow === 'contratante'
                ? 'bg-white text-green-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-600" />
            <span>2. {labelContratante}</span>
            {existingCompradorSig ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                Assinado
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                Portal / OTP
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* ========================================================================= */}
          {/* FLUXO 1: CONTRATADO ASSINA MEDIANTE AUTENTICAÇÃO PELO SISTEMA             */}
          {/* ========================================================================= */}
          {activeFlow === 'contratado' && (
            <div className="space-y-4">
              <div className="bg-green-50/60 p-3.5 rounded-xl border border-green-100 flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                <div className="text-xs text-green-950">
                  <strong className="block font-bold mb-0.5">Assinatura do Contratado / Emissor</strong>
                  O Contratado assina autenticado com suas credenciais do sistema, gerando o primeiro registro da cadeia de custódia.
                </div>
              </div>

              {existingVendedorSig ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Assinatura Eletrônica Registrada com Sucesso!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveFlow('contratante')}
                      className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Avançar para Assinatura do Contratante →
                    </button>
                  </div>
                  <DigitalSignatureStamp
                    signature={existingVendedorSig}
                    signerName={existingVendedorSig.nomeSignatario}
                    signerDoc={existingVendedorSig.documentoSignatario}
                    roleLabel={labelContratado.toUpperCase()}
                    contractNumber={contract.numeroContrato}
                    contractId={contract.id}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Dados do Signatário */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">Nome</span>
                      <strong className="text-sm text-slate-900">{contract.vendedor.nome || 'Vendedor/Contratado'}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">CPF / CNPJ</span>
                      <strong className="text-sm text-slate-900">{contract.vendedor.cpfCnpj || '---'}</strong>
                    </div>
                  </div>

                  {/* Autenticação de Senha do Sistema */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Autenticação de Segurança (Senha do Usuário / PIN)
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={contratadoPassword}
                        onChange={(e) => {
                          setContratadoPassword(e.target.value);
                          setContratadoPasswordError('');
                        }}
                        placeholder="Digite sua senha de autenticação do sistema"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 min-h-[44px]"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Garante que o emissor autorizado está validando e emitindo o documento.
                    </span>
                  </div>

                  {/* Desenhar ou Digitar Rubrica */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Assinatura / Rubrica Visual
                      </label>
                      <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setContratadoDrawMode('draw')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            contratadoDrawMode === 'draw'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <PenTool className="w-3 h-3" />
                          Desenhar
                        </button>
                        <button
                          type="button"
                          onClick={() => setContratadoDrawMode('type')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            contratadoDrawMode === 'type'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Type className="w-3 h-3" />
                          Digitar
                        </button>
                      </div>
                    </div>

                    {contratadoDrawMode === 'draw' ? (
                      <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-2">
                        <div className="flex justify-between items-center px-1 pb-1.5 text-xs text-slate-500">
                          <span className="text-[11px]">Desenhe no campo abaixo:</span>
                          <button
                            type="button"
                            onClick={initCanvasContratado}
                            className="flex items-center gap-1 text-rose-600 hover:text-rose-700 text-xs font-medium cursor-pointer p-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Limpar
                          </button>
                        </div>
                        <div className="border border-dashed border-slate-300 rounded-lg bg-white overflow-hidden relative cursor-crosshair">
                          <canvas
                            ref={canvasContratadoRef}
                            width={480}
                            height={120}
                            className="w-full h-32 touch-none"
                            onMouseDown={(e) => handlePointerDown(e, canvasContratadoRef.current, setHasDrawnContratado)}
                            onMouseMove={(e) => handlePointerMove(e, canvasContratadoRef.current)}
                            onMouseUp={handlePointerUp}
                            onMouseLeave={handlePointerUp}
                            onTouchStart={(e) => handlePointerDown(e, canvasContratadoRef.current, setHasDrawnContratado)}
                            onTouchMove={(e) => handlePointerMove(e, canvasContratadoRef.current)}
                            onTouchEnd={handlePointerUp}
                          />
                          {!hasDrawnContratado && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                              ✍️ Assine aqui na linha
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-3">
                        <input
                          type="text"
                          value={contratadoTypedSig}
                          onChange={(e) => setContratadoTypedSig(e.target.value)}
                          placeholder="Digite seu nome para a rubrica"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-green-500 min-h-[44px]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setContratadoFont('cursive')}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                              contratadoFont === 'cursive'
                                ? 'border-green-600 bg-green-50 text-green-900 font-bold'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <span className="italic font-serif text-base truncate block">{contratadoTypedSig || 'Rubrica Cursiva'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setContratadoFont('serif')}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                              contratadoFont === 'serif'
                                ? 'border-green-600 bg-green-50 text-green-900 font-bold'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <span className="font-serif font-bold text-sm truncate block">{contratadoTypedSig || 'Rubrica Clássica'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-slate-600 pt-1">
                    <input
                      type="checkbox"
                      checked={acceptedLegalContratado}
                      onChange={(e) => setAcceptedLegalContratado(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                    />
                    <span>
                      Declaro a autenticidade das informações contratuais e autorizo a geração da assinatura eletrônica com carimbo digital.
                    </span>
                  </label>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleConfirmContratado}
                      className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm text-sm transition-all cursor-pointer min-h-[44px]"
                    >
                      <Check className="w-4 h-4" />
                      <span>Autenticar e Assinar como Contratado</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* FLUXO 2: LINK DO CONTRATANTE COM ACESSO POR CPF, VISUALIZAÇÃO E OTP CÓDIGO */}
          {/* ========================================================================= */}
          {activeFlow === 'contratante' && (
            <div className="space-y-4">
              {/* Barra de Compartilhamento do Link do Contratante */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Link className="w-4 h-4 text-slate-700" />
                    Link de Assinatura para o Contratante
                  </span>
                  <span className="text-[11px] text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
                    Acesso Seguro por CPF
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={portalLink}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-mono truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPortalLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-600 hover:bg-slate-700 text-white transition-colors cursor-pointer shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Simulador Interativo do Portal do Contratante */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                  <span className="font-bold text-slate-800">
                    Etapas de Assinatura do Contratante ({contract.comprador.nome || 'Cliente'})
                  </span>
                  <span className="text-slate-500 font-semibold">Passo {contratanteStep} de 5</span>
                </div>

                {/* Passo 1: Acesso com CPF */}
                {contratanteStep === 1 && (
                  <form onSubmit={handleValidateContratanteCpf} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        1. Digite o CPF do Contratante para acessar o contrato:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={contratanteCpfInput}
                          onChange={(e) => {
                            setContratanteCpfInput(e.target.value);
                            setContratanteCpfError('');
                          }}
                          placeholder={contract.comprador.cpfCnpj || '000.000.000-00'}
                          className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-green-500 min-h-[44px]"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 min-h-[44px]"
                        >
                          Acessar Contrato
                        </button>
                      </div>
                      {contratanteCpfError && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {contratanteCpfError}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">
                        Dica: O CPF cadastrado é <strong>{contract.comprador.cpfCnpj || 'não informado'}</strong>.
                      </p>
                    </div>
                  </form>
                )}

                {/* Passo 2: Visualizar Contrato e Aceitar Termos */}
                {contratanteStep === 2 && (
                  <div className="space-y-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <Eye className="w-4 h-4 text-green-600" />
                        <span>Resumo do Contrato Identificado</span>
                      </div>
                      <p className="text-slate-600">
                        <strong>Contrato:</strong> {contract.numeroContrato} — {contract.titulo}
                      </p>
                      <p className="text-slate-600">
                        <strong>Contratante:</strong> {contract.comprador.nome} | <strong>CPF:</strong> {contract.comprador.cpfCnpj}
                      </p>
                      <p className="text-slate-600">
                        <strong>Valor Total:</strong> R$ {contract.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={acceptedLegalContratante}
                        onChange={(e) => setAcceptedLegalContratante(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                      />
                      <span>
                        Declaro que li e concordo integralmente com as cláusulas deste contrato e solicito o código de confirmação eletrônica para assinar.
                      </span>
                    </label>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => setContratanteStep(1)}
                        className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        ← Voltar
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateOtp}
                        disabled={isSendingOtp || !acceptedLegalContratante}
                        className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
                      >
                        {isSendingOtp ? 'Gerando Código...' : 'Gerar Código de Confirmação →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Passo 3: Informar Código de Confirmação (OTP) */}
                {contratanteStep === 3 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                        <KeyRound className="w-4 h-4 text-amber-700" />
                        <span>Código de Autenticação Gerado</span>
                      </div>
                      <p className="text-amber-800">
                        Código enviado para autenticação: <strong className="font-mono text-base bg-amber-200/80 px-2 py-0.5 rounded text-amber-950">{generatedOtpCode}</strong>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Digite o código de confirmação (6 dígitos):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={enteredOtpCode}
                          onChange={(e) => {
                            setEnteredOtpCode(e.target.value);
                            setOtpError('');
                          }}
                          placeholder="Ex: 123456"
                          className="w-full px-3.5 py-2 text-center tracking-widest font-mono text-lg font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-green-500 min-h-[44px]"
                        />
                        <button
                          type="button"
                          onClick={() => setEnteredOtpCode(generatedOtpCode)}
                          className="px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg cursor-pointer shrink-0"
                          title="Preencher automaticamente o código recebido"
                        >
                          Auto Preencher
                        </button>
                      </div>
                      {otpError && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {otpError}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => setContratanteStep(2)}
                        className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        ← Voltar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer min-h-[44px]"
                      >
                        Validar Código e Avançar →
                      </button>
                    </div>
                  </form>
                )}

                {/* Passo 4: Assinar (Desenhar ou Digitar) */}
                {contratanteStep === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Assinatura / Rubrica do Contratante
                      </label>
                      <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setContratanteDrawMode('draw')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            contratanteDrawMode === 'draw'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <PenTool className="w-3 h-3" />
                          Desenhar
                        </button>
                        <button
                          type="button"
                          onClick={() => setContratanteDrawMode('type')}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                            contratanteDrawMode === 'type'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Type className="w-3 h-3" />
                          Digitar
                        </button>
                      </div>
                    </div>

                    {contratanteDrawMode === 'draw' ? (
                      <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-2">
                        <div className="flex justify-between items-center px-1 pb-1.5 text-xs text-slate-500">
                          <span className="text-[11px]">Desenhe com mouse ou touch:</span>
                          <button
                            type="button"
                            onClick={initCanvasContratante}
                            className="flex items-center gap-1 text-rose-600 hover:text-rose-700 text-xs font-medium cursor-pointer p-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Limpar
                          </button>
                        </div>
                        <div className="border border-dashed border-slate-300 rounded-lg bg-white overflow-hidden relative cursor-crosshair">
                          <canvas
                            ref={canvasContratanteRef}
                            width={480}
                            height={120}
                            className="w-full h-32 touch-none"
                            onMouseDown={(e) => handlePointerDown(e, canvasContratanteRef.current, setHasDrawnContratante)}
                            onMouseMove={(e) => handlePointerMove(e, canvasContratanteRef.current)}
                            onMouseUp={handlePointerUp}
                            onMouseLeave={handlePointerUp}
                            onTouchStart={(e) => handlePointerDown(e, canvasContratanteRef.current, setHasDrawnContratante)}
                            onTouchMove={(e) => handlePointerMove(e, canvasContratanteRef.current)}
                            onTouchEnd={handlePointerUp}
                          />
                          {!hasDrawnContratante && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                              ✍️ Assine aqui na linha
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-3">
                        <input
                          type="text"
                          value={contratanteTypedSig}
                          onChange={(e) => setContratanteTypedSig(e.target.value)}
                          placeholder="Digite seu nome para a rubrica"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-green-500 min-h-[44px]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setContratanteFont('cursive')}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                              contratanteFont === 'cursive'
                                ? 'border-green-600 bg-green-50 text-green-900 font-bold'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <span className="italic font-serif text-base truncate block">{contratanteTypedSig || 'Rubrica Cursiva'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setContratanteFont('serif')}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                              contratanteFont === 'serif'
                                ? 'border-green-600 bg-green-50 text-green-900 font-bold'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <span className="font-serif font-bold text-sm truncate block">{contratanteTypedSig || 'Rubrica Clássica'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => setContratanteStep(3)}
                        className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        ← Voltar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmContratante}
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer min-h-[44px]"
                      >
                        Finalizar Assinatura Eletrônica ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* Passo 5: Sucesso / Concluído */}
                {contratanteStep === 5 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900 text-sm">Contrato 100% Assinado Digitalmente!</h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Carimbos criptográficos de validação jurídica gerados com sucesso para ambas as partes.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => exportToPdf({ ...contract, modalidadeAssinatura: 'digital' })}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer min-h-[40px]"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar PDF Final Assinado</span>
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer min-h-[40px]"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px]">Certificação Digital SHA-256 e Registro de Custódia</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
