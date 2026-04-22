'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface Karyawan { id: number; nama: string; divisi: string }

interface Props {
  onDone: () => void
  onClose: () => void
}

export function OverrideModal({ onDone, onClose }: Props) {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([])
  const [karyawanId, setKaryawanId]     = useState('')
  const [tgl, setTgl]                   = useState(new Date().toISOString().slice(0, 10))
  const [jamMasuk, setJamMasuk]         = useState('07:00')
  const [status, setStatus]             = useState('HADIR')
  const [catatan, setCatatan]           = useState('')
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    api.get('/api/karyawan').then(r => setKaryawanList(r.data.data ?? []))
  }, [])

  async function submit() {
    if (!karyawanId) return
    setSaving(true)
    try {
      await api.post('/api/absensi/manual', {
        karyawan_id: Number(karyawanId),
        tgl,
        jam_masuk: jamMasuk ? `${jamMasuk}:00` : undefined,
        status,
        catatan,
      })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Absensi Manual</h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Karyawan *</label>
            <select value={karyawanId} onChange={e => setKaryawanId(e.target.value)} className="input-field w-full">
              <option value="">— Pilih karyawan —</option>
              {karyawanList.map(k => (
                <option key={k.id} value={k.id}>{k.nama} ({k.divisi})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Tanggal</label>
            <Input type="date" value={tgl} onChange={e => setTgl(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Jam Masuk</label>
            <Input type="time" value={jamMasuk} onChange={e => setJamMasuk(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Status</label>
            <div className="flex gap-2 flex-wrap">
              {['HADIR', 'TERLAMBAT', 'TIDAK_HADIR'].map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1 rounded-lg border-2 text-xs font-body transition-colors ${status === s ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Catatan</label>
            <Input value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Opsional..." />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving} disabled={!karyawanId}>Simpan</Button>
        </div>
      </div>
    </div>
  )
}
