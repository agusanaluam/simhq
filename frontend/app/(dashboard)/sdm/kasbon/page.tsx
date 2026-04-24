'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface KasbonRow {
  id:         number
  nominal:    number
  alasan:     string
  status:     string
  karyawan:   { id: number; nama: string; divisi: string } | null
  cicilan:    { nominal_cicilan: number; jumlah_cicil: number; cicil_terbayar: number } | null
  created_at: string
}

const STATUS_TABS = ['', 'PENDING', 'APPROVED', 'REJECTED', 'LUNAS']
const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  LUNAS:    'bg-blue-100 text-blue-700',
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function KasbonPage() {
  const [kasbon,  setKasbon]  = useState<KasbonRow[]>([])
  const [status,  setStatus]  = useState('')
  const [loading, setLoading] = useState(true)

  const [approving,     setApproving]     = useState<number | null>(null)
  const [approveForm,   setApproveForm]   = useState({
    nominal_cicilan: '',
    jumlah_cicil:    '',
    tgl_mulai:       new Date().toISOString().slice(0, 10),
  })
  const [approveSaving, setApproveSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = status ? `?status=${status}` : ''
      const res = await api.get(`/api/sdm/kasbon${params}`)
      setKasbon(res.data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleApprove(id: number) {
    if (!approveForm.nominal_cicilan || !approveForm.jumlah_cicil) return
    setApproveSaving(true)
    try {
      await api.put(`/api/sdm/kasbon/${id}/approve`, {
        nominal_cicilan: Number(approveForm.nominal_cicilan),
        jumlah_cicil:    Number(approveForm.jumlah_cicil),
        tgl_mulai:       approveForm.tgl_mulai,
      })
      setApproving(null)
      setApproveForm({ nominal_cicilan: '', jumlah_cicil: '', tgl_mulai: new Date().toISOString().slice(0, 10) })
      await fetchData()
    } catch {
      alert('Gagal approve.')
    } finally {
      setApproveSaving(false)
    }
  }

  async function handleReject(id: number) {
    if (!confirm('Tolak kasbon ini?')) return
    try {
      await api.put(`/api/sdm/kasbon/${id}/reject`)
      await fetchData()
    } catch {
      alert('Gagal reject.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Kasbon Karyawan</h1>
          <p className="text-sm text-on-surface-variant mt-1">Pengajuan pinjaman gaji karyawan</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-body transition-colors ${
              status === s
                ? 'bg-primary text-on-primary'
                : 'bg-surface text-on-surface-variant hover:bg-surface-high'
            }`}>
            {s || 'Semua'}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-surface rounded animate-pulse" />)}
          </div>
        ) : kasbon.length === 0 ? (
          <p className="text-center py-8 text-on-surface-variant text-sm">Tidak ada kasbon.</p>
        ) : (
          <div className="space-y-3">
            {kasbon.map((k) => (
              <div key={k.id} className="border border-surface-high rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-body font-semibold text-on-surface">
                      {k.karyawan?.nama ?? '—'}
                      <span className="text-on-surface-variant font-normal text-xs ml-1">
                        ({k.karyawan?.divisi})
                      </span>
                    </p>
                    <p className="font-display font-bold text-primary text-lg">{rupiah(k.nominal)}</p>
                    <p className="text-sm text-on-surface-variant">{k.alasan}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGE[k.status] ?? 'bg-gray-100'}`}>
                    {k.status}
                  </span>
                </div>

                {k.cicilan && (
                  <p className="text-xs text-on-surface-variant mb-2">
                    Cicilan: {rupiah(k.cicilan.nominal_cicilan)} × {k.cicilan.jumlah_cicil} kali
                    ({k.cicilan.cicil_terbayar}/{k.cicilan.jumlah_cicil} terbayar)
                  </p>
                )}

                {k.status === 'PENDING' && (
                  <div className="mt-2">
                    {approving === k.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-on-surface-variant block mb-0.5">Nominal/cicil</label>
                            <input type="number" min="1" value={approveForm.nominal_cicilan}
                              onChange={(e) => setApproveForm(f => ({...f, nominal_cicilan: e.target.value}))}
                              className="input-field text-sm" placeholder="100000" />
                          </div>
                          <div>
                            <label className="text-xs text-on-surface-variant block mb-0.5">Jumlah cicil</label>
                            <input type="number" min="1" value={approveForm.jumlah_cicil}
                              onChange={(e) => setApproveForm(f => ({...f, jumlah_cicil: e.target.value}))}
                              className="input-field text-sm" placeholder="5" />
                          </div>
                          <div>
                            <label className="text-xs text-on-surface-variant block mb-0.5">Mulai</label>
                            <input type="date" value={approveForm.tgl_mulai}
                              onChange={(e) => setApproveForm(f => ({...f, tgl_mulai: e.target.value}))}
                              className="input-field text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleApprove(k.id)} loading={approveSaving} className="flex-1">
                            Konfirmasi Approve
                          </Button>
                          <Button variant="ghost" onClick={() => setApproving(null)} className="flex-1">
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={() => setApproving(k.id)} className="flex-1">Approve</Button>
                        <Button variant="ghost" onClick={() => handleReject(k.id)} className="flex-1">Tolak</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
