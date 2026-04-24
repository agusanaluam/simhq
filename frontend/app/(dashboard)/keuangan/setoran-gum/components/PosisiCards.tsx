import { Card } from '@/components/ui/Card'

interface Posisi {
  total_pengadaan: number
  total_setor: number
  sisa_hutang: number
}

interface PosisiCardsProps {
  posisi: Posisi
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function PosisiCards({ posisi }: PosisiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Pengadaan GUM
        </p>
        <p className="font-display font-bold text-2xl text-on-surface">
          {rupiah(posisi.total_pengadaan)}
        </p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Total Disetor
        </p>
        <p className="font-display font-bold text-2xl text-[#15803d]">
          {rupiah(posisi.total_setor)}
        </p>
      </Card>
      <Card>
        <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
          Sisa Hutang
        </p>
        <p className={`font-display font-bold text-2xl ${
          posisi.sisa_hutang > 0 ? 'text-error' : 'text-[#15803d]'
        }`}>
          {rupiah(posisi.sisa_hutang)}
        </p>
        {posisi.sisa_hutang > 0 && (
          <p className="text-xs text-on-surface-variant mt-1">Belum lunas</p>
        )}
        {posisi.sisa_hutang <= 0 && posisi.total_pengadaan > 0 && (
          <p className="text-xs text-[#15803d] mt-1">Lunas</p>
        )}
      </Card>
    </div>
  )
}
