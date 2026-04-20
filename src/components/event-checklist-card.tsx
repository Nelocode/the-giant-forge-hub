// @ts-nocheck
'use client';

/* ─────────────────────────────────────────────────────────────
   Event Checklist Bento Card
   Empresa → Evento (con urgencia por color) → Checklist + IA
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback } from 'react';

/* ── Types ─────────────────────────────────────────────────── */
interface Company   { id: number; name: string; color: string; }
interface CEvent    { id: number; company_id: number; title: string; event_date: string; }
interface CItem     { id: number; event_id: number; task: string; done: number; ai_note: string | null; }

/* ── Urgency helpers ────────────────────────────────────────── */
function getDaysLeft(dateStr: string) {
  const now  = new Date(); now.setHours(0,0,0,0);
  const date = new Date(dateStr + 'T00:00:00');
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

function urgencyColor(daysLeft: number) {
  if (daysLeft < 0)  return '#6b7280'; // pasado — gris
  if (daysLeft <= 2) return '#ef4444'; // urgente — rojo
  if (daysLeft <= 6) return '#eab308'; // moderado — amarillo
  return '#10b981';                    // tranquilo — verde
}

function urgencyLabel(daysLeft: number) {
  if (daysLeft < 0)  return `Hace ${Math.abs(daysLeft)}d`;
  if (daysLeft === 0) return 'Hoy';
  if (daysLeft === 1) return 'Mañana';
  return `${daysLeft}d`;
}

/* ── Tiny input styles ──────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 9px', borderRadius: 7,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
  color: '#fff', fontSize: 11.5, outline: 'none',
  fontFamily: 'inherit',
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export function EventChecklistCard() {
  const [companies,       setCompanies]       = useState<Company[]>([]);
  const [events,          setEvents]          = useState<CEvent[]>([]);
  const [items,           setItems]           = useState<CItem[]>([]);

  const [selCompany,      setSelCompany]      = useState<number | null>(null);
  const [selEvent,        setSelEvent]        = useState<number | null>(null);

  // Add-company form
  const [showAddCo,       setShowAddCo]       = useState(false);
  const [newCoName,       setNewCoName]       = useState('');
  const [newCoColor,      setNewCoColor]      = useState('#d4772c');

  // Add-event form
  const [showAddEv,       setShowAddEv]       = useState(false);
  const [newEvTitle,      setNewEvTitle]      = useState('');
  const [newEvDate,       setNewEvDate]       = useState('');

  // Add-item form
  const [newItemTask,     setNewItemTask]     = useState('');

  // AI loading state per item
  const [aiLoading,       setAiLoading]       = useState<Record<number, boolean>>({});

  /* ── Loaders ────────────────────────────────────────────── */
  const loadCompanies = useCallback(async () => {
    const r = await fetch('/api/companies');
    const d = await r.json();
    setCompanies(d.companies ?? []);
  }, []);

  const loadEvents = useCallback(async (companyId: number) => {
    const r = await fetch(`/api/company-events?companyId=${companyId}`);
    const d = await r.json();
    setEvents(d.events ?? []);
    setSelEvent(null);
    setItems([]);
  }, []);

  const loadItems = useCallback(async (eventId: number) => {
    const r = await fetch(`/api/checklist?eventId=${eventId}`);
    const d = await r.json();
    setItems(d.items ?? []);
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useEffect(() => { if (selCompany != null) loadEvents(selCompany); }, [selCompany, loadEvents]);
  useEffect(() => { if (selEvent   != null) loadItems(selEvent);    }, [selEvent,   loadItems]);

  /* ── Company actions ────────────────────────────────────── */
  async function addCompany() {
    if (!newCoName.trim()) return;
    await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCoName.trim(), color: newCoColor }),
    });
    setNewCoName(''); setShowAddCo(false);
    await loadCompanies();
  }

  async function deleteCompany(id: number) {
    await fetch(`/api/companies/${id}`, { method: 'DELETE' });
    if (selCompany === id) { setSelCompany(null); setEvents([]); setItems([]); }
    await loadCompanies();
  }

  /* ── Event actions ──────────────────────────────────────── */
  async function addEvent() {
    if (!newEvTitle.trim() || !newEvDate || selCompany == null) return;
    await fetch('/api/company-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: selCompany, title: newEvTitle.trim(), eventDate: newEvDate }),
    });
    setNewEvTitle(''); setNewEvDate(''); setShowAddEv(false);
    await loadEvents(selCompany);
  }

  async function deleteEvent(id: number) {
    await fetch(`/api/company-events/${id}`, { method: 'DELETE' });
    if (selEvent === id) { setSelEvent(null); setItems([]); }
    await loadEvents(selCompany!);
  }

  /* ── Checklist actions ──────────────────────────────────── */
  async function addItem() {
    if (!newItemTask.trim() || selEvent == null) return;
    await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: selEvent, task: newItemTask.trim() }),
    });
    setNewItemTask('');
    await loadItems(selEvent);
  }

  async function toggleDone(item: CItem) {
    await fetch(`/api/checklist/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: item.done ? 0 : 1 }),
    });
    await loadItems(selEvent!);
  }

  async function deleteItem(id: number) {
    await fetch(`/api/checklist/${id}`, { method: 'DELETE' });
    await loadItems(selEvent!);
  }

  async function generateAiNote(item: CItem) {
    if (!selEvent || !selCompany) return;
    const ev  = events.find(e => e.id === selEvent);
    const co  = companies.find(c => c.id === selCompany);
    if (!ev || !co) return;
    setAiLoading(p => ({ ...p, [item.id]: true }));
    try {
      const r = await fetch('/api/ai-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: ev.title,
          eventDate:  ev.event_date,
          company:    co.name,
          task:       item.task,
        }),
      });
      const d = await r.json();
      if (d.note) {
        await fetch(`/api/checklist/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ai_note: d.note }),
        });
        await loadItems(selEvent!);
      }
    } finally {
      setAiLoading(p => ({ ...p, [item.id]: false }));
    }
  }

  /* ── Derived ────────────────────────────────────────────── */
  const selCo  = companies.find(c => c.id === selCompany);
  const selEv  = events.find(e => e.id === selEvent);
  const completedCount = items.filter(i => i.done).length;

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <div className="h-full flex flex-col" style={{
      background: '#0b0b0b',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* ── Accent bar ── */}
      <div style={{
        height: 2, flexShrink: 0,
        background: 'linear-gradient(90deg, transparent, #7c3aed, #a855f7 60%, transparent)',
      }}/>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 13px 9px', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.055)',
      }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a855f7', marginBottom: 1 }}>
            Eventos
          </p>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Checklist de Eventos
          </h3>
        </div>
        {/* Add company button */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setShowAddCo(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: showAddCo ? '#a855f7' : 'rgba(255,255,255,0.28)',
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'color 0.2s',
          }}
        >
          <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
          Empresa
        </button>
      </div>

      {/* ── Add company form ── */}
      {showAddCo && (
        <div onMouseDown={e => e.stopPropagation()} style={{
          padding: '8px 13px', background: 'rgba(168,85,247,0.06)',
          borderBottom: '1px solid rgba(168,85,247,0.12)',
          display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0,
        }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Nombre de empresa"
            value={newCoName}
            onChange={e => setNewCoName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCompany()}
          />
          <input
            type="color"
            value={newCoColor}
            onChange={e => setNewCoColor(e.target.value)}
            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}
          />
          <button onClick={addCompany} style={{
            padding: '5px 10px', borderRadius: 6, background: '#7c3aed', border: 'none',
            color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}>OK</button>
        </div>
      )}

      {/* ── Body: 2-col layout ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Companies + Events ── */}
        <div style={{
          width: 160, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.055)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Company tabs */}
          {companies.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', textAlign: 'center', lineHeight: 1.5 }}>
                Agrega una empresa para comenzar
              </p>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Company list */}
              <div style={{ padding: '6px 8px 4px', flexShrink: 0 }}>
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 4 }}>Empresas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {companies.map(co => (
                    <div key={co.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => setSelCompany(co.id)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 7px', borderRadius: 7, cursor: 'pointer',
                          background: selCompany === co.id ? `${co.color}18` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${selCompany === co.id ? co.color + '50' : 'rgba(255,255,255,0.06)'}`,
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: co.color, flexShrink: 0 }}/>
                        <span style={{
                          fontSize: 10.5, fontWeight: selCompany === co.id ? 700 : 500,
                          color: selCompany === co.id ? '#fff' : 'rgba(255,255,255,0.55)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1, minWidth: 0,
                        }}>{co.name}</span>
                      </button>
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => deleteCompany(co.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 10, padding: '0 2px', flexShrink: 0 }}
                        title="Eliminar empresa"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events for selected company */}
              {selCompany != null && (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 8px 6px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
                    <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>Eventos</p>
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => setShowAddEv(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', fontSize: 13, lineHeight: 1 }}
                      title="Agregar evento"
                    >+</button>
                  </div>

                  {/* Add event inline form */}
                  {showAddEv && (
                    <div onMouseDown={e => e.stopPropagation()} style={{ marginBottom: 5, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <input
                        style={{ ...inputStyle, fontSize: 10 }}
                        placeholder="Nombre del evento"
                        value={newEvTitle}
                        onChange={e => setNewEvTitle(e.target.value)}
                      />
                      <input
                        type="date"
                        style={{ ...inputStyle, fontSize: 10, colorScheme: 'dark' }}
                        value={newEvDate}
                        onChange={e => setNewEvDate(e.target.value)}
                      />
                      <button onMouseDown={e => e.stopPropagation()} onClick={addEvent} style={{
                        padding: '4px 0', borderRadius: 6, background: '#7c3aed', border: 'none',
                        color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      }}>Agregar</button>
                    </div>
                  )}

                  {/* Event list */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }} className="no-scrollbar">
                    {events.length === 0 ? (
                      <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: 10 }}>Sin eventos</p>
                    ) : events.map(ev => {
                      const dl  = getDaysLeft(ev.event_date);
                      const col = urgencyColor(dl);
                      return (
                        <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={() => setSelEvent(ev.id)}
                            style={{
                              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                              padding: '5px 7px', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                              background: selEvent === ev.id ? `${col}18` : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${selEvent === ev.id ? col + '60' : 'rgba(255,255,255,0.05)'}`,
                              transition: 'all 0.15s', overflow: 'hidden',
                            }}
                          >
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              color: selEvent === ev.id ? '#fff' : 'rgba(255,255,255,0.6)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              width: '100%',
                            }}>{ev.title}</span>
                            <span style={{
                              fontSize: 8.5, fontWeight: 700, color: col,
                              marginTop: 1,
                            }}>● {urgencyLabel(dl)}</span>
                          </button>
                          <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={() => deleteEvent(ev.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: 10, padding: '0 2px', flexShrink: 0 }}
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Checklist ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selEvent == null ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ textAlign: 'center', opacity: 0.35 }}>
                <svg width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.5)" style={{ margin: '0 auto 8px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                  Selecciona un evento<br/>para ver su checklist
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Checklist header */}
              <div style={{ padding: '9px 11px 7px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: urgencyColor(getDaysLeft(selEv?.event_date ?? '')), marginBottom: 1 }}>
                  {selCo?.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {selEv?.title}
                  </p>
                  {items.length > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                      {completedCount}/{items.length}
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {items.length > 0 && (
                  <div style={{ marginTop: 5, height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(completedCount / items.length) * 100}%`,
                      background: completedCount === items.length ? '#10b981' : '#a855f7',
                      transition: 'width 0.4s ease',
                      borderRadius: 2,
                    }}/>
                  </div>
                )}
              </div>

              {/* Checklist items */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 5 }} className="no-scrollbar">
                {items.map(item => (
                  <div key={item.id} style={{
                    padding: '7px 9px', borderRadius: 8,
                    background: item.done ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${item.done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.07)'}`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      {/* Checkbox */}
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => toggleDone(item)}
                        style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                          background: item.done ? '#10b981' : 'rgba(255,255,255,0.07)',
                          border: `1.5px solid ${item.done ? '#10b981' : 'rgba(255,255,255,0.18)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        {item.done && (
                          <svg width={9} height={9} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        )}
                      </button>

                      {/* Task text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 11, fontWeight: 500, lineHeight: 1.35,
                          color: item.done ? 'rgba(255,255,255,0.35)' : '#fff',
                          textDecoration: item.done ? 'line-through' : 'none',
                          transition: 'all 0.2s',
                        }}>{item.task}</p>

                        {/* AI note */}
                        {item.ai_note && (
                          <div style={{
                            marginTop: 5, padding: '5px 8px', borderRadius: 6,
                            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)',
                          }}>
                            <p style={{ fontSize: 9.5, color: 'rgba(200,160,255,0.9)', lineHeight: 1.5, fontStyle: 'italic' }}>
                              ✦ {item.ai_note}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        {/* AI note button */}
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => generateAiNote(item)}
                          disabled={aiLoading[item.id]}
                          title="Generar nota IA"
                          style={{
                            width: 20, height: 20, borderRadius: 5,
                            background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
                            color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: aiLoading[item.id] ? 'wait' : 'pointer',
                            fontSize: aiLoading[item.id] ? 8 : 11,
                            transition: 'all 0.2s',
                          }}
                        >
                          {aiLoading[item.id] ? '…' : '✦'}
                        </button>
                        {/* Delete */}
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => deleteItem(item.id)}
                          title="Eliminar tarea"
                          style={{
                            width: 20, height: 20, borderRadius: 5,
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
                            color: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: 12, transition: 'all 0.15s',
                          }}
                        >×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add item input */}
              <div onMouseDown={e => e.stopPropagation()} style={{
                padding: '7px 10px 9px', flexShrink: 0,
                borderTop: '1px solid rgba(255,255,255,0.055)',
                display: 'flex', gap: 5,
              }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="+ Nueva tarea..."
                  value={newItemTask}
                  onChange={e => setNewItemTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                />
                <button onClick={addItem} style={{
                  padding: '5px 10px', borderRadius: 7, background: '#7c3aed', border: 'none',
                  color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                }}>+</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
