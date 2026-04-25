'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface CsUser { id: number; name: string }

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
  onSubmit: (data: {
    csId: number | null
    tellerId: number | null
    salesNama: string
    rencana_pelunasan: string
    metodeBayar: string
    tipeBayar: string
    nominalBayar: number
  }) => void
  onBack: () => void
  submitting: boolean
}

const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

export function StepReview({ summary, onSubmit, onBack, submitting }: Props) {
  const { data: session }  = useSession()
  const sessionUser        = (session?.user as any)
  const tellerId           = sessionUser?.id as number | undefined
  const tellerName         = sessionUser?.name as string | undefined

  const [csUsers,   setCsUsers]   = useState<CsUser[]>([])
  const [csId,      setCsId]      = useState<number | null>(null)
  const [salesNama, setSalesNama] = useState('')
  const [metode,    setMetode]    = useState('CASH')
  const [tipe,      setTipe]      = useState('PELUNASAN')
  const [nominal,   setNominal]   = useState(summary.harga)
  const [rencana,   setRencana]   = useState('')

  useEffect(() => {
    api.get('/api/users?role=CS_KETUA,CS_ANGGOTA').then(r => setCsUsers(r.data.data ?? []))
  }, [])

  const canSubmit = nominal > 0 && (tipe === 'PELUNASAN' || rencana !== '')

  function handleSubmit() {
    onSubmit({
      csId,
      tellerId: tellerId ?? null,
      salesNama,
      rencana_pelunasan: tipe === 'DP' ? rencana : '',
      metodeBayar: metode,
      tipeBayar:   tipe,
      nominalBayar: nominal,
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
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
              : `#${summary.hewanNo}`}
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

      {/* Staff */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">CS</label>
          <select
            value={csId ?? ''}
            onChange={e => setCsId(e.target.value ? Number(e.target.value) : null)}
            className="input-field w-full"
          >
            <option value="">— Tidak ada —</option>
            {csUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Teller</label>
          <div className="input-field bg-surface-high text-on-surface-variant cursor-not-allowed select-none">
            {tellerName ?? '—'}
          </div>
        </div>

        <Input
          label="Sales"
          value={salesNama}
          onChange={e => setSalesNama(e.target.value)}
          placeholder="Nama sales..."
        />
      </div>

      {/* Payment */}
      <div className="space-y-3">
        <p className="text-sm font-body font-semibold text-on-surface">Pembayaran</p>

        <div>
          <label className="block text-xs font-body text-on-surface-variant mb-1.5">Metode</label>
          <div className="flex gap-2 flex-wrap">
            {METODE_OPTIONS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetode(m.value)}
                className={`px-3 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
                  metode === m.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-surface-high text-on-surface hover:border-primary/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-body text-on-surface-variant mb-1.5">Skema</label>
          <div className="flex gap-2">
            {[{ value: 'PELUNASAN', label: 'Lunas' }, { value: 'DP', label: 'DP' }].map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipe(t.value)}
                className={`px-4 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
                  tipe === t.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-surface-high text-on-surface hover:border-primary/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">
            Nominal {tipe === 'DP' ? 'DP' : 'Pembayaran'}
          </label>
          <input
            type="number"
            min={1}
            value={nominal}
            onChange={e => setNominal(Number(e.target.value))}
            className="input-field w-full"
          />
        </div>

        {tipe === 'DP' && (
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">
              Rencana Pelunasan *
            </label>
            <input
              type="date"
              value={rencana}
              onChange={e => setRencana(e.target.value)}
              className="input-field w-full"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>← Kembali</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
          Simpan Transaksi
        </Button>
      </div>
    </div>
  )
}
