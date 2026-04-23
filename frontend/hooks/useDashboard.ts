'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

export interface StokPerKelas {
  kelas_kode: string
  kelas_nama: string
  jenis: string
  tersedia: number
  terjual: number
}

export interface AlertStok {
  kelas_kode: string
  kelas_nama: string
  jenis: string
  sisa: number
}

export interface GrafikItem {
  tanggal: string
  pendapatan: number
  ekor: number
}

export interface DashboardData {
  stok: {
    masuk: number
    tersedia: number
    terjual: number
    delivered: number
    mati: number
    per_kelas: StokPerKelas[]
  }
  pendapatan: {
    hari_ini: number
    musim: number
  }
  transaksi_hari_ini: {
    total: number
    per_tipe: Array<{ tipe_qurban: string; count: number }>
  }
  grafik_7hari: GrafikItem[]
  alert_stok: AlertStok[]
}

export function useDashboard(musim?: number) {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (musim !== undefined) params.set('musim', String(musim))
      const res = await api.get<DashboardData>(`/api/dashboard/depot?${params}`)
      setData(res.data)
      setError(null)
    } catch {
      setError('Gagal memuat data dashboard.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchData])

  return { data, loading, error, refresh: fetchData }
}
