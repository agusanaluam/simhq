'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

interface TambahRealisasiModalProps {
  rabId:  number
  divisi: string
  onDone:  () => void
  onClose: () => void
}

export function TambahRealisasiModal({ rabId, divisi, onDone, onClose }: TambahRealisasiModalProps) {
  const [form, setForm] = useState({
    keterangan:      '',
    jumlah:          '',
    tgl_pengeluaran: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    if (!form.keterangan || !form.jumlah || !form.tgl_pengeluaran) {
      setError('Semua field wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post(`/api/keuangan/rab/${rabId}/realisasi`, {
        keterangan:      form.keterangan,
        jumlah:          Number(form.jumlah),
        tgl_pengeluaran: form.tgl_pengeluaran,
      })
      onDone()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">
          Tambah Realisasi — {divisi}
        </h2>

        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => set('keterangan', e.target.value)}
          placeholder="Mis. Sewa truk pengiriman"
        />

        <Input
          label="Jumlah (Rp)"
          type="number"
          min="1"
          value={form.jumlah}
          onChange={(e) => set('jumlah', e.target.value)}
          placeholder="1000000"
        />

        <Input
          label="Tanggal Pengeluaran"
          type="date"
          value={form.tgl_pengeluaran}
          onChange={(e) => set('tgl_pengeluaran', e.target.value)}
        />

        {error && (
          <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}
