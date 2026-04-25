'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

const SUMBER_OPTIONS = ['PENJUALAN', 'DEPOSIT', 'LAIN']
const DIVISI_OPTIONS = ['KONSTRUKSI', 'LOGISTIK', 'ADMIN', 'CS', 'KANDANG', 'DISTRIBUSI', 'PAKAN', 'LISTRIK', 'LAIN']
const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Tunai' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

interface RabOption {
  rab_id: number
  divisi: string
  jumlah_anggaran: number
  total_realisasi: number
  selisih: number
}

interface TambahKasModalProps {
  onDone:  () => void
  onClose: () => void
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export function TambahKasModal({ onDone, onClose }: TambahKasModalProps) {
  const [form, setForm] = useState({
    tipe:          'MASUK',
    sumber:        'DEPOSIT',
    divisi:        'ADMIN',
    keterangan:    '',
    jumlah:        '',
    metode:        'CASH',
    tgl_transaksi: new Date().toISOString().slice(0, 10),
    rab_id:        '',
  })
  const [rabOptions, setRabOptions] = useState<RabOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    const musim = new Date().getFullYear()
    api.get(`/api/keuangan/rab/summary?musim=${musim}`)
      .then(r => setRabOptions(r.data.data ?? []))
      .catch(() => {})
  }, [])

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    if (!form.keterangan || !form.jumlah || !form.tgl_transaksi) {
      setError('Keterangan, jumlah, dan tanggal wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/kas', {
        tipe:          form.tipe,
        sumber:        form.tipe === 'MASUK'  ? form.sumber : undefined,
        divisi:        form.tipe === 'KELUAR' ? form.divisi : undefined,
        keterangan:    form.keterangan,
        jumlah:        Number(form.jumlah),
        metode:        form.metode,
        tgl_transaksi: form.tgl_transaksi,
        rab_id:        form.tipe === 'KELUAR' && form.rab_id ? Number(form.rab_id) : null,
      })
      onDone()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const labelClass = 'text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">Tambah Kas</h2>

        <div>
          <label className={labelClass}>Tipe</label>
          <div className="flex gap-2">
            {['MASUK', 'KELUAR'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('tipe', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-body font-medium border transition-colors ${
                  form.tipe === t
                    ? t === 'MASUK'
                      ? 'bg-[#dcfce7] border-[#15803d] text-[#15803d]'
                      : 'bg-[#fee2e2] border-error text-error'
                    : 'border-surface-high text-on-surface-variant hover:bg-surface-low'
                }`}
              >
                {t === 'MASUK' ? 'Kas Masuk' : 'Kas Keluar'}
              </button>
            ))}
          </div>
        </div>

        {form.tipe === 'MASUK' ? (
          <div>
            <label className={labelClass}>Sumber</label>
            <select value={form.sumber} onChange={(e) => set('sumber', e.target.value)} className="input-field">
              {SUMBER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className={labelClass}>Divisi</label>
              <select value={form.divisi} onChange={(e) => set('divisi', e.target.value)} className="input-field">
                {DIVISI_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Bebankan ke RAB <span className="normal-case text-on-surface-variant">(opsional)</span></label>
              <select value={form.rab_id} onChange={(e) => set('rab_id', e.target.value)} className="input-field">
                <option value="">— Tidak dibebankan ke RAB —</option>
                {rabOptions.map((r) => (
                  <option key={r.rab_id} value={r.rab_id}>
                    {r.divisi} — Sisa {rupiah(r.selisih)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => set('keterangan', e.target.value)}
          placeholder="Mis. Setoran tunai penjualan sore"
        />
        <Input
          label="Jumlah (Rp)"
          type="number"
          min="1"
          value={form.jumlah}
          onChange={(e) => set('jumlah', e.target.value)}
          placeholder="5000000"
        />

        <div>
          <label className={labelClass}>Metode</label>
          <select value={form.metode} onChange={(e) => set('metode', e.target.value)} className="input-field">
            {METODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <Input
          label="Tanggal"
          type="date"
          value={form.tgl_transaksi}
          onChange={(e) => set('tgl_transaksi', e.target.value)}
        />

        {error && (
          <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}
