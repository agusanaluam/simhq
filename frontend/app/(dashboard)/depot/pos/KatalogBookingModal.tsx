'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

export interface BookingOrderRow {
  id:          number
  nama:        string
  hp:          string
  jenis:       string
  kelas:       string
  tipe_qurban: string
  catatan:     string | null
  status:      string
  created_at:  string
}

interface Props {
  onSelect: (order: BookingOrderRow) => void
  onClose:  () => void
}

const STATUS_COLOR: Record<string, string> = {
  BARU:         'bg-blue-100 text-blue-800',
  DIKONFIRMASI: 'bg-yellow-100 text-yellow-800',
}

function fmtTgl(raw: string) {
  return new Date(raw).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function KatalogBookingModal({ onSelect, onClose }: Props) {
  const [rows,    setRows]    = useState<BookingOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    api.get('/api/cs/order?per_page=200')
      .then(r => {
        const all: BookingOrderRow[] = r.data.data?.data ?? r.data.data ?? []
        setRows(all.filter(o => o.status === 'BARU' || o.status === 'DIKONFIRMASI'))
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r =>
    !search ||
    r.nama.toLowerCase().includes(search.toLowerCase()) ||
    r.hp.includes(search) ||
    r.kelas.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-high">
          <div>
            <h2 className="font-display font-bold text-lg text-on-surface">Booking dari Katalog</h2>
            <p className="text-xs text-on-surface-variant font-body mt-0.5">Status: Baru &amp; Dikonfirmasi</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface text-2xl leading-none">×</button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-surface-high">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, HP, atau kelas..."
            className="input-field w-full text-sm"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center py-10 text-sm text-on-surface-variant">Memuat...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-sm text-on-surface-variant italic">
              {rows.length === 0 ? 'Tidak ada booking masuk.' : 'Tidak ada hasil pencarian.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-lowest">
                <tr className="border-b border-surface-high">
                  {['Tgl', 'Nama / HP', 'Jenis', 'Kelas', 'Tipe', 'Status', ''].map(h => (
                    <th key={h} className="py-2 px-3 text-left text-xs font-body font-medium text-on-surface-variant uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-surface-high last:border-0 hover:bg-surface-high/50 transition-colors">
                    <td className="py-2.5 px-3 text-on-surface-variant whitespace-nowrap">{fmtTgl(r.created_at)}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-on-surface">{r.nama}</p>
                      <p className="text-xs text-on-surface-variant">{r.hp}</p>
                      {r.catatan && (
                        <p className="text-xs text-on-surface-variant mt-0.5 italic line-clamp-1">{r.catatan}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-on-surface">{r.jenis}</td>
                    <td className="py-2.5 px-3 text-on-surface font-medium">{r.kelas}</td>
                    <td className="py-2.5 px-3 text-on-surface">{r.tipe_qurban}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onSelect(r)}
                        className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-body font-medium hover:bg-primary/90 transition-colors"
                      >
                        Pilih
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
