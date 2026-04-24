'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

interface ForecastDay  { tgl: string; target: number; realisasi: number }
interface ForecastData { musim: number; sapi: ForecastDay[]; domba: ForecastDay[] }

const today     = new Date().toISOString().slice(0, 10)
const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

export default function ForecastPage() {
  const currentYear = new Date().getFullYear()

  const [data,      setData]      = useState<ForecastData | null>(null)
  const [musim,     setMusim]     = useState(currentYear)
  const [tglDari,   setTglDari]   = useState(thirtyAgo)
  const [tglSampai, setTglSampai] = useState(today)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const [targetForm, setTargetForm] = useState({ jenis: 'SAPI', tgl: today, target_unit: '' })
  const [saving,     setSaving]     = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(
        `/api/laporan/forecast?tgl_dari=${tglDari}&tgl_sampai=${tglSampai}&musim=${musim}`
      )
      setData(res.data)
    } catch {
      setError('Gagal memuat data forecast.')
    } finally {
      setLoading(false)
    }
  }, [tglDari, tglSampai, musim])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveTarget() {
    if (!targetForm.target_unit) return
    setSaving(true)
    try {
      await api.post('/api/laporan/target', {
        jenis:       targetForm.jenis,
        tgl:         targetForm.tgl,
        musim,
        target_unit: Number(targetForm.target_unit),
      })
      await fetchData()
      setTargetForm(f => ({ ...f, target_unit: '' }))
    } catch {
      alert('Gagal simpan target.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Forecast Penjualan</h1>
          <p className="text-sm text-on-surface-variant mt-1">Target vs realisasi penjualan harian</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Musim</label>
          <input type="number" min="2020" max="2099" value={musim}
            onChange={(e) => setMusim(Number(e.target.value))}
            className="input-field text-sm w-24" />
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Dari</label>
          <input type="date" value={tglDari} onChange={(e) => setTglDari(e.target.value)} className="input-field text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Sampai</label>
          <input type="date" value={tglSampai} onChange={(e) => setTglSampai(e.target.value)} className="input-field text-sm" />
        </div>
      </div>

      {/* Target input */}
      <Card className="mb-6">
        <h2 className="font-display font-semibold text-base text-on-surface mb-3">Input Target Harian</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Jenis</label>
            <select value={targetForm.jenis}
              onChange={(e) => setTargetForm(f => ({...f, jenis: e.target.value}))}
              className="input-field text-sm">
              <option value="SAPI">Sapi</option>
              <option value="DOMBA">Domba</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Tanggal</label>
            <input type="date" value={targetForm.tgl}
              onChange={(e) => setTargetForm(f => ({...f, tgl: e.target.value}))}
              className="input-field text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Target (unit)</label>
            <input type="number" min="0" value={targetForm.target_unit}
              onChange={(e) => setTargetForm(f => ({...f, target_unit: e.target.value}))}
              placeholder="5"
              className="input-field text-sm w-24" />
          </div>
          <Button onClick={saveTarget} loading={saving}>Simpan</Button>
        </div>
      </Card>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-48 bg-surface rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <h2 className="font-display font-semibold text-base text-on-surface mb-4">Sapi</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.sapi ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="tgl" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip labelFormatter={(v) => `Tanggal: ${v}`} />
                <Legend />
                <Line type="monotone" dataKey="target" name="Target"
                  stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="realisasi" name="Realisasi"
                  stroke="#2779a7" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="font-display font-semibold text-base text-on-surface mb-4">Domba</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.domba ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="tgl" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip labelFormatter={(v) => `Tanggal: ${v}`} />
                <Legend />
                <Line type="monotone" dataKey="target" name="Target"
                  stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="realisasi" name="Realisasi"
                  stroke="#15803d" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  )
}
