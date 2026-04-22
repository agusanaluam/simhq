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

export default function AdminAbsensiPage() {
  const today = new Date().toISOString().slice(0, 7)
  const [bulan, setBulan]         = useState(today)
  const [rekap, setRekap]         = useState<RekapRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [showModal, setShowModal] = useState(false)

  function load() {
    setLoading(true)
    api.get(`/api/absensi/rekap?bulan=${bulan}`)
      .then(r => setRekap(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [bulan])

  function exportCsv() {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/absensi/rekap/export?bulan=${bulan}`, '_blank')
  }

  const totalHadir      = rekap.reduce((s, r) => s + r.hadir, 0)
  const totalTerlambat  = rekap.reduce((s, r) => s + r.terlambat, 0)
  const totalTidakHadir = rekap.reduce((s, r) => s + r.tidak_hadir, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Rekap Absensi</h1>
          <p className="text-sm text-on-surface-variant mt-1">Rekapitulasi kehadiran karyawan</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="w-40" />
          <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
          <Button onClick={() => setShowModal(true)}>+ Override</Button>
        </div>
      </div>

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

      {showModal && (
        <OverrideModal
          onDone={() => { setShowModal(false); load() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
