import { Card } from '@/components/ui/Card'

export interface PendapatanRow {
  kelas:        string
  jenis:        string
  qty:          number
  pendapatan:   number
  harga_beli:   number
  hpp:          number
  margin_bruto: number
}

interface PendapatanTableProps {
  rows: PendapatanRow[]
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function PendapatanTable({ rows }: PendapatanTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada data transaksi untuk musim ini.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-high">
              {['Kelas', 'Jenis', 'Qty', 'Pendapatan', 'HPP', 'Margin Bruto'].map((h) => (
                <th key={h} className={`py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest ${
                  ['Qty', 'Pendapatan', 'HPP', 'Margin Bruto'].includes(h) ? 'text-right' : 'text-left'
                }`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body font-medium text-on-surface">{r.kelas}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{r.jenis}</td>
                <td className="py-3 px-4 font-display text-right text-on-surface">{r.qty}</td>
                <td className="py-3 px-4 font-display text-right text-on-surface whitespace-nowrap">{rupiah(r.pendapatan)}</td>
                <td className="py-3 px-4 font-display text-right text-error whitespace-nowrap">{rupiah(r.hpp)}</td>
                <td className={`py-3 px-4 font-display font-semibold text-right whitespace-nowrap ${
                  r.margin_bruto >= 0 ? 'text-[#15803d]' : 'text-error'
                }`}>{rupiah(r.margin_bruto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
