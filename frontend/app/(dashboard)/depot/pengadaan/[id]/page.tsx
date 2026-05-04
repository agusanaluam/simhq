'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import { Trash2, Upload, Pencil, X, Check } from 'lucide-react'
import api from '@/lib/api'
import Link from 'next/link'

interface RiwayatItem {
  id: number; dari_petak_id: number | null; ke_petak_id: number | null
  tgl: string; catatan: string | null; user: { name: string } | null
}

interface FotoItem {
  id:       number
  url:      string
  urutan:   number
  foto_url: string
}

interface KesehatanRiwayatItem {
  id:      number
  tgl:     string
  kondisi: string
  bobot:   string | null
  catatan: string | null
  petugas: { name: string } | null
}

interface KelasItem { id: number; kode: string; nama: string }

interface HewanDetail {
  id:                  number
  no_hewan:            string
  jenis:               string
  status:              string
  bobot_masuk:         string
  bobot_terkini:       string | null
  tgl_masuk:           string
  musim:               number
  qr_svg:              string
  kelas_asal:          { kode: string } | null
  kelas_jual:          { id: number; kode: string } | null
  supplier:            { nama: string } | null
  riwayat_perpindahan: RiwayatItem[]
}

const STATUS_CHIP: Record<string, 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI'> = {
  AVAILABLE: 'TERSEDIA', BOOKED: 'DIPESAN',
  SOLD: 'TERJUAL', DELIVERED: 'TERJUAL', MATI: 'MATI',
}

function formatTgl(raw: string): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const KANDANG_ROLES = ['KANDANG_SAPI_KETUA','KANDANG_SAPI_ANGGOTA','KANDANG_DOMBA_KETUA','KANDANG_DOMBA_ANGGOTA']

export default function HewanDetailPage() {
  const { id }            = useParams<{ id: string }>()
  const { data: session } = useSession()
  const userRole          = (session?.user as any)?.role ?? ''
  const isKandang         = KANDANG_ROLES.includes(userRole)

  const [hewan,       setHewan]       = useState<HewanDetail | null>(null)
  const [fotos,       setFotos]       = useState<FotoItem[]>([])
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [riwayatList,   setRiwayatList]   = useState<KesehatanRiwayatItem[]>([])
  const [riwayatForm,   setRiwayatForm]   = useState({ tgl: new Date().toISOString().slice(0, 10), kondisi: 'SEHAT', bobot: '', catatan: '' })
  const [riwayatSaving, setRiwayatSaving] = useState(false)

  const [kelasList,   setKelasList]   = useState<KelasItem[]>([])
  const [editMode,    setEditMode]    = useState(false)
  const [editKelasId, setEditKelasId] = useState<number | ''>('')
  const [editBobot,   setEditBobot]   = useState('')
  const [editSaving,  setEditSaving]  = useState(false)
  const [editError,   setEditError]   = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  async function loadFotos() {
    const res = await api.get(`/api/hewan/${id}/foto`)
    setFotos(res.data.data ?? [])
  }

  async function loadRiwayat() {
    const res = await api.get(`/api/hewan/${id}/riwayat`)
    setRiwayatList(res.data.data ?? [])
  }

  useEffect(() => {
    api.get('/api/master/kelas').then(r => setKelasList(r.data.data ?? []))
  }, [])

  useEffect(() => {
    if (!id) return
    api.get(`/api/hewan/${id}`).then(r => setHewan(r.data.hewan))
    loadFotos()
    loadRiwayat()
  }, [id])

  function openEdit(h: HewanDetail) {
    setEditKelasId(h.kelas_jual?.id ?? '')
    setEditBobot(h.bobot_terkini ?? '')
    setEditError('')
    setEditMode(true)
  }

  async function saveEdit() {
    setEditSaving(true)
    setEditError('')
    try {
      const res = await api.put(`/api/hewan/${id}`, {
        kelas_jual_id: editKelasId !== '' ? editKelasId : null,
        bobot_terkini: editBobot   !== '' ? Number(editBobot) : undefined,
      })
      setHewan(prev => ({ ...prev!, ...res.data.hewan }))
      setEditMode(false)
    } catch (err: any) {
      setEditError(err?.response?.data?.message ?? 'Gagal menyimpan.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fotos.length >= 4) { setUploadError('Maksimal 4 foto per hewan.'); return }
    setUploading(true)
    setUploadError('')
    try {
      const form = new FormData()
      form.append('foto', file)
      form.append('urutan', String(fotos.length + 1))
      await api.post(`/api/hewan/${id}/foto`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadFotos()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setUploadError(msg ?? 'Gagal upload foto.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(fotoId: number) {
    if (!confirm('Hapus foto ini?')) return
    try {
      await api.delete(`/api/hewan/${id}/foto/${fotoId}`)
      setFotos((prev) => prev.filter((f) => f.id !== fotoId))
    } catch {
      alert('Gagal menghapus foto.')
    }
  }

  async function submitRiwayat(e: React.FormEvent) {
    e.preventDefault()
    setRiwayatSaving(true)
    try {
      await api.post(`/api/hewan/${id}/riwayat`, {
        tgl:     riwayatForm.tgl,
        kondisi: riwayatForm.kondisi,
        bobot:   riwayatForm.bobot ? Number(riwayatForm.bobot) : undefined,
        catatan: riwayatForm.catatan || undefined,
      })
      setRiwayatForm({ tgl: new Date().toISOString().slice(0, 10), kondisi: 'SEHAT', bobot: '', catatan: '' })
      await loadRiwayat()
    } catch {
      alert('Gagal simpan riwayat.')
    } finally {
      setRiwayatSaving(false)
    }
  }

  if (!hewan) return <p className="text-on-surface-variant text-sm p-6">Memuat...</p>

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/depot/pengadaan" className="text-xs text-primary hover:underline mb-2 inline-block">← Kembali</Link>
          <h1 className="font-display font-bold text-2xl text-on-surface">Hewan #{hewan.no_hewan}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{hewan.jenis} · Musim {hewan.musim}</p>
        </div>
        <StatusChip status={STATUS_CHIP[hewan.status] ?? 'TERSEDIA'} />
      </div>

      {/* Data Hewan + QR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Data Hewan</CardTitle>
            {!editMode && !isKandang && (
              <button onClick={() => openEdit(hewan)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-high transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-2 gap-y-3">
                {([
                  ['Kelas Asal',  hewan.kelas_asal?.kode ?? '—'],
                  ['Bobot Masuk', `${hewan.bobot_masuk} kg`],
                  ['Tgl Masuk',   formatTgl(hewan.tgl_masuk)],
                  ['Supplier',    hewan.supplier?.nama ?? '—'],
                ] as [string, string][]).map(([k, v]) => (
                  <><dt key={`k-${k}`} className="text-on-surface-variant font-body">{k}</dt>
                  <dd key={`v-${k}`} className="font-body font-medium text-on-surface">{v}</dd></>
                ))}
              </dl>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-high">
                <div>
                  <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Kelas Jual</label>
                  <select value={editKelasId} onChange={e => setEditKelasId(e.target.value ? Number(e.target.value) : '')}
                    className="input-field text-sm w-full">
                    <option value="">— Belum dikelaskan —</option>
                    {kelasList.map(k => <option key={k.id} value={k.id}>{k.kode} – {k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Bobot Terkini (kg)</label>
                  <input type="number" step="0.01" min="1" value={editBobot}
                    onChange={e => setEditBobot(e.target.value)}
                    className="input-field text-sm w-full" placeholder="310.50" />
                </div>
              </div>
              {editError && <p className="text-xs text-error">{editError}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditMode(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body text-on-surface-variant hover:bg-surface-high transition-colors">
                  <X className="w-4 h-4" /> Batal
                </button>
                <button onClick={saveEdit} disabled={editSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  <Check className="w-4 h-4" /> {editSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              {([
                ['Kelas Asal',    hewan.kelas_asal?.kode ?? '—'],
                ['Kelas Jual',    hewan.kelas_jual?.kode ?? <span className="text-yellow-600 font-medium">Belum dikelaskan</span>],
                ['Bobot Masuk',   `${hewan.bobot_masuk} kg`],
                ['Bobot Terkini', hewan.bobot_terkini ? `${hewan.bobot_terkini} kg` : '—'],
                ['Tgl Masuk',     formatTgl(hewan.tgl_masuk)],
                ['Supplier',      hewan.supplier?.nama ?? '—'],
              ] as [string, React.ReactNode][]).map(([k, v]) => (
                <><dt key={`k-${k}`} className="text-on-surface-variant font-body">{k}</dt>
                <dd key={`v-${k}`} className="font-body font-medium text-on-surface">{v}</dd></>
              ))}
            </dl>
          )}
        </Card>

        <Card className="flex flex-col items-center justify-center">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-body mb-3">QR Code</p>
          {hewan.qr_svg ? (
            <div className="w-32 h-32" dangerouslySetInnerHTML={{ __html: hewan.qr_svg }} />
          ) : (
            <div className="w-32 h-32 bg-surface-high rounded flex items-center justify-center">
              <span className="text-xs text-on-surface-variant">QR</span>
            </div>
          )}
          <p className="text-xs text-on-surface-variant mt-2 font-body">
            {hewan.id}-{hewan.musim}-{hewan.no_hewan}
          </p>
          <Button
            variant="ghost"
            className="mt-3 text-xs"
            onClick={() => window.open(`${apiBase}/api/hewan/cetak-label?ids=${hewan.id}`, '_blank')}
          >
            Cetak Label
          </Button>
        </Card>
      </div>

      {/* Foto */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Foto ({fotos.length}/4)</CardTitle>
          {fotos.length < 4 && !isKandang && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={uploading}>
                <Upload className="w-4 h-4" />
                Upload Foto
              </Button>
            </>
          )}
        </div>

        {uploadError && (
          <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md mb-3">{uploadError}</p>
        )}

        {fotos.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada foto. Upload foto dari HP kandang.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {fotos.map((f) => (
              <div key={f.id} className="relative group rounded-xl overflow-hidden border border-surface-high">
                <img src={f.foto_url} alt={`Foto ${f.urutan}`} className="w-full h-40 object-cover" />
                {!isKandang && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-md">
                  Foto {f.urutan}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Riwayat Perpindahan */}
      <Card className="mb-4">
        <CardHeader><CardTitle>Riwayat Perpindahan</CardTitle></CardHeader>
        {hewan.riwayat_perpindahan.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada perpindahan.</p>
        ) : (
          <div className="space-y-2">
            {hewan.riwayat_perpindahan.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-surface-high last:border-0">
                <span className="text-on-surface-variant w-24 flex-shrink-0">{formatTgl(r.tgl)}</span>
                <span className="text-on-surface">Petak {r.dari_petak_id ?? '—'} → {r.ke_petak_id ?? '—'}</span>
                {r.catatan && <span className="text-on-surface-variant">· {r.catatan}</span>}
                {r.user && <span className="text-xs text-on-surface-variant ml-auto">{r.user.name}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Riwayat Kesehatan */}
      <Card>
        <CardHeader><CardTitle>Riwayat Kesehatan</CardTitle></CardHeader>

        <form onSubmit={submitRiwayat} className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Tanggal</label>
            <input type="date" value={riwayatForm.tgl}
              onChange={(e) => setRiwayatForm(f => ({...f, tgl: e.target.value}))}
              className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Kondisi</label>
            <select value={riwayatForm.kondisi}
              onChange={(e) => setRiwayatForm(f => ({...f, kondisi: e.target.value}))}
              className="input-field text-sm">
              {['SEHAT','SAKIT','KRITIS','MATI'].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Bobot (kg)</label>
            <input type="number" step="0.01" min="1" value={riwayatForm.bobot}
              onChange={(e) => setRiwayatForm(f => ({...f, bobot: e.target.value}))}
              className="input-field text-sm" placeholder="310.50" />
          </div>
          <div>
            <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body mb-1 block">Catatan</label>
            <input type="text" value={riwayatForm.catatan}
              onChange={(e) => setRiwayatForm(f => ({...f, catatan: e.target.value}))}
              className="input-field text-sm" placeholder="Opsional" />
          </div>
          <div className="col-span-2">
            <Button type="submit" loading={riwayatSaving} className="w-full">Simpan Log Kondisi</Button>
          </div>
        </form>

        {riwayatList.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada riwayat kesehatan.</p>
        ) : (
          <div className="space-y-2">
            {riwayatList.map(r => {
              const color = r.kondisi === 'SEHAT'
                ? 'text-[#15803d]'
                : (r.kondisi === 'KRITIS' || r.kondisi === 'MATI')
                  ? 'text-error'
                  : 'text-[#ca8a04]'
              return (
                <div key={r.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-surface-high last:border-0">
                  <span className="text-on-surface-variant w-24 flex-shrink-0">{formatTgl(r.tgl)}</span>
                  <span className={`font-semibold ${color}`}>{r.kondisi}</span>
                  {r.bobot && <span className="text-on-surface-variant">{r.bobot} kg</span>}
                  {r.catatan && <span className="text-on-surface-variant">· {r.catatan}</span>}
                  {r.petugas && <span className="text-xs text-on-surface-variant ml-auto">{r.petugas.name}</span>}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
