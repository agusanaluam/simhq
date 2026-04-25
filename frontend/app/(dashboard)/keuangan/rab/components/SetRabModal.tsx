'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

interface Kategori { id: number; nama: string }

interface SetRabModalProps {
  // If kategoriId provided: edit mode. If null: create mode.
  kategoriId:      number | null
  kategoriNama:    string
  musim:           number
  currentAnggaran: number
  onDone:          () => void
  onClose:         () => void
}

export function SetRabModal({ kategoriId, kategoriNama, musim, currentAnggaran, onDone, onClose }: SetRabModalProps) {
  const isEdit = kategoriId !== null
  const [kategoris, setKategoris]   = useState<Kategori[]>([])
  const [selectedId, setSelectedId] = useState<string>(isEdit ? String(kategoriId) : '')
  const [jumlah, setJumlah]         = useState(currentAnggaran > 0 ? String(currentAnggaran) : '')
  const [saving, setSaving]         = useState(false)
  const [error,  setError]          = useState('')

  useEffect(() => {
    if (!isEdit) {
      api.get('/api/master/rab-kategori').then(r => setKategoris(r.data.data ?? []))
    }
  }, [isEdit])

  async function submit() {
    if (!isEdit && !selectedId) { setError('Pilih kategori terlebih dahulu.'); return }
    if (!jumlah) { setError('Jumlah anggaran wajib diisi.'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/rab', {
        kategori_id:     isEdit ? kategoriId : Number(selectedId),
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
          {isEdit ? `Edit RAB — ${kategoriNama}` : 'Tambah Pos RAB'}
        </h2>
        <p className="text-sm text-on-surface-variant">Musim {musim}</p>

        {!isEdit && (
          <div>
            <label className="block text-xs font-body font-medium text-on-surface-variant mb-1">Kategori *</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="input-field w-full"
            >
              <option value="">— Pilih kategori —</option>
              {kategoris.map(k => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
        )}

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
