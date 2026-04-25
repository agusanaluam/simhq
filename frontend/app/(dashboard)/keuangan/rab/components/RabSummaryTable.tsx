import { Card } from '@/components/ui/Card'
import { Settings, Plus } from 'lucide-react'

export interface RabRow {
  rab_id: number
  kategori_id: number
  kategori: string
  jumlah_anggaran: number
  total_realisasi: number
  selisih: number
  persen_terpakai: number
}

interface RabSummaryTableProps {
  rows: RabRow[]
  onSetRab: (row: RabRow) => void
  onAddRealisasi: (row: RabRow) => void
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

function progressColor(persen: number): string {
  if (persen >= 80) return 'bg-error'
  if (persen >= 70) return 'bg-[#ca8a04]'
  return 'bg-[#15803d]'
}

function textColor(persen: number): string {
  if (persen >= 80) return 'text-error'
  if (persen >= 70) return 'text-[#ca8a04]'
  return 'text-[#15803d]'
}

export function RabSummaryTable({ rows, onSetRab, onAddRealisasi }: RabSummaryTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada pos RAB untuk musim ini. Tambah RAB dulu.
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
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Kategori</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Anggaran</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Realisasi</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Selisih</th>
              <th className="py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest min-w-[140px]">% Terpakai</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rab_id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body font-medium text-on-surface">{row.kategori}</td>
                <td className="py-3 px-4 font-display text-right text-on-surface whitespace-nowrap">
                  {rupiah(row.jumlah_anggaran)}
                </td>
                <td className="py-3 px-4 font-display text-right text-on-surface whitespace-nowrap">
                  {rupiah(row.total_realisasi)}
                </td>
                <td className={`py-3 px-4 font-display font-semibold text-right whitespace-nowrap ${textColor(row.persen_terpakai)}`}>
                  {rupiah(row.selisih)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-surface-high rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${progressColor(row.persen_terpakai)}`}
                        style={{ width: `${Math.min(row.persen_terpakai, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-body font-medium whitespace-nowrap ${textColor(row.persen_terpakai)}`}>
                      {row.persen_terpakai}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => onSetRab(row)}
                      className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-high transition-colors"
                      title="Edit Anggaran"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onAddRealisasi(row)}
                      className="p-1.5 rounded-md text-primary hover:bg-surface-high transition-colors"
                      title="Tambah Realisasi"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
