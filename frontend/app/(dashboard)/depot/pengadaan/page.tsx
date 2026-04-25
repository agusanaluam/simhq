'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import { TambahHewanModal } from './TambahHewanModal'
import { BulkTambahHewanModal } from './BulkTambahHewanModal'
import { StatistikPanel } from './StatistikPanel'
import api from '@/lib/api'
import Link from 'next/link'

interface Hewan {
  id: number; no_hewan: string; jenis: string; status: string
  no_pengadaan: number
  bobot_masuk: string; tgl_masuk: string
  kelas_asal: { kode: string } | null
  kelas_jual: { kode: string } | null
  supplier: { nama: string } | null
}

type StatusFilter = '' | 'AVAILABLE' | 'BOOKED' | 'SOLD' | 'DELIVERED' | 'MATI'

const STATUS_CHIP: Record<string, 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI'> = {
  AVAILABLE: 'TERSEDIA', BOOKED: 'DIPESAN',
  SOLD: 'TERJUAL', DELIVERED: 'TERJUAL', MATI: 'MATI',
}

// ---------------------------------------------------------------------------
// TambahSupplierModal
// ---------------------------------------------------------------------------
interface TambahSupplierModalProps {
  onClose: () => void
  onSuccess: () => void
}

function TambahSupplierModal({ onClose, onSuccess }: TambahSupplierModalProps) {
  const [nama,    setNama]    = useState('')
  const [kontak,  setKontak]  = useState('')
  const [alamat,  setAlamat]  = useState('')
  const [isGum,   setIsGum]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) { setError('Nama supplier wajib diisi'); return }

    setLoading(true)
    setError('')
    try {
      await api.post('/api/supplier', {
        nama:    nama.trim(),
        kontak:  kontak.trim() || undefined,
        alamat:  alamat.trim() || undefined,
        is_gum:  isGum,
      })
      onSuccess()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Gagal menyimpan supplier'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-4">Tambah Supplier</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama */}
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Nama supplier"
              className="input-field w-full"
              required
            />
          </div>

          {/* Kontak */}
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Kontak</label>
            <input
              type="text"
              value={kontak}
              onChange={e => setKontak(e.target.value)}
              placeholder="No. telepon / email"
              className="input-field w-full"
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Alamat</label>
            <textarea
              value={alamat}
              onChange={e => setAlamat(e.target.value)}
              placeholder="Alamat supplier"
              rows={2}
              className="input-field w-full resize-none"
            />
          </div>

          {/* is_gum checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isGum}
              onChange={e => setIsGum(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm font-body text-on-surface">Supplier GUM / Konsinyasi</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-body font-medium text-on-surface-variant hover:bg-surface-high transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-body font-medium bg-primary text-white disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PengadaanPage
// ---------------------------------------------------------------------------
export default function PengadaanPage() {
  const [hewan, setHewan]               = useState<Hewan[]>([])
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatus]       = useState<StatusFilter>('')
  const [jenisFilter, setJenis]         = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [showSupplier, setShowSupplier] = useState(false)
  const [kelasFilter, setKelas]   = useState('')
  const [kelasList, setKelasList] = useState<{ id: number; kode: string }[]>([])
  const [showBulk, setShowBulk]         = useState(false)

  function loadHewan() {
    setLoading(true)
    const p = new URLSearchParams()
    if (statusFilter) p.set('status', statusFilter)
    if (jenisFilter)  p.set('jenis', jenisFilter)
    if (kelasFilter) p.set('kelas', kelasFilter)
    api.get(`/api/hewan?${p}`)
      .then(r => setHewan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
  }, [])

  useEffect(() => { loadHewan() }, [statusFilter, jenisFilter, kelasFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Pengadaan Hewan</h1>
          <p className="text-sm text-on-surface-variant mt-1">Daftar hewan masuk depot</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="secondary" onClick={() => setShowSupplier(true)}>+ Tambah Supplier</Button>
          <Button variant="secondary" onClick={() => setShowBulk(true)}>+ Tambah Massal</Button>
          <Button onClick={() => setShowModal(true)}>+ Tambah 1 Ekor</Button>
        </div>
      </div>

      <StatistikPanel />

      <div className="flex gap-3 my-4 flex-wrap">
        <select value={statusFilter} onChange={e => setStatus(e.target.value as StatusFilter)} className="input-field w-40">
          <option value="">Semua Status</option>
          {(['AVAILABLE','BOOKED','SOLD','DELIVERED','MATI'] as const).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={jenisFilter} onChange={e => setJenis(e.target.value)} className="input-field w-36">
          <option value="">Semua Jenis</option>
          <option value="SAPI">Sapi</option>
          <option value="DOMBA">Domba</option>
        </select>
        <select value={kelasFilter} onChange={e => setKelas(e.target.value)} className="input-field w-44">
          <option value="">Semua Kelas</option>
          <option value="UNCLASSED">Belum Dikelas</option>
          {kelasList.map(k => <option key={k.id} value={String(k.id)}>{k.kode}</option>)}
        </select>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['No','Pengadaan','Jenis','Kelas Beli','Kelas Jual','Bobot','Tgl Masuk','Supplier','Status',''].map(h => (
                  <th key={h} className="pb-3 pr-3 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hewan.map((h, i) => (
                <tr key={h.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-3 font-display font-bold text-primary">{h.no_hewan}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.no_pengadaan > 0 ? `ke-${h.no_pengadaan}` : '—'}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.jenis}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.kelas_asal?.kode ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {h.kelas_jual
                      ? <span className="font-body font-medium">{h.kelas_jual.kode}</span>
                      : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-body">Belum Dikelas</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.bobot_masuk} kg</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.tgl_masuk}</td>
                  <td className="py-2.5 pr-3 text-on-surface-variant">{h.supplier?.nama ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    <StatusChip status={STATUS_CHIP[h.status] ?? 'TERSEDIA'} />
                  </td>
                  <td className="py-2.5">
                    <Link href={`/depot/pengadaan/${h.id}`} className="text-xs text-primary hover:underline">Detail</Link>
                  </td>
                </tr>
              ))}
              {hewan.length === 0 && (
                <tr><td colSpan={10} className="py-8 text-center text-on-surface-variant">Belum ada hewan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showModal && (
        <TambahHewanModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadHewan() }}
        />
      )}

      {showBulk && (
        <BulkTambahHewanModal
          onClose={() => setShowBulk(false)}
          onSuccess={() => { setShowBulk(false); loadHewan() }}
        />
      )}

      {showSupplier && (
        <TambahSupplierModal
          onClose={() => setShowSupplier(false)}
          onSuccess={() => setShowSupplier(false)}
        />
      )}
    </div>
  )
}
