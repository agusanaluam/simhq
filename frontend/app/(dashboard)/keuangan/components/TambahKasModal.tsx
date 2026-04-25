'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import api from '@/lib/api'

const SUMBER_OPTIONS = ['PENJUALAN', 'DEPOSIT', 'LAIN']
const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Tunai' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

interface RabOption {
  rab_id: number
  kategori: string
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
    if (form.tipe === 'KELUAR' && !form.rab_id) {
      setError('Pilih pos RAB untuk kas keluar.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.post('/api/keuangan/kas', {
        tipe:          form.tipe,
        sumber:        form.tipe === 'MASUK' ? form.sumber : undefined,
        keterangan:    form.keterangan,
        jumlah:        Number(form.jumlah),
        metode:        form.metode,
        tgl_transaksi: form.tgl_transaksi,
        rab_id:        form.tipe === 'KELUAR' ? Number(form.rab_id) : undefined,
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
          <div>
            <label className={labelClass}>Pos RAB *</label>
            <select
              value={form.rab_id}
              onChange={(e) => set('rab_id', e.target.value)}
              className="input-field"
            >
              <option value="">— Pilih pos RAB —</option>
              {rabOptions.map((r) => (
                <option key={r.rab_id} value={r.rab_id}>
                  {r.kategori} — Sisa {rupiah(r.selisih)}
                </option>
              ))}
            </select>
            {rabOptions.length === 0 && (
              <p className="text-xs text-on-surface-variant mt-1">
                Belum ada pos RAB untuk musim ini. Buat dulu di halaman RAB.
              </p>
            )}
          </div>
        )}

        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => set('keterangan', e.target.value)}
          placeholder="Mis. Beli pakan ternak"
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
