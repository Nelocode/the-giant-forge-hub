'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Session } from 'next-auth';
import { signIn } from 'next-auth/react';

interface CalEvent {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  all_day: number;
  color: string;
}

interface NewEventForm {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
}

const EVENT_COLORS = ['#f91117', '#d4772c', '#10b981', '#3b82f6', '#8b5cf6', '#eab308'];

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function CalendarView({ session }: { session: Session }) {
  const user = session.user as any;
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState<NewEventForm>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    color: '#f91117',
  });
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function getEventsForDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.start_time.startsWith(dateStr));
  }

  function openFormForDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(date);
    setForm(f => ({ ...f, start_time: `${dateStr}T09:00`, end_time: `${dateStr}T10:00` }));
    setShowForm(true);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ title: '', description: '', start_time: '', end_time: '', all_day: false, color: '#f91117' });
        await loadEvents();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(id: number) {
    await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
    await loadEvents();
  }

  // Calendar grid generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push(new Date(year, month - 1, daysInPrevMonth - i));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) {
    cells.push(new Date(year, month + 1, cells.length - daysInMonth - firstDay + 1));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upcoming events (next 7 days)
  const upcoming = events
    .filter(e => new Date(e.start_time) >= today)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f91117] mb-1">Agenda</p>
          <h1 className="text-2xl font-extrabold text-white">Calendario</h1>
        </div>
        <button
          onClick={() => { setSelectedDate(today); setForm(f => ({ ...f, start_time: `${today.toISOString().split('T')[0]}T09:00`, end_time: `${today.toISOString().split('T')[0]}T10:00` })); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f91117] hover:bg-[#d70f14] text-white text-sm font-bold transition-all"
          style={{ boxShadow: '0 0 16px rgba(249,17,23,0.3)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Evento
        </button>
      </div>

      {/* Google Calendar connect banner */}
      {!user?.googleAccessToken && (
        <div className="mb-4 flex items-center justify-between p-4 rounded-xl glass border border-[#27272a] animate-fade-up">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-white">Conecta Google Calendar</p>
              <p className="text-[10px] text-[#a1a1aa]">Sincroniza tus reuniones de Google automáticamente</p>
            </div>
          </div>
          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard/calendar' })}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-[#1a1a1a] hover:bg-white/90 transition-all flex-shrink-0"
          >
            Conectar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-3 glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-2 rounded-xl hover:bg-[#1a1a1a] text-[#a1a1aa] hover:text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">{MONTHS[month]}</h2>
              <p className="text-[11px] text-[#a1a1aa] font-mono">{year}</p>
            </div>
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-2 rounded-xl hover:bg-[#1a1a1a] text-[#a1a1aa] hover:text-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-[#52525b] py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const isCurrentMonth = date.getMonth() === month;
              const isToday = date.toDateString() === new Date().toDateString();
              const dayEvents = getEventsForDate(date);

              return (
                <button
                  key={i}
                  onClick={() => openFormForDate(date)}
                  className={`
                    relative aspect-square rounded-xl p-1.5 text-left transition-all duration-150
                    ${!isCurrentMonth ? 'opacity-20' : ''}
                    ${isToday ? 'ring-1 ring-[#f91117]' : 'hover:bg-[#1a1a1a]'}
                  `}
                  style={{ background: isToday ? 'rgba(249,17,23,0.08)' : 'transparent' }}
                >
                  <span className={`
                    block text-center text-[11px] font-semibold rounded-full w-5 h-5 mx-auto flex items-center justify-center
                    ${isToday ? 'bg-[#f91117] text-white' : isCurrentMonth ? 'text-white' : 'text-[#52525b]'}
                  `}>
                    {date.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 flex flex-col gap-0.5">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className="h-1 rounded-full w-full"
                          style={{ background: ev.color }}
                          title={ev.title}
                        />
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[8px] text-[#a1a1aa] text-center">+{dayEvents.length - 2}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming sidebar */}
        <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1aa] mb-4">Próximos Eventos</h3>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 shimmer rounded-xl" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs text-[#52525b]">Sin eventos próximos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(event => {
                const d = new Date(event.start_time);
                return (
                  <div key={event.id} className="group flex items-start gap-3 p-3 rounded-xl bg-[#0d0d0d] border border-[#27272a]/50 hover:border-[#3f3f46] transition-colors">
                    <div className="text-center min-w-[32px]">
                      <div className="text-[8px] text-[#a1a1aa] uppercase">{MONTHS[d.getMonth()].slice(0,3)}</div>
                      <div className="text-base font-bold text-white leading-tight">{d.getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{event.title}</p>
                      <p className="text-[10px] text-[#a1a1aa]">
                        {event.all_day ? 'Todo el día' : d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: event.color }} />
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#52525b] hover:text-[#f91117] transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create event modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-md glass rounded-2xl p-6 border border-[#27272a] animate-fade-up"
            style={{ boxShadow: '0 0 0 1px rgba(249,17,23,0.1), 0 40px 80px rgba(0,0,0,0.8)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-white">Nuevo Evento</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-[#52525b] hover:text-white hover:bg-[#1a1a1a] transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">Título *</label>
                <input
                  id="event-title"
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Reunión, llamada, entrega..."
                  className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f91117] focus:ring-1 focus:ring-[#f91117]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Detalles opcionales..."
                  className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f91117] focus:ring-1 focus:ring-[#f91117]/20 transition-all resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.all_day}
                    onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-xs text-[#a1a1aa]">Todo el día</span>
                </label>
              </div>
              {!form.all_day && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">Inicio *</label>
                    <input
                      type="datetime-local"
                      required
                      value={form.start_time}
                      onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f91117] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">Fin</label>
                    <input
                      type="datetime-local"
                      value={form.end_time}
                      onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0d0d0d] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f91117] transition-all"
                    />
                  </div>
                </div>
              )}
              {form.all_day && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={form.start_time.split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, start_time: `${e.target.value}T00:00`, end_time: '' }))}
                    className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f91117] transition-all"
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: c,
                        outline: form.color === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-[#f91117] hover:bg-[#d70f14] text-white font-bold text-sm transition-all disabled:opacity-50"
                style={{ boxShadow: '0 0 16px rgba(249,17,23,0.3)' }}
              >
                {saving ? 'Guardando...' : 'Crear Evento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
