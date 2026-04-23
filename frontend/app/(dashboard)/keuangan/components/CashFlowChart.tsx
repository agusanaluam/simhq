'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

interface CashFlowItem {
  tanggal: string
  masuk: number
  keluar: number
}

interface CashFlowChartProps {
  data: CashFlowItem[]
  bulan: string
}

function formatTgl(str: string): string {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}

export function CashFlowChart({ data, bulan }: CashFlowChartProps) {
  const chartData = data.map((d) => ({ ...d, label: formatTgl(d.tanggal) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow — {bulan}</CardTitle>
      </CardHeader>
      {data.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">
          Belum ada data bulan ini.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradMasuk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2779a7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2779a7" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradKeluar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ba1a1a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3f0f8" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#2d4a5e' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatRupiah}
              tick={{ fontSize: 10, fill: '#2d4a5e' }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              formatter={(value: unknown) => {
                const n = typeof value === 'number' ? value : 0
                return [`Rp ${n.toLocaleString('id-ID')}`, '']
              }}
              contentStyle={{
                background: '#fff',
                border: '1px solid #e3f0f8',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area
              type="monotone"
              dataKey="masuk"
              name="Kas Masuk"
              stroke="#2779a7"
              strokeWidth={2}
              fill="url(#gradMasuk)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="keluar"
              name="Kas Keluar"
              stroke="#ba1a1a"
              strokeWidth={2}
              fill="url(#gradKeluar)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
