import { Card } from '@/components/ui/Card'

interface OrderRow {
  id:          number
  nama:        string
  hp:          string
  jenis:       string
  kelas:       string
  tipe_qurban: string
  status:      string
  created_at:  string
  cs:          { id: number; name: string } | null
}

interface OrderTableProps {
  orders:         OrderRow[]
  onStatusChange: (id: number, status: string) => void
}

const STATUS_OPTIONS = ['BARU', 'DIKONFIRMASI', 'DP_DIBAYAR', 'LUNAS', 'DIJADWALKAN', 'DIBATALKAN']

const STATUS_BADGE: Record<string, string> = {
  BARU:         'bg-blue-100 text-blue-700',
  DIKONFIRMASI: 'bg-yellow-100 text-yellow-700',
  DP_DIBAYAR:   'bg-purple-100 text-purple-700',
  LUNAS:        'bg-green-100 text-green-700',
  DIJADWALKAN:  'bg-teal-100 text-teal-700',
  DIBATALKAN:   'bg-red-100 text-red-700',
}

export function OrderTable({ orders, onStatusChange }: OrderTableProps) {
  if (orders.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">Belum ada order masuk.</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-high">
              {['Waktu', 'Nama', 'HP', 'Pesanan', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                <td className="py-3 px-4 font-body text-on-surface-variant whitespace-nowrap text-xs">
                  {new Date(o.created_at).toLocaleDateString('id-ID')}
                </td>
                <td className="py-3 px-4 font-body font-medium text-on-surface">{o.nama}</td>
                <td className="py-3 px-4 font-body text-on-surface-variant">
                  <a
                    href={`https://wa.me/62${o.hp.replace(/^0/, '')}?text=${encodeURIComponent(`Halo ${o.nama}, kami dari Tim Qurban. Terima kasih sudah memesan ${o.kelas} ${o.jenis} (${o.tipe_qurban}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                  >
                    {o.hp}
                  </a>
                </td>
                <td className="py-3 px-4 font-body text-on-surface">
                  {o.kelas} {o.jenis} ({o.tipe_qurban})
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_BADGE[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <select
                    value={o.status}
                    onChange={(e) => onStatusChange(o.id, e.target.value)}
                    className="text-xs border border-surface-high rounded-md px-2 py-1 bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
