'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusChip } from '@/components/ui/StatusChip'
import { RoleGuard } from '@/components/shared/RoleGuard'
import api from '@/lib/api'

interface User {
  id: number; name: string; email: string
  role: string; divisi: string | null; is_active: boolean
  depot: { id: number; nama: string } | null
}
interface Depot { id: number; nama: string }

const ALL_ROLES = [
  'SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA','ADMIN_ANGGOTA',
  'KANDANG_SAPI_KETUA','KANDANG_SAPI_ANGGOTA','KANDANG_DOMBA_KETUA','KANDANG_DOMBA_ANGGOTA',
  'CS_KETUA','CS_ANGGOTA','LOGISTIK_KETUA','LOGISTIK_ANGGOTA',
  'PAKAN_KETUA','PAKAN_ANGGOTA','KONSTRUKSI_KETUA','KONSTRUKSI_ANGGOTA',
]

function TambahUserModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [depots, setDepots] = useState<Depot[]>([])
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'ADMIN_ANGGOTA', depot_id: '', divisi: '', phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
  }, [])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.name || !form.email || !form.password || !form.role) {
      setError('Nama, email, password, dan role wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      await api.post('/api/users', {
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role,
        depot_id: form.depot_id ? Number(form.depot_id) : null,
        divisi:   form.divisi || null,
        phone:    form.phone || null,
      })
      onDone()
    } catch (e: any) {
      const msgs = e?.response?.data?.errors
      setError(msgs ? Object.values(msgs).flat().join(', ') : (e?.response?.data?.message ?? 'Gagal menyimpan'))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Tambah User</h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama *</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nama lengkap..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Email *</label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@simhq.id" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Password *</label>
            <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 karakter..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Role *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="input-field w-full">
              {ALL_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Depot</label>
            <select value={form.depot_id} onChange={e => set('depot_id', e.target.value)} className="input-field w-full">
              <option value="">— Tidak ada (Super Admin) —</option>
              {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Divisi</label>
            <Input value={form.divisi} onChange={e => set('divisi', e.target.value)} placeholder="Admin, Kandang, dll" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">No HP</label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08..." />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving}>Simpan</Button>
        </div>
      </div>
    </div>
  )
}

function TambahDepotModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [form, setForm]   = useState({ nama: '', alamat: '', kota: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nama.trim()) { setError('Nama depot wajib diisi'); return }
    setSaving(true); setError('')
    try {
      await api.post('/api/depots', form)
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-sm p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Tambah Depot</h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama Depot *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Depot Jakarta Selatan..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Alamat</label>
            <Input value={form.alamat} onChange={e => set('alamat', e.target.value)} placeholder="Jl. ..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Kota</label>
            <Input value={form.kota} onChange={e => set('kota', e.target.value)} placeholder="Jakarta..." />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving}>Simpan</Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers]           = useState<User[]>([])
  const [loading, setLoading]       = useState(true)
  const [showUserModal, setShowUser]   = useState(false)
  const [showDepotModal, setShowDepot] = useState(false)

  function load() {
    setLoading(true)
    api.get('/api/users')
      .then(res => setUsers(res.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <RoleGuard roles={['SUPER_ADMIN']} fallback={<p className="text-on-surface-variant">Akses ditolak.</p>}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-on-surface">Manajemen User</h1>
            <p className="text-sm text-on-surface-variant mt-1">Kelola akun dan role pengguna</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowDepot(true)}>+ Tambah Depot</Button>
            <Button onClick={() => setShowUser(true)}>+ Tambah User</Button>
          </div>
        </div>

        <Card>
          {loading ? (
            <p className="text-on-surface-variant text-sm">Memuat data...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">Nama</th>
                    <th className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">Role</th>
                    <th className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</th>
                    <th className="pb-3 text-xs uppercase tracking-widest text-on-surface-variant font-body">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr key={user.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                      <td className="py-3 pr-4">
                        <p className="font-body font-medium text-on-surface">{user.name}</p>
                        <p className="text-xs text-on-surface-variant">{user.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-on-surface-variant font-body">{user.role.replace(/_/g, ' ')}</td>
                      <td className="py-3 pr-4 text-on-surface-variant font-body">{user.depot?.nama ?? '—'}</td>
                      <td className="py-3"><StatusChip status={user.is_active ? 'AKTIF' : 'NONAKTIF'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center text-on-surface-variant py-8 text-sm">Belum ada user.</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {showUserModal && (
        <TambahUserModal
          onDone={() => { setShowUser(false); load() }}
          onClose={() => setShowUser(false)}
        />
      )}
      {showDepotModal && (
        <TambahDepotModal
          onDone={() => { setShowDepot(false) }}
          onClose={() => setShowDepot(false)}
        />
      )}
    </RoleGuard>
  )
}
