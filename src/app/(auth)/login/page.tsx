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
