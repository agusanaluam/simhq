'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'

interface Karyawan {
  id: number; nama: string; divisi: string
  tarif_harian: number; berlaku_dari: string; is_active: boolean
}
interface Depot { id: number; nama: string }

function TambahKaryawanModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [depots, setDepots] = useState<Depot[]>([])
  const [form, setForm]     = useState({ depot_id: '', nama: '', divisi: '', tarif_harian: '', berlaku_dari: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
  }, [])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.depot_id || !form.nama || !form.divisi || !form.tarif_harian || !form.berlaku_dari) {
      setError('Semua field wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      await api.post('/api/karyawan', {
        depot_id: Number(form.depot_id), nama: form.nama, divisi: form.divisi,
        tarif_harian: Number(form.tarif_harian), berlaku_dari: form.berlaku_dari,
      })
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Tambah Karyawan</h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Depot *</label>
            <select value={form.depot_id} onChange={e => set('depot_id', e.target.value)} className="input-field w-full">
              <option value="">— Pilih depot —</option>
              {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
          </div>
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
            <Input type="number" value={form.tarif_harian} onChange={e => set('tarif_harian', e.target.value)} placeholder="100000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Berlaku Dari *</label>
            <Input type="date" value={form.berlaku_dari} onChange={e => set('berlaku_dari', e.target.value)} />
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
  const [showModal, setShowModal] = useState(false)

  function load() {
    setLoading(true)
    api.get('/api/karyawan')
      .then(r => setKaryawan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowModal(true)}>+ Tambah Karyawan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama','Divisi','Tarif Harian','Berlaku Dari','Status'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {karyawan.map((k, i) => (
                <tr key={k.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4 font-body font-medium text-on-surface">{k.nama}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.divisi}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(k.tarif_harian)}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.berlaku_dari}</td>
                  <td className="py-2.5"><StatusChip status={k.is_active ? 'AKTIF' : 'NONAKTIF'} /></td>
                </tr>
              ))}
              {karyawan.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">Belum ada karyawan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
      {showModal && (
        <TambahKaryawanModal
          onDone={() => { setShowModal(false); load() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
