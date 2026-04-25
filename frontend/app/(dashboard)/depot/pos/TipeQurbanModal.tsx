'use client'

import { useState } from 'react'

export interface HewanForCart {
  id: number
  no_hewan: string
  jenis: string
  kelas_jual: { id: number; kode: string } | null
  bobot_masuk: string
}

interface Props {
  hewan: HewanForCart
  harga: number
  onConfirm: (tipeQurban: string) => void
  onClose: () => void
}

const TIPE_OPTIONS = [
  { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
  { value: 'THQ', label: 'THQ – Sembelih di Depot' },
  { value: 'PHQ', label: 'PHQ – Sembelih + Kirim' },
]

export function TipeQurbanModal({ hewan, harga, onConfirm, onClose }: Props) {
  const [tipe, setTipe] = useState('SHQ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-1">
          Hewan #{hewan.no_hewan}
        </h2>
        <p className="text-sm text-on-surface-variant mb-4 font-body">
          {hewan.jenis} · {hewan.kelas_jual?.kode ?? '—'} · {hewan.bobot_masuk} kg
          {harga > 0 && (
            <span className="ml-2 text-primary font-medium">
              · {harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </span>
          )}
        </p>

        <div className="space-y-2 mb-6">
          {TIPE_OPTIONS.map(t => (
            <label
              key={t.value}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                tipe === t.value ? 'border-primary bg-surface-high' : 'border-surface-high'
              }`}
            >
              <input
                type="radio"
                name="tipe"
                value={t.value}
                checked={tipe === t.value}
                onChange={() => setTipe(t.value)}
                className="accent-primary"
              />
              <span className="text-sm font-body text-on-surface">{t.label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(tipe)}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Tambah ke Cart
          </button>
        </div>
      </div>
    </div>
  )
}
