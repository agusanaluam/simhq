import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { DashboardData, AlertStok } from '@/hooks/useDashboard'

interface SummaryCardsProps {
  stok: DashboardData['stok']
  alertStok: AlertStok[]
}

function StatCard({ label, value, colorClass, sub }: {
  label: string
  value: number
  colorClass: string
  sub?: string
}) {
  return (
    <Card>
      <p className="text-xs font-body font-medium uppercase tracking-widest text-on-surface-variant mb-2">
        {label}
      </p>
      <p className={`font-display font-bold text-3xl ${colorClass}`}>
        {value.toLocaleString('id-ID')}
      </p>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </Card>
  )
}

export function SummaryCards({ stok, alertStok }: SummaryCardsProps) {
  return (
    <div className="space-y-4">
      {alertStok.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-[#fef9c3] border border-[#fde047] rounded-lg">
          <AlertTriangle className="w-4 h-4 text-[#854d0e] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-body font-medium text-[#854d0e]">Stok Rendah</p>
            <ul className="mt-1 space-y-0.5">
              {alertStok.map((a) => (
                <li key={`${a.kelas_kode}-${a.jenis}`} className="text-xs text-[#713f12]">
                  {a.kelas_nama} ({a.jenis}): {a.sisa} ekor tersisa
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Masuk"  value={stok.masuk}    colorClass="text-on-surface" sub="ekor musim ini" />
        <StatCard label="Tersedia"     value={stok.tersedia} colorClass="text-primary"    sub="AVAILABLE + BOOKED" />
        <StatCard label="Terjual"      value={stok.terjual}  colorClass="text-[#15803d]"  sub="SOLD + DELIVERED" />
        <StatCard label="Mati"         value={stok.mati}     colorClass="text-error"      sub="total musim ini" />
      </div>
    </div>
  )
}
