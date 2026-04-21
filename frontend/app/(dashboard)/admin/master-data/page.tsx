'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TabHarga } from './TabHarga'
import { TabKaryawan } from './TabKaryawan'
import { TabYayasan } from './TabYayasan'

const tabs = [
  { id: 'harga',    label: 'Harga Kelas' },
  { id: 'karyawan', label: 'Karyawan' },
  { id: 'yayasan',  label: 'Yayasan THQ' },
]

export default function MasterDataPage() {
  const [active, setActive] = useState('harga')

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-on-surface">Master Data</h1>
        <p className="text-sm text-on-surface-variant mt-1">Kelas hewan, harga, karyawan, dan yayasan THQ</p>
      </div>

      <div className="flex gap-1 mb-6 bg-surface-high p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-body font-medium transition-colors',
              active === t.id
                ? 'bg-surface-lowest text-on-surface shadow-card'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'harga'    && <TabHarga />}
      {active === 'karyawan' && <TabKaryawan />}
      {active === 'yayasan'  && <TabYayasan />}
    </div>
  )
}
