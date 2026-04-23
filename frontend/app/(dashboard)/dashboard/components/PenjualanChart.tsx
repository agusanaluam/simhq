'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { GrafikItem } from '@/hooks/useDashboard'

interface PenjualanChartProps {
  grafik: GrafikItem[]
}

function formatTanggal(str: string): string {
  const d = new Date(str)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}

export function PenjualanChart({ grafik }: PenjualanChartProps) {
  const data = grafik.map((g) => ({
    ...g,
    label: formatTanggal(g.tanggal),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Penjualan 7 Hari Terakhir</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3f0f8" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#2d4a5e' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="pendapatan"
            orientation="left"
            tickFormatter={formatRupiah}
            tick={{ fontSize: 11, fill: '#2d4a5e' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <YAxis
            yAxisId="ekor"
            orientation="right"
            tick={{ fontSize: 11, fill: '#2d4a5e' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            formatter={(value: ValueType | undefined, name: NameType | undefined) => {
              if (name === 'Pendapatan' && typeof value === 'number')
                return [`Rp ${value.toLocaleString('id-ID')}`, name]
              return [value, name]
            }}
            contentStyle={{
              background: '#fff',
              border: '1px solid #e3f0f8',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line
            yAxisId="pendapatan"
            type="monotone"
            dataKey="pendapatan"
            name="Pendapatan"
            stroke="#2779a7"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            yAxisId="ekor"
            type="monotone"
            dataKey="ekor"
            name="Ekor Terjual"
            stroke="#ECD06F"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
