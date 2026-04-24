import { Card } from '@/components/ui/Card'

interface SummaryCardsProps {
  totalPendapatan: number
  totalHPP:        number
  marginBruto:     number
  totalBiaya:      number
  labaBersih:      number
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function SummaryCards({ totalPendapatan, totalHPP, marginBruto, totalBiaya, labaBersih }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Pendapatan
        </p>
        <p className="font-display font-bold text-xl text-on-surface">{rupiah(totalPendapatan)}</p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total HPP
        </p>
        <p className="font-display font-bold text-xl text-error">{rupiah(totalHPP)}</p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Margin Bruto
        </p>
        <p className={`font-display font-bold text-xl ${marginBruto >= 0 ? 'text-[#15803d]' : 'text-error'}`}>
          {rupiah(marginBruto)}
        </p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Biaya
        </p>
        <p className="font-display font-bold text-xl text-error">{rupiah(totalBiaya)}</p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Laba Bersih
        </p>
        <p className={`font-display font-bold text-xl ${labaBersih >= 0 ? 'text-primary' : 'text-error'}`}>
          {rupiah(labaBersih)}
        </p>
      </Card>
    </div>
  )
}
