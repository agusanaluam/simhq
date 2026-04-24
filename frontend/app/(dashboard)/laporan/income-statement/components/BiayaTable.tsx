import { Card } from '@/components/ui/Card'

export interface BiayaRow {
  divisi:      string
  total_biaya: number
}

interface BiayaTableProps {
  rows:       BiayaRow[]
  totalBiaya: number
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function BiayaTable({ rows, totalBiaya }: BiayaTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada realisasi biaya untuk musim ini.
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
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Divisi</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Total Biaya</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.divisi} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body font-medium text-on-surface">{r.divisi}</td>
                <td className="py-3 px-4 font-display text-right text-error whitespace-nowrap">{rupiah(r.total_biaya)}</td>
              </tr>
            ))}
            <tr className="bg-surface-low">
              <td className="py-3 px-4 font-body font-semibold text-on-surface">Total</td>
              <td className="py-3 px-4 font-display font-bold text-right text-error whitespace-nowrap">{rupiah(totalBiaya)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}
