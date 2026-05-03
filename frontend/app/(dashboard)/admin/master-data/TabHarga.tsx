'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import { parseCurrency } from '@/lib/format'

interface KelasHewan { id: number; kode: string; nama: string; urutan: number }
interface Depot      { id: number; nama: string }
interface Harga {
  id: number; jenis: string; musim: number
  harga_beli: number; harga_jual: number; harga_slot: number | null; fee_sales: number
  kelas: KelasHewan
}

interface Kelas { id: number; kode: string; nama: string }

function HargaModal({ depotId, musim, initialData, onDone, onClose }: {
  depotId: string; musim: string; initialData?: Harga; onDone: () => void; onClose: () => void
}) {
  const isEdit = !!initialData
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [form, setForm] = useState({
    kelas_id:   initialData ? String(initialData.kelas.id) : '',
    jenis:      initialData?.jenis ?? 'SAPI',
    harga_beli: initialData ? String(initialData.harga_beli) : '',
    harga_jual: initialData ? String(initialData.harga_jual) : '',
    harga_slot: initialData?.harga_slot != null ? String(initialData.harga_slot) : '',
    fee_sales:  initialData ? String(initialData.fee_sales) : '0',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!isEdit) {
      api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
    }
  }, [isEdit])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.harga_beli || !form.harga_jual) {
      setError('Harga beli dan harga jual wajib diisi'); return
    }
    if (!isEdit && !form.kelas_id) {
      setError('Kelas wajib diisi'); return
    }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.put(`/api/master/harga/${initialData!.id}`, {
          harga_beli: Number(form.harga_beli),
          harga_jual: Number(form.harga_jual),
          harga_slot: form.harga_slot !== '' ? Number(form.harga_slot) : null,
          fee_sales:  Number(form.fee_sales),
        })
      } else {
        await api.post('/api/master/harga', {
          depot_id:   Number(depotId),
          kelas_id:   Number(form.kelas_id),
          jenis:      form.jenis,
          musim:      Number(musim),
          harga_beli: Number(form.harga_beli),
          harga_jual: Number(form.harga_jual),
          harga_slot: form.harga_slot !== '' ? Number(form.harga_slot) : null,
          fee_sales:  Number(form.fee_sales),
        })
      }
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">
            {isEdit ? 'Edit Harga' : 'Tambah Harga'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-on-surface-variant mb-4 font-body">Depot terpilih · Musim {musim}</p>
        <div className="space-y-3">
          {isEdit ? (
            <div>
              <label className="block text-xs font-body font-medium text-on-surface mb-1">Kelas</label>
              <p className="text-sm text-on-surface font-body">
                {initialData!.kelas.kode} — {initialData!.kelas.nama}
                <span className="ml-2 text-on-surface-variant">({initialData!.jenis})</span>
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Harga Beli (Rp) *</label>
            <Input type="text" value={form.harga_beli ? Number(form.harga_beli).toLocaleString('id-ID') : ''} onChange={e => set('harga_beli', String(parseCurrency(e.target.value) || ''))} placeholder="5.000.000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Harga Jual (Rp) *</label>
            <Input type="text" value={form.harga_jual ? Number(form.harga_jual).toLocaleString('id-ID') : ''} onChange={e => set('harga_jual', String(parseCurrency(e.target.value) || ''))} placeholder="6.000.000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">
              Harga Slot 1/7 (Rp) <span className="text-on-surface-variant font-normal">— opsional, hanya SAPI</span>
            </label>
            <Input type="text" value={form.harga_slot ? Number(form.harga_slot).toLocaleString('id-ID') : ''} onChange={e => set('harga_slot', String(parseCurrency(e.target.value) || ''))} placeholder="900.000" />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Fee Sales (Rp)</label>
            <Input type="text" value={form.fee_sales ? Number(form.fee_sales).toLocaleString('id-ID') : ''} onChange={e => set('fee_sales', String(parseCurrency(e.target.value) || ''))} placeholder="50.000" />
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
  const [depots, setDepots]   = useState<Depot[]>([])
  const [harga, setHarga]     = useState<Harga[]>([])
  const [depotId, setDepotId] = useState<string>('')
  const [musim, setMusim]     = useState<string>(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal]             = useState(false)
  const [editingItem, setEditingItem]         = useState<Harga | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId]           = useState<number | null>(null)

  useEffect(() => {
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
  }, [])

  function loadHarga() {
    if (!depotId) return
    setLoading(true)
    api.get(`/api/master/harga?depot=${depotId}&musim=${musim}`)
      .then(r => setHarga(r.data.data))
      .finally(() => setLoading(false))
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await api.delete(`/api/master/harga/${id}`)
      setHarga(prev => prev.filter(h => h.id !== id))
      setConfirmDeleteId(null)
    } catch (e: any) {
      setConfirmDeleteId(null)
      alert(e?.response?.data?.message ?? 'Gagal menghapus')
    } finally { setDeletingId(null) }
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
          {depotId && <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>+ Tambah Harga</Button>}
        </div>
      </div>

      {loading && <p className="text-sm text-on-surface-variant">Memuat...</p>}

      {harga.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Kelas','Jenis','Harga Beli','Harga Jual','Harga Slot','Fee Sales','Aksi'].map(h => (
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
                  <td className="py-2.5 pr-4 font-body text-on-surface">
                    {h.harga_slot != null ? fmt(h.harga_slot) : <span className="text-on-surface-variant text-xs italic">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 font-body text-on-surface-variant">{fmt(h.fee_sales)}</td>
                  <td className="py-2.5">
                    {confirmDeleteId === h.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-on-surface-variant">Hapus?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >Batal</button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          disabled={deletingId === h.id}
                          className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >{deletingId === h.id ? '...' : 'Hapus'}</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingItem(h); setShowModal(true) }}
                          className="text-xs text-primary hover:underline"
                        >Edit</button>
                        <button
                          onClick={() => setConfirmDeleteId(h.id)}
                          className="text-xs text-red-500 hover:underline"
                        >Hapus</button>
                      </span>
                    )}
                  </td>
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
        <HargaModal
          depotId={depotId}
          musim={musim}
          initialData={editingItem ?? undefined}
          onDone={() => { setShowModal(false); setEditingItem(null); loadHarga() }}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
