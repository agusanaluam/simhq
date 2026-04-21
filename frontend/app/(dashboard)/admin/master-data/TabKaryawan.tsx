'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'

interface Karyawan {
  id: number; nama: string; divisi: string
  tarif_harian: number; berlaku_dari: string; is_active: boolean
}

export function TabKaryawan() {
  const [karyawan, setKaryawan] = useState<Karyawan[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/api/karyawan')
      .then(r => setKaryawan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  function fmt(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button>+ Tambah Karyawan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama','Divisi','Tarif Harian','Berlaku Dari','Status'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {karyawan.map((k, i) => (
                <tr key={k.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4 font-body font-medium text-on-surface">{k.nama}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.divisi}</td>
                  <td className="py-2.5 pr-4 font-body text-on-surface">{fmt(k.tarif_harian)}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{k.berlaku_dari}</td>
                  <td className="py-2.5"><StatusChip status={k.is_active ? 'AKTIF' : 'NONAKTIF'} /></td>
                </tr>
              ))}
              {karyawan.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">Belum ada karyawan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
