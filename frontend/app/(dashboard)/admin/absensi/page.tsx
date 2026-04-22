'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { OverrideModal } from './OverrideModal'
import api from '@/lib/api'

interface RekapRow {
  karyawan_id: number
  nama: string
  divisi: string
  hadir: number
  terlambat: number
  tidak_hadir: number
  total_durasi: number
}

interface JamKerjaRow {
  id: number
  depot_id: number
  divisi: string
  jam_masuk: string
  jam_keluar: string
  toleransi_menit: number
}

interface Depot {
  id: number
  nama: string
}

// ---------------------------------------------------------------------------
// TambahJamKerjaModal
// ---------------------------------------------------------------------------
interface TambahJamKerjaModalProps {
  onClose: () => void
  onSuccess: () => void
}

function TambahJamKerjaModal({ onClose, onSuccess }: TambahJamKerjaModalProps) {
  const [depots,         setDepots]        = useState<Depot[]>([])
  const [depotId,        setDepotId]       = useState<string>('')
  const [divisi,         setDivisi]        = useState('')
  const [jamMasuk,       setJamMasuk]      = useState('08:00')
  const [jamKeluar,      setJamKeluar]     = useState('17:00')
  const [toleransi,      setToleransi]     = useState(15)
  const [loading,        setLoading]       = useState(false)
  const [loadingDepots,  setLoadingDepots] = useState(true)
  const [error,          setError]         = useState('')

  useEffect(() => {
    api.get('/api/depots')
      .then(r => {
        const list: Depot[] = r.data.data ?? r.data ?? []
        setDepots(list)
        if (list.length > 0) setDepotId(String(list[0].id))
      })
      .catch(() => setError('Gagal memuat daftar depot'))
      .finally(() => setLoadingDepots(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!depotId) { setError('Depot wajib dipilih'); return }
    if (!divisi.trim()) { setError('Divisi wajib diisi'); return }

    setLoading(true)
    setError('')
    try {
      await api.post('/api/absensi/jam-kerja', {
        depot_id:        Number(depotId),
        divisi:          divisi.trim(),
        jam_masuk:       jamMasuk,
        jam_keluar:      jamKeluar,
        toleransi_menit: toleransi,
      })
      onSuccess()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Gagal menyimpan jam kerja'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-lowest rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-display font-bold text-lg text-on-surface mb-4">Tambah / Update Jam Kerja</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Depot */}
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">
              Depot <span className="text-red-500">*</span>
            </label>
            {loadingDepots ? (
              <p className="text-xs text-on-surface-variant">Memuat depot...</p>
            ) : (
              <select
                value={depotId}
                onChange={e => setDepotId(e.target.value)}
                className="input-field w-full"
                required
              >
                <option value="">-- Pilih Depot --</option>
                {depots.map(d => (
                  <option key={d.id} value={d.id}>{d.nama}</option>
                ))}
              </select>
            )}
          </div>

          {/* Divisi */}
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">
              Divisi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={divisi}
              onChange={e => setDivisi(e.target.value)}
              placeholder="Contoh: Kandang Sapi"
              className="input-field w-full"
              required
            />
          </div>

          {/* Jam Masuk & Keluar */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-body font-medium text-on-surface mb-1">Jam Masuk</label>
              <input
                type="time"
                value={jamMasuk}
                onChange={e => setJamMasuk(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-body font-medium text-on-surface mb-1">Jam Keluar</label>
              <input
                type="time"
                value={jamKeluar}
                onChange={e => setJamKeluar(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          {/* Toleransi */}
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">
              Toleransi (menit)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={toleransi}
              onChange={e => setToleransi(Number(e.target.value))}
              className="input-field w-full"
            />
          </div>

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
              disabled={loading || loadingDepots}
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
// AdminAbsensiPage
// ---------------------------------------------------------------------------
type Tab = 'rekap' | 'jam-kerja'

export default function AdminAbsensiPage() {
  const today = new Date().toISOString().slice(0, 7)
  const [tab, setTab]               = useState<Tab>('rekap')
  const [bulan, setBulan]           = useState(today)
  const [rekap, setRekap]           = useState<RekapRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [showModal, setShowModal]   = useState(false)

  // Jam kerja tab state
  const [jamKerjaList, setJamKerjaList]   = useState<JamKerjaRow[]>([])
  const [loadingJK, setLoadingJK]         = useState(false)
  const [showJKModal, setShowJKModal]     = useState(false)

  function load() {
    setLoading(true)
    api.get(`/api/absensi/rekap?bulan=${bulan}`)
      .then(r => setRekap(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  function loadJamKerja() {
    setLoadingJK(true)
    api.get('/api/absensi/jam-kerja')
      .then(r => setJamKerjaList(r.data.data ?? []))
      .finally(() => setLoadingJK(false))
  }

  useEffect(() => { load() }, [bulan])

  useEffect(() => {
    if (tab === 'jam-kerja') loadJamKerja()
  }, [tab])

  function exportCsv() {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/absensi/rekap/export?bulan=${bulan}`, '_blank')
  }

  const totalHadir      = rekap.reduce((s, r) => s + r.hadir, 0)
  const totalTerlambat  = rekap.reduce((s, r) => s + r.terlambat, 0)
  const totalTidakHadir = rekap.reduce((s, r) => s + r.tidak_hadir, 0)

  // Format HH:MM:SS → HH:MM
  function fmtTime(t: string) {
    return t ? t.slice(0, 5) : '—'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Absensi</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manajemen kehadiran karyawan</p>
        </div>

        {tab === 'rekap' && (
          <div className="flex gap-2 items-center">
            <Input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="w-40" />
            <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
            <Button onClick={() => setShowModal(true)}>+ Override</Button>
          </div>
        )}

        {tab === 'jam-kerja' && (
          <Button onClick={() => setShowJKModal(true)}>+ Tambah / Update Jam Kerja</Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex bg-surface-high rounded-xl p-1 gap-1 w-fit mb-6">
        {(['rekap', 'jam-kerja'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-body font-medium transition-colors ${
              tab === t
                ? 'bg-surface-lowest text-on-surface shadow-card'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t === 'rekap' ? 'Rekap' : 'Jam Kerja'}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tab: Rekap                                                          */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'rekap' && (
        <>
          <div className="flex gap-3 mb-4">
            {[
              { label: 'Hadir', val: totalHadir, color: 'bg-green-50 text-green-800' },
              { label: 'Terlambat', val: totalTerlambat, color: 'bg-yellow-50 text-yellow-800' },
              { label: 'Tidak Hadir', val: totalTidakHadir, color: 'bg-red-50 text-red-700' },
            ].map(s => (
              <div key={s.label} className={`px-4 py-2 rounded-xl font-body text-sm font-medium ${s.color}`}>
                {s.label}: <span className="font-bold">{s.val}</span>
              </div>
            ))}
          </div>

          <Card>
            {loading ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
            ) : rekap.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">Tidak ada data absensi bulan ini</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-high text-xs text-on-surface-variant font-body text-left">
                      <th className="pb-2 pr-4">Nama</th>
                      <th className="pb-2 pr-4">Divisi</th>
                      <th className="pb-2 pr-4 text-green-700">Hadir</th>
                      <th className="pb-2 pr-4 text-yellow-700">Terlambat</th>
                      <th className="pb-2 pr-4 text-red-600">Tidak Hadir</th>
                      <th className="pb-2">Total Jam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekap.map(r => (
                      <tr key={r.karyawan_id} className="border-b border-surface-high last:border-0">
                        <td className="py-2 pr-4 font-body font-medium text-on-surface">{r.nama}</td>
                        <td className="py-2 pr-4 font-body text-xs text-on-surface-variant">{r.divisi}</td>
                        <td className="py-2 pr-4 font-body font-semibold text-green-700">{r.hadir}</td>
                        <td className="py-2 pr-4 font-body font-semibold text-yellow-700">{r.terlambat}</td>
                        <td className="py-2 pr-4 font-body font-semibold text-red-600">{r.tidak_hadir}</td>
                        <td className="py-2 font-body text-on-surface-variant text-xs">
                          {r.total_durasi ? `${Math.floor(r.total_durasi / 60)}j ${r.total_durasi % 60}m` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Tab: Jam Kerja                                                      */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'jam-kerja' && (
        <Card>
          {loadingJK ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
          ) : jamKerjaList.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">Belum ada jam kerja default.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-high text-xs text-on-surface-variant font-body text-left">
                    <th className="pb-2 pr-4">Divisi</th>
                    <th className="pb-2 pr-4">Jam Masuk</th>
                    <th className="pb-2 pr-4">Jam Keluar</th>
                    <th className="pb-2">Toleransi</th>
                  </tr>
                </thead>
                <tbody>
                  {jamKerjaList.map(jk => (
                    <tr key={jk.id} className="border-b border-surface-high last:border-0">
                      <td className="py-2 pr-4 font-body font-medium text-on-surface">{jk.divisi}</td>
                      <td className="py-2 pr-4 font-body text-on-surface-variant">{fmtTime(jk.jam_masuk)}</td>
                      <td className="py-2 pr-4 font-body text-on-surface-variant">{fmtTime(jk.jam_keluar)}</td>
                      <td className="py-2 font-body text-on-surface-variant">{jk.toleransi_menit} menit</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      {showModal && (
        <OverrideModal
          onDone={() => { setShowModal(false); load() }}
          onClose={() => setShowModal(false)}
        />
      )}

      {showJKModal && (
        <TambahJamKerjaModal
          onClose={() => setShowJKModal(false)}
          onSuccess={() => { setShowJKModal(false); loadJamKerja() }}
        />
      )}
    </div>
  )
}
