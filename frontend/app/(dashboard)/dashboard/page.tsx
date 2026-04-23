'use client'

import { RefreshCw } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { SummaryCards }      from './components/SummaryCards'
import { StokGrid }          from './components/StokGrid'
import { PenjualanChart }    from './components/PenjualanChart'
import { PendapatanSummary } from './components/PendapatanSummary'
import { TransaksiTipeCard } from './components/TransaksiTipeCard'

const MUSIM = new Date().getFullYear()

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard(MUSIM)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Dashboard</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Musim {MUSIM} — auto-refresh setiap 5 menit
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body text-primary
                     hover:bg-surface-high transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Dashboard content */}
      {data && (
        <div className="space-y-6">
          <SummaryCards stok={data.stok} alertStok={data.alert_stok} />
          <PendapatanSummary pendapatan={data.pendapatan} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PenjualanChart grafik={data.grafik_7hari} />
            </div>
            <div>
              <TransaksiTipeCard transaksiHariIni={data.transaksi_hari_ini} />
            </div>
          </div>
          <StokGrid perKelas={data.stok.per_kelas} />
        </div>
      )}
    </div>
  )
}
