'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { KatalogContent } from './components/KatalogContent'
import axios from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

interface CatalogItem {
  kelas: string; jenis: string; harga_jual: number
  jumlah_tersedia: number; foto_url: string | null
}

interface Depot { id: number; nama: string }

export default function KatalogPage() {
  const searchParams = useSearchParams()
  const depotParam   = searchParams.get('depot') ?? ''

  const [depots,   setDepots]   = useState<Depot[]>([])
  const [catalog,  setCatalog]  = useState<{ data: CatalogItem[]; musim: number } | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  const depotId = depotParam && !isNaN(Number(depotParam)) ? Number(depotParam) : null

  useEffect(() => {
    if (depotId) {
      setLoading(true)
      axios.get(`${BASE}/api/katalog?depot=${depotId}`)
        .then(r => setCatalog(r.data))
        .catch(() => setError('Gagal memuat katalog.'))
        .finally(() => setLoading(false))
    } else {
      axios.get(`${BASE}/api/depots`)
        .then(r => {
          const list: Depot[] = r.data.data ?? []
          if (list.length === 1) {
            window.location.replace(`/katalog?depot=${list[0].id}`)
          } else {
            setDepots(list)
            setLoading(false)
          }
        })
        .catch(() => { setDepots([]); setLoading(false) })
    }
  }, [depotId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Memuat...</p>
      </div>
    )
  }

  // No depot → show picker
  if (!depotId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Katalog Hewan Qurban</h1>
          <p className="text-sm text-gray-500 mb-6">Pilih depot yang ingin Anda lihat</p>
          <div className="space-y-2">
            {depots.length === 0
              ? <p className="text-sm text-gray-400">Belum ada depot tersedia.</p>
              : depots.map(d => (
                  <a key={d.id} href={`/katalog?depot=${d.id}`}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors">
                    {d.nama}
                  </a>
                ))
            }
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-bold text-gray-900">Katalog Hewan Qurban</h1>
          <p className="text-sm text-gray-500 mt-1">Musim {catalog?.musim} — Tersedia sekarang</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <KatalogContent
          items={catalog?.data ?? []}
          depotId={depotId}
          musim={catalog?.musim ?? new Date().getFullYear()}
        />
      </main>
      <footer className="text-center py-8 text-xs text-gray-400">
        © {new Date().getFullYear()} SIM Hewan Qurban
      </footer>
    </div>
  )
}
