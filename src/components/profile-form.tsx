'use client';

import { useState, useRef } from 'react';
import type { Session } from 'next-auth';
import { useSession, signIn } from 'next-auth/react';
import { getInitials } from '@/lib/utils';

export function ProfileForm({ session }: { session: Session }) {
  const { update } = useSession();
  const user = session.user as any;

  const [name, setName] = useState(user.name ?? '');
  const [avatar, setAvatar] = useState<string | null>(user.avatar ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [googleConnected, setGoogleConnected] = useState(!!user.googleAccessToken);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      let avatarUrl = avatar;

      // Upload avatar if changed
      if (uploadFile) {
        const fd = new FormData();
        fd.append('avatar', uploadFile);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Error subiendo imagen');
        avatarUrl = data.url;
        setAvatar(avatarUrl);
        setPreviewUrl(null);
      }

      // Update name / avatar in DB
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, name, avatar: avatarUrl }),
      });
      if (!res.ok) throw new Error('Error guardando cambios');

      // Update NextAuth session
      await update({ name, avatar: avatarUrl });
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Error desconocido' });
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = previewUrl ?? avatar;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f91117] mb-1">Configuración</p>
        <h1 className="text-2xl font-extrabold text-white">Mi Perfil</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Personaliza tu nombre, foto e integraciones.</p>
      </div>

      {/* Avatar card */}
      <div className="glass rounded-2xl p-6 mb-4 animate-fade-up" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#a1a1aa] mb-4">Foto de Perfil</h2>
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-[#27272a]"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#f91117] to-[#d4772c] flex items-center justify-center text-2xl font-bold text-white border-2 border-[#27272a]">
                {getInitials(name)}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#27272a] bg-[#141414] hover:bg-[#1f1f1f] text-white transition-all"
            >
              Cambiar foto
            </button>
            <p className="text-[10px] text-[#52525b] mt-2">JPG, PNG o WEBP. Máx 5MB.</p>
            {previewUrl && (
              <p className="text-[10px] text-[#d4772c] mt-1 flex items-center gap-1">
                <span>⬆</span> Lista para guardar
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Name card */}
      <div className="glass rounded-2xl p-6 mb-4 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#a1a1aa] mb-4">Información Personal</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">
              Nombre
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f91117] focus:ring-1 focus:ring-[#f91117]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">Email</label>
            <input
              type="email"
              value={user.email ?? ''}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#27272a]/50 text-[#52525b] text-sm cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">Rol</label>
            <div className="px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#27272a]/50">
              <span
                className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  background: user.role === 'admin' ? 'rgba(212,119,44,0.15)' : 'rgba(249,17,23,0.1)',
                  color: user.role === 'admin' ? '#d4772c' : '#f91117',
                  border: `1px solid ${user.role === 'admin' ? 'rgba(212,119,44,0.3)' : 'rgba(249,17,23,0.2)'}`,
                }}
              >
                {user.role === 'admin' ? '⚙ Administrador' : '◎ Usuario'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="glass rounded-2xl p-6 mb-6 animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#a1a1aa] mb-4">Integraciones</h2>
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#0d0d0d] border border-[#27272a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Google Calendar</p>
              <p className="text-[10px] text-[#a1a1aa]">
                {googleConnected ? 'Conectado — tus eventos aparecen en el calendario' : 'Conecta para ver tus reuniones y compromisos'}
              </p>
            </div>
          </div>
          {googleConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/30 border border-emerald-900/30">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Conectado</span>
            </div>
          ) : (
            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard/profile' })}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-[#1a1a1a] hover:bg-white/90 transition-all"
            >
              Conectar
            </button>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        {message && (
          <div className={`mb-4 p-3 rounded-xl border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-900/30 text-emerald-400'
              : 'bg-red-950/30 border-red-900/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}
        <button
          id="save-profile-btn"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-[#f91117] hover:bg-[#d70f14] text-white font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-50"
          style={{ boxShadow: '0 0 20px rgba(249,17,23,0.25)' }}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}
