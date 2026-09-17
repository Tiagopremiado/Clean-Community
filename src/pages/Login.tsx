import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  Globe, 
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useNavigate, Navigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const { user, loading: authLoading } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Password reset flow
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'signup') setIsSignUp(true);
    if (mode === 'login') setIsSignUp(false);
  }, [mode]);

  // If already authenticated, redirect to home
  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  // Check if input looks like a username instead of email
  const trimmedEmail = email.trim();
  const looksLikeUsername = trimmedEmail.length > 2 && (!trimmedEmail.includes('@') || trimmedEmail.startsWith('@'));

  const translateAuthError = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
      return 'E-mail ou senha incorretos. Lembre-se: use o e-mail cadastrado na conta (a alteração do seu nome de usuário não altera seu e-mail de login).';
    }
    if (lower.includes('email not confirmed')) {
      return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e spam.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Já existe uma conta cadastrada com este e-mail. Alterne para a opção "Entrar" abaixo.';
    }
    if (lower.includes('password should be at least')) {
      return 'A senha precisa ter pelo menos 6 caracteres.';
    }
    if (lower.includes('rate limit')) {
      return 'Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.';
    }
    return message || 'Ocorreu um erro ao autenticar. Tente novamente.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido (ex: seu@email.com). O login é realizado pelo seu e-mail, e não pelo @username.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          navigate('/');
        } else {
          setInfoMessage('Conta criada com sucesso! Se necessário, confirme seu e-mail para ativar o acesso.');
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (signInError) throw signInError;
        navigate('/');
      }
    } catch (err: any) {
      setError(translateAuthError(err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    const targetEmail = (resetEmail || email).trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setResetError('Por favor, informe um endereço de e-mail válido.');
      setResetLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw error;
      setResetSuccess(`Enviamos as instruções para ${targetEmail}. Verifique sua caixa de entrada e spam.`);
    } catch (err: any) {
      setResetError(err.message || 'Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 bg-dot-pattern flex flex-col items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar e navegar na comunidade</span>
          </Link>
        </div>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white flex items-center justify-center mb-5 shadow-xs">
            <Sparkles className="w-6 h-6 text-white dark:text-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            {isSignUp ? 'Criar uma conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isSignUp 
              ? 'Junte-se à CLEAN Community e colabore.' 
              : 'Entre com seu e-mail para acessar sua conta.'}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl shadow-xs border border-gray-100 dark:border-zinc-800 flex flex-col gap-5 transition-colors">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-300 font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-600 dark:text-emerald-300 font-medium leading-relaxed">{infoMessage}</p>
            </div>
          )}

          {/* Modal / Bloco de Recuperação de Senha */}
          {isForgotPasswordOpen ? (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Recuperar Senha</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordOpen(false);
                    setResetError(null);
                    setResetSuccess(null);
                  }}
                  className="text-xs text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              {resetError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg text-xs text-red-600 dark:text-red-300">
                  {resetError}
                </div>
              )}

              {resetSuccess ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  {resetSuccess}
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                    Informe seu e-mail cadastrado. Enviaremos um link seguro para você redefinir sua senha.
                  </p>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={resetEmail || email}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 dark:focus:border-white transition-all text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Enviar link de recuperação
                  </button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Campo E-mail */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="email" className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    E-mail da Conta
                  </label>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">Acesso principal</span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 dark:focus:border-white transition-all text-gray-900 dark:text-white"
                  />
                </div>

                {/* Dica amigável se digitar username */}
                {looksLikeUsername && (
                  <div className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/40 mt-1">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Dica: O login é feito com o seu <strong>e-mail completo</strong> (ex: seu@email.com), mesmo que você já tenha alterado o seu @username no perfil.
                    </span>
                  </div>
                )}
              </div>

              {/* Campo Senha */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Senha
                  </label>
                  {!isSignUp && (
                    <button 
                      type="button" 
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 dark:focus:border-white transition-all text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 cursor-pointer"
                    title={showPassword ? "Ocultar senha" : "Ver senha digitada"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nota explicativa permanente sobre login por email */}
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                ℹ️ <strong>Atenção:</strong> O login é sempre realizado com o seu <strong>e-mail cadastrado</strong>. Caso tenha trocado seu nome de usuário (@username), continue usando seu e-mail normalmente para entrar.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl text-sm font-bold mt-1 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSignUp ? 'Criar conta' : 'Entrar na Conta'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-5 text-sm text-gray-500 dark:text-gray-400">
          {isSignUp ? 'Já tem uma conta?' : 'Ainda não faz parte?'}
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setInfoMessage(null);
            }} 
            className="ml-1.5 font-bold text-black dark:text-white hover:underline focus:outline-none cursor-pointer"
          >
            {isSignUp ? 'Fazer login' : 'Criar conta'}
          </button>
        </p>

        <div className="mt-8 pt-6 border-t border-gray-200/60 dark:border-zinc-800/80 text-center">
          <a
            href="https://clean-community-three.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-zinc-200 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>clean-community-three.vercel.app</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
