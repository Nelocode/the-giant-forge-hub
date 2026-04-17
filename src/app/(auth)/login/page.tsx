'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-40" />

      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#f91117]/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#d4772c]/5 blur-3xl pointer-events-none" />

      {/* Animated corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-[#f91117]/20 rounded-tl-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-[#f91117]/20 rounded-br-3xl" />
      <div className="absolute top-0 right-0 w-20 h-20 border-r border-t border-[#d4772c]/10 rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-20 h-20 border-l border-b border-[#d4772c]/10 rounded-bl-2xl" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-up">
        <div className="glass rounded-2xl p-8 border border-[#27272a] shadow-2xl"
          style={{ boxShadow: '0 0 0 1px rgba(249,17,23,0.05), 0 40px 80px rgba(0,0,0,0.8)' }}>
          
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/logo.webp"
              alt="Copper Giant"
              width={180}
              height={45}
              className="object-contain mb-4"
              priority
            />
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#f91117]/60 to-transparent mb-4" />
            <h1 className="text-xs font-bold tracking-[0.3em] text-[#a1a1aa] uppercase">
              The Giant Forge
            </h1>
            <p className="text-[10px] tracking-widest text-[#52525b] uppercase mt-1">
              Hub de Herramientas Internas
            </p>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#27272a] bg-[#141414] hover:bg-[#1f1f1f] hover:border-[#3f3f46] transition-all duration-200 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed mb-4 group"
          >
            {googleLoading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="group-hover:text-white/90">
              {googleLoading ? 'Conectando...' : 'Continuar con Google'}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#27272a]" />
            <span className="text-[11px] text-[#52525b] uppercase tracking-widest">o</span>
            <div className="flex-1 h-px bg-[#27272a]" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-[#27272a] text-white text-sm placeholder:text-[#52525b] focus:outline-none focus:border-[#f91117] focus:ring-1 focus:ring-[#f91117]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-[#27272a] text-white text-sm placeholder:text-[#52525b] focus:outline-none focus:border-[#f91117] focus:ring-1 focus:ring-[#f91117]/30 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/30 border border-red-900/30">
                <svg className="h-4 w-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3.5 rounded-xl bg-[#f91117] hover:bg-[#d70f14] text-white font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{ boxShadow: '0 0 20px rgba(249,17,23,0.3)' }}
            >
              <span className="relative z-10">
                {loading ? 'Iniciando sesión...' : 'Ingresar al Hub'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#f91117] to-[#ff3333] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[10px] text-[#3f3f46] mt-6 uppercase tracking-widest">
            Copper Giant Resources Corp · Uso Interno
          </p>
        </div>
      </div>
    </div>
  );
}
