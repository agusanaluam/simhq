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

function TambahYayasanModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [form, setForm]   = useState({ nama: '', alamat: '', kontak_pic: '', telepon: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nama.trim()) { setError('Nama wajib diisi'); return }
    setSaving(true); setError('')
    try {
      await api.post('/api/master/yayasan', form)
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Tambah Yayasan</h2>
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
  const [showModal, setShowModal] = useState(false)

  function load() {
    setLoading(true)
    api.get('/api/master/yayasan')
      .then(r => setYayasan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowModal(true)}>+ Tambah Yayasan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama Yayasan','Kontak PIC','Telepon','Status'].map(h => (
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
                  <td className="py-2.5"><StatusChip status={y.is_active ? 'AKTIF' : 'NONAKTIF'} /></td>
                </tr>
              ))}
              {yayasan.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant">Belum ada yayasan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      {showModal && (
        <TambahYayasanModal
          onDone={() => { setShowModal(false); load() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
