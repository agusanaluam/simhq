'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface CustomerRow {
  id:   number
  nama: string
  hp:   string
  kota: string | null
}

export default function CsCustomerPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [q,         setQ]         = useState('')
  const [wilayah,   setWilayah]   = useState('')
  const [loading,   setLoading]   = useState(true)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q)       params.set('q',       q)
      if (wilayah) params.set('wilayah', wilayah)
      const res = await api.get(`/api/crm/customer?${params}`)
      setCustomers(res.data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [q, wilayah])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Database Customer</h1>
          <p className="text-sm text-on-surface-variant mt-1">Profil &amp; histori pembelian customer</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text" placeholder="Cari nama / no. HP..."
          value={q} onChange={(e) => setQ(e.target.value)}
          className="input-field text-sm flex-1 min-w-48"
        />
        <input
          type="text" placeholder="Filter kota / wilayah..."
          value={wilayah} onChange={(e) => setWilayah(e.target.value)}
          className="input-field text-sm w-48"
        />
      </div>

      <Card>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-surface rounded animate-pulse" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-high">
                {['Nama', 'No. HP', 'Kota', ''].map((h) => (
                  <th key={h} className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                  <td className="py-3 px-4 font-body font-medium text-on-surface">{c.nama}</td>
                  <td className="py-3 px-4 font-body text-on-surface-variant">{c.hp}</td>
                  <td className="py-3 px-4 font-body text-on-surface-variant">{c.kota ?? '—'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => router.push(`/cs/customer/${c.id}`)}
                      className="text-xs text-primary hover:underline"
                    >
                      Detail →
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-on-surface-variant text-sm">
                    Tidak ada customer ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
