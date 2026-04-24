'use client'

import { useState, useEffect, useCallback } from 'react'
import { OrderTable } from './components/OrderTable'
import api from '@/lib/api'

interface OrderRow {
  id:          number
  nama:        string
  hp:          string
  jenis:       string
  kelas:       string
  tipe_qurban: string
  status:      string
  created_at:  string
  cs:          { id: number; name: string } | null
}

const STATUS_FILTER = ['', 'BARU', 'DIKONFIRMASI', 'DP_DIBAYAR', 'LUNAS', 'DIJADWALKAN', 'DIBATALKAN']

export default function CsOrderPage() {
  const [orders,  setOrders]  = useState<OrderRow[]>([])
  const [status,  setStatus]  = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = status ? `?status=${status}` : ''
      const res = await api.get(`/api/cs/order${params}`)
      setOrders(res.data.data?.data ?? [])
    } catch {
      setError('Gagal memuat order.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(id: number, newStatus: string) {
    try {
      await api.put(`/api/cs/order/${id}/status`, { status: newStatus })
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o))
    } catch {
      alert('Gagal mengubah status.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Antrian Order Katalog</h1>
          <p className="text-sm text-on-surface-variant mt-1">Order masuk dari katalog web publik</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field text-sm"
          >
            {STATUS_FILTER.map((s) => (
              <option key={s} value={s}>{s || '— Semua —'}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <OrderTable orders={orders} onStatusChange={handleStatusChange} />
      )}
    </div>
  )
}
