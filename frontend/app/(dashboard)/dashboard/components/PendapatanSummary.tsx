import { Card } from '@/components/ui/Card'
import type { DashboardData } from '@/hooks/useDashboard'

interface PendapatanSummaryProps {
  pendapatan: DashboardData['pendapatan']
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)
}

export function PendapatanSummary({ pendapatan }: PendapatanSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Pendapatan Hari Ini
        </p>
        <p className="font-display font-bold text-2xl text-primary">
          {rupiah(pendapatan.hari_ini)}
        </p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Pendapatan Musim
        </p>
        <p className="font-display font-bold text-2xl text-on-surface">
          {rupiah(pendapatan.musim)}
        </p>
      </Card>
    </div>
  )
}
