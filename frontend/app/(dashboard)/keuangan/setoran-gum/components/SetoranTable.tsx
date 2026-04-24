import { Card } from '@/components/ui/Card'

interface SetoranEntry {
  id: number
  tgl_setor: string
  jumlah: number
  metode: string
  keterangan: string | null
  supplier: { id: number; nama: string } | null
  input_by: { id: number; name: string } | null
}

interface SetoranTableProps {
  entries: SetoranEntry[]
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

const METODE_LABEL: Record<string, string> = {
  CASH:          'Tunai',
  TRANSFER_BCA:  'Transfer BCA',
  TRANSFER_LAIN: 'Transfer Lain',
}

export function SetoranTable({ entries }: SetoranTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada riwayat setoran.
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
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Tanggal</th>
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Supplier</th>
              <th className="text-right py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Jumlah</th>
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Metode</th>
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Keterangan</th>
              <th className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">Input By</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body text-on-surface whitespace-nowrap">{e.tgl_setor}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{e.supplier?.nama ?? 'GUM'}</td>
                <td className="py-3 px-4 font-display font-semibold text-[#15803d] text-right whitespace-nowrap">
                  {rupiah(e.jumlah)}
                </td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{METODE_LABEL[e.metode] ?? e.metode}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{e.keterangan ?? '—'}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">{e.input_by?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
