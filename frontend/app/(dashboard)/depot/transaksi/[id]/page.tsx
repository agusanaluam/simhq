'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import { formatDate } from '@/lib/format'

interface PembayaranEntry {
  id: number
  jumlah: number
  tipe: string
  metode: string
  tgl_bayar: string
  catatan: string | null
  teller: { name: string } | null
}

interface TransaksiDetail {
  id: number
  no_faktur: string
  tipe_qurban: string
  jenis: string
  total: number
  status_transaksi: string
  status_bayar: string
  customer: { nama: string; hp: string } | null
  hewan: { no_hewan: string } | null
  kelas: { kode: string } | null
}

const STATUS_BAYAR_COLOR: Record<string, string> = {
  BELUM_BAYAR: 'bg-red-100 text-red-700',
  DP:          'bg-yellow-100 text-yellow-800',
  LUNAS:       'bg-green-100 text-green-800',
}

const STATUS_BAYAR_LABEL: Record<string, string> = {
  BELUM_BAYAR: 'Belum Bayar',
  DP:          'DP',
  LUNAS:       'Lunas',
}

export default function TransaksiDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [transaksi, setTransaksi]     = useState<TransaksiDetail | null>(null)
  const [pembayaran, setPembayaran]   = useState<PembayaranEntry[]>([])
  const [totalBayar, setTotalBayar]   = useState(0)
  const [sisaPelunasan, setSisa]      = useState(0)
  const [loading, setLoading]         = useState(true)

  const [jumlah, setJumlah]     = useState('')
  const [tipe, setTipe]         = useState('DP')
  const [metode, setMetode]     = useState('CASH')
  const [tglBayar, setTglBayar] = useState(new Date().toISOString().slice(0, 10))
  const [catatan, setCatatan]   = useState('')
  const [saving, setSaving]     = useState(false)

  const [ket, setKet]               = useState('')
  const [biaya, setBiaya]           = useState('')
  const [savingBiaya, setSavingBiaya] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [trxRes, bayarRes] = await Promise.all([
        api.get(`/api/transaksi/${id}`),
        api.get(`/api/transaksi/${id}/pembayaran`),
      ])
      setTransaksi(trxRes.data.transaksi)
      setPembayaran(bayarRes.data.pembayaran ?? [])
      setTotalBayar(bayarRes.data.total_bayar ?? 0)
      setSisa(bayarRes.data.sisa_pelunasan ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function submitBayar() {
    if (!jumlah || parseInt(jumlah) <= 0) return
    setSaving(true)
    try {
      await api.post(`/api/transaksi/${id}/bayar`, {
        jumlah: parseInt(jumlah), tipe, metode, tgl_bayar: tglBayar, catatan,
      })
      setJumlah(''); setCatatan('')
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function submitBiaya() {
    if (!ket.trim() || !biaya || parseInt(biaya) <= 0) return
    setSavingBiaya(true)
    try {
      await api.post(`/api/transaksi/${id}/biaya-tambahan`, {
        keterangan: ket, jumlah: parseInt(biaya),
      })
      setKet(''); setBiaya('')
      await load()
    } finally {
      setSavingBiaya(false)
    }
  }

  if (loading) return <p className="text-sm text-on-surface-variant p-8">Memuat...</p>
  if (!transaksi) return <p className="text-sm text-red-600 p-8">Transaksi tidak ditemukan</p>

  const pct = transaksi.total > 0 ? Math.min((totalBayar / transaksi.total) * 100, 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-on-surface-variant hover:text-on-surface text-sm">
          ← Kembali
        </button>
        <h1 className="font-display font-bold text-2xl text-on-surface">{transaksi.no_faktur}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-body font-semibold ${STATUS_BAYAR_COLOR[transaksi.status_bayar] ?? ''}`}>
          {STATUS_BAYAR_LABEL[transaksi.status_bayar] ?? transaksi.status_bayar}
        </span>
      </div>

      <Card>
        <h2 className="font-display font-semibold text-on-surface mb-3">Info Transaksi</h2>
        <div className="grid grid-cols-2 gap-2 text-sm font-body">
          <div><span className="text-on-surface-variant">Pembeli: </span><span className="font-medium">{transaksi.customer?.nama}</span></div>
          <div><span className="text-on-surface-variant">HP: </span><span>{transaksi.customer?.hp}</span></div>
          <div><span className="text-on-surface-variant">Hewan: </span><span>{transaksi.hewan ? `#${transaksi.hewan.no_hewan}` : 'Pre-order'}</span></div>
          <div><span className="text-on-surface-variant">Tipe: </span><span>{transaksi.tipe_qurban} · {transaksi.jenis} · {transaksi.kelas?.kode}</span></div>
          <div>
            <span className="text-on-surface-variant">Total Tagihan: </span>
            <span className="font-semibold text-primary">
              {transaksi.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-on-surface-variant">Sisa: </span>
            <span className={`font-semibold ${sisaPelunasan > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {sisaPelunasan.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-on-surface-variant mb-1 font-body">
            <span>Pelunasan</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 bg-surface-high rounded-full">
            <div
              className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-semibold text-on-surface mb-3">Riwayat Pembayaran</h2>
        {pembayaran.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic">Belum ada pembayaran</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high text-xs text-on-surface-variant font-body text-left">
                  <th className="pb-2 pr-3">Tgl</th>
                  <th className="pb-2 pr-3">Jumlah</th>
                  <th className="pb-2 pr-3">Tipe</th>
                  <th className="pb-2 pr-3">Metode</th>
                  <th className="pb-2">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {pembayaran.map(p => (
                  <tr key={p.id} className="border-b border-surface-high last:border-0">
                    <td className="py-2 pr-3 font-body text-on-surface">{formatDate(p.tgl_bayar)}</td>
                    <td className="py-2 pr-3 font-body font-medium text-on-surface">
                      {p.jumlah.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 pr-3 font-body text-xs">{p.tipe}</td>
                    <td className="py-2 pr-3 font-body text-xs">{p.metode.replace('_', ' ')}</td>
                    <td className="py-2 text-xs text-on-surface-variant">{p.catatan ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {transaksi.status_bayar !== 'LUNAS' && (
        <Card>
          <h2 className="font-display font-semibold text-on-surface mb-4">Input Pembayaran</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-body font-medium text-on-surface mb-1">Jumlah (Rp) *</label>
                <Input type="number" value={jumlah} onChange={e => setJumlah(e.target.value)} placeholder="2000000" />
              </div>
              <div>
                <label className="block text-xs font-body font-medium text-on-surface mb-1">Tanggal</label>
                <Input type="date" value={tglBayar} onChange={e => setTglBayar(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Tipe</label>
              <div className="flex gap-2">
                {['DP', 'PELUNASAN'].map(t => (
                  <button key={t} onClick={() => setTipe(t)}
                    className={`px-3 py-1 rounded-lg border-2 text-xs font-body transition-colors ${tipe === t ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Metode</label>
              <div className="flex gap-2 flex-wrap">
                {([['CASH','Cash'],['TRANSFER_BCA','Transfer BCA'],['TRANSFER_LAIN','Transfer Lain']] as const).map(([val, lbl]) => (
                  <button key={val} onClick={() => setMetode(val)}
                    className={`px-3 py-1 rounded-lg border-2 text-xs font-body transition-colors ${metode === val ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Catatan</label>
              <Input value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Opsional..." />
            </div>
            <Button onClick={submitBayar} loading={saving} disabled={!jumlah || parseInt(jumlah) <= 0}>
              Simpan Pembayaran
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-display font-semibold text-on-surface mb-4">Biaya Tambahan</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Keterangan *</label>
            <Input value={ket} onChange={e => setKet(e.target.value)} placeholder="Ongkos kirim..." />
          </div>
          <div className="w-36">
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Jumlah (Rp) *</label>
            <Input type="number" value={biaya} onChange={e => setBiaya(e.target.value)} placeholder="200000" />
          </div>
          <Button onClick={submitBiaya} loading={savingBiaya} disabled={!ket.trim() || !biaya}>
            Tambah
          </Button>
        </div>
      </Card>
    </div>
  )
}
