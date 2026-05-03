import { Card } from '@/components/ui/Card'

interface PerMetode {
  metode: string
  masuk: number
  keluar: number
}

interface KasSummary {
  total_masuk: number
  total_keluar: number
  saldo: number
  per_metode: PerMetode[]
}

interface SaldoCardsProps {
  summary: KasSummary
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

export function SaldoCards({ summary }: SaldoCardsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
            Total Masuk
          </p>
          <p className="font-display font-bold text-2xl text-[#15803d]">
            {rupiah(summary.total_masuk)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
            Total Keluar
          </p>
          <p className="font-display font-bold text-2xl text-error">
            {rupiah(summary.total_keluar)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
            Saldo
          </p>
          <p className={`font-display font-bold text-2xl ${
            summary.saldo >= 0 ? 'text-primary' : 'text-error'
          }`}>
            {rupiah(summary.saldo)}
          </p>
        </Card>
      </div>

    </div>
  )
}
