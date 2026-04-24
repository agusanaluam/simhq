'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface RetargetCustomer {
  id:        number
  nama:      string
  hp:        string
  kota:      string | null
  transaksi: Array<{ jenis: string; harga: number; musim: number }>
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function RetargetingPage() {
  const currentYear = new Date().getFullYear()

  const [customers, setCustomers] = useState<RetargetCustomer[]>([])
  const [musim,     setMusim]     = useState(currentYear)
  const [loading,   setLoading]   = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/crm/customer/retargeting?musim=${musim}`)
      setCustomers(res.data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Retargeting</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Customer yang beli musim lalu tapi belum order musim {musim}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Musim</label>
          <input
            type="number" min="2020" max="2099"
            value={musim} onChange={(e) => setMusim(Number(e.target.value))}
            className="input-field text-sm w-24"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-surface rounded animate-pulse" />)}
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <p className="text-center py-8 text-on-surface-variant text-sm">
            Semua customer musim {musim - 1} sudah order musim {musim}. 🎉
          </p>
        </Card>
      ) : (
        <Card>
          <div className="mb-3 text-sm text-on-surface-variant">
            {customers.length} customer perlu di-follow-up
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high">
                  {['Nama', 'HP', 'Kota', 'Pembelian Lalu', 'Aksi'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const lastBuy = c.transaksi[0]
                  return (
                    <tr key={c.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                      <td className="py-3 px-4 font-body font-medium text-on-surface">{c.nama}</td>
                      <td className="py-3 px-4 font-body text-on-surface-variant">{c.hp}</td>
                      <td className="py-3 px-4 font-body text-on-surface-variant">{c.kota ?? '—'}</td>
                      <td className="py-3 px-4 font-body text-on-surface-variant">
                        {lastBuy ? `${lastBuy.jenis} ${rupiah(lastBuy.harga)}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={`https://wa.me/62${c.hp.replace(/^0/, '')}?text=${encodeURIComponent(`Halo ${c.nama}, kami dari Tim Qurban. Tahun ini kami kembali hadir dengan pilihan hewan qurban pilihan. Apakah Anda berminat untuk order musim ${musim}?`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:underline whitespace-nowrap"
                        >
                          💬 Kirim WA
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
