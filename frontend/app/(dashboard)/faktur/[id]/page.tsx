'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import api from '@/lib/api'

interface Pembayaran { id: number; tipe: string; jumlah: number; tgl_bayar: string; metode: string }
interface SlotItem {
  no_slot:     number
  status:      string
  nama_qurban?: string
  nominal?:    number
  customer:    { nama: string; hp: string } | null
}

interface FakturData {
  transaksi: {
    id: number; no_faktur: string; tipe_qurban: string; jenis: string
    harga: number; total: number; status_bayar: string; status_transaksi: string; musim: number
    customer:  { nama: string; hp: string; alamat: string | null; kota: string | null }
    hewan:     { no_hewan: string; bobot_masuk: string; bobot_terkini: string | null; kelas_jual: { kode: string; nama: string } | null } | null
    kelas:     { kode: string; nama: string } | null
    teller:    { name: string } | null
    pembayaran: Pembayaran[]
  }
  slots: SlotItem[]
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function FakturPage() {
  const { id }        = useParams<{ id: string }>()
  const [data, setData]       = useState<FakturData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/transaksi/${id}/faktur`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat faktur...</div>
  if (!data)   return <div className="p-8 text-center text-red-500">Gagal memuat faktur.</div>

  const { transaksi, slots } = data
  const totalDibayar = transaksi.pembayaran.reduce((s, p) => s + p.jumlah, 0)
  const sisaBayar    = transaksi.harga - totalDibayar

  return (
    <>
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700"
        >
          <Printer className="w-4 h-4" />
          Cetak Faktur
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-8 bg-white print:p-4 print:max-w-none font-sans text-gray-900 text-sm">
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-xl font-bold">FAKTUR PEMBELIAN HEWAN QURBAN</h1>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>No. Faktur: <strong>{transaksi.no_faktur}</strong></span>
            <span>Musim {transaksi.musim}</span>
          </div>
        </div>

        <div className="mb-4">
          <p className="font-semibold text-xs uppercase text-gray-500 mb-1">Data Pembeli</p>
          <p className="font-bold text-base">{transaksi.customer.nama}</p>
          <p className="text-xs text-gray-600">{transaksi.customer.hp}</p>
          {transaksi.customer.alamat && (
            <p className="text-xs text-gray-600">{transaksi.customer.alamat}, {transaksi.customer.kota}</p>
          )}
        </div>

        <table className="w-full border border-gray-300 text-xs mb-4">
          <thead className="bg-gray-100">
            <tr>
              {['Jenis', 'Kelas', 'No. Hewan', 'Bobot', 'Tipe', 'Harga'].map(h => (
                <th key={h} className={`border border-gray-300 px-2 py-1 ${h === 'Harga' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-2 py-1">{transaksi.jenis}</td>
              <td className="border border-gray-300 px-2 py-1">{transaksi.kelas?.nama ?? '—'}</td>
              <td className="border border-gray-300 px-2 py-1">{transaksi.hewan?.no_hewan ?? '(Belum dialokasikan)'}</td>
              <td className="border border-gray-300 px-2 py-1">
                {transaksi.hewan ? `${transaksi.hewan.bobot_terkini ?? transaksi.hewan.bobot_masuk} kg` : '—'}
              </td>
              <td className="border border-gray-300 px-2 py-1">{transaksi.tipe_qurban}</td>
              <td className="border border-gray-300 px-2 py-1 text-right font-semibold">{rupiah(transaksi.harga)}</td>
            </tr>
          </tbody>
        </table>

        {transaksi.jenis === 'SAPI' && slots.length > 0 && (
          <div className="mb-4">
            <p className="font-semibold text-xs uppercase text-gray-500 mb-1">Daftar Slot Pembeli</p>
            <table className="w-full border border-gray-300 text-xs">
              <thead className="bg-gray-100">
                <tr>
                  {['Slot', 'Nama Pembeli', 'Nama Qurban', 'Nominal', 'Status'].map(h => (
                    <th key={h} className={`border border-gray-300 px-2 py-1 ${h === 'Nominal' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.no_slot} className={s.status === 'KOSONG' ? 'bg-gray-50' : ''}>
                    <td className="border border-gray-300 px-2 py-1 text-center">{s.no_slot}</td>
                    <td className="border border-gray-300 px-2 py-1">{s.customer?.nama ?? '—'}</td>
                    <td className="border border-gray-300 px-2 py-1">{s.nama_qurban ?? '—'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{s.nominal ? rupiah(s.nominal) : '—'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mb-4 border border-gray-300 rounded p-3 text-xs">
          <p className="font-semibold text-xs uppercase text-gray-500 mb-2">Status Pembayaran</p>
          {transaksi.pembayaran.map(p => (
            <div key={p.id} className="flex justify-between">
              <span>{p.tipe} — {p.tgl_bayar}</span>
              <span className="font-semibold">{rupiah(p.jumlah)}</span>
            </div>
          ))}
          <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold">
            <span>Harga Total</span><span>{rupiah(transaksi.harga)}</span>
          </div>
          <div className="flex justify-between text-green-700">
            <span>Sudah Dibayar</span><span>{rupiah(totalDibayar)}</span>
          </div>
          <div className={`flex justify-between font-bold ${sisaBayar > 0 ? 'text-red-600' : 'text-green-700'}`}>
            <span>Sisa</span><span>{rupiah(sisaBayar)}</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-center">
          <div>
            <p>Pembeli</p>
            <div className="h-16 border-b border-gray-400 mt-1 mb-1" />
            <p>{transaksi.customer.nama}</p>
          </div>
          <div>
            <p>Teller / CS</p>
            <div className="h-16 border-b border-gray-400 mt-1 mb-1" />
            <p>{transaksi.teller?.name ?? '—'}</p>
          </div>
        </div>
      </div>
    </>
  )
}
