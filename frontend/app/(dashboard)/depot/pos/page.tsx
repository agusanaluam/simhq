'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { HewanBrowser } from './HewanBrowser'
import { CartPanel } from './CartPanel'
import api from '@/lib/api'

const MUSIM = new Date().getFullYear()

export interface CartItem {
  tempId: string
  hewanId: number | null
  noHewan: string | null
  jenis: string
  kelasId: number
  kelasKode: string
  tipeQurban: string
  satuan: 'EKOR' | 'SLOT'
  namaQurban: string
  harga: number
  isPreorder: boolean
}

export interface CartSubmitData {
  customerId: number
  nama: string; hp: string; alamat: string
  kelurahan: string; kecamatan: string; kode_pos: string; kota: string
  csId: number | null
  tellerId: number | null
  salesNama: string
  metodeBayar: string
  tipeBayar: string
  nominalBayar: number
  rencana_pelunasan: string
  ongkosKirim: number
  biayaPotong: number
}

export default function POSPage() {
  const router            = useRouter()
  const { data: session } = useSession()
  const depotId           = (session?.user as any)?.depotId as number | undefined

  const [cart,       setCart]       = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  function addItem(item: CartItem) {
    setCart(prev => [...prev, item])
  }

  function removeItem(tempId: string) {
    setCart(prev => prev.filter(i => i.tempId !== tempId))
  }

  async function handleSubmit(data: CartSubmitData) {
    if (!depotId) { setError('Depot tidak ditemukan di sesi.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/api/transaksi', {
        depot_id:           depotId,
        customer_id:        data.customerId,
        cs_id:              data.csId,
        teller_id:          data.tellerId,
        sales_id:           null,
        sales_nama:         data.salesNama || null,
        rencana_pelunasan:  data.rencana_pelunasan || null,
        ongkos_kirim:       data.ongkosKirim || 0,
        biaya_potong:       data.biayaPotong || 0,
        musim:              MUSIM,
        items: cart.map(item => ({
          hewan_id:    item.hewanId,
          jenis:       item.jenis,
          kelas_id:    item.kelasId,
          tipe_qurban: item.tipeQurban,
          harga:       item.harga,
          is_preorder: item.isPreorder,
          satuan:      item.satuan,
          nama_qurban: item.namaQurban || null,
        })),
      })
      const transaksiId = res.data.transaksi.id

      await api.post(`/api/transaksi/${transaksiId}/bayar`, {
        jumlah:    data.nominalBayar,
        tipe:      data.tipeBayar,
        metode:    data.metodeBayar,
        teller_id: data.tellerId,
        tgl_bayar: new Date().toISOString().split('T')[0],
      })

      router.push('/depot/transaksi')
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Gagal memproses transaksi.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display font-bold text-2xl text-on-surface">POS Penjualan</h1>
        <p className="text-sm text-on-surface-variant mt-1">Pilih hewan → tambah ke cart → proses</p>
      </div>

      {error && (
        <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md mb-4">{error}</p>
      )}

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <HewanBrowser
            musim={MUSIM}
            depotId={depotId}
            onAdd={addItem}
          />
        </div>

        <div className="w-80 xl:w-96 flex-shrink-0 sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          <CartPanel
            items={cart}
            onRemove={removeItem}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  )
}
