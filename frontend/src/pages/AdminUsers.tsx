import { useEffect, useState } from 'react';
import { ShieldCheck, User as UserIcon, Ban, CheckCircle } from 'lucide-react';
import { adminApi, type User } from '../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);

  const load = () => adminApi.users().then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const handleToggle = async (id: string) => {
    await adminApi.toggleUser(id);
    load();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Uzytkownicy</h2>
      <p className="text-sm text-(--color-text-muted) mb-8">
        Zarzadzaj kontami uzytkownikow
      </p>

      <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-left text-(--color-text-muted)">
              <th className="px-5 py-3 font-medium">Uzytkownik</th>
              <th className="px-5 py-3 font-medium">Rola</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Data utworzenia</th>
              <th className="px-5 py-3 font-medium text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-(--color-bg-sidebar) transition-colors">
                <td className="px-5 py-3 font-medium">{u.username}</td>
                <td className="px-5 py-3">
                  {u.is_admin ? (
                    <span className="inline-flex items-center gap-1 text-xs text-(--color-accent)">
                      <ShieldCheck size={14} /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-(--color-text-muted)">
                      <UserIcon size={14} /> User
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {u.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs text-(--color-success)">
                      <CheckCircle size={14} /> Aktywny
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-(--color-danger)">
                      <Ban size={14} /> Zablokowany
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-(--color-text-muted)">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('pl-PL') : '-'}
                </td>
                <td className="px-5 py-3 text-right">
                  {!u.is_admin && (
                    <button
                      onClick={() => handleToggle(u.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        u.is_active
                          ? 'text-(--color-danger) hover:bg-(--color-danger)/10'
                          : 'text-(--color-success) hover:bg-(--color-success)/10'
                      }`}
                    >
                      {u.is_active ? 'Zablokuj' : 'Odblokuj'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
