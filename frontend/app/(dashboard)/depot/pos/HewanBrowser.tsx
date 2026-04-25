'use client'

import { useEffect, useState } from 'react'
import { TipeQurbanModal, type HewanForCart } from './TipeQurbanModal'
import { PreorderModal } from './PreorderModal'
import type { CartItem } from './page'
import api from '@/lib/api'

interface KelasHewan { id: number; kode: string; nama: string }
interface HargaEntry  { kelas_id: number; jenis: string; harga_jual: number }

interface Props {
  musim: number
  depotId: number | undefined
  onAdd: (item: CartItem) => void
}

export function HewanBrowser({ musim, depotId, onAdd }: Props) {
  const [jenis,        setJenis]        = useState<'SAPI' | 'DOMBA'>('SAPI')
  const [kelasFilter,  setKelasFilter]  = useState<string>('')
  const [hewan,        setHewan]        = useState<HewanForCart[]>([])
  const [kelasList,    setKelasList]    = useState<KelasHewan[]>([])
  const [hargaList,    setHargaList]    = useState<HargaEntry[]>([])
  const [loading,      setLoading]      = useState(false)
  const [selected,     setSelected]     = useState<HewanForCart | null>(null)
  const [showPreorder, setShowPreorder] = useState(false)

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
    api.get(`/api/master/harga?musim=${musim}`).then(r => setHargaList(r.data.data ?? []))
  }, [musim])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ status: 'AVAILABLE', jenis })
    if (kelasFilter) params.set('kelas', kelasFilter)
    if (depotId)     params.set('depot', String(depotId))
    params.set('musim', String(musim))
    api.get(`/api/hewan?${params}&per_page=100`)
      .then(r => setHewan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [jenis, kelasFilter, depotId, musim])

  function getHarga(kelasId: number, j: string): number {
    return hargaList.find(h => h.kelas_id === kelasId && h.jenis === j)?.harga_jual ?? 0
  }

  function handleHewanConfirm(tipeQurban: string) {
    if (!selected || !selected.kelas_jual) return
    onAdd({
      tempId:     crypto.randomUUID(),
      hewanId:    selected.id,
      noHewan:    selected.no_hewan,
      jenis:      selected.jenis,
      kelasId:    selected.kelas_jual.id,
      kelasKode:  selected.kelas_jual.kode,
      tipeQurban,
      harga:      getHarga(selected.kelas_jual.id, selected.jenis),
      isPreorder: false,
    })
    setSelected(null)
  }

  function handlePreorderConfirm(item: { jenis: string; kelasId: number; kelasKode: string; tipeQurban: string; harga: number }) {
    onAdd({
      tempId:     crypto.randomUUID(),
      hewanId:    null,
      noHewan:    null,
      jenis:      item.jenis,
      kelasId:    item.kelasId,
      kelasKode:  item.kelasKode,
      tipeQurban: item.tipeQurban,
      harga:      item.harga,
      isPreorder: true,
    })
    setShowPreorder(false)
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex bg-surface-high rounded-xl p-1 gap-1">
          {(['SAPI', 'DOMBA'] as const).map(j => (
            <button
              key={j}
              onClick={() => { setJenis(j); setKelasFilter('') }}
              className={`px-4 py-1.5 rounded-lg text-sm font-body font-medium transition-colors ${
                jenis === j ? 'bg-surface-lowest text-on-surface shadow-card' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {j === 'SAPI' ? 'Sapi' : 'Domba'}
            </button>
          ))}
        </div>

        <select value={kelasFilter} onChange={e => setKelasFilter(e.target.value)} className="input-field w-36">
          <option value="">Semua Kelas</option>
          {kelasList.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
        </select>

        <button
          onClick={() => setShowPreorder(true)}
          className="px-3 py-1.5 rounded-xl border border-primary text-primary text-sm font-body hover:bg-primary/5 transition-colors"
        >
          + Pre-order
        </button>

        <span className="text-xs text-on-surface-variant font-body ml-auto">
          {hewan.length} ekor tersedia
        </span>
      </div>

      {/* Hewan grid */}
      {loading ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
      ) : hewan.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-8 text-center italic">Tidak ada hewan tersedia.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {hewan.map(h => {
            const harga = h.kelas_jual ? getHarga(h.kelas_jual.id, h.jenis) : 0
            return (
              <button
                key={h.id}
                onClick={() => setSelected(h)}
                className="p-3 rounded-xl border-2 border-surface-high bg-surface-lowest text-left hover:border-primary/50 hover:bg-surface-high transition-colors"
              >
                <p className="font-display font-bold text-primary text-sm">#{h.no_hewan}</p>
                <p className="text-xs text-on-surface-variant font-body">{h.kelas_jual?.kode ?? '—'} · {h.bobot_masuk} kg</p>
                {harga > 0 && (
                  <p className="text-xs font-medium text-on-surface mt-0.5">
                    {harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <TipeQurbanModal
          hewan={selected}
          harga={selected.kelas_jual ? getHarga(selected.kelas_jual.id, selected.jenis) : 0}
          onConfirm={handleHewanConfirm}
          onClose={() => setSelected(null)}
        />
      )}

      {showPreorder && (
        <PreorderModal
          kelasList={kelasList}
          hargaList={hargaList}
          onConfirm={handlePreorderConfirm}
          onClose={() => setShowPreorder(false)}
        />
      )}
    </div>
  )
}
