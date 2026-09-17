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
  HelpCircle,
  User,
  AtSign,
  UserCheck
} from 'lucide-react';
import { useNavigate, Navigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resolveIdentifierToEmails, saveUserIdentifierMapping } from '../lib/userAuthLookup';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const { user, loading: authLoading } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [loginMethod, setLoginMethod] = useState<'username' | 'email'>('username');
  
  // Form fields
  const [identifier, setIdentifier] = useState(''); // username or email in login
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Sign up specific fields
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');

  // Password reset flow
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetInput, setResetInput] = useState('');
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

  const translateAuthError = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
      return 'Credenciais incorretas. Verifique a senha digitada ou seu usuário/e-mail.';
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
      return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
    }
    return message || 'Ocorreu um erro ao autenticar. Tente novamente.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      if (isSignUp) {
        // --- CADASTRO ---
        const cleanEmail = signUpEmail.trim().toLowerCase();
        const rawUsername = signUpUsername.trim().replace(/^@/, '');
        const cleanUsername = rawUsername.toLowerCase() || cleanEmail.split('@')[0];
        const cleanFullName = signUpFullName.trim() || cleanUsername;
        const cleanPassword = password;

        if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
          setError('Por favor, informe um endereço de e-mail válido.');
          setLoading(false);
          return;
        }

        if (cleanUsername.length < 3) {
          setError('O nome de usuário precisa ter pelo menos 3 caracteres.');
          setLoading(false);
          return;
        }

        const { error: signUpError, data } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              username: cleanUsername,
              full_name: cleanFullName,
            }
          }
        });

        if (signUpError) throw signUpError;

        // Remember username -> email mapping
        saveUserIdentifierMapping(cleanUsername, cleanEmail);

        if (data.session) {
          navigate('/');
        } else {
          setInfoMessage('Conta criada com sucesso! Você já pode entrar com seu e-mail ou @' + cleanUsername + '.');
          setIsSignUp(false);
          setIdentifier(cleanUsername);
          setLoginMethod('username');
          setPassword('');
        }
      } else {
        // --- LOGIN COM USERNAME OU E-MAIL ---
        const rawInput = identifier.trim();
        if (!rawInput) {
          setError(loginMethod === 'username' ? 'Digite seu nome de usuário.' : 'Digite seu e-mail.');
          setLoading(false);
          return;
        }

        // Resolves identifier (username or email) into email candidates
        const { isEmail, emailCandidates, username, foundProfile } = await resolveIdentifierToEmails(rawInput);

        if (isEmail) {
          // Login direto por e-mail
          const targetEmail = emailCandidates[0];
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: password,
          });

          if (signInError) throw signInError;

          // Se tiver username nos metadados ou perfil, salva o mapeamento
          if (signInData?.user) {
            const resolvedUsername = (signInData.user.user_metadata?.username as string) || signInData.user.email?.split('@')[0];
            if (resolvedUsername && signInData.user.email) {
              saveUserIdentifierMapping(resolvedUsername, signInData.user.email);
            }
          }

          navigate('/');
        } else {
          // Login por NOME DE USUÁRIO
          if (emailCandidates.length > 0) {
            let signedIn = false;
            let lastError: any = null;

            for (const candEmail of emailCandidates) {
              const { data: signInData, error: candError } = await supabase.auth.signInWithPassword({
                email: candEmail,
                password: password,
              });

              if (!candError && signInData.session) {
                signedIn = true;
                if (username) {
                  saveUserIdentifierMapping(username, candEmail);
                }
                navigate('/');
                return;
              } else {
                lastError = candError;
              }
            }

            if (!signedIn) {
              if (lastError) throw lastError;
              throw new Error('Senha incorreta para o usuário @' + (username || rawInput) + '.');
            }
          } else {
            // Nenhum e-mail mapeado ainda para esse username
            if (foundProfile) {
              setError(
                `Encontramos o usuário @${foundProfile.username}! Como é seu primeiro acesso por nome de usuário neste navegador, faça login uma vez com seu e-mail cadastrado para ativar a entrada direta por @username.`
              );
            } else {
              setError(
                `Nome de usuário "@${rawInput.replace(/^@/, '')}" não encontrado. Verifique a digitação ou entre usando seu e-mail.`
              );
            }
          }
        }
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

    const rawTarget = (resetInput || identifier || signUpEmail).trim();
    if (!rawTarget) {
      setResetError('Por favor, informe seu e-mail ou nome de usuário.');
      setResetLoading(false);
      return;
    }

    try {
      const { emailCandidates, isEmail } = await resolveIdentifierToEmails(rawTarget);
      const targetEmail = isEmail ? rawTarget.toLowerCase() : (emailCandidates[0] || null);

      if (!targetEmail) {
        setResetError('Não foi possível identificar o e-mail correspondente. Por favor, digite seu endereço de e-mail completo.');
        setResetLoading(false);
        return;
      }

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
              ? 'Defina seu @username e participe da comunidade.' 
              : 'Entre com seu nome de usuário ou e-mail.'}
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
                    Informe seu nome de usuário ou e-mail cadastrado. Enviaremos um link seguro para redefinir sua senha.
                  </p>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={resetInput}
                      onChange={(e) => setResetInput(e.target.value)}
                      placeholder="seu @username ou seu@email.com"
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
              {/* Se for MODO LOGIN: Alternador visual entre Nome de Usuário e E-mail */}
              {!isSignUp ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('username');
                        setError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        loginMethod === 'username'
                          ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-xs'
                          : 'text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <AtSign className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Nome de Usuário</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('email');
                        setError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        loginMethod === 'email'
                          ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-xs'
                          : 'text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>E-mail</span>
                    </button>
                  </div>

                  {/* Campo de Identificador (Username ou E-mail) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="identifier" className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        {loginMethod === 'username' ? 'Nome de Usuário' : 'E-mail da Conta'}
                      </label>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">
                        {loginMethod === 'username' ? 'ex: thalesdev' : 'seu@email.com'}
                      </span>
                    </div>
                    <div className="relative">
                      {loginMethod === 'username' ? (
                        <AtSign className="w-4 h-4 text-purple-600 dark:text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      ) : (
                        <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      )}
                      <input
                        id="identifier"
                        type={loginMethod === 'username' ? 'text' : 'email'}
                        required
                        autoComplete={loginMethod === 'username' ? 'username' : 'email'}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={loginMethod === 'username' ? 'thalesdev ou @thalesdev' : 'seu@email.com'}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 dark:focus:border-white transition-all text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Se for MODO SIGN UP: Nome, Username e E-mail */
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-name" className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Nome ou Apelido
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-name"
                        type="text"
                        required
                        value={signUpFullName}
                        onChange={(e) => setSignUpFullName(e.target.value)}
                        placeholder="Thales Alves"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 dark:focus:border-white transition-all text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="signup-username" className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Nome de Usuário (@username)
                      </label>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Único na rede</span>
                    </div>
                    <div className="relative">
                      <AtSign className="w-4 h-4 text-purple-600 dark:text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-username"
                        type="text"
                        required
                        value={signUpUsername}
                        onChange={(e) => setSignUpUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                        placeholder="thalesdev"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 dark:focus:border-white transition-all text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-email" className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-900 dark:focus:border-white transition-all text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

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

              {/* Badge informativa elegante */}
              <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-center gap-2 text-[11px] text-purple-900 dark:text-purple-300">
                <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>
                  {isSignUp 
                    ? 'Seu nome de usuário poderá ser usado para entrar em qualquer dispositivo.'
                    : loginMethod === 'username' 
                      ? 'Você pode entrar diretamente com seu @username e sua senha cadastrada.'
                      : 'Você pode alternar para entrar com seu @username a qualquer momento.'}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl text-sm font-bold mt-1 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSignUp ? 'Criar conta com @username' : 'Entrar na Conta'}
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
