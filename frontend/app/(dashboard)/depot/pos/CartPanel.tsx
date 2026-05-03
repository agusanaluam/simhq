'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/Input'
import type { CartItem, CartSubmitData } from './page'
import api from '@/lib/api'
import { formatIDR, parseCurrency } from '@/lib/format'

interface Customer { id: number; nama: string; hp: string; alamat: string | null; kelurahan: string | null; kecamatan: string | null; kode_pos: string | null; kota: string | null }
interface CsUser   { id: number; name: string }

interface Props {
  items: CartItem[]
  onRemove: (tempId: string) => void
  onSubmit: (data: CartSubmitData) => void
  submitting: boolean
}

const METODE_OPTIONS = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'TRANSFER_BCA',  label: 'Transfer BCA' },
  { value: 'TRANSFER_LAIN', label: 'Transfer Lain' },
]

export function CartPanel({ items, onRemove, onSubmit, submitting }: Props) {
  const { data: session } = useSession()
  const sessionUser       = (session?.user as any)
  const tellerId          = sessionUser?.id as number | undefined
  const tellerName        = sessionUser?.name as string | undefined

  // Customer
  const [nama,        setNama]       = useState('')
  const [hp,          setHp]         = useState('')
  const [alamat,      setAlamat]     = useState('')
  const [kelurahan,   setKelurahan]  = useState('')
  const [kecamatan,   setKecamatan]  = useState('')
  const [kode_pos,    setKodePOS]    = useState('')
  const [kota,        setKota]       = useState('')
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [showSug,     setShowSug]    = useState(false)
  const customerId = useRef<number | null>(null)
  const debounce   = useRef<ReturnType<typeof setTimeout>>()

  // Staff
  const [csUsers,   setCsUsers]   = useState<CsUser[]>([])
  const [csId,      setCsId]      = useState<number | null>(null)
  const [salesNama, setSalesNama] = useState('')

  // Payment
  const [metode,  setMetode]  = useState('CASH')
  const [tipe,    setTipe]    = useState('PELUNASAN')
  const [nominal, setNominal] = useState(0)
  const [rencana, setRencana] = useState('')
  const [ongkosKirim, setOngkosKirim] = useState(0)
  const [biayaPotong, setBiayaPotong] = useState(0)

  const subtotal = items.reduce((sum, i) => sum + i.harga, 0)
  const total    = subtotal + ongkosKirim + biayaPotong

  useEffect(() => {
    setNominal(total)
  }, [total])

  useEffect(() => {
    api.get('/api/karyawan/users').then(r => setCsUsers(r.data.data ?? []))
  }, [])

  function searchCustomer(q: string) {
    customerId.current = null
    clearTimeout(debounce.current)
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return }
    debounce.current = setTimeout(() => {
      api.get(`/api/customer?q=${encodeURIComponent(q)}`)
        .then(r => { setSuggestions(r.data.data ?? []); setShowSug(true) })
    }, 300)
  }

  function selectCustomer(c: Customer) {
    customerId.current = c.id
    setNama(c.nama); setHp(c.hp ?? ''); setAlamat(c.alamat ?? '')
    setKelurahan(c.kelurahan ?? ''); setKecamatan(c.kecamatan ?? '')
    setKodePOS(c.kode_pos ?? ''); setKota(c.kota ?? '')
    setSuggestions([]); setShowSug(false)
  }

  async function handleSubmit() {
    if (items.length === 0 || !nama.trim()) return

    let cId = customerId.current
    if (!cId) {
      const res = await api.post('/api/customer', { nama, hp, alamat, kelurahan, kecamatan, kode_pos, kota })
      cId = res.data.customer.id as number
    }

    onSubmit({
      customerId:        cId,
      nama, hp, alamat, kelurahan, kecamatan, kode_pos, kota,
      csId,
      tellerId:          tellerId ?? null,
      salesNama,
      metodeBayar:       metode,
      tipeBayar:         tipe,
      nominalBayar:      nominal,
      rencana_pelunasan: tipe === 'DP' ? rencana : '',
      ongkosKirim,
      biayaPotong,
    })
  }

  const canSubmit = items.length > 0 && nama.trim() !== '' && nominal > 0 && (tipe === 'PELUNASAN' || rencana !== '')

  return (
    <div className="bg-surface-lowest rounded-2xl border border-surface-high flex flex-col gap-0">
      {/* Cart items */}
      <div className="p-4 border-b border-surface-high">
        <h3 className="font-display font-semibold text-on-surface mb-3 text-sm">
          Cart ({items.length} item)
        </h3>

        {items.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic text-center py-4">Cart kosong</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.tempId} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-on-surface">
                    {item.isPreorder ? `Pre-order` : `#${item.noHewan}`}
                    {' '}<span className="text-on-surface-variant font-normal">{item.jenis} {item.kelasKode} {item.tipeQurban}</span>
                  </p>
                  <p className="text-xs text-primary">
                    {item.harga.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(item.tempId)}
                  className="text-error hover:opacity-70 text-sm px-1 flex-shrink-0"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-surface-high space-y-1">
            <div className="flex justify-between">
              <span className="text-xs font-body text-on-surface-variant">Subtotal</span>
              <span className="text-xs text-on-surface">{formatIDR(subtotal)}</span>
            </div>
            {ongkosKirim > 0 && (
              <div className="flex justify-between">
                <span className="text-xs font-body text-on-surface-variant">Ongkos Kirim</span>
                <span className="text-xs text-on-surface">{formatIDR(ongkosKirim)}</span>
              </div>
            )}
            {biayaPotong > 0 && (
              <div className="flex justify-between">
                <span className="text-xs font-body text-on-surface-variant">Biaya Potong</span>
                <span className="text-xs text-on-surface">{formatIDR(biayaPotong)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-surface-high pt-1">
              <span className="text-sm font-body font-semibold text-on-surface">Total</span>
              <span className="text-sm font-semibold text-primary">{formatIDR(total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Customer */}
      <div className="p-4 border-b border-surface-high space-y-3">
        <h3 className="font-display font-semibold text-on-surface text-sm">Data Pembeli</h3>

        <div className="relative">
          <Input
            label="Nama *"
            value={nama}
            onChange={e => { setNama(e.target.value); searchCustomer(e.target.value) }}
            onFocus={() => suggestions.length > 0 && setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 150)}
            placeholder="Cari pelanggan atau isi baru..."
          />
          {showSug && suggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 bg-surface-lowest border border-surface-high rounded-xl shadow-card mt-1 max-h-40 overflow-y-auto">
              {suggestions.map(c => (
                <button key={c.id} onMouseDown={() => selectCustomer(c)}
                  className="w-full text-left px-3 py-2 hover:bg-surface-high text-sm font-body">
                  <span className="font-medium text-on-surface">{c.nama}</span>
                  <span className="text-on-surface-variant ml-2 text-xs">{c.hp}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Input label="No HP" value={hp} onChange={e => setHp(e.target.value)} placeholder="08..." />
        <Input label="Alamat" value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Jalan, RT/RW..." />

        <div className="grid grid-cols-2 gap-2">
          <Input label="Kelurahan" value={kelurahan} onChange={e => setKelurahan(e.target.value)} placeholder="Kelurahan..." />
          <Input label="Kecamatan" value={kecamatan} onChange={e => setKecamatan(e.target.value)} placeholder="Kecamatan..." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Kode Pos"  value={kode_pos}  onChange={e => setKodePOS(e.target.value)}   placeholder="12345" />
          <Input label="Kota"      value={kota}      onChange={e => setKota(e.target.value)}       placeholder="Nama kota..." />
        </div>
      </div>

      {/* Staff */}
      <div className="p-4 border-b border-surface-high space-y-3">
        <h3 className="font-display font-semibold text-on-surface text-sm">Staff</h3>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">CS</label>
          <select value={csId ?? ''} onChange={e => setCsId(e.target.value ? Number(e.target.value) : null)} className="input-field w-full">
            <option value="">— Tidak ada —</option>
            {csUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Teller</label>
          <div className="input-field bg-surface-high text-on-surface-variant cursor-not-allowed select-none">
            {tellerName ?? '—'}
          </div>
        </div>

        <Input label="Sales" value={salesNama} onChange={e => setSalesNama(e.target.value)} placeholder="Nama sales..." />
      </div>

      {/* Biaya Tambahan */}
      <div className="p-4 border-b border-surface-high space-y-3">
        <h3 className="font-display font-semibold text-on-surface text-sm">Biaya Tambahan</h3>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Ongkos Kirim</label>
          <input
            type="text"
            value={ongkosKirim ? ongkosKirim.toLocaleString('id-ID') : ''}
            onChange={e => setOngkosKirim(parseCurrency(e.target.value))}
            className="input-field w-full"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Biaya Potong</label>
          <input
            type="text"
            value={biayaPotong ? biayaPotong.toLocaleString('id-ID') : ''}
            onChange={e => setBiayaPotong(parseCurrency(e.target.value))}
            className="input-field w-full"
            placeholder="0"
          />
        </div>
      </div>

      {/* Payment */}
      <div className="p-4 border-b border-surface-high space-y-3">
        <h3 className="font-display font-semibold text-on-surface text-sm">Pembayaran</h3>

        <div>
          <label className="block text-xs font-body text-on-surface-variant mb-1.5">Metode</label>
          <div className="flex gap-1.5 flex-wrap">
            {METODE_OPTIONS.map(m => (
              <button key={m.value} type="button" onClick={() => setMetode(m.value)}
                className={`px-3 py-1.5 rounded-lg border-2 text-xs font-body transition-colors ${
                  metode === m.value ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface hover:border-primary/50'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-body text-on-surface-variant mb-1.5">Skema</label>
          <div className="flex gap-2">
            {[{ value: 'PELUNASAN', label: 'Lunas' }, { value: 'DP', label: 'DP' }].map(t => (
              <button key={t.value} type="button" onClick={() => setTipe(t.value)}
                className={`px-4 py-1.5 rounded-lg border-2 text-sm font-body transition-colors ${
                  tipe === t.value ? 'border-primary bg-primary text-white' : 'border-surface-high text-on-surface hover:border-primary/50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">
            Nominal {tipe === 'DP' ? 'DP' : 'Pembayaran'}
          </label>
          <input
            type="text"
            value={nominal ? nominal.toLocaleString('id-ID') : ''}
            onChange={e => setNominal(parseCurrency(e.target.value))}
            className="input-field w-full"
            placeholder="0"
          />
        </div>

        {tipe === 'DP' && (
          <div>
            <label className="block text-sm font-body font-medium text-on-surface mb-1">Rencana Pelunasan *</label>
            <input type="date" value={rencana} onChange={e => setRencana(e.target.value)} className="input-field w-full" />
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="p-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full py-3 rounded-xl text-sm font-body font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Memproses...' : `Proses Transaksi (${items.length} item)`}
        </button>
      </div>
    </div>
  )
}
