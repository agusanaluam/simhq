'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

interface Depot { id: number; nama: string; slug: string }

export default function KatalogIndexPage() {
  const [depots,  setDepots]  = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${BASE}/api/depots`)
      .then(r => {
        const list: Depot[] = r.data.data ?? []
        if (list.length === 1 && list[0].slug) {
          window.location.replace(`/katalog/${list[0].slug}`)
        } else {
          setDepots(list)
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Memuat...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Katalog Hewan Qurban</h1>
        <p className="text-sm text-gray-500 mb-6">Pilih depot yang ingin Anda lihat</p>
        <div className="space-y-2">
          {depots.length === 0
            ? <p className="text-sm text-gray-400">Belum ada depot tersedia.</p>
            : depots.map(d => (
                <a key={d.id} href={`/katalog/${d.slug ?? d.id}`}
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
