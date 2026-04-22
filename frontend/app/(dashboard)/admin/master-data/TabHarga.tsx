'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface KelasHewan { id: number; kode: string; nama: string; urutan: number }
interface Depot      { id: number; nama: string }
interface Harga {
  id: number; jenis: string; musim: number
  harga_beli: number; harga_jual: number; fee_sales: number
  kelas: KelasHewan
}

interface Kelas { id: number; kode: string; nama: string }

function TambahHargaModal({ depotId, musim, onDone, onClose }: {
  depotId: string; musim: string; onDone: () => void; onClose: () => void
}) {
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [form, setForm] = useState({
    kelas_id: '', jenis: 'SAPI', harga_beli: '', harga_jual: '', fee_sales: '0',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
  }, [])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.kelas_id || !form.harga_beli || !form.harga_jual) {
      setError('Kelas, harga beli, dan harga jual wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      await api.post('/api/master/harga', {
        depot_id:   Number(depotId),
        kelas_id:   Number(form.kelas_id),
        jenis:      form.jenis,
        musim:      Number(musim),
        harga_beli: Number(form.harga_beli),
        harga_jual: Number(form.harga_jual),
        fee_sales:  Number(form.fee_sales),
      })
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Tambah Harga</h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4 font-body">Depot terpilih · Musim {musim}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Kelas *</label>
            <select value={form.kelas_id} onChange={e => set('kelas_id', e.target.value)} className="input-field w-full">
              <option value="">— Pilih kelas —</option>
              {kelasList.map(k => <option key={k.id} value={k.id}>{k.kode} — {k.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Jenis</label>
            <div className="flex gap-2">
              {['SAPI', 'DOMBA'].map(j => (
                <button key={j} onClick={() => set('jenis', j)}
                  className={`px-4 py-1.5 rounded-lg border-2 text-xs font-body transition-colors ${form.jenis === j ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'}`}>
                  {j}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Harga Beli (Rp) *</label>
            <Input type="number" value={form.harga_beli} onChange={e => set('harga_beli', e.target.value)} placeholder="5000000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Harga Jual (Rp) *</label>
            <Input type="number" value={form.harga_jual} onChange={e => set('harga_jual', e.target.value)} placeholder="6000000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Fee Sales (Rp)</label>
            <Input type="number" value={form.fee_sales} onChange={e => set('fee_sales', e.target.value)} placeholder="50000" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving}>Simpan</Button>
        </div>
      </div>
    </div>
  )
}

export function TabHarga() {
  const [kelas, setKelas]     = useState<KelasHewan[]>([])
  const [depots, setDepots]   = useState<Depot[]>([])
  const [harga, setHarga]     = useState<Harga[]>([])
  const [depotId, setDepotId] = useState<string>('')
  const [musim, setMusim]     = useState<string>(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelas(r.data.data))
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
  }, [])

  function loadHarga() {
    if (!depotId) return
    setLoading(true)
    api.get(`/api/master/harga?depot=${depotId}&musim=${musim}`)
      .then(r => setHarga(r.data.data))
      .finally(() => setLoading(false))
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</label>
          <select
            value={depotId}
            onChange={e => setDepotId(e.target.value)}
            className="input-field mt-1.5"
          >
            <option value="">Pilih depot...</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Musim</label>
          <Input value={musim} onChange={e => setMusim(e.target.value)} className="mt-1.5 w-28" />
        </div>
        <div className="flex gap-2">
          <Button onClick={loadHarga} disabled={!depotId}>Tampilkan</Button>
          {depotId && <Button onClick={() => setShowModal(true)}>+ Tambah Harga</Button>}
        </div>
      </div>

      {loading && <p className="text-sm text-on-surface-variant">Memuat...</p>}

      {harga.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Kelas','Jenis','Harga Beli','Harga Jual','Fee Sales'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {harga.map((h, i) => (
                <tr key={h.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4 font-body font-medium">{h.kelas?.kode ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{h.jenis}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(h.harga_beli)}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(h.harga_jual)}</td>
                  <td className="py-2.5 font-body text-on-surface-variant">{fmt(h.fee_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {harga.length === 0 && depotId && !loading && (
        <p className="text-sm text-on-surface-variant text-center py-8">Belum ada harga untuk depot + musim ini.</p>
      )}

      {showModal && (
        <TambahHargaModal
          depotId={depotId}
          musim={musim}
          onDone={() => { setShowModal(false); loadHarga() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
