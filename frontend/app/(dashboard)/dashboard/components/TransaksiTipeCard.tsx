import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { DashboardData } from '@/hooks/useDashboard'

interface TransaksiTipeCardProps {
  transaksiHariIni: DashboardData['transaksi_hari_ini']
}

const TIPE_LABEL: Record<string, string> = {
  SHQ: 'Kirim Hidup',
  THQ: 'Titip ke Yayasan',
  PHQ: 'Potong di Depot, Kirim Daging',
}

export function TransaksiTipeCard({ transaksiHariIni }: TransaksiTipeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaksi Hari Ini</CardTitle>
      </CardHeader>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="font-display font-bold text-3xl text-on-surface">
          {transaksiHariIni.total}
        </span>
        <span className="text-sm text-on-surface-variant">transaksi</span>
      </div>

      {transaksiHariIni.per_tipe.length > 0 ? (
        <div className="space-y-2">
          {transaksiHariIni.per_tipe.map((t) => (
            <div key={t.tipe_qurban} className="flex items-center justify-between">
              <span className="text-sm font-body text-on-surface-variant">
                {TIPE_LABEL[t.tipe_qurban] ?? t.tipe_qurban}
              </span>
              <span className="font-display font-semibold text-sm text-on-surface">
                {t.count}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">Belum ada transaksi hari ini.</p>
      )}
    </Card>
  )
}
