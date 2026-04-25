'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface Props { onClose: () => void; onSuccess: () => void }
interface KelasHewan { id: number; kode: string }
interface Depot { id: number; nama: string }
interface Supplier { id: number; nama: string }
interface Row { kelas_asal_id: string; kelas_jual_id: string; bobot_masuk: string }

const emptyRow = (): Row => ({ kelas_asal_id: '', kelas_jual_id: '', bobot_masuk: '' })

export function BulkTambahHewanModal({ onClose, onSuccess }: Props) {
  const [kelas,    setKelas]    = useState<KelasHewan[]>([])
  const [depots,   setDepots]   = useState<Depot[]>([])
  const [supplier, setSupplier] = useState<Supplier[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const [shared, setShared] = useState({
    depot_id: '', supplier_id: '', jenis: 'SAPI',
    tgl_masuk: new Date().toISOString().split('T')[0],
    musim: String(new Date().getFullYear()),
  })
  const [rows, setRows] = useState<Row[]>([emptyRow()])

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelas(r.data.data))
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
    api.get('/api/supplier').then(r => setSupplier(r.data.data ?? []))
  }, [])

  const setS = (k: string, v: string) => setShared(s => ({ ...s, [k]: v }))

  function updateRow(i: number, k: keyof Row, v: string) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  }

  function addRow()         { setRows(rs => [...rs, emptyRow()]) }
  function removeRow(i: number) { setRows(rs => rs.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/hewan/bulk', {
        depot_id:    Number(shared.depot_id),
        supplier_id: shared.supplier_id ? Number(shared.supplier_id) : null,
        jenis:       shared.jenis,
        tgl_masuk:   shared.tgl_masuk,
        musim:       Number(shared.musim),
        rows: rows.map(r => ({
          kelas_asal_id: Number(r.kelas_asal_id),
          kelas_jual_id: r.kelas_jual_id ? Number(r.kelas_jual_id) : null,
          bobot_masuk:   parseFloat(r.bobot_masuk),
        })),
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Gagal menyimpan hewan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-semibold text-lg mb-5">Tambah Hewan Massal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Shared header fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</label>
              <select value={shared.depot_id} onChange={e => setS('depot_id', e.target.value)} className="input-field mt-1.5" required>
                <option value="">Pilih depot...</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Supplier</label>
              <select value={shared.supplier_id} onChange={e => setS('supplier_id', e.target.value)} className="input-field mt-1.5">
                <option value="">Pilih supplier...</option>
                {supplier.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Jenis</label>
              <select value={shared.jenis} onChange={e => setS('jenis', e.target.value)} className="input-field mt-1.5">
                <option value="SAPI">Sapi</option>
                <option value="DOMBA">Domba</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Tanggal Masuk</label>
              <input type="date" value={shared.tgl_masuk} onChange={e => setS('tgl_masuk', e.target.value)} className="input-field mt-1.5" required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Musim</label>
              <input type="number" value={shared.musim} onChange={e => setS('musim', e.target.value)} className="input-field mt-1.5" required />
            </div>
          </div>

          {/* Per-animal rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  {['#', 'Kelas Asal', 'Kelas Jual', 'Bobot (kg)', ''].map(h => (
                    <th key={h} className="pb-2 pr-2 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="pr-2 py-1.5 text-on-surface-variant w-6">{i + 1}</td>
                    <td className="pr-2 py-1.5">
                      <select value={row.kelas_asal_id} onChange={e => updateRow(i, 'kelas_asal_id', e.target.value)} className="input-field" required>
                        <option value="">Pilih...</option>
                        {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
                      </select>
                    </td>
                    <td className="pr-2 py-1.5">
                      <select value={row.kelas_jual_id} onChange={e => updateRow(i, 'kelas_jual_id', e.target.value)} className="input-field">
                        <option value="">Pilih nanti...</option>
                        {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
                      </select>
                    </td>
                    <td className="pr-2 py-1.5">
                      <input
                        type="number" step="0.01" min="1"
                        value={row.bobot_masuk}
                        onChange={e => updateRow(i, 'bobot_masuk', e.target.value)}
                        className="input-field w-24" required
                      />
                    </td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                        className="text-error hover:opacity-70 disabled:opacity-30 text-sm px-2"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" onClick={addRow} className="text-sm text-primary hover:underline font-body">
              + Tambah Baris
            </button>
            <span className="text-sm text-on-surface-variant">{rows.length} ekor</span>
          </div>

          {error && <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" loading={loading} disabled={rows.length === 0}>
              Simpan {rows.length} Ekor
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
