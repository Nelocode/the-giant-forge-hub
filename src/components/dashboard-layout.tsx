'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { getInitials } from '@/lib/utils';
import { useEasterEggs, CopperRushOverlay, MapleRushOverlay, PanicOverlay, LanternOverlay, EggToast, HiddenMineral } from '@/components/easter-eggs';

const NAV_ITEMS = [
  { href: '/dashboard',          label: 'Hub',        icon: '⬡' },
  { href: '/dashboard/calendar', label: 'Calendario', icon: '📅' },
  { href: '/dashboard/admin',    label: 'Usuarios',   icon: '👥', adminOnly: true },
  { href: '/dashboard/profile',  label: 'Mi Perfil',  icon: '◎' },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const user = session?.user as any;
  const {
    copperRush, stopCopperRush,
    mapleRush, stopMapleRush,
    quakeMode,
    panicMode, stopPanicMode, triggerPanic,
    lanternMode,
    toast, clearToast,
    onTitleClick, onUptimeClick,
    onMineralFound
  } = useEasterEggs();

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ callbackUrl: '/login' });
  }

  const navItems = NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin' || user?.role === 'ceo');

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col">
      {lanternMode && <LanternOverlay />}
      {copperRush && <CopperRushOverlay onDone={stopCopperRush} />}
      {mapleRush && <MapleRushOverlay onDone={stopMapleRush} />}
      {panicMode && <PanicOverlay onDone={stopPanicMode} />}
      {toast && <EggToast message={toast.msg} icon={toast.icon} onDone={clearToast} />}
      <HiddenMineral onFound={onMineralFound} />

      {/* ── Top Header ── */}
      <header className="z-50 border-b border-[#27272a]/60 bg-[#000]/80 backdrop-blur-xl sticky top-0">
        <div className="flex items-center justify-between px-6 h-16">
          {/* Logo + Title */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" data-tour="logo" className="flex items-center gap-3 group" onClick={onTitleClick}>
              <Image
                src="/logo.webp"
                alt="Copper Giant"
                width={140}
                height={35}
                className="object-contain"
                priority
              />
              <div className="hidden sm:flex flex-col ml-1 pl-3 border-l border-[#27272a]">
                <span className="text-[11px] font-extrabold tracking-[0.2em] text-white uppercase leading-tight">
                  The Giant Forge
                </span>
                <span className="text-[9px] tracking-[0.3em] text-[#a1a1aa] uppercase leading-tight">
                  Hub de Herramientas
                </span>
              </div>
            </Link>
          </div>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0a0a0a] border border-[#27272a] rounded-full px-2 py-1.5">
            {navItems.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all duration-200
                    ${isActive
                      ? 'bg-[#f91117] text-white shadow-[0_0_12px_rgba(249,17,23,0.4)]'
                      : 'text-[#a1a1aa] hover:text-white hover:bg-[#1a1a1a]'
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: status + user */}
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div data-tour="live-status" className="hidden sm:flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-900/30 px-3 py-1 rounded-full cursor-pointer hover:bg-emerald-950/50 transition-colors" onClick={onUptimeClick}>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Live</span>
            </div>

            {/* User avatar */}
            <Link href="/dashboard/profile" className="flex items-center gap-2 group">
              <div className="relative">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-[#27272a] group-hover:border-[#f91117] transition-colors"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f91117] to-[#d4772c] flex items-center justify-center text-[11px] font-bold text-white border-2 border-[#27272a] group-hover:border-[#f91117] transition-colors">
                    {getInitials(user?.name ?? 'U')}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[11px] font-semibold text-white leading-tight">{user?.name}</span>
                <span className="text-[9px] uppercase tracking-widest leading-tight" style={{
                  color: user?.role === 'ceo' ? '#f91117' : user?.role === 'admin' ? '#d4772c' : '#a1a1aa'
                }}>
                  {user?.role === 'ceo' ? '⚡ CEO' : user?.role === 'admin' ? '⚙ Admin' : user?.role ?? 'Usuario'}
                </span>
              </div>
            </Link>

            {/* Sign out */}
            <button
              id="signout-btn"
              onClick={handleSignOut}
              disabled={signingOut}
              className="p-2 rounded-lg text-[#52525b] hover:text-[#f91117] hover:bg-[#f91117]/10 transition-all"
              title="Cerrar sesión"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex border-t border-[#27272a]/40">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex-1 py-2 text-center text-[10px] font-semibold uppercase tracking-widest transition-colors
                  ${isActive ? 'text-[#f91117] border-b-2 border-[#f91117]' : 'text-[#52525b]'}
                `}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#27272a]/30 px-6 py-2.5 flex items-center justify-between relative">
        <div
          onClick={triggerPanic}
          className="absolute bottom-0 right-0 w-2 h-2 opacity-0 hover:opacity-100 cursor-pointer"
          title="Shut down"
        />
        <span className="text-[9px] text-[#3f3f46] uppercase tracking-widest">
          Copper Giant Resources Corp · The Giant Forge v1.0
        </span>
        <span className="text-[9px] font-mono text-[#3f3f46]">
          Uso Interno Exclusivo
        </span>
      </footer>
    </div>
  );
}
