'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface Hewan {
  id: number
  no_hewan: string
  jenis: string
  kelas_jual: { kode: string } | null
  bobot_masuk: string
}

interface Props {
  transaksiId: number
  jenis: string
  onDone: () => void
  onClose: () => void
}

export function AssignHewanModal({ transaksiId, jenis, onDone, onClose }: Props) {
  const [hewan, setHewan]       = useState<Hewan[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    api.get(`/api/hewan?status=AVAILABLE&jenis=${jenis}`)
      .then(r => setHewan(r.data.data ?? []))
  }, [jenis])

  async function submit() {
    if (!selected) return
    setSaving(true)
    try {
      await api.put(`/api/transaksi/${transaksiId}/assign-hewan`, { hewan_id: selected })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Assign Nomor Hewan</h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
          {hewan.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-8">Tidak ada hewan {jenis} tersedia</p>
          )}
          {hewan.map(h => (
            <button
              key={h.id}
              onClick={() => setSelected(h.id)}
              className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-colors ${
                selected === h.id
                  ? 'border-primary bg-surface-high'
                  : 'border-surface-high hover:border-primary/50'
              }`}
            >
              <span className="font-body font-medium text-on-surface">#{h.no_hewan}</span>
              <span className="text-xs text-on-surface-variant ml-2">
                {h.kelas_jual?.kode ?? '—'} · {h.bobot_masuk} kg
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving} disabled={!selected}>Assign</Button>
        </div>
      </div>
    </div>
  )
}
