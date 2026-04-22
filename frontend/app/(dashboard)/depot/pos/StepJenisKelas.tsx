'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface Kelas { id: number; kode: string; nama: string }
interface HargaEntry { kelas_id: number; jenis: string; harga_jual: number }

interface Props {
  jenis: string
  kelasId: number | null
  tipeQurban: string
  musim: number
  onNext: (data: { jenis: string; kelasId: number; tipeQurban: string; harga: number; kelasKode: string }) => void
}

export function StepJenisKelas({ jenis: initJenis, kelasId: initKelas, tipeQurban: initTipe, musim, onNext }: Props) {
  const [jenis, setJenis]         = useState(initJenis || 'SAPI')
  const [tipe, setTipe]           = useState(initTipe || 'SHQ')
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [hargaList, setHargaList] = useState<HargaEntry[]>([])
  const [kelasId, setKelasId]     = useState<number | null>(initKelas)

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
    api.get(`/api/master/harga?musim=${musim}`).then(r => setHargaList(r.data.data ?? []))
  }, [musim])

  function getHarga(): number {
    if (!kelasId) return 0
    return hargaList.find(h => h.kelas_id === kelasId && h.jenis === jenis)?.harga_jual ?? 0
  }

  function getKelasKode(): string {
    return kelasList.find(k => k.id === kelasId)?.kode ?? ''
  }

  function handleNext() {
    if (!kelasId) return
    onNext({ jenis, kelasId, tipeQurban: tipe, harga: getHarga(), kelasKode: getKelasKode() })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-2">Jenis Hewan</label>
        <div className="flex gap-2">
          {(['SAPI', 'DOMBA'] as const).map(j => (
            <button
              key={j}
              onClick={() => { setJenis(j); setKelasId(null) }}
              className={`px-6 py-2 rounded-xl border-2 font-body font-medium transition-colors ${
                jenis === j ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
              }`}
            >
              {j === 'SAPI' ? '🐄 Sapi' : '🐑 Domba'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-2">Tipe Qurban</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
            { value: 'THQ', label: 'THQ – Sembelih di Depot' },
            { value: 'PHQ', label: 'PHQ – Sembelih + Kirim' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTipe(t.value)}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-body transition-colors ${
                tipe === t.value ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-2">Kelas</label>
        <div className="grid grid-cols-3 gap-2">
          {kelasList.map(k => {
            const harga = hargaList.find(h => h.kelas_id === k.id && h.jenis === jenis)?.harga_jual
            return (
              <button
                key={k.id}
                onClick={() => setKelasId(k.id)}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  kelasId === k.id ? 'border-primary bg-surface-high' : 'border-surface-high hover:border-primary/50'
                }`}
              >
                <p className="font-body font-semibold text-on-surface text-sm">{k.kode}</p>
                <p className="text-xs text-on-surface-variant">{k.nama}</p>
                {harga != null ? (
                  <p className="text-xs font-medium text-primary mt-1">
                    {harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                  </p>
                ) : (
                  <p className="text-xs text-on-surface-variant mt-1">Harga belum diset</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Button onClick={handleNext} disabled={!kelasId}>Lanjut →</Button>
    </div>
  )
}
