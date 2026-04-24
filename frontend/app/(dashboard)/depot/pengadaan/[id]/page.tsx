'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Trash2, Upload } from 'lucide-react'
import api from '@/lib/api'

interface FotoItem {
  id:       number
  url:      string
  urutan:   number
  foto_url: string
}

interface HewanDetail {
  id:            number
  no_hewan:      string
  jenis:         string
  status:        string
  bobot_masuk:   string
  bobot_terkini: string | null
  tgl_masuk:     string
  musim:         number
  kelas_asal:    { kode: string; nama: string } | null
  kelas_jual:    { kode: string; nama: string } | null
  supplier:      { nama: string } | null
}

export default function HewanDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [hewan,       setHewan]       = useState<HewanDetail | null>(null)
  const [fotos,       setFotos]       = useState<FotoItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [hewanRes, fotoRes] = await Promise.all([
        api.get(`/api/hewan/${id}`),
        api.get(`/api/hewan/${id}/foto`),
      ])
      setHewan(hewanRes.data.hewan ?? hewanRes.data)
      setFotos(fotoRes.data.data ?? [])
    } catch {
      setError('Gagal memuat data hewan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (fotos.length >= 2) { setUploadError('Maksimal 2 foto per hewan.'); return }

    setUploading(true)
    setUploadError('')
    try {
      const form = new FormData()
      form.append('foto', file)
      form.append('urutan', String(fotos.length + 1))
      await api.post(`/api/hewan/${id}/foto`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadData()
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

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Memuat...</div>
  if (error)   return <div className="p-8 text-center text-error">{error}</div>
  if (!hewan)  return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="text-on-surface-variant hover:text-on-surface">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-xl text-on-surface">
          Hewan #{hewan.no_hewan}
        </h1>
      </div>

      {/* Info */}
      <Card>
        <h2 className="font-display font-semibold text-base text-on-surface mb-3">Informasi Hewan</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          {([
            ['Jenis',         hewan.jenis],
            ['Status',        hewan.status],
            ['Kelas Asal',    hewan.kelas_asal?.nama ?? '—'],
            ['Kelas Jual',    hewan.kelas_jual?.nama ?? '—'],
            ['Bobot Masuk',   `${hewan.bobot_masuk} kg`],
            ['Bobot Terkini', hewan.bobot_terkini ? `${hewan.bobot_terkini} kg` : '—'],
            ['Tgl Masuk',     hewan.tgl_masuk],
            ['Musim',         String(hewan.musim)],
            ['Supplier',      hewan.supplier?.nama ?? '—'],
          ] as [string, string][]).map(([label, value]) => (
            <React.Fragment key={label}>
              <span className="font-body text-on-surface-variant">{label}</span>
              <span className="font-body font-medium text-on-surface">{value}</span>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Foto */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base text-on-surface">Foto ({fotos.length}/2)</h2>
          {fotos.length < 2 && (
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
          <p className="text-sm text-on-surface-variant text-center py-6">
            Belum ada foto. Upload foto dari HP kandang.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {fotos.map((f) => (
              <div key={f.id} className="relative group rounded-xl overflow-hidden border border-surface-high">
                <img src={f.foto_url} alt={`Foto ${f.urutan}`} className="w-full h-40 object-cover" />
                <button
                  onClick={() => handleDelete(f.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-md">
                  Foto {f.urutan}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
