'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface Props { onClose: () => void; onSuccess: () => void }
interface KelasHewan { id: number; kode: string }
interface Depot { id: number; nama: string }
interface Supplier { id: number; nama: string }

export function TambahHewanModal({ onClose, onSuccess }: Props) {
  const [kelas, setKelas]       = useState<KelasHewan[]>([])
  const [depots, setDepots]     = useState<Depot[]>([])
  const [supplier, setSupplier] = useState<Supplier[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    depot_id: '', supplier_id: '', kelas_asal_id: '', kelas_jual_id: '',
    jenis: 'SAPI', bobot_masuk: '',
    tgl_masuk: new Date().toISOString().split('T')[0],
    musim: String(new Date().getFullYear()),
  })

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelas(r.data.data))
    api.get('/api/depots').then(r => setDepots(r.data.data ?? []))
    api.get('/api/supplier').then(r => setSupplier(r.data.data ?? []))
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/hewan', {
        ...form,
        depot_id:      Number(form.depot_id),
        supplier_id:   form.supplier_id ? Number(form.supplier_id) : null,
        kelas_asal_id: Number(form.kelas_asal_id),
        kelas_jual_id: Number(form.kelas_jual_id),
        bobot_masuk:   parseFloat(form.bobot_masuk),
        musim:         Number(form.musim),
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Gagal menyimpan hewan.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-semibold text-lg mb-5">Tambah Hewan Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</label>
              <select value={form.depot_id} onChange={e => set('depot_id', e.target.value)} className="input-field mt-1.5" required>
                <option value="">Pilih depot...</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Supplier</label>
              <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} className="input-field mt-1.5">
                <option value="">Pilih supplier...</option>
                {supplier.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Jenis</label>
              <select value={form.jenis} onChange={e => set('jenis', e.target.value)} className="input-field mt-1.5">
                <option value="SAPI">Sapi</option>
                <option value="DOMBA">Domba</option>
              </select>
            </div>
            <Input label="Bobot Masuk (kg)" value={form.bobot_masuk} onChange={e => set('bobot_masuk', e.target.value)} type="number" step="0.01" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Kelas Asal</label>
              <select value={form.kelas_asal_id} onChange={e => set('kelas_asal_id', e.target.value)} className="input-field mt-1.5" required>
                <option value="">Pilih kelas...</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Kelas Jual</label>
              <select value={form.kelas_jual_id} onChange={e => set('kelas_jual_id', e.target.value)} className="input-field mt-1.5" required>
                <option value="">Pilih kelas...</option>
                {kelas.map(k => <option key={k.id} value={k.id}>{k.kode}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Tanggal Masuk" value={form.tgl_masuk} onChange={e => set('tgl_masuk', e.target.value)} type="date" required />
            <Input label="Musim" value={form.musim} onChange={e => set('musim', e.target.value)} type="number" required />
          </div>

          {error && <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" loading={loading}>Simpan Hewan</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
