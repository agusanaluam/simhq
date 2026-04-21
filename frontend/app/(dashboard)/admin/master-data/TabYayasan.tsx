'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import api from '@/lib/api'

interface Yayasan {
  id: number; nama: string; alamat: string | null
  kontak_pic: string | null; telepon: string | null; is_active: boolean
}

export function TabYayasan() {
  const [yayasan, setYayasan] = useState<Yayasan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/master/yayasan')
      .then(r => setYayasan(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button>+ Tambah Yayasan</Button>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-on-surface-variant">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Nama Yayasan','Kontak PIC','Telepon','Status'].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yayasan.map((y, i) => (
                <tr key={y.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                  <td className="py-2.5 pr-4">
                    <p className="font-body font-medium text-on-surface">{y.nama}</p>
                    {y.alamat && <p className="text-xs text-on-surface-variant">{y.alamat}</p>}
                  </td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{y.kontak_pic ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-on-surface-variant">{y.telepon ?? '—'}</td>
                  <td className="py-2.5"><StatusChip status={y.is_active ? 'AKTIF' : 'NONAKTIF'} /></td>
                </tr>
              ))}
              {yayasan.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant">Belum ada yayasan.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
