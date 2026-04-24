'use client'

import { useState } from 'react'
import { HewanCard } from './HewanCard'
import { OrderModal } from './OrderModal'

interface CatalogItem {
  kelas:           string
  jenis:           string
  harga_jual:      number
  jumlah_tersedia: number
}

interface KatalogContentProps {
  items:   CatalogItem[]
  depotId: number
  musim:   number
}

export function KatalogContent({ items, depotId, musim }: KatalogContentProps) {
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [submitted,    setSubmitted]    = useState(false)

  const kelasList = Array.from(new Set(items.map((i) => i.kelas)))

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pesanan Diterima!</h2>
        <p className="text-gray-600 max-w-sm">
          Tim CS kami akan menghubungi Anda dalam 1×24 jam via WhatsApp untuk konfirmasi dan informasi pembayaran.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 px-6 py-2.5 border border-green-600 text-green-600 rounded-xl font-medium hover:bg-green-50"
        >
          Pesan Lagi
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">Belum ada hewan tersedia untuk musim {musim}.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((item, i) => (
          <HewanCard
            key={i}
            kelas={item.kelas}
            jenis={item.jenis}
            harga_jual={item.harga_jual}
            jumlah_tersedia={item.jumlah_tersedia}
            onOrder={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {selectedItem && (
        <OrderModal
          depotId={depotId}
          kelasList={kelasList}
          initialKelas={selectedItem.kelas}
          initialJenis={selectedItem.jenis}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => { setSelectedItem(null); setSubmitted(true) }}
        />
      )}
    </>
  )
}
