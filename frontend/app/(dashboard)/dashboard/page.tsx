import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export const metadata = { title: 'Dashboard — SIM Hewan Qurban' }

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-on-surface">Dashboard</h1>
        <p className="text-sm text-on-surface-variant mt-1">Selamat datang di SIM Hewan Qurban</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Hewan</CardTitle>
          </CardHeader>
          <p className="font-display font-bold text-3xl text-primary">—</p>
          <p className="text-xs text-on-surface-variant mt-1">Data tersedia setelah T-03</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Penjualan</CardTitle>
          </CardHeader>
          <p className="font-display font-bold text-3xl text-accent">—</p>
          <p className="text-xs text-on-surface-variant mt-1">Data tersedia setelah T-05</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kas Hari Ini</CardTitle>
          </CardHeader>
          <p className="font-display font-bold text-3xl text-on-surface">—</p>
          <p className="text-xs text-on-surface-variant mt-1">Data tersedia setelah T-10</p>
        </Card>
      </div>
    </div>
  )
}
