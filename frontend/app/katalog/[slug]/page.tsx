'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

interface HewanItem {
  id: number
  no_hewan: string
  jenis: string
  kelas: string
  status: string
  harga_jual: number
  harga_slot: number | null
  fotos: string[]
  slot_terisi: number | null
  slot_total: number | null
  slot_tersedia: number | null
}

interface CatalogData {
  depot: { id: number; nama: string; slug: string }
  musim: number
  data: HewanItem[]
}

function rupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Tersedia',
  BOOKED:    'Booked',
  SOLD:      'Terjual',
}
const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  BOOKED:    'bg-yellow-100 text-yellow-800',
  SOLD:      'bg-gray-100 text-gray-600',
}

// ── Photo Gallery Modal ───────────────────────────────────────────────────────
function FotoModal({ fotos, noHewan, onClose }: { fotos: string[]; noHewan: string; onClose: () => void }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, fotos.length - 1))
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fotos.length, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="relative max-w-lg w-full">
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white text-3xl leading-none">×</button>
        <p className="text-white/60 text-sm text-center mb-3">Hewan #{noHewan} — {idx + 1}/{fotos.length}</p>
        <img src={fotos[idx]} alt={`Hewan #${noHewan}`} className="w-full rounded-xl object-cover max-h-[70vh]" />
        {fotos.length > 1 && (
          <div className="flex justify-center gap-3 mt-4">
            {fotos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
        {fotos.length > 1 && (
          <>
            {idx > 0 && (
              <button onClick={() => setIdx(i => i - 1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white/70 hover:text-white text-3xl">‹</button>
            )}
            {idx < fotos.length - 1 && (
              <button onClick={() => setIdx(i => i + 1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white/70 hover:text-white text-3xl">›</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Order Modal ───────────────────────────────────────────────────────────────
function OrderModal({ hewan, depotId, onClose, onSuccess }: {
  hewan: HewanItem; depotId: number; onClose: () => void; onSuccess: () => void
}) {
  const [nama,       setNama]    = useState('')
  const [hp,         setHp]      = useState('')
  const [tipe,       setTipe]    = useState('SHQ')
  const [satuan,     setSatuan]  = useState<'EKOR' | 'SLOT'>('EKOR')
  const [catatan,    setCatatan] = useState('')
  const [saving,     setSaving]  = useState(false)
  const [err,        setErr]     = useState('')

  const canSlot = hewan.jenis === 'SAPI' && hewan.harga_slot && (hewan.slot_tersedia ?? 0) > 0

  async function submit() {
    if (!nama.trim() || !hp.trim()) { setErr('Nama dan HP wajib diisi.'); return }
    setSaving(true); setErr('')
    try {
      await axios.post(`${BASE}/api/katalog/order`, {
        depot_id:    depotId,
        nama, hp,
        jenis:       hewan.jenis,
        kelas:       hewan.kelas,
        tipe_qurban: tipe,
        catatan:     `${satuan === 'SLOT' ? '[1/7 Slot] ' : ''}No. ${hewan.no_hewan}. ${catatan}`.trim(),
      })
      onSuccess()
    } catch { setErr('Gagal mengirim. Coba lagi.') }
    finally { setSaving(false) }
  }

  const TIPE_OPTIONS = [
    { value: 'SHQ', label: 'SHQ – Kirim Hidup' },
    { value: 'THQ', label: 'THQ – Titip ke Yayasan' },
    { value: 'PHQ', label: 'PHQ – Potong di Depot' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Pesan Hewan #{hewan.no_hewan}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{hewan.jenis} · Kelas {hewan.kelas}</p>

        {/* Satuan (only for SAPI with slots) */}
        {canSlot && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Satuan</label>
            <div className="flex gap-2">
              {[
                { v: 'EKOR', l: `1 Ekor — ${rupiah(hewan.harga_jual)}` },
                { v: 'SLOT', l: `1/7 Slot — ${rupiah(hewan.harga_slot!)}` },
              ].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => setSatuan(v as 'EKOR' | 'SLOT')}
                  className={`flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                    satuan === v ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 text-gray-700'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nama *</label>
            <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">No HP *</label>
            <input value={hp} onChange={e => setHp(e.target.value)} placeholder="08..." type="tel"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Qurban</label>
            <div className="flex flex-col gap-1.5">
              {TIPE_OPTIONS.map(t => (
                <label key={t.value} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                  tipe === t.value ? 'border-green-600 bg-green-50' : 'border-gray-200'
                }`}>
                  <input type="radio" name="tipe" value={t.value} checked={tipe === t.value} onChange={() => setTipe(t.value)} className="accent-green-600" />
                  <span className="text-xs text-gray-800">{t.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Catatan</label>
            <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={2} placeholder="Opsional..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
        </div>

        {err && <p className="text-xs text-red-600 mb-3">{err}</p>}

        <button onClick={submit} disabled={saving || !nama.trim() || !hp.trim()}
          className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors">
          {saving ? 'Mengirim...' : 'Kirim Permintaan'}
        </button>
      </div>
    </div>
  )
}

// ── Hewan Card ────────────────────────────────────────────────────────────────
function HewanCard({ hewan, onOrder }: { hewan: HewanItem; onOrder: () => void }) {
  const [showFoto, setShowFoto] = useState(false)
  const canOrder = hewan.status === 'AVAILABLE' || (hewan.status !== 'SOLD' && (hewan.slot_tersedia ?? 0) > 0)
  const hasFoto  = hewan.fotos.length > 0

  return (
    <>
      <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${hewan.status === 'SOLD' ? 'opacity-70' : ''}`}>
        {/* Photo */}
        <div
          className={`relative h-48 bg-gray-100 ${hasFoto ? 'cursor-pointer' : ''}`}
          onClick={() => hasFoto && setShowFoto(true)}
        >
          {hasFoto ? (
            <>
              <img src={hewan.fotos[0]} alt={`Hewan #${hewan.no_hewan}`} className="w-full h-full object-cover" />
              {hewan.fotos.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                  +{hewan.fotos.length - 1} foto
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Tidak ada foto</div>
          )}
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[hewan.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABEL[hewan.status] ?? hewan.status}
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="font-bold text-gray-900 text-lg">#{hewan.no_hewan}</p>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{hewan.jenis} · {hewan.kelas}</span>
          </div>

          {/* Harga */}
          <p className="text-green-700 font-semibold text-sm mb-1">{rupiah(hewan.harga_jual)} / ekor</p>
          {hewan.harga_slot && (
            <p className="text-blue-700 font-semibold text-sm">{rupiah(hewan.harga_slot)} / slot (1/7)</p>
          )}

          {/* Slot info for SAPI */}
          {hewan.jenis === 'SAPI' && hewan.slot_total != null && (
            <div className="mt-2 mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Slot terisi</span>
                <span>{hewan.slot_terisi}/{hewan.slot_total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${((hewan.slot_terisi ?? 0) / 7) * 100}%` }}
                />
              </div>
              {(hewan.slot_tersedia ?? 0) > 0 && (
                <p className="text-xs text-green-700 mt-1">{hewan.slot_tersedia} slot tersedia</p>
              )}
              {(hewan.slot_tersedia ?? 0) === 0 && hewan.status !== 'SOLD' && (
                <p className="text-xs text-gray-500 mt-1">Semua slot terisi</p>
              )}
            </div>
          )}

          {canOrder && (
            <button onClick={onOrder}
              className="w-full mt-3 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
              Pesan Sekarang
            </button>
          )}
        </div>
      </div>

      {showFoto && (
        <FotoModal fotos={hewan.fotos} noHewan={hewan.no_hewan} onClose={() => setShowFoto(false)} />
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KatalogSlugPage() {
  const { slug }    = useParams<{ slug: string }>()
  const [catalog,   setCatalog]   = useState<CatalogData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [orderItem, setOrderItem] = useState<HewanItem | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [filterJenis, setFilterJenis] = useState<string>('ALL')
  const [showSold,    setShowSold]    = useState(false)

  useEffect(() => {
    if (!slug) return
    axios.get(`${BASE}/api/katalog/${slug}`)
      .then(r => setCatalog(r.data))
      .catch(() => setError('Katalog tidak ditemukan.'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Memuat katalog...</p>
    </div>
  )

  if (error || !catalog) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">{error || 'Tidak ditemukan.'}</p>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Pesanan Diterima!</h2>
      <p className="text-gray-600 max-w-sm mb-6">Tim CS kami akan menghubungi Anda via WhatsApp dalam 1×24 jam untuk konfirmasi.</p>
      <button onClick={() => setSubmitted(false)} className="px-6 py-2.5 border border-green-600 text-green-700 rounded-xl font-medium hover:bg-green-50">
        Lihat Katalog Lagi
      </button>
    </div>
  )

  const filtered   = catalog.data.filter(h => filterJenis === 'ALL' || h.jenis === filterJenis)
  const available  = filtered.filter(h => h.status === 'AVAILABLE')
  const nonAvail   = filtered.filter(h => h.status === 'BOOKED' || (showSold && h.status === 'SOLD'))
  const hasSold    = catalog.data.some(h => h.status === 'SOLD')
  const hasBooked  = catalog.data.some(h => h.status === 'BOOKED')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Katalog Hewan Qurban</h1>
            <p className="text-xs text-gray-500">{catalog.depot.nama} · Musim {catalog.musim}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap items-center">
          {['ALL', 'SAPI', 'DOMBA'].map(j => (
            <button key={j} onClick={() => setFilterJenis(j)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterJenis === j ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {j === 'ALL' ? 'Semua' : j}
            </button>
          ))}
          {hasSold && (
            <button onClick={() => setShowSold(s => !s)}
              className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                showSold ? 'bg-gray-200 text-gray-800' : 'bg-white border border-gray-200 text-gray-500'
              }`}>
              {showSold ? 'Sembunyikan Terjual' : 'Tampilkan Terjual'}
            </button>
          )}
          {!hasSold && hasBooked && (
            <span className="ml-auto text-xs text-gray-400">Booked ditampilkan di bawah</span>
          )}
        </div>

        {/* Available stock */}
        {available.length === 0 && nonAvail.length === 0 ? (
          <p className="text-center text-gray-500 py-16">Belum ada hewan tersedia.</p>
        ) : (
          <>
            {available.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {available.map(h => (
                  <HewanCard key={h.id} hewan={h} onOrder={() => setOrderItem(h)} />
                ))}
              </div>
            )}
            {available.length === 0 && (
              <p className="text-center text-gray-400 py-10 text-sm">Semua stok sudah habis.</p>
            )}

            {/* Separator + booked/sold section */}
            {nonAvail.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Sudah Booked / Terjual</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nonAvail.map(h => (
                    <HewanCard key={h.id} hewan={h} onOrder={() => setOrderItem(h)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        © {new Date().getFullYear()} SIM Hewan Qurban
      </footer>

      {orderItem && (
        <OrderModal
          hewan={orderItem}
          depotId={catalog.depot.id}
          onClose={() => setOrderItem(null)}
          onSuccess={() => { setOrderItem(null); setSubmitted(true) }}
        />
      )}
    </div>
  )
}
