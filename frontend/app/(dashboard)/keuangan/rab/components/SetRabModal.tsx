'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

interface SetRabModalProps {
  divisi:          string
  musim:           number
  currentAnggaran: number
  onDone:          () => void
  onClose:         () => void
}

export function SetRabModal({ divisi, musim, currentAnggaran, onDone, onClose }: SetRabModalProps) {
  const [jumlah,  setJumlah]  = useState(currentAnggaran > 0 ? String(currentAnggaran) : '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  async function submit() {
    if (!jumlah) { setError('Jumlah anggaran wajib diisi.'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/rab', {
        divisi,
        musim,
        jumlah_anggaran: Number(jumlah),
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
      <div className="bg-white rounded-xl shadow-card w-full max-w-sm p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">
          Set RAB — {divisi}
        </h2>
        <p className="text-sm text-on-surface-variant">Musim {musim}</p>

        <Input
          label="Jumlah Anggaran (Rp)"
          type="number"
          min="0"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="10000000"
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
