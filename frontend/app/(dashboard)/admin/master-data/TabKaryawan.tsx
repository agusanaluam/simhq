'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'
import { parseCurrency } from '@/lib/format'

interface UserOption { id: number; name: string; email: string }
interface Karyawan {
  id: number; nama: string; divisi: string
  tarif_harian: number; berlaku_dari: string; is_active: boolean
  user_id: number | null; user?: UserOption | null
}
interface Depot { id: number; nama: string }

function KaryawanModal({ initialData, onDone, onClose }: {
  initialData?: Karyawan; onDone: () => void; onClose: () => void
}) {
  const isEdit = !!initialData
  const [depots, setDepots] = useState<Depot[]>([])
  const [users, setUsers]   = useState<UserOption[]>([])
  const [form, setForm] = useState({
    depot_id:     '',
    nama:         initialData?.nama ?? '',
    divisi:       initialData?.divisi ?? '',
    tarif_harian: initialData ? String(initialData.tarif_harian) : '',
    berlaku_dari: initialData?.berlaku_dari ?? '',
    user_id:      initialData?.user_id ? String(initialData.user_id) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    api.get('/api/karyawan/users').then(r => setUsers(r.data.data ?? []))
    if (!isEdit) {
      api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
    }
  }, [isEdit])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!isEdit && !form.depot_id) { setError('Depot wajib diisi'); return }
    if (!form.nama || !form.divisi || !form.tarif_harian || !form.berlaku_dari) {
      setError('Semua field wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      const userId = form.user_id ? Number(form.user_id) : null
      if (isEdit) {
        await api.put(`/api/karyawan/${initialData!.id}`, {
          nama:         form.nama,
          divisi:       form.divisi,
          tarif_harian: Number(form.tarif_harian),
          berlaku_dari: form.berlaku_dari,
          user_id:      userId,
        })
      } else {
        await api.post('/api/karyawan', {
          depot_id:     Number(form.depot_id),
          nama:         form.nama,
          divisi:       form.divisi,
          tarif_harian: Number(form.tarif_harian),
          berlaku_dari: form.berlaku_dari,
          user_id:      userId,
        })
      }
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">
            {isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          {!isEdit && (
            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Depot *</label>
              <select value={form.depot_id} onChange={e => set('depot_id', e.target.value)} className="input-field w-full">
                <option value="">— Pilih depot —</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Nama karyawan..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Divisi *</label>
            <Input value={form.divisi} onChange={e => set('divisi', e.target.value)} placeholder="Kandang, Admin, dll" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Tarif Harian (Rp) *</label>
            <Input type="text" value={form.tarif_harian ? Number(form.tarif_harian).toLocaleString('id-ID') : ''} onChange={e => set('tarif_harian', String(parseCurrency(e.target.value) || ''))} placeholder="100.000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Berlaku Dari *</label>
            <Input type="date" value={form.berlaku_dari} onChange={e => set('berlaku_dari', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Link Akun User</label>
            <select value={form.user_id} onChange={e => set('user_id', e.target.value)} className="input-field w-full">
              <option value="">— Tidak dilink —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <p className="text-xs text-on-surface-variant mt-1">Diperlukan agar karyawan bisa check-in via app</p>
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

export function TabKaryawan() {
  const [karyawan, setKaryawan] = useState<Karyawan[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal]             = useState(false)
  const [editingItem, setEditingItem]         = useState<Karyawan | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId]           = useState<number | null>(null)

  function load() {
    setLoading(true)
    api.get('/api/karyawan')
      .then(r => setKaryawan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await api.delete(`/api/karyawan/${id}`)
      setKaryawan(prev => prev.filter(k => k.id !== id))
      setConfirmDeleteId(null)
    } catch (e: any) {
      setConfirmDeleteId(null)
      alert(e?.response?.data?.message ?? 'Gagal menghapus')
    } finally { setDeletingId(null) }
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>+ Tambah Karyawan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama','Divisi','Tarif Harian','Berlaku Dari','Status','Aksi'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {karyawan.map((k, i) => (
                <tr key={k.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4">
                    <p className="font-body font-medium text-on-surface">{k.nama}</p>
                    {k.user && (
                      <p className="text-xs text-on-surface-variant">{k.user.name}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.divisi}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(k.tarif_harian)}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.berlaku_dari}</td>
                  <td className="py-2.5 pr-4"><StatusChip status={k.is_active ? 'AKTIF' : 'NONAKTIF'} /></td>
                  <td className="py-2.5">
                    {confirmDeleteId === k.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-on-surface-variant">Hapus?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >Batal</button>
                        <button
                          onClick={() => handleDelete(k.id)}
                          disabled={deletingId === k.id}
                          className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >{deletingId === k.id ? '...' : 'Hapus'}</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingItem(k); setShowModal(true) }}
                          className="text-xs text-primary hover:underline"
                        >Edit</button>
                        <button
                          onClick={() => setConfirmDeleteId(k.id)}
                          className="text-xs text-red-500 hover:underline"
                        >Hapus</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {karyawan.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">Belum ada karyawan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      {showModal && (
        <KaryawanModal
          initialData={editingItem ?? undefined}
          onDone={() => { setShowModal(false); setEditingItem(null); load() }}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
