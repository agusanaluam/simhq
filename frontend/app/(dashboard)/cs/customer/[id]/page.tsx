'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface TrxItem { id: number; jenis: string; harga: number; musim: number; status_transaksi: string; kelas: { kode: string } | null }
interface LogItem  { id: number; tanggal: string; channel: string; isi: string; cs: { name: string } | null }
interface Customer { id: number; nama: string; hp: string; alamat: string | null; kota: string | null; kecamatan: string | null; kelurahan: string | null }

interface DetailData {
  customer:  Customer
  transaksi: TrxItem[]
  logs:      LogItem[]
  is_repeat: boolean
}

const CHANNEL_OPTIONS = ['WA', 'TELEPON', 'EMAIL']

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function CsCustomerDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [data,      setData]      = useState<DetailData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [logForm,   setLogForm]   = useState({ tanggal: new Date().toISOString().slice(0, 10), channel: 'WA', isi: '' })
  const [logSaving, setLogSaving] = useState(false)
  const [logError,  setLogError]  = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await api.get(`/api/crm/customer/${id}`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function submitLog(e: React.FormEvent) {
    e.preventDefault()
    if (!logForm.isi.trim()) { setLogError('Isi log wajib diisi.'); return }
    setLogSaving(true)
    setLogError('')
    try {
      await api.post(`/api/crm/customer/${id}/log`, logForm)
      setLogForm({ tanggal: new Date().toISOString().slice(0, 10), channel: 'WA', isi: '' })
      await load()
    } catch (err: unknown) {
      setLogError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal simpan log.')
    } finally {
      setLogSaving(false)
    }
  }

  if (loading || !data) return <div className="p-8 text-center text-on-surface-variant">Memuat...</div>

  const { customer, transaksi, logs, is_repeat } = data

  const profileFields: [string, string][] = [
    ['HP',        customer.hp],
    ['Alamat',    customer.alamat ?? '—'],
    ['Kelurahan', customer.kelurahan ?? '—'],
    ['Kecamatan', customer.kecamatan ?? '—'],
    ['Kota',      customer.kota ?? '—'],
  ]

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/cs/customer" className="text-xs text-primary hover:underline">← Kembali</Link>
        <h1 className="font-display font-bold text-xl text-on-surface">{customer.nama}</h1>
        {is_repeat && (
          <span className="px-2 py-0.5 bg-primary text-on-primary text-xs font-semibold rounded-full">
            REPEAT CUSTOMER
          </span>
        )}
      </div>

      {/* Info */}
      <Card>
        <h2 className="font-display font-semibold text-base text-on-surface mb-3">Profil Customer</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          {profileFields.map(([k, v]) => (
            <React.Fragment key={k}>
              <span className="font-body text-on-surface-variant">{k}</span>
              <span className="font-body font-medium text-on-surface">{v}</span>
            </React.Fragment>
          ))}
        </div>
        <div className="mt-3">
          <a
            href={`https://wa.me/62${customer.hp.replace(/^0/, '')}?text=${encodeURIComponent(`Halo ${customer.nama}, kami dari Tim Qurban.`)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-sm text-green-600 hover:underline"
          >
            Kirim WA
          </a>
        </div>
      </Card>

      {/* Histori Transaksi */}
      <Card>
        <h2 className="font-display font-semibold text-base text-on-surface mb-3">
          Histori Pembelian ({transaksi.length})
        </h2>
        {transaksi.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada transaksi.</p>
        ) : (
          <div className="space-y-2">
            {transaksi.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-surface-high last:border-0 text-sm">
                <div>
                  <span className="font-body font-medium text-on-surface">
                    {t.musim} — {t.jenis} {t.kelas?.kode ?? ''}
                  </span>
                  <span className="ml-2 text-xs text-on-surface-variant">{t.status_transaksi}</span>
                </div>
                <span className="font-display font-semibold text-primary">{rupiah(t.harga)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Log Interaksi */}
      <Card>
        <h2 className="font-display font-semibold text-base text-on-surface mb-3">Log Interaksi</h2>

        <form onSubmit={submitLog} className="space-y-3 mb-4 p-3 bg-surface-low rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Tanggal</label>
              <input
                type="date" value={logForm.tanggal}
                onChange={(e) => setLogForm((f) => ({ ...f, tanggal: e.target.value }))}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Channel</label>
              <select
                value={logForm.channel}
                onChange={(e) => setLogForm((f) => ({ ...f, channel: e.target.value }))}
                className="input-field text-sm"
              >
                {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Isi</label>
            <textarea
              value={logForm.isi}
              onChange={(e) => setLogForm((f) => ({ ...f, isi: e.target.value }))}
              placeholder="Ringkasan interaksi..."
              className="input-field text-sm h-16 resize-none w-full"
            />
          </div>
          {logError && <p className="text-sm text-error">{logError}</p>}
          <Button type="submit" loading={logSaving} className="w-full">Tambah Log</Button>
        </form>

        {logs.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada log interaksi.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="border-b border-surface-high last:border-0 py-2 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-surface rounded text-xs font-medium">{l.channel}</span>
                  <span className="text-on-surface-variant text-xs">{l.tanggal}</span>
                  {l.cs && <span className="text-xs text-on-surface-variant ml-auto">{l.cs.name}</span>}
                </div>
                <p className="text-on-surface font-body">{l.isi}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
