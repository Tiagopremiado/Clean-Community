import React, { useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, isAdminUser, normalizeProfile } from '../types';
import { convertImageToWebP, formatBytes, WebPConversionResult } from '../utils/image';
import { Camera, Upload, Check, AlertCircle, Loader2, Sparkles, Link2, Shield, RefreshCw, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface ProfileSettingsProps {
  user: User;
  profile: UserProfile | null;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export function ProfileSettings({ user, profile, onProfileUpdated }: ProfileSettingsProps) {
  const { refreshProfile } = useAuth();
  const { settings, updateSetting } = useSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultName = profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '';
  const defaultUsername = profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || '';
  const defaultAvatar = profile?.avatar || user.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.id}`;
  const defaultBio = profile?.bio || '';

  const [name, setName] = useState(defaultName);
  const [username, setUsername] = useState(defaultUsername);
  const [bio, setBio] = useState(defaultBio);
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);

  const [conversionInfo, setConversionInfo] = useState<WebPConversionResult | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [useManualUrl, setUseManualUrl] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Automatic WebP conversion with square center-crop and compression
      const result = await convertImageToWebP(file, 256, 0.82);
      setConversionInfo(result);
      setAvatarUrl(result.webpDataUrl);
      setUseManualUrl(false);
    } catch (err: any) {
      console.error('Image conversion error:', err);
      setErrorMessage(err.message || 'Erro ao processar imagem para formato WebP.');
    } finally {
      setIsProcessingImage(false);
      // Reset input value to allow selecting the same file again if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyManualUrl = () => {
    if (!manualUrlInput.trim()) return;
    setAvatarUrl(manualUrlInput.trim());
    setConversionInfo(null);
    setManualUrlInput('');
    setUseManualUrl(false);
  };

  const handleResetToDefaultAvatar = () => {
    const fallback = `https://api.dicebear.com/9.x/notionists/svg?seed=${user.id}`;
    setAvatarUrl(fallback);
    setConversionInfo(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanName = name.trim();

    if (!cleanName) {
      setErrorMessage('O nome não pode ficar vazio.');
      setSaving(false);
      return;
    }

    if (!cleanUsername) {
      setErrorMessage('O nome de usuário não pode ficar vazio e deve conter apenas letras, números e sublinhados.');
      setSaving(false);
      return;
    }

    try {
      const isTargetAdmin = isAdminUser(cleanUsername) || isAdminUser(profile?.username);

      const payload: Partial<UserProfile> & { id: string } = {
        id: user.id,
        name: cleanName,
        username: cleanUsername,
        bio: bio.trim() || null,
        avatar: avatarUrl,
        ...(isTargetAdmin ? { role: 'admin' } : {})
      };

      // Upsert into Supabase profiles table
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Keep Supabase Auth user_metadata in sync with new profile details
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: cleanName,
            username: cleanUsername,
            avatar_url: avatarUrl,
          }
        });
      } catch (authErr) {
        console.warn('Não foi possível sincronizar metadados do auth:', authErr);
      }

      await refreshProfile();

      if (onProfileUpdated && data) {
        const normalized = normalizeProfile(data as UserProfile);
        if (normalized) {
          onProfileUpdated(normalized);
        }
      }

      setSuccessMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMessage(err.message || 'Não foi possível salvar as alterações do perfil.');
    } finally {
      setSaving(false);
    }
  };

  const isUserAdmin = profile?.role === 'admin' || isAdminUser(username) || isAdminUser(profile?.username);
  const displayedRole = isUserAdmin ? 'ADMIN' : (profile?.role?.toUpperCase() || 'MEMBER');

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs transition-colors">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Configurações do Perfil</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          Personalize sua presença na CLEAN Community. O avatar é comprimido automaticamente em WebP.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm font-medium">
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center gap-3 text-red-800 dark:text-red-300 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Foto de Perfil Section */}
        <div className="flex flex-col gap-3 pb-6 border-b border-gray-100 dark:border-zinc-800">
          <label className="text-sm font-bold text-gray-900 dark:text-white">Foto de Perfil</label>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar Preview */}
            <div className="relative group">
              <img
                src={avatarUrl}
                alt={name || 'Avatar'}
                className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-zinc-700 object-cover shadow-xs bg-gray-50 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="absolute inset-0 rounded-full bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Trocar imagem"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-semibold mt-0.5">Alterar</span>
              </button>
            </div>

            {/* Upload Controls */}
            <div className="flex-1 flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImage}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isProcessingImage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Convertendo para WebP...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Enviar nova foto
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setUseManualUrl(!useManualUrl)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  Inserir URL
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefaultAvatar}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Restaurar avatar padrão gerado"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Avatar Padrão
                </button>
              </div>

              {/* WebP Conversion Badge / Egress Info */}
              {conversionInfo && (
                <div className="mt-1 inline-flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>Otimizado em WebP:</strong> {formatBytes(conversionInfo.sizeInBytes)} (redução de {conversionInfo.reductionPercentage}% no egress de tráfego)
                  </span>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Formatos aceitos: JPG, PNG, WebP, GIF. A imagem é automaticamente recortada em quadrado e convertida para <strong>WebP ultra-leve</strong> diretamente no navegador para máxima economia de dados.
              </p>
            </div>
          </div>

          {/* Optional manual URL input */}
          {useManualUrl && (
            <div className="mt-3 p-3.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={manualUrlInput}
                onChange={(e) => setManualUrlInput(e.target.value)}
                placeholder="https://exemplo.com/minha-foto.webp"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              <button
                type="button"
                onClick={handleApplyManualUrl}
                className="px-3.5 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Aplicar URL
              </button>
            </div>
          )}
        </div>

        {/* Tema do Aplicativo (adicionado diretamente no perfil) */}
        <div className="flex flex-col gap-3 pb-6 border-b border-gray-100 dark:border-zinc-800/80">
          <label className="text-sm font-bold text-gray-900 dark:text-zinc-50">Aparência do Aplicativo</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => updateSetting('theme', 'light')}
              className={cn(
                "flex flex-col items-center gap-2.5 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                settings.theme === 'light'
                  ? "border-black bg-zinc-50 dark:bg-zinc-800 text-black dark:text-white ring-1 ring-black"
                  : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-zinc-700"
              )}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span>Claro</span>
            </button>

            <button
              type="button"
              onClick={() => updateSetting('theme', 'dark')}
              className={cn(
                "flex flex-col items-center gap-2.5 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                settings.theme === 'dark'
                  ? "border-black dark:border-zinc-400 bg-zinc-900 text-white ring-1 ring-zinc-700"
                  : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-zinc-700"
              )}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              <span>Escuro</span>
            </button>

            <button
              type="button"
              onClick={() => updateSetting('theme', 'system')}
              className={cn(
                "flex flex-col items-center gap-2.5 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                settings.theme === 'system'
                  ? "border-black dark:border-zinc-400 bg-zinc-50 dark:bg-zinc-800 text-black dark:text-white ring-1 ring-black dark:ring-zinc-400"
                  : "border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-zinc-700"
              )}
            >
              <Monitor className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span>Sistema</span>
            </button>
          </div>
        </div>

        {/* Nome Completo */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-name" className="text-sm font-bold text-gray-900 dark:text-white">
            Nome Completo
          </label>
          <input
            id="settings-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu Nome"
            maxLength={60}
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 focus:border-gray-900 dark:focus:border-white transition-all"
          />
        </div>

        {/* Nome de Usuário (@username) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-username" className="text-sm font-bold text-gray-900 dark:text-white">
            Nome de Usuário (@username)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-semibold text-sm">
              @
            </span>
            <input
              id="settings-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="usuario"
              maxLength={30}
              className="w-full pl-8 pr-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 focus:border-gray-900 dark:focus:border-white transition-all font-mono"
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">Apenas letras minúsculas, números e sublinhados (_).</span>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-gray-100 dark:border-zinc-800">
            💡 <strong>Nota:</strong> Mudar seu nome de usuário altera apenas sua identificação visual. O login no app continuará sendo feito com seu e-mail cadastrado <strong>({user.email})</strong>.
          </p>
        </div>

        {/* Biografia */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="settings-bio" className="text-sm font-bold text-gray-900 dark:text-white">
              Biografia
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">{bio.length}/200</span>
          </div>
          <textarea
            id="settings-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            placeholder="Compartilhe o que você constrói com inteligência artificial, ferramentas que usa ou seu papel na comunidade..."
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/10 focus:border-gray-900 dark:focus:border-white transition-all resize-none"
          />
        </div>

        {/* Papel / Role (Read-only as per strict security rules) */}
        <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/80 rounded-xl flex items-start gap-3">
          <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 dark:text-white">Cargo Atual:</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase tracking-wide ${
                isUserAdmin 
                  ? 'bg-black dark:bg-white text-white dark:text-black' 
                  : 'bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200'
              }`}>
                {displayedRole}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Cargos e privilégios são gerenciados pela moderação e administração da comunidade.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving || isProcessingImage}
            className="px-6 py-2.5 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando alterações...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Salvar alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
