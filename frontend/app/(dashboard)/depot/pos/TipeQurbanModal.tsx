'use client'

import { useState } from 'react'

export interface HewanForCart {
  id: number
  no_hewan: string
  jenis: string
  kelas_jual: { id: number; kode: string } | null
  bobot_masuk: string
  slot_sapi_count: number
}

interface Props {
  hewan: HewanForCart
  harga: number
  hargaSlot: number | null
  slotTerisi: number
  onConfirm: (data: { tipeQurban: string; satuan: 'EKOR' | 'SLOT'; namaQurban: string; harga: number }) => void
  onClose: () => void
}

const TIPE_OPTIONS = [
  { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
  { value: 'THQ', label: 'THQ – Titip ke Yayasan' },
  { value: 'PHQ', label: 'PHQ – Potong di Depot, Kirim Daging' },
]

export function TipeQurbanModal({ hewan, harga, hargaSlot, slotTerisi, onConfirm, onClose }: Props) {
  const [tipe,       setTipe]       = useState('SHQ')
  const [satuan,     setSatuan]     = useState<'EKOR' | 'SLOT'>('EKOR')
  const [namaQurban, setNamaQurban] = useState('')

  const slotTersisa     = 7 - slotTerisi
  const slotPenuh       = slotTersisa <= 0
  const hargaEfektif    = satuan === 'SLOT' ? (hargaSlot ?? 0) : harga
  const namaQurbanWajib = satuan === 'SLOT' && tipe === 'PHQ'
  const canAdd          = satuan === 'EKOR' ? true : (hargaSlot != null && !slotPenuh)

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

        {/* Satuan toggle */}
        <div className="mb-4">
          <label className="block text-xs font-body font-medium text-on-surface mb-2">Satuan</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setSatuan('EKOR'); setNamaQurban('') }}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-body transition-colors ${
                satuan === 'EKOR' ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
              }`}
            >
              1 Ekor
            </button>
            <button
              type="button"
              onClick={() => !slotPenuh && hargaSlot != null && setSatuan('SLOT')}
              disabled={slotPenuh || hargaSlot == null}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-body transition-colors ${
                satuan === 'SLOT' ? 'border-primary bg-primary text-white'
                : slotPenuh || hargaSlot == null ? 'border-surface-high text-on-surface-variant opacity-50 cursor-not-allowed'
                : 'border-surface-high text-on-surface'
              }`}
            >
              1/7 Slot
              {hargaSlot != null
                ? <span className="block text-xs font-normal opacity-80">{hargaSlot.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span>
                : <span className="block text-xs font-normal opacity-70">Harga belum diset</span>}
            </button>
          </div>
          {satuan === 'SLOT' && !slotPenuh && (
            <p className="text-xs text-on-surface-variant mt-1 font-body">Tersisa {slotTersisa} slot</p>
          )}
          {slotPenuh && hewan.jenis === 'SAPI' && <p className="text-xs text-red-600 mt-1 font-body">Semua slot penuh</p>}
        </div>

        {/* Tipe qurban */}
        <div className="space-y-2 mb-4">
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

        {/* Nama qurban — only for SLOT */}
        {satuan === 'SLOT' && (
          <div className="mb-4">
            <label className="block text-xs font-body font-medium text-on-surface mb-1">
              Nama Qurban (bin/binti){namaQurbanWajib ? ' *' : ''}
            </label>
            <input
              type="text"
              value={namaQurban}
              onChange={e => setNamaQurban(e.target.value)}
              placeholder={namaQurbanWajib ? 'Ahmad bin Budi...' : 'Ahmad bin Budi... (opsional)'}
              className="input-field w-full"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              if (canAdd && !(namaQurbanWajib && !namaQurban.trim())) {
                onConfirm({ tipeQurban: tipe, satuan, namaQurban, harga: hargaEfektif })
              }
            }}
            disabled={!canAdd || (namaQurbanWajib && !namaQurban.trim())}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Tambah ke Cart
          </button>
        </div>
      </div>
    </div>
  )
}
