'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface AbsensiHariIni {
  id: number
  jam_masuk: string | null
  jam_keluar: string | null
  status: string
  durasi: number | null
}

interface KaryawanInfo { id: number; nama: string; divisi: string }

interface RiwayatRow {
  id:         number
  tgl:        string
  jam_masuk:  string | null
  jam_keluar: string | null
  status:     string
  durasi:     number | null
  catatan:    string | null
}

const STATUS_COLOR: Record<string, string> = {
  HADIR:       'text-green-700',
  TERLAMBAT:   'text-yellow-700',
  TIDAK_HADIR: 'text-red-600',
}

const STATUS_LABEL: Record<string, string> = {
  HADIR:       'Hadir',
  TERLAMBAT:   'Terlambat',
  TIDAK_HADIR: 'Tidak Hadir',
}

const today = new Date().toISOString().slice(0, 7)

export default function AbsensiPage() {
  const [absensi, setAbsensi]   = useState<AbsensiHariIni | null>(null)
  const [karyawan, setKaryawan] = useState<KaryawanInfo | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const [riwayat,      setRiwayat]      = useState<RiwayatRow[]>([])
  const [bulan,        setBulan]        = useState(today)
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/api/absensi/hari-ini')
      setAbsensi(r.data.absensi ?? null)
      setKaryawan(r.data.karyawan ?? null)
    } finally {
      setLoading(false)
    }
  }

  async function loadRiwayat() {
    setLoadingRiwayat(true)
    try {
      const r = await api.get(`/api/absensi/riwayat?bulan=${bulan}`)
      setRiwayat(r.data.data ?? [])
    } finally {
      setLoadingRiwayat(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadRiwayat() }, [bulan])

  async function checkIn() {
    setSaving(true); setError('')
    try {
      await api.post('/api/absensi/checkin')
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal check-in')
    } finally {
      setSaving(false)
    }
  }

  async function checkOut() {
    setSaving(true); setError('')
    try {
      await api.post('/api/absensi/checkout')
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal check-out')
    } finally {
      setSaving(false)
    }
  }

  const sudahMasuk  = !!absensi?.jam_masuk
  const sudahPulang = !!absensi?.jam_keluar

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-on-surface-variant">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-3xl text-on-surface">Absensi</h1>
        {karyawan && (
          <p className="text-on-surface-variant font-body mt-1">{karyawan.nama} · {karyawan.divisi}</p>
        )}
        <p className="text-sm text-on-surface-variant mt-1">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="bg-surface-high rounded-2xl p-6 mb-6 text-center">
        {!sudahMasuk ? (
          <p className="font-body text-on-surface-variant">Belum absen hari ini</p>
        ) : (
          <>
            <p className={`font-display font-bold text-xl mb-1 ${STATUS_COLOR[absensi!.status] ?? 'text-on-surface'}`}>
              {STATUS_LABEL[absensi!.status] ?? absensi!.status}
            </p>
            <p className="font-body text-on-surface">
              Masuk: <span className="font-semibold">{absensi!.jam_masuk}</span>
            </p>
            {sudahPulang && (
              <>
                <p className="font-body text-on-surface">
                  Pulang: <span className="font-semibold">{absensi!.jam_keluar}</span>
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                  Durasi: {absensi!.durasi != null
                    ? `${Math.floor(absensi!.durasi / 60)}j ${absensi!.durasi % 60}m`
                    : '—'}
                </p>
              </>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center mb-4 font-body">{error}</p>
      )}

      {!karyawan ? (
        <p className="text-sm text-on-surface-variant text-center font-body">
          Akun ini tidak terdaftar sebagai karyawan aktif.
        </p>
      ) : !sudahMasuk ? (
        <Button onClick={checkIn} loading={saving} className="w-full py-6 text-lg">
          🟢 MASUK
        </Button>
      ) : !sudahPulang ? (
        <Button onClick={checkOut} loading={saving} variant="accent" className="w-full py-6 text-lg">
          🔴 PULANG
        </Button>
      ) : (
        <p className="text-green-700 font-body font-semibold text-center">✓ Absensi hari ini selesai</p>
      )}

      {/* Riwayat Absensi */}
      {karyawan && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-base text-on-surface">Riwayat Absensi</h2>
            <input
              type="month"
              value={bulan}
              onChange={e => setBulan(e.target.value)}
              className="input-field text-xs w-32"
            />
          </div>

          {loadingRiwayat ? (
            <p className="text-sm text-on-surface-variant text-center py-4">Memuat...</p>
          ) : riwayat.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-4 italic">Belum ada data absensi bulan ini.</p>
          ) : (
            <div className="space-y-2">
              {riwayat.map(r => {
                const tgl = new Date(r.tgl).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                const durStr = r.durasi != null ? `${Math.floor(r.durasi / 60)}j ${r.durasi % 60}m` : null
                return (
                  <div key={r.id} className="flex items-center justify-between bg-surface-high rounded-xl px-4 py-3 text-sm">
                    <div>
                      <p className="font-body font-medium text-on-surface">{tgl}</p>
                      <p className="text-xs text-on-surface-variant font-body">
                        {r.jam_masuk ?? '—'} {r.jam_keluar ? `→ ${r.jam_keluar}` : ''}
                        {durStr && <span className="ml-1">({durStr})</span>}
                      </p>
                    </div>
                    <span className={`text-xs font-body font-semibold ${STATUS_COLOR[r.status] ?? 'text-on-surface-variant'}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
