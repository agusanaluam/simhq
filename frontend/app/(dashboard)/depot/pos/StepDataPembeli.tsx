'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'

interface Customer { id: number; nama: string; hp: string; alamat: string | null; kelurahan: string | null; kecamatan: string | null; kode_pos: string | null; kota: string | null }

interface PembeliData {
  customerId: number | null
  nama: string
  hp: string
  alamat: string
  kelurahan: string
  kecamatan: string
  kode_pos: string
  kota: string
}

interface Props {
  data: PembeliData
  onNext: (data: PembeliData & { customerId: number }) => void
  onBack: () => void
}

export function StepDataPembeli({ data: initData, onNext, onBack }: Props) {
  const [nama, setNama]     = useState(initData.nama)
  const [hp, setHp]         = useState(initData.hp)
  const [alamat, setAlamat] = useState(initData.alamat)
  const [kelurahan, setKelurahan] = useState(initData.kelurahan ?? '')
  const [kecamatan, setKecamatan] = useState(initData.kecamatan ?? '')
  const [kode_pos,  setKodePOS]   = useState(initData.kode_pos ?? '')
  const [kota, setKota]     = useState(initData.kota)
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [showSug, setShowSug]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const selectedCustomerId            = useRef<number | null>(initData.customerId)
  const debounce                      = useRef<ReturnType<typeof setTimeout>>()

  function searchCustomer(q: string) {
    selectedCustomerId.current = null
    clearTimeout(debounce.current)
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return }
    debounce.current = setTimeout(() => {
      api.get(`/api/customer?q=${encodeURIComponent(q)}`)
        .then(r => { setSuggestions(r.data.data ?? []); setShowSug(true) })
    }, 300)
  }

  function selectCustomer(c: Customer) {
    selectedCustomerId.current = c.id
    setNama(c.nama)
    setHp(c.hp ?? '')
    setAlamat(c.alamat ?? '')
    setKelurahan(c.kelurahan ?? '')
    setKecamatan(c.kecamatan ?? '')
    setKodePOS(c.kode_pos ?? '')
    setKota(c.kota ?? '')
    setSuggestions([])
    setShowSug(false)
  }

  async function handleNext() {
    if (!nama.trim()) return
    setSaving(true)
    try {
      let customerId = selectedCustomerId.current
      if (!customerId) {
        const res = await api.post('/api/customer', { nama, hp, alamat, kelurahan, kecamatan, kode_pos, kota })
        customerId = res.data.customer.id as number
      }
      onNext({ customerId, nama, hp, alamat, kelurahan, kecamatan, kode_pos, kota })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="block text-sm font-body font-medium text-on-surface mb-1">Nama Pembeli *</label>
        <Input
          value={nama}
          onChange={e => { setNama(e.target.value); searchCustomer(e.target.value) }}
          onFocus={() => suggestions.length > 0 && setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder="Cari nama pelanggan lama atau isi baru..."
        />
        {showSug && suggestions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 bg-surface-lowest border border-surface-high rounded-xl shadow-card mt-1 max-h-48 overflow-y-auto">
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
        <label className="block text-sm font-body font-medium text-on-surface mb-1">No HP</label>
        <Input value={hp} onChange={e => setHp(e.target.value)} placeholder="08..." />
      </div>

      <div>
        <label className="block text-sm font-body font-medium text-on-surface mb-1">Alamat</label>
        <Input value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Jalan, RT/RW..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Kelurahan</label>
          <Input value={kelurahan} onChange={e => setKelurahan(e.target.value)} placeholder="Kelurahan..." />
        </div>
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Kecamatan</label>
          <Input value={kecamatan} onChange={e => setKecamatan(e.target.value)} placeholder="Kecamatan..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Kode Pos</label>
          <Input value={kode_pos} onChange={e => setKodePOS(e.target.value)} placeholder="12345" />
        </div>
        <div>
          <label className="block text-sm font-body font-medium text-on-surface mb-1">Kota</label>
          <Input value={kota} onChange={e => setKota(e.target.value)} placeholder="Nama kota..." />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack}>← Kembali</Button>
        <Button onClick={handleNext} disabled={!nama.trim()} loading={saving}>Lanjut →</Button>
      </div>
    </div>
  )
}
