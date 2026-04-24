'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import api from '@/lib/api'

interface SlotItem {
  no_slot:     number
  status:      string
  nama_qurban?: string
  nominal?:    number
  customer:    { nama: string; hp: string } | null
}

interface PlotingData {
  hewan: {
    id: number; no_hewan: string; jenis: string; bobot_masuk: string; bobot_terkini: string | null
    musim: number
    kelas_jual: { kode: string; nama: string } | null
  }
  slots: SlotItem[]
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function FakturPlotingPage() {
  const { id }        = useParams<{ id: string }>()
  const [data, setData]       = useState<PlotingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/hewan/${id}/faktur-ploting`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat faktur ploting...</div>
  if (!data)   return <div className="p-8 text-center text-red-500">Gagal memuat faktur.</div>

  const { hewan, slots } = data
  const totalNominal = slots.reduce((s, slot) => s + (slot.nominal ?? 0), 0)
  const slotTerisi   = slots.filter(s => s.status !== 'KOSONG').length

  return (
    <>
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700"
        >
          <Printer className="w-4 h-4" />
          Cetak Faktur Ploting
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-8 bg-white print:p-4 print:max-w-none font-sans text-gray-900 text-sm">
        <div className="border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-xl font-bold">FAKTUR PLOTING SAPI QURBAN (K-09)</h1>
          <p className="text-xs text-gray-600 mt-1">Musim {hewan.musim}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 text-xs">
          {[
            ['No. Hewan', hewan.no_hewan],
            ['Jenis', hewan.jenis],
            ['Kelas', hewan.kelas_jual?.nama ?? '—'],
            ['Bobot', `${hewan.bobot_terkini ?? hewan.bobot_masuk} kg`],
            ['Slot Terisi', `${slotTerisi} / 7`],
            ['Total Nominal', totalNominal > 0 ? rupiah(totalNominal) : '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <span className="text-gray-500">{label}:</span>
              <span className="font-bold ml-2">{value}</span>
            </div>
          ))}
        </div>

        <table className="w-full border border-gray-300 text-xs">
          <thead className="bg-gray-100">
            <tr>
              {['Slot', 'Nama Pembeli', 'Nama Qurban (bin/binti)', 'Nominal (Rp)', 'Status'].map(h => (
                <th key={h} className={`border border-gray-300 px-2 py-1 ${h === 'Nominal (Rp)' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.no_slot} className={s.status === 'KOSONG' ? 'bg-gray-50 text-gray-400' : ''}>
                <td className="border border-gray-300 px-2 py-2 text-center font-bold">{s.no_slot}</td>
                <td className="border border-gray-300 px-2 py-2">{s.customer?.nama ?? '—'}</td>
                <td className="border border-gray-300 px-2 py-2">{s.nama_qurban ?? '—'}</td>
                <td className="border border-gray-300 px-2 py-2 text-right">{s.nominal ? rupiah(s.nominal) : '—'}</td>
                <td className="border border-gray-300 px-2 py-2 text-center">{s.status}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td colSpan={3} className="border border-gray-300 px-2 py-1 text-right">Total</td>
              <td className="border border-gray-300 px-2 py-1 text-right">{rupiah(totalNominal)}</td>
              <td className="border border-gray-300 px-2 py-1" />
            </tr>
          </tbody>
        </table>

        <div className="mt-6 text-xs text-gray-400 text-center">
          Dicetak dari SIM Hewan Qurban · Musim {hewan.musim}
        </div>
      </div>
    </>
  )
}
