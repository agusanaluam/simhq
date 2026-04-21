'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface Stat {
  total: number
  per_jenis: { jenis: string; total: number }[]
  per_status: { status: string; total: number }[]
}

export function StatistikPanel() {
  const [stat, setStat] = useState<Stat | null>(null)

  useEffect(() => {
    api.get(`/api/hewan/statistik?musim=${new Date().getFullYear()}`)
      .then(r => setStat(r.data))
      .catch(() => {})
  }, [])

  if (!stat) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <Card className="p-4">
        <p className="text-xs uppercase tracking-widest text-on-surface-variant font-body">Total Hewan</p>
        <p className="font-display font-bold text-3xl text-primary mt-1">{stat.total}</p>
      </Card>
      {stat.per_jenis.map(j => (
        <Card key={j.jenis} className="p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-body">{j.jenis}</p>
          <p className="font-display font-bold text-3xl text-on-surface mt-1">{j.total}</p>
        </Card>
      ))}
      {stat.per_status.map(s => (
        <Card key={s.status} className="p-4">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-body">{s.status}</p>
          <p className="font-display font-bold text-2xl text-accent mt-1">{s.total}</p>
        </Card>
      ))}
    </div>
  )
}
