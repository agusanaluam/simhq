'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'

interface Yayasan {
  id: number; nama: string; alamat: string | null
  kontak_pic: string | null; telepon: string | null; is_active: boolean
}

function YayasanModal({ initialData, onDone, onClose }: {
  initialData?: Yayasan; onDone: () => void; onClose: () => void
}) {
  const isEdit = !!initialData
  const [form, setForm] = useState({
    nama:       initialData?.nama ?? '',
    alamat:     initialData?.alamat ?? '',
    kontak_pic: initialData?.kontak_pic ?? '',
    telepon:    initialData?.telepon ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nama.trim()) { setError('Nama wajib diisi'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.put(`/api/master/yayasan/${initialData!.id}`, form)
      } else {
        await api.post('/api/master/yayasan', form)
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
            {isEdit ? 'Edit Yayasan' : 'Tambah Yayasan'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama Yayasan *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Yayasan Al-Hikmah..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Alamat</label>
            <Input value={form.alamat} onChange={e => set('alamat', e.target.value)} placeholder="Jl. ..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Kontak PIC</label>
            <Input value={form.kontak_pic} onChange={e => set('kontak_pic', e.target.value)} placeholder="Nama penanggung jawab..." />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Telepon</label>
            <Input value={form.telepon} onChange={e => set('telepon', e.target.value)} placeholder="08..." />
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

export function TabYayasan() {
  const [yayasan, setYayasan] = useState<Yayasan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal]             = useState(false)
  const [editingItem, setEditingItem]         = useState<Yayasan | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId]           = useState<number | null>(null)

  function load() {
    setLoading(true)
    api.get('/api/master/yayasan')
      .then(r => setYayasan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await api.delete(`/api/master/yayasan/${id}`)
      setYayasan(prev => prev.filter(y => y.id !== id))
      setConfirmDeleteId(null)
    } catch (e: any) {
      setConfirmDeleteId(null)
      alert(e?.response?.data?.message ?? 'Gagal menghapus')
    } finally { setDeletingId(null) }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>+ Tambah Yayasan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama Yayasan','Kontak PIC','Telepon','Status','Aksi'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yayasan.map((y, i) => (
                <tr key={y.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4">
                    <p className="font-body font-medium text-on-surface">{y.nama}</p>
                    {y.alamat && <p className="text-xs text-on-surface-variant">{y.alamat}</p>}
                  </td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{y.kontak_pic ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{y.telepon ?? '—'}</td>
                  <td className="py-2.5 pr-4"><StatusChip status={y.is_active ? 'AKTIF' : 'NONAKTIF'} /></td>
                  <td className="py-2.5">
                    {confirmDeleteId === y.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-on-surface-variant">Hapus?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >Batal</button>
                        <button
                          onClick={() => handleDelete(y.id)}
                          disabled={deletingId === y.id}
                          className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >{deletingId === y.id ? '...' : 'Hapus'}</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingItem(y); setShowModal(true) }}
                          className="text-xs text-primary hover:underline"
                        >Edit</button>
                        <button
                          onClick={() => setConfirmDeleteId(y.id)}
                          className="text-xs text-red-500 hover:underline"
                        >Hapus</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {yayasan.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">Belum ada yayasan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      {showModal && (
        <YayasanModal
          initialData={editingItem ?? undefined}
          onDone={() => { setShowModal(false); setEditingItem(null); load() }}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
