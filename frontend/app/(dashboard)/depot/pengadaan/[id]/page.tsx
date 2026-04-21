'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'
import Link from 'next/link'

interface RiwayatItem {
  id: number; dari_petak_id: number | null; ke_petak_id: number | null
  tgl: string; catatan: string | null; user: { name: string } | null
}

interface HewanDetail {
  id: number; no_hewan: string; jenis: string; status: string
  bobot_masuk: string; bobot_terkini: string | null
  tgl_masuk: string; musim: number; qr_svg: string
  kelas_asal: { kode: string }; kelas_jual: { kode: string }
  supplier: { nama: string } | null
  riwayat_perpindahan: RiwayatItem[]
}

const STATUS_CHIP: Record<string, 'TERSEDIA' | 'DIPESAN' | 'TERJUAL' | 'MATI'> = {
  AVAILABLE: 'TERSEDIA', BOOKED: 'DIPESAN',
  SOLD: 'TERJUAL', DELIVERED: 'TERJUAL', MATI: 'MATI',
}

export default function HewanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [hewan, setHewan] = useState<HewanDetail | null>(null)

  useEffect(() => {
    if (id) api.get(`/api/hewan/${id}`).then(r => setHewan(r.data.hewan))
  }, [id])

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Data Hewan</CardTitle></CardHeader>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            {([
              ['Kelas Asal',    hewan.kelas_asal?.kode ?? '—'],
              ['Kelas Jual',    hewan.kelas_jual?.kode ?? '—'],
              ['Bobot Masuk',   `${hewan.bobot_masuk} kg`],
              ['Bobot Terkini', hewan.bobot_terkini ? `${hewan.bobot_terkini} kg` : '—'],
              ['Tgl Masuk',     hewan.tgl_masuk],
              ['Supplier',      hewan.supplier?.nama ?? '—'],
            ] as [string, string][]).map(([k, v]) => (
              <><dt key={`k-${k}`} className="text-on-surface-variant font-body">{k}</dt>
              <dd key={`v-${k}`} className="font-body font-medium text-on-surface">{v}</dd></>
            ))}
          </dl>
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

      <Card>
        <CardHeader><CardTitle>Riwayat Perpindahan</CardTitle></CardHeader>
        {hewan.riwayat_perpindahan.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Belum ada perpindahan.</p>
        ) : (
          <div className="space-y-2">
            {hewan.riwayat_perpindahan.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-surface-high last:border-0">
                <span className="text-on-surface-variant w-24 flex-shrink-0">{r.tgl}</span>
                <span className="text-on-surface">Petak {r.dari_petak_id ?? '—'} → {r.ke_petak_id ?? '—'}</span>
                {r.catatan && <span className="text-on-surface-variant">· {r.catatan}</span>}
                {r.user && <span className="text-xs text-on-surface-variant ml-auto">{r.user.name}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
