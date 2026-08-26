import React, { useState } from 'react';
import { useAuth } from '../utils/authContext';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import { FileSignature, Lock, Mail, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (signInError) {
      setError(
        !isSupabaseConfigured
          ? 'Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações/env.'
          : 'E-mail ou senha inválidos.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 border border-neutral-200">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center p-1.5 shadow-md mb-3">
            <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#f5e283] via-[#dfb739] to-[#b8860b] flex items-center justify-center text-[#171202] font-bold shadow-xs">
              <FileSignature className="w-6 h-6 stroke-[2.2] text-[#171202]" />
            </div>
          </div>
          <h1 className="font-extrabold text-2xl text-neutral-950 tracking-tight">Contratos</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Acesse sua conta para continuar</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Configuração necessária</p>
              <p className="text-amber-700 mt-0.5">
                Defina <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> e <code className="bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> no painel de configurações para conectar ao seu banco de dados.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-500 text-slate-900 placeholder:text-slate-400"
                placeholder="seuemail@exemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-500 text-slate-900 placeholder:text-slate-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                title={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-gold text-slate-950 font-extrabold text-sm py-2.5 rounded-xl transition-all shadow-md shadow-yellow-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-slate-950" />}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};
