'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface Hewan {
  id: number
  no_hewan: string
  kelas_jual: { kode: string } | null
  bobot_masuk: string
}

interface Props {
  jenis: string
  kelasId: number | null
  hewanId: number | null
  preorder: boolean
  onNext: (data: { hewanId: number | null; preorder: boolean; hewanNo: string | null }) => void
  onBack: () => void
}

export function StepPilihHewan({ jenis, kelasId, hewanId: initHewanId, preorder: initPreorder, onNext, onBack }: Props) {
  const [hewan, setHewan]       = useState<Hewan[]>([])
  const [selected, setSelected] = useState<number | null>(initHewanId)
  const [preorder, setPreorder] = useState(initPreorder)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({ status: 'AVAILABLE', jenis })
    if (kelasId) params.set('kelas', String(kelasId))
    api.get(`/api/hewan?${params}`)
      .then(r => setHewan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [jenis, kelasId])

  function handleNext() {
    const hewanNo = selected ? hewan.find(h => h.id === selected)?.no_hewan ?? null : null
    onNext({ hewanId: preorder ? null : selected, preorder, hewanNo: preorder ? null : hewanNo })
  }

  const canContinue = preorder || selected !== null

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-surface-high cursor-pointer">
        <input
          type="checkbox"
          checked={preorder}
          onChange={e => { setPreorder(e.target.checked); if (e.target.checked) setSelected(null) }}
          className="w-4 h-4"
        />
        <div>
          <p className="font-body font-medium text-on-surface">Pre-order (tanpa nomor hewan)</p>
          <p className="text-xs text-on-surface-variant">Nomor hewan bisa di-assign nanti</p>
        </div>
      </label>

      {!preorder && (
        <div>
          <p className="text-sm font-body font-medium text-on-surface mb-2">
            Pilih Hewan {jenis} Tersedia ({hewan.length} ekor)
          </p>
          {loading ? (
            <p className="text-sm text-on-surface-variant py-4">Memuat...</p>
          ) : hewan.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-4 italic">Tidak ada hewan tersedia. Gunakan pre-order.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {hewan.map(h => (
                <button
                  key={h.id}
                  onClick={() => setSelected(h.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    selected === h.id
                      ? 'border-primary bg-surface-high'
                      : 'border-surface-high hover:border-primary/50'
                  }`}
                >
                  <p className="font-body font-semibold text-on-surface">#{h.no_hewan}</p>
                  <p className="text-xs text-on-surface-variant">{h.kelas_jual?.kode ?? '—'} · {h.bobot_masuk} kg</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>← Kembali</Button>
        <Button onClick={handleNext} disabled={!canContinue}>Lanjut →</Button>
      </div>
    </div>
  )
}
