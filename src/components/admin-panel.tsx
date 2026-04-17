'use client';

import { useState, useEffect } from "react";
import { getInitials } from "@/lib/utils";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  avatar: string | null;
  active: number;
  created_at: string;
}

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
}

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateUserForm>({ name: "", email: "", password: "", role: "user" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetPw, setResetPw] = useState<Record<number, { open: boolean; value: string; saving: boolean; err: string }>>({});

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error creando usuario");
      setSuccess("Usuario creado exitosamente.");
      setForm({ name: "", email: "", password: "", role: "user" });
      setShowCreate(false);
      await loadUsers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleRole(user: User) {
    const newRole = user.role === "admin" ? "user" : "admin";
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: newRole }),
    });
    await loadUsers();
  }

  async function toggleActive(user: User) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, active: user.active ? 0 : 1 }),
    });
    await loadUsers();
  }

  async function deleteUser(user: User) {
    if (!confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/users?id=${user.id}`, { method: "DELETE" });
    await loadUsers();
  }

  function openReset(userId: number) {
    setResetPw(p => ({ ...p, [userId]: { open: true, value: "", saving: false, err: "" } }));
  }
  function closeReset(userId: number) {
    setResetPw(p => ({ ...p, [userId]: { ...p[userId], open: false } }));
  }
  async function handleResetPw(userId: number) {
    const state = resetPw[userId];
    if (!state?.value) return;
    setResetPw(p => ({ ...p, [userId]: { ...p[userId], saving: true, err: "" } }));
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, newPassword: state.value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cambiar contraseña");
      setSuccess("Contraseña actualizada correctamente.");
      setResetPw(p => ({ ...p, [userId]: { open: false, value: "", saving: false, err: "" } }));
    } catch (e: any) {
      setResetPw(p => ({ ...p, [userId]: { ...p[userId], saving: false, err: e.message } }));
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8 animate-fade-up">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f91117] mb-1">Panel de Control</p>
          <h1 className="text-2xl font-extrabold text-white">Gestión de Usuarios</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">{users.length} usuario{users.length !== 1 ? "s" : ""} registrados</p>
        </div>
        <button
          id="create-user-btn"
          onClick={() => { setShowCreate(!showCreate); setError(""); setSuccess(""); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f91117] hover:bg-[#d70f14] text-white text-sm font-bold transition-all"
          style={{ boxShadow: "0 0 16px rgba(249,17,23,0.3)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/30 text-sm text-emerald-400 animate-fade-in">
          {success}
        </div>
      )}

      {showCreate && (
        <div className="glass rounded-2xl p-6 mb-6 border border-[#f91117]/20 animate-fade-up">
          <h2 className="text-sm font-bold text-white mb-4">Crear Nuevo Usuario</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: "new-name", label: "Nombre", key: "name", type: "text", placeholder: "Nombre completo" },
              { id: "new-email", label: "Email", key: "email", type: "email", placeholder: "correo@empresa.com" },
              { id: "new-password", label: "Contraseña", key: "password", type: "password", placeholder: "Min. 8 caracteres" },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">{field.label}</label>
                <input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={(form as any)[field.key]}

import { useState, useEffect } from "react";
import { getInitials } from "@/lib/utils";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  avatar: string | null;
  active: number;
  created_at: string;
}

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
}

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateUserForm>({ name: "", email: "", password: "", role: "user" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetPw, setResetPw] = useState<Record<number, { open: boolean; value: string; saving: boolean; err: string }>>({});

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error creando usuario");
      setSuccess("Usuario creado exitosamente.");
      setForm({ name: "", email: "", password: "", role: "user" });
      setShowCreate(false);
      await loadUsers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleRole(user: User) {
    const newRole = user.role === "admin" ? "user" : "admin";
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, role: newRole }),
    });
    await loadUsers();
  }

  async function toggleActive(user: User) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, active: user.active ? 0 : 1 }),
    });
    await loadUsers();
  }

  async function deleteUser(user: User) {
    if (!confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/users?id=${user.id}`, { method: "DELETE" });
    await loadUsers();
  }

  function openReset(userId: number) {
    setResetPw(p => ({ ...p, [userId]: { open: true, value: "", saving: false, err: "" } }));
  }
  function closeReset(userId: number) {
    setResetPw(p => ({ ...p, [userId]: { ...p[userId], open: false } }));
  }
  async function handleResetPw(userId: number) {
    const state = resetPw[userId];
    if (!state?.value) return;
    setResetPw(p => ({ ...p, [userId]: { ...p[userId], saving: true, err: "" } }));
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, newPassword: state.value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cambiar contraseña");
      setSuccess("Contraseña actualizada correctamente.");
      setResetPw(p => ({ ...p, [userId]: { open: false, value: "", saving: false, err: "" } }));
    } catch (e: any) {
      setResetPw(p => ({ ...p, [userId]: { ...p[userId], saving: false, err: e.message } }));
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8 animate-fade-up">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#f91117] mb-1">Panel de Control</p>
          <h1 className="text-2xl font-extrabold text-white">Gestión de Usuarios</h1>
          <p className="text-sm text-[#a1a1aa] mt-1">{users.length} usuario{users.length !== 1 ? "s" : ""} registrados</p>
        </div>
        <button
          id="create-user-btn"
          onClick={() => { setShowCreate(!showCreate); setError(""); setSuccess(""); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f91117] hover:bg-[#d70f14] text-white text-sm font-bold transition-all"
          style={{ boxShadow: "0 0 16px rgba(249,17,23,0.3)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/30 text-sm text-emerald-400 animate-fade-in">
          {success}
        </div>
      )}

      {showCreate && (
        <div className="glass rounded-2xl p-6 mb-6 border border-[#f91117]/20 animate-fade-up">
          <h2 className="text-sm font-bold text-white mb-4">Crear Nuevo Usuario</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: "new-name", label: "Nombre", key: "name", type: "text", placeholder: "Nombre completo" },
              { id: "new-email", label: "Email", key: "email", type: "email", placeholder: "correo@empresa.com" },
              { id: "new-password", label: "Contraseña", key: "password", type: "password", placeholder: "Min. 8 caracteres" },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">{field.label}</label>
                <input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={(form as any)[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f91117] focus:ring-1 focus:ring-[#f91117]/20 transition-all"
                />
              </div>
            ))}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa] mb-2">Rol</label>
              <select
                id="new-role"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as "admin" | "user" }))}
                className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f91117] transition-all"
              >
                <option value="user">◎ Usuario</option>
                <option value="admin">⚙ Administrador</option>
              </select>
            </div>
            {error && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-red-950/30 border border-red-900/30 text-sm text-red-400">{error}</div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 rounded-xl bg-[#f91117] hover:bg-[#d70f14] text-white text-sm font-bold transition-all disabled:opacity-50"
              >
                {creating ? "Creando..." : "Crear Usuario"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-6 py-2.5 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white text-sm font-semibold transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden animate-fade-up" style={{ animationDelay: "100ms" }}>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 shimmer rounded-xl" />)}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#27272a]">
                {["Usuario", "Email", "Rol", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#52525b]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-[#0d0d0d] transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-[#27272a]" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f91117] to-[#d4772c] flex items-center justify-center text-[10px] font-bold text-white">
                          {getInitials(user.name)}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-[#a1a1aa] font-mono">{user.email}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleRole(user)}
                      className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full transition-all hover:opacity-80"
                      style={{
                        background: user.role === "admin" ? "rgba(212,119,44,0.15)" : "rgba(249,17,23,0.1)",
                        color: user.role === "admin" ? "#d4772c" : "#f91117",
                        border: "1px solid " + (user.role === "admin" ? "rgba(212,119,44,0.3)" : "rgba(249,17,23,0.2)"),
                      }}
                      title="Click para cambiar rol"
                    >
                      {user.role === "admin" ? "⚙ Admin" : "◎ User"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleActive(user)}
                      className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: user.active ? "rgba(16,185,129,0.1)" : "rgba(100,100,100,0.1)",
                        color: user.active ? "#10b981" : "#52525b",
                        border: "1px solid " + (user.active ? "rgba(16,185,129,0.2)" : "rgba(100,100,100,0.2)"),
                      }}
                    >
                      {user.active ? "● Activo" : "○ Inactivo"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => resetPw[user.id]?.open ? closeReset(user.id) : openReset(user.id)}
                        className="p-1.5 rounded-lg text-[#52525b] hover:text-[#d4772c] hover:bg-[#d4772c]/10 transition-all"
                        title="Cambiar contraseña"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteUser(user)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#52525b] hover:text-[#f91117] hover:bg-[#f91117]/10 transition-all"
                        title="Eliminar usuario"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                {resetPw[user.id]?.open && (
                  <tr className="bg-[#0d0d0d] border-b border-[#27272a]/50">
                    <td colSpan={5} className="px-5 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[11px] text-[#a1a1aa] font-semibold uppercase tracking-widest whitespace-nowrap">
                          Nueva contraseña para <span className="text-[#d4772c]">{user.name}</span>:
                        </span>
                        <input
                          type="password"
                          placeholder="Mín. 6 caracteres"
                          value={resetPw[user.id]?.value ?? ""}
                          onChange={e => setResetPw(p => ({ ...p, [user.id]: { ...p[user.id], value: e.target.value } }))}
                          className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#d4772c] transition-all w-48"
                          onKeyDown={e => e.key === "Enter" && handleResetPw(user.id)}
                        />
                        <button
                          onClick={() => handleResetPw(user.id)}
                          disabled={resetPw[user.id]?.saving}
                          className="px-4 py-1.5 rounded-lg bg-[#d4772c] hover:bg-[#c0671e] text-white text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {resetPw[user.id]?.saving ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          onClick={() => closeReset(user.id)}
                          className="px-4 py-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white text-xs font-semibold transition-all"
                        >
                          Cancelar
                        </button>
                        {resetPw[user.id]?.err && (
                          <span className="text-xs text-red-400">{resetPw[user.id].err}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
