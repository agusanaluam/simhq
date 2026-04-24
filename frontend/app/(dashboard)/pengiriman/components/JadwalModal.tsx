'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

const SESI_OPTIONS = ['PAGI', 'SIANG', 'SORE', 'MALAM']

interface JadwalModalProps {
  onDone:  () => void
  onClose: () => void
}

export function JadwalModal({ onDone, onClose }: JadwalModalProps) {
  const [form, setForm] = useState({
    nama_penerima: '',
    alamat:        '',
    no_hp1:        '',
    tgl_kirim:     new Date().toISOString().slice(0, 10),
    sesi:          'PAGI',
    catatan:       '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.nama_penerima || !form.alamat || !form.no_hp1) {
      setError('Nama, alamat, dan no. HP wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/pengiriman', form)
      onDone()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const labelClass = 'text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-semibold text-lg text-on-surface">Jadwalkan Pengiriman</h2>

        <Input label="Nama Penerima" value={form.nama_penerima} onChange={(e) => set('nama_penerima', e.target.value)} placeholder="Ahmad Fauzi" />
        <Input label="Alamat Lengkap" value={form.alamat} onChange={(e) => set('alamat', e.target.value)} placeholder="Jl. Mawar No. 5, RT 03/RW 04" />
        <Input label="No. HP Penerima" type="tel" value={form.no_hp1} onChange={(e) => set('no_hp1', e.target.value)} placeholder="081234567890" />
        <Input label="Tanggal Kirim" type="date" value={form.tgl_kirim} onChange={(e) => set('tgl_kirim', e.target.value)} />

        <div>
          <label className={labelClass}>Sesi</label>
          <div className="grid grid-cols-4 gap-2">
            {SESI_OPTIONS.map((s) => (
              <button key={s} type="button" onClick={() => set('sesi', s)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.sesi === s
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-surface-high text-on-surface-variant hover:bg-surface-low'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <Input label="Catatan (opsional)" value={form.catatan} onChange={(e) => set('catatan', e.target.value)} placeholder="Patokan, instruksi khusus, dll." />

        {error && <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}
