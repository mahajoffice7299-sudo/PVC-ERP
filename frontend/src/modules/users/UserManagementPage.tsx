import React, { useEffect, useState } from 'react';
import { UserPlus, Users, UserX } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

type UserRole = 'Administrator' | 'Procurement' | 'Store Manager' | 'Production Supervisor' | 'Finance' | 'Sales';
interface ManagedUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}
const roles: UserRole[] = ['Administrator', 'Procurement', 'Store Manager', 'Production Supervisor', 'Finance', 'Sales'];
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100';

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Production Supervisor');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { api('/users/users').then(setUsers).catch(()=>{}); }, []);

  useEffect(() => localStorage.setItem('pvc_managed_users', JSON.stringify(users)), [users]);

  const addUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setMessage('');
    const normalized = username.trim().toLowerCase();
    if (!normalized || !fullName.trim()) {
      setError('Enter the user name and full name.');
      return;
    }
    if (users.some((item) => item.username.toLowerCase() === normalized)) {
      setError('That user name is already in the prototype user list.');
      return;
    }
    const entry = { id: `user-${crypto.randomUUID()}`, username: normalized, fullName: fullName.trim(), role, active: true, createdAt: new Date().toISOString() };
    const saved = await api('/users/users', { method: 'POST', body: JSON.stringify(entry) });
    setUsers((previous) => [saved ?? entry, ...previous]);
    setUsername(''); setFullName('');
    setMessage('User added.');
  };

  const toggleActive = (target: ManagedUser) => {
    if (currentUser?.username.toLowerCase() === target.username.toLowerCase() && target.active) {
      setError('You cannot deactivate the currently signed-in account.');
      return;
    }
    setError(''); setMessage('');
    setUsers((previous) => previous.map((item) => item.id === target.id ? { ...item, active: !item.active } : item));
  };

  const removeUser = (target: ManagedUser) => {
    if (currentUser?.username.toLowerCase() === target.username.toLowerCase()) {
      setError('You cannot remove the currently signed-in account.');
      return;
    }
    setError(''); setMessage('');
    setUsers((previous) => previous.filter((item) => item.id !== target.id));
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-sky-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-800">Administration</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-950">User Management</h1>
        <p className="mt-1 text-sm text-slate-600">Manage a local prototype user list and role assignments.</p>
      </header>
      <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Prototype only:</strong> this list is stored in this browser and does not create accounts, passwords, permissions, or restrict access. Secure user management requires a backend authentication service.
      </div>
      {(error || message) && <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm font-semibold ${error ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Listed Users" value={users.length.toLocaleString()} />
        <Metric label="Active" value={users.filter((item) => item.active).length.toLocaleString()} />
        <Metric label="Roles" value={new Set(users.map((item) => item.role)).size.toLocaleString()} />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Heading icon={<UserPlus />} title="Add Prototype User" />
        <form onSubmit={addUser} className="grid gap-3 p-5 md:grid-cols-4">
          <Field label="User name"><input required value={username} onChange={(event) => setUsername(event.target.value)} className={inputClass} autoComplete="off" /></Field>
          <Field label="Full name"><input required value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass} /></Field>
          <Field label="Role"><select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className={inputClass}>{roles.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <button className="self-end rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800"><UserPlus className="mr-2 inline h-4 w-4" />Add User</button>
        </form>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Heading icon={<Users />} title="Prototype Users" />
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs">
          <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700"><tr><th className="p-3">Name</th><th className="p-3">Username</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Added</th><th className="p-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{users.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">No prototype users listed yet.</td></tr> : users.map((item) => (
            <tr key={item.id} className="odd:bg-white even:bg-slate-50/70">
              <td className="p-3 font-semibold">{item.fullName}</td><td className="p-3">{item.username}</td><td className="p-3">{item.role}</td>
              <td className="p-3"><span className={`rounded-full px-2.5 py-1 font-bold ${item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{item.active ? 'Active' : 'Inactive'}</span></td>
              <td className="p-3">{new Date(item.createdAt).toLocaleDateString()}</td>
              <td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => toggleActive(item)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-semibold hover:bg-slate-100">{item.active ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => removeUser(item)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 font-semibold text-rose-700 hover:bg-rose-50"><UserX className="h-3.5 w-3.5" />Remove</button></div></td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p></article>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-700">{label}</span>{children}</label>;
}
function Heading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 p-4"><span className="text-violet-700">{icon}</span><h2 className="font-bold text-slate-900">{title}</h2></div>;
}
