'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatIDR } from '@/lib/format'
import api from '@/lib/api'

interface Customer { id: number; nama: string; hp: string }

interface Kandidat {
  transaksi_id: number
  no_faktur: string
  customer_id: number
  customer_nama: string
  customer_hp: string
  tipe_qurban: string
  harga: number
}

interface Props {
  hewanId: number
  noSlot: number
  hargaDefault: number
  onDone: () => void
  onClose: () => void
}

export function AssignSlotModal({ hewanId, noSlot, hargaDefault, onDone, onClose }: Props) {
  const [kandidat,        setKandidat]        = useState<Kandidat[]>([])
  const [loadingKandidat, setLoadingKandidat] = useState(true)
  const [transaksiId,     setTransaksiId]     = useState<number | null>(null)

  const [nama,        setNama]        = useState('')
  const [hp,          setHp]          = useState('')
  const [namaQurban,  setNamaQurban]  = useState('')
  const [tipe,        setTipe]        = useState('SHQ')
  const [harga,       setHarga]       = useState(String(hargaDefault))
  const [statusBayar, setStatus]      = useState<'DP' | 'LUNAS'>('DP')
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [showSug,     setShowSug]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const selectedCustomerId            = useRef<number | null>(null)
  const debounce                      = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    api.get(`/api/hewan/${hewanId}/kandidat-slot`)
      .then(r => setKandidat(r.data.data ?? []))
      .finally(() => setLoadingKandidat(false))
  }, [hewanId])

  function pilihKandidat(k: Kandidat) {
    setTransaksiId(k.transaksi_id)
    selectedCustomerId.current = k.customer_id
    setNama(k.customer_nama)
    setHp(k.customer_hp ?? '')
    setTipe(k.tipe_qurban ?? 'SHQ')
    setHarga(String(k.harga ?? hargaDefault))
    setSuggestions([])
    setShowSug(false)
  }

  function searchCustomer(q: string) {
    setTransaksiId(null)
    selectedCustomerId.current = null
    clearTimeout(debounce.current)
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return }
    debounce.current = setTimeout(async () => {
      const r = await api.get(`/api/customer?q=${encodeURIComponent(q)}`)
      setSuggestions(r.data.data ?? [])
      setShowSug(true)
    }, 300)
  }

  function selectCustomer(c: Customer) {
    selectedCustomerId.current = c.id
    setNama(c.nama)
    setHp(c.hp ?? '')
    setSuggestions([])
    setShowSug(false)
  }

  async function submit() {
    if (!nama.trim() || !namaQurban.trim()) return
    setSaving(true)
    try {
      let customerId = selectedCustomerId.current
      if (!customerId) {
        const res = await api.post('/api/customer', { nama, hp })
        customerId = res.data.customer.id as number
      }
      await api.post(`/api/hewan/${hewanId}/slot`, {
        no_slot:      noSlot,
        customer_id:  customerId,
        transaksi_id: transaksiId ?? undefined,
        nama_qurban:  namaQurban,
        tipe_qurban:  tipe,
        harga_slot:   parseInt(harga) || 0,
        status_bayar: statusBayar,
      })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const TIPE_OPTIONS = [
    { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
    { value: 'THQ', label: 'THQ – Titip ke Yayasan' },
    { value: 'PHQ', label: 'PHQ – Potong di Depot, Kirim Daging' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-lowest rounded-2xl w-full max-w-md p-6 shadow-card max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-on-surface">Isi Slot {noSlot}</h2>
          <button onClick={onClose} className="text-on-surface-variant text-xl leading-none">×</button>
        </div>

        {/* Kandidat dari transaksi */}
        {!loadingKandidat && kandidat.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-body font-medium text-on-surface-variant mb-2">
              Pilih dari transaksi ({kandidat.length})
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {kandidat.map(k => (
                <button
                  key={k.transaksi_id}
                  type="button"
                  onClick={() => pilihKandidat(k)}
                  className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-colors text-sm font-body ${
                    transaksiId === k.transaksi_id
                      ? 'border-primary bg-surface-high'
                      : 'border-surface-high hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-on-surface">{k.customer_nama}</span>
                    <span className="text-xs text-on-surface-variant">{k.no_faktur}</span>
                  </div>
                  <div className="text-xs text-on-surface-variant mt-0.5">
                    {k.tipe_qurban} · {k.customer_hp}
                    {k.harga > 0 && <span className="ml-1">· {formatIDR(k.harga)}</span>}
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-surface-high mt-3 mb-3" />
          </div>
        )}
        {loadingKandidat && (
          <p className="text-xs text-on-surface-variant mb-4">Memuat transaksi...</p>
        )}
        {!loadingKandidat && kandidat.length === 0 && (
          <p className="text-xs text-on-surface-variant mb-4 italic">Tidak ada transaksi yang belum terploting.</p>
        )}

        {/* Manual form */}
        <div className="space-y-3">
          {transaksiId ? (
            <div className="bg-surface-high rounded-xl px-3 py-2 text-sm font-body">
              <span className="text-on-surface-variant text-xs">Pembeli: </span>
              <span className="font-medium text-on-surface">{nama}</span>
              {hp && <span className="text-on-surface-variant text-xs ml-2">{hp}</span>}
            </div>
          ) : (
            <>
              <div className="relative">
                <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama Pembeli *</label>
                <Input
                  value={nama}
                  onChange={e => { setNama(e.target.value); searchCustomer(e.target.value) }}
                  onBlur={() => setTimeout(() => setShowSug(false), 150)}
                  placeholder="Cari atau isi baru..."
                />
                {showSug && suggestions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-surface-lowest border border-surface-high rounded-xl shadow-card mt-1 max-h-40 overflow-y-auto">
                    {suggestions.map(c => (
                      <button
                        key={c.id}
                        onMouseDown={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-surface-high text-sm font-body"
                      >
                        <span className="font-medium text-on-surface">{c.nama}</span>
                        <span className="text-on-surface-variant ml-2 text-xs">{c.hp}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-body font-medium text-on-surface mb-1">No HP</label>
                <Input value={hp} onChange={e => setHp(e.target.value)} placeholder="08..." />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Nama Qurban (bin/binti) *</label>
            <Input value={namaQurban} onChange={e => setNamaQurban(e.target.value)} placeholder="Ahmad bin Budi..." />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Tipe Qurban</label>
            <div className="flex flex-col gap-1.5">
              {TIPE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipe(t.value)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-xs font-body text-left transition-colors ${
                    tipe === t.value ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Harga Slot (Rp)</label>
            <Input
              type="number"
              value={harga}
              onChange={e => setHarga(e.target.value)}
              placeholder="900000"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-on-surface mb-1">Status Bayar</label>
            <div className="flex gap-2">
              {(['DP', 'LUNAS'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-4 py-1 rounded-lg border-2 text-xs font-body transition-colors ${
                    statusBayar === s ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={saving} disabled={!nama.trim() || !namaQurban.trim()}>
            Simpan
          </Button>
        </div>
      </div>
    </div>
  )
}
