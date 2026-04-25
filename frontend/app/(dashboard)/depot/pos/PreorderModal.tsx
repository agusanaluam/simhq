'use client'

import { useState } from 'react'

interface KelasHewan { id: number; kode: string; nama: string }
interface HargaEntry { kelas_id: number; jenis: string; harga_jual: number }

interface Props {
  kelasList: KelasHewan[]
  hargaList: HargaEntry[]
  onConfirm: (item: { jenis: string; kelasId: number; kelasKode: string; tipeQurban: string; harga: number }) => void
  onClose: () => void
}

const TIPE_OPTIONS = ['SHQ', 'THQ', 'PHQ']

export function PreorderModal({ kelasList, hargaList, onConfirm, onClose }: Props) {
  const [jenis,   setJenis]   = useState('SAPI')
  const [kelasId, setKelasId] = useState<number | null>(null)
  const [tipe,    setTipe]    = useState('SHQ')

  function getHarga(): number {
    if (!kelasId) return 0
    return hargaList.find(h => h.kelas_id === kelasId && h.jenis === jenis)?.harga_jual ?? 0
  }

  function handleConfirm() {
    if (!kelasId) return
    const kelas = kelasList.find(k => k.id === kelasId)!
    onConfirm({ jenis, kelasId, kelasKode: kelas.kode, tipeQurban: tipe, harga: getHarga() })
  }

  const harga = getHarga()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-4">Tambah Pre-order</h2>

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
            <div className="flex gap-2">
              {TIPE_OPTIONS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipe(t)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
                    tipe === t ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {kelasId && harga > 0 && (
            <p className="text-sm font-body text-primary font-medium">
              Harga: {harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </p>
          )}
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
            disabled={!kelasId}
            className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            Tambah ke Cart
          </button>
        </div>
      </div>
    </div>
  )
}
