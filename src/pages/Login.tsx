import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Mail, Lock, AlertCircle, Loader2, ArrowLeft, Globe, ExternalLink } from 'lucide-react';
import { useNavigate, Navigate, useSearchParams, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const { user, loading: authLoading } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'signup') setIsSignUp(true);
    if (mode === 'login') setIsSignUp(false);
  }, [mode]);

  // If already authenticated, redirect to home
  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
           navigate('/');
        } else {
           setError('Conta criada! Verifique seu email para confirmar o cadastro (caso necessário) ou faça login se estiver habilitado auto-confirm.');
           setIsSignUp(false);
           setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 bg-dot-pattern flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar e explorar feed como visitante</span>
          </Link>
        </div>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white flex items-center justify-center mb-6 shadow-sm">
            <Sparkles className="w-6 h-6 text-white dark:text-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white  mb-2">
            {isSignUp ? 'Criar uma conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isSignUp 
              ? 'Junte-se à comunidade CLEAN e acesse recursos.' 
              : 'Entre com seus dados para acessar a comunidade.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col gap-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 font-medium leading-snug">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-bold text-gray-900 dark:text-white ">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 dark:focus:border-white transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-bold text-gray-900 dark:text-white ">Senha</label>
              {!isSignUp && (
                <button type="button" className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white  transition-colors">
                  Esqueceu a senha?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 dark:focus:border-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl text-sm font-bold mt-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSignUp ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          {isSignUp ? 'Já tem uma conta?' : 'Ainda não faz parte?'}
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            className="ml-1.5 font-bold text-black dark:text-white hover:underline focus:outline-none"
          >
            {isSignUp ? 'Fazer login' : 'Criar conta'}
          </button>
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800/80 text-center">
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
