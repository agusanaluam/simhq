'use client'

import { useState } from 'react'

interface KelasHewan { id: number; kode: string; nama: string }
interface HargaEntry { kelas_id: number; jenis: string; harga_jual: number; harga_slot?: number | null }

export interface PreorderInitialValues {
  jenis:      string
  kelasKode:  string
  tipeQurban: string
  satuan:     'EKOR' | 'SLOT'
  catatan?:   string
}

interface Props {
  kelasList:      KelasHewan[]
  hargaList:      HargaEntry[]
  initialValues?: PreorderInitialValues
  onConfirm: (item: { jenis: string; kelasId: number; kelasKode: string; tipeQurban: string; satuan: 'EKOR' | 'SLOT'; namaQurban: string; tglPengiriman: string; harga: number }) => void
  onClose: () => void
}

const TIPE_OPTIONS = [
  { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
  { value: 'THQ', label: 'THQ – Titip ke Yayasan' },
  { value: 'PHQ', label: 'PHQ – Potong di Depot, Kirim Daging' },
]

export function PreorderModal({ kelasList, hargaList, initialValues, onConfirm, onClose }: Props) {
  const [jenis,      setJenis]      = useState(initialValues?.jenis ?? 'SAPI')
  const [kelasId,    setKelasId]    = useState<number | null>(
    initialValues?.kelasKode ? (kelasList.find(k => k.kode === initialValues.kelasKode)?.id ?? null) : null
  )
  const [tipe,       setTipe]       = useState(initialValues?.tipeQurban ?? 'SHQ')
  const [satuan,         setSatuan]        = useState<'EKOR' | 'SLOT'>(initialValues?.satuan ?? 'EKOR')
  const [namaQurban,     setNamaQurban]    = useState('')
  const [tglPengiriman,  setTglPengiriman] = useState('')

  function getHarga(): number {
    if (!kelasId) return 0
    return hargaList.find(h => h.kelas_id === kelasId && h.jenis === jenis)?.harga_jual ?? 0
  }

  function handleConfirm() {
    if (!kelasId) return
    const kelas        = kelasList.find(k => k.id === kelasId)!
    const h            = hargaList.find(h => h.kelas_id === kelasId && h.jenis === jenis)
    const hargaEfektif = satuan === 'SLOT' ? (h?.harga_slot ?? 0) : getHarga()
    onConfirm({ jenis, kelasId, kelasKode: kelas.kode, tipeQurban: tipe, satuan, namaQurban, tglPengiriman, harga: hargaEfektif })
  }

  const harga = getHarga()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-3">Tambah Pre-order</h2>
        {initialValues?.catatan && (
          <div className="bg-surface-high rounded-xl px-3 py-2 mb-4 text-xs text-on-surface-variant font-body">
            <span className="font-medium text-on-surface">Dari booking:</span> {initialValues.catatan}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Jenis</label>
            <div className="flex gap-2">
              {(['SAPI', 'DOMBA'] as const).map(j => (
                <button
                  key={j}
                  type="button"
                  onClick={() => { setJenis(j); setKelasId(null) }}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-body transition-colors ${
                    jenis === j ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {j === 'SAPI' ? 'Sapi' : 'Domba'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Kelas</label>
            <select
              value={kelasId ?? ''}
              onChange={e => setKelasId(e.target.value ? Number(e.target.value) : null)}
              className="input-field w-full"
            >
              <option value="">Pilih kelas...</option>
              {kelasList.map(k => {
                const h = hargaList.find(h => h.kelas_id === k.id && h.jenis === jenis)
                return (
                  <option key={k.id} value={k.id}>
                    {k.kode} {h ? `– ${h.harga_jual.toLocaleString('id-ID')}` : '(no price)'}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Tipe Qurban</label>
            <div className="flex flex-col gap-2">
              {TIPE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipe(t.value)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-body text-left transition-colors ${
                    tipe === t.value ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Satuan</label>
            <div className="flex gap-2">
              {(['EKOR', 'SLOT'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSatuan(s); if (s === 'EKOR') setNamaQurban('') }}
                  className={`flex-1 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
                    satuan === s ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {s === 'EKOR' ? '1 Ekor' : '1/7 Slot'}
                </button>
              ))}
            </div>
          </div>

          {satuan === 'SLOT' && (
            <div>
              <label className="block text-sm font-body font-medium text-on-surface mb-1">
                Nama Qurban{tipe === 'PHQ' ? ' *' : ''}
              </label>
              <input
                type="text"
                value={namaQurban}
                onChange={e => setNamaQurban(e.target.value)}
                placeholder={tipe === 'PHQ' ? 'Ahmad bin Budi...' : 'Ahmad bin Budi... (opsional)'}
                className="input-field w-full"
              />
            </div>
          )}

          {tipe === 'SHQ' && (
            <div>
              <label className="block text-sm font-body font-medium text-on-surface mb-1">
                Tgl Pengiriman *
              </label>
              <input
                type="date"
                value={tglPengiriman}
                onChange={e => setTglPengiriman(e.target.value)}
                className="input-field w-full"
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
          )}

          {(() => {
            const displayHarga = satuan === 'SLOT'
              ? (hargaList.find(h => h.kelas_id === kelasId && h.jenis === jenis)?.harga_slot ?? 0)
              : harga
            return kelasId && displayHarga > 0 ? (
              <p className="text-sm font-body text-primary font-medium">
                Harga: {displayHarga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
              </p>
            ) : null
          })()}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!kelasId || (satuan === 'SLOT' && tipe === 'PHQ' && !namaQurban.trim()) || (tipe === 'SHQ' && !tglPengiriman)}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            Tambah ke Cart
          </button>
        </div>
      </div>
    </div>
  )
}
