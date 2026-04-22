'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AssignHewanModal } from './AssignHewanModal'
import api from '@/lib/api'
import Link from 'next/link'

interface Transaksi {
  id: number
  no_faktur: string
  status_transaksi: string
  tipe_qurban: string
  jenis: string
  total: number
  created_at: string
  customer: { nama: string; hp: string } | null
  hewan: { no_hewan: string } | null
  kelas: { kode: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU_HEWAN:   'Menunggu Hewan',
  HEWAN_TERALOKASI: 'Hewan Teralokasi',
  DIKONFIRMASI:     'Dikonfirmasi',
  SELESAI:          'Selesai',
  DIBATALKAN:       'Dibatalkan',
}

const STATUS_COLOR: Record<string, string> = {
  MENUNGGU_HEWAN:   'bg-yellow-100 text-yellow-800',
  HEWAN_TERALOKASI: 'bg-blue-100 text-blue-800',
  DIKONFIRMASI:     'bg-green-100 text-green-800',
  SELESAI:          'bg-gray-100 text-gray-700',
  DIBATALKAN:       'bg-red-100 text-red-700',
}

export default function TransaksiPage() {
  const [list, setList]       = useState<Transaksi[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const [assignModal, setAssignModal] = useState<{ id: number; jenis: string } | null>(null)

  function load() {
    setLoading(true)
    const p = new URLSearchParams()
    if (filter) p.set('status', filter)
    api.get(`/api/transaksi?${p}`)
      .then(r => setList(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  async function konfirmasi(id: number) {
    await api.put(`/api/transaksi/${id}/konfirmasi`)
    load()
  }

  async function batal(id: number) {
    if (!confirm('Batalkan transaksi ini?')) return
    await api.put(`/api/transaksi/${id}/batal`)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Transaksi</h1>
          <p className="text-sm text-on-surface-variant mt-1">Semua transaksi penjualan</p>
        </div>
        <Link href="/depot/pos">
          <Button>+ Transaksi Baru</Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'MENUNGGU_HEWAN', 'HEWAN_TERALOKASI', 'DIKONFIRMASI', 'SELESAI', 'DIBATALKAN'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-colors ${
              filter === s
                ? 'bg-primary text-white'
                : 'bg-surface-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {s ? STATUS_LABEL[s] : 'Semua'}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-8 text-center">Belum ada transaksi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high text-left text-xs text-on-surface-variant font-body">
                  <th className="pb-2 pr-4">No Faktur</th>
                  <th className="pb-2 pr-4">Pembeli</th>
                  <th className="pb-2 pr-4">Hewan</th>
                  <th className="pb-2 pr-4">Tipe</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map(t => (
                  <tr key={t.id} className="border-b border-surface-high last:border-0">
                    <td className="py-2 pr-4">
                      <Link href={`/depot/transaksi/${t.id}`} className="font-body font-medium text-primary hover:underline">
                        {t.no_faktur}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 font-body">
                      <p className="font-medium text-on-surface">{t.customer?.nama ?? '—'}</p>
                      <p className="text-xs text-on-surface-variant">{t.customer?.hp}</p>
                    </td>
                    <td className="py-2 pr-4 font-body text-on-surface">
                      {t.hewan
                        ? `#${t.hewan.no_hewan}`
                        : <span className="text-on-surface-variant italic">Pre-order</span>
                      }
                    </td>
                    <td className="py-2 pr-4 font-body">
                      <span className="text-xs">{t.tipe_qurban} · {t.jenis}</span>
                      {t.kelas && (
                        <span className="text-xs text-on-surface-variant ml-1">· {t.kelas.kode}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 font-body font-medium text-on-surface">
                      {t.total.toLocaleString('id-ID', {
                        style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body ${STATUS_COLOR[t.status_transaksi] ?? ''}`}>
                        {STATUS_LABEL[t.status_transaksi] ?? t.status_transaksi}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {t.status_transaksi === 'MENUNGGU_HEWAN' && (
                          <button
                            onClick={() => setAssignModal({ id: t.id, jenis: t.jenis })}
                            className="text-xs text-primary hover:underline"
                          >
                            Assign Hewan
                          </button>
                        )}
                        {t.status_transaksi === 'HEWAN_TERALOKASI' && (
                          <button
                            onClick={() => konfirmasi(t.id)}
                            className="text-xs text-green-700 hover:underline"
                          >
                            Konfirmasi
                          </button>
                        )}
                        {!['SELESAI', 'DIBATALKAN'].includes(t.status_transaksi) && (
                          <button
                            onClick={() => batal(t.id)}
                            className="text-xs text-red-600 hover:underline ml-1"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {assignModal && (
        <AssignHewanModal
          transaksiId={assignModal.id}
          jenis={assignModal.jenis}
          onDone={() => { setAssignModal(null); load() }}
          onClose={() => setAssignModal(null)}
        />
      )}
    </div>
  )
}
