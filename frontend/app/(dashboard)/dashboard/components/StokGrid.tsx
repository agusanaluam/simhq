import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import type { StokPerKelas } from '@/hooks/useDashboard'

interface StokGridProps {
  perKelas: StokPerKelas[]
}

export function StokGrid({ perKelas }: StokGridProps) {
  if (perKelas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stok per Kelas</CardTitle>
        </CardHeader>
        <p className="text-sm text-on-surface-variant">Belum ada data stok.</p>
      </Card>
    )
  }

  const jenisList = Array.from(new Set(perKelas.map((k) => k.jenis))).sort()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stok per Kelas</CardTitle>
      </CardHeader>

      {jenisList.map((jenis) => {
        const rows = perKelas.filter((k) => k.jenis === jenis)
        if (rows.length === 0) return null

        return (
          <div key={jenis} className="mb-6 last:mb-0">
            <p className="text-xs font-body font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              {jenis}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left pb-2 pr-6 text-xs text-on-surface-variant font-body">Kelas</th>
                    <th className="text-right pb-2 pr-6 text-xs text-on-surface-variant font-body">Tersedia</th>
                    <th className="text-right pb-2 text-xs text-on-surface-variant font-body">Terjual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-high">
                  {rows.map((row) => (
                    <tr key={row.kelas_kode}>
                      <td className="py-2 pr-6 font-body font-medium text-on-surface">
                        {row.kelas_nama}
                      </td>
                      <td className="py-2 pr-6 text-right">
                        <span className={`font-display font-semibold ${
                          row.tersedia < 5 ? 'text-[#854d0e]' : 'text-primary'
                        }`}>
                          {row.tersedia}
                        </span>
                      </td>
                      <td className="py-2 text-right font-display font-semibold text-[#15803d]">
                        {row.terjual}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
