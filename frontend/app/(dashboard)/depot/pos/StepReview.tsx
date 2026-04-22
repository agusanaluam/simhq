'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface Karyawan { id: number; nama: string; divisi: string }

interface Summary {
  jenis: string
  tipeQurban: string
  kelasKode: string
  harga: number
  hewanNo: string | null
  preorder: boolean
  namaPembeli: string
  hp: string
}

interface Props {
  summary: Summary
  onSubmit: (data: { csId: number | null; tellerId: number | null; salesId: number | null }) => void
  onBack: () => void
  submitting: boolean
}

export function StepReview({ summary, onSubmit, onBack, submitting }: Props) {
  const [karyawan, setKaryawan] = useState<Karyawan[]>([])
  const [csId, setCsId]         = useState<number | null>(null)
  const [tellerId, setTeller]   = useState<number | null>(null)
  const [salesId, setSales]     = useState<number | null>(null)

  useEffect(() => {
    api.get('/api/karyawan').then(r => setKaryawan(r.data.data ?? []))
  }, [])

  function KaryawanSelect({ label, value, onChange }: {
    label: string
    value: number | null
    onChange: (v: number | null) => void
  }) {
    return (
      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-1">{label}</label>
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          className="input-field w-full"
        >
          <option value="">— Tidak ada —</option>
          {karyawan.map(k => (
            <option key={k.id} value={k.id}>{k.nama} ({k.divisi})</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-high rounded-xl p-4 space-y-2 text-sm font-body">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Jenis</span>
          <span className="font-medium text-on-surface">{summary.jenis}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Tipe Qurban</span>
          <span className="font-medium text-on-surface">{summary.tipeQurban}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Kelas</span>
          <span className="font-medium text-on-surface">{summary.kelasKode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Hewan</span>
          <span className="font-medium text-on-surface">
            {summary.preorder
              ? <span className="italic text-yellow-700">Pre-order</span>
              : `#${summary.hewanNo}`
            }
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Pembeli</span>
          <span className="font-medium text-on-surface">{summary.namaPembeli} · {summary.hp}</span>
        </div>
        <div className="flex justify-between border-t border-surface-highest pt-2 mt-2">
          <span className="text-on-surface font-semibold">Total</span>
          <span className="font-semibold text-primary">
            {summary.harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <KaryawanSelect label="CS" value={csId} onChange={setCsId} />
        <KaryawanSelect label="Teller" value={tellerId} onChange={setTeller} />
        <KaryawanSelect label="Sales" value={salesId} onChange={setSales} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>← Kembali</Button>
        <Button onClick={() => onSubmit({ csId, tellerId, salesId })} loading={submitting}>
          Simpan Transaksi
        </Button>
      </div>
    </div>
  )
}
