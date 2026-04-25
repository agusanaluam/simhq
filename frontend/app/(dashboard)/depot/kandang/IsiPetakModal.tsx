'use client'

import { useEffect, useState } from 'react'
import type { PetakData } from './PetakCard'
import api from '@/lib/api'

interface HewanItem {
  id: number
  no_hewan: string
  kelas_asal: { kode: string } | null
  kelas_jual: { kode: string } | null
  bobot_masuk: string
}

interface Props {
  petak: PetakData
  musim: number
  onClose: () => void
  onSuccess: () => void
}

export function IsiPetakModal({ petak, musim, onClose, onSuccess }: Props) {
  const [hewan,    setHewan]    = useState<HewanItem[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const sisaSlot = petak.kapasitas - petak.jumlah_terisi

  useEffect(() => {
    api.get(`/api/hewan?depot=${petak.depot_id}&jenis=${petak.jenis_kandang}&musim=${musim}&unassigned=1&per_page=100`)
      .then(r => setHewan(r.data.data ?? []))
      .catch(() => setError('Gagal memuat daftar hewan.'))
  }, [petak.depot_id, petak.jenis_kandang, musim])

  function toggle(id: number) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleAssign() {
    if (selected.length === 0) return
    setLoading(true)
    setError('')
    try {
      await Promise.all(
        selected.map(id => api.post(`/api/hewan/${id}/transfer`, { ke_petak_id: petak.id }))
      )
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Gagal mengassign hewan.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold text-lg text-on-surface">Isi Petak {petak.no_petak}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-on-surface-variant mb-4 font-body">
          {petak.jumlah_terisi}/{petak.kapasitas} terisi &middot; Sisa {sisaSlot} slot
        </p>

        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {hewan.length === 0 && !error && (
            <p className="text-sm text-on-surface-variant italic py-4 text-center">
              Semua hewan sudah dialokasikan ke petak.
            </p>
          )}
          {hewan.map(h => {
            const isSelected = selected.includes(h.id)
            const isDisabled = !isSelected && selected.length >= sisaSlot
            return (
              <label
                key={h.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-surface-high'
                } ${isSelected ? 'bg-surface-high' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => !isDisabled && toggle(h.id)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="font-display font-bold text-sm text-primary w-10">{h.no_hewan}</span>
                <span className="text-sm text-on-surface-variant font-body">
                  {h.kelas_jual?.kode ?? h.kelas_asal?.kode ?? '—'} &middot; {h.bobot_masuk} kg
                </span>
              </label>
            )
          })}
        </div>

        {error && <p className="text-sm text-error mb-3">{error}</p>}

        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant font-body">
            Dipilih: {selected.length} / maks {sisaSlot}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={loading || selected.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {loading ? 'Menyimpan...' : `Assign ${selected.length} Ekor`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
