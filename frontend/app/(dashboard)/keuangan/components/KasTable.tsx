import { Card } from '@/components/ui/Card'

interface KasEntry {
  id: number
  tipe: 'MASUK' | 'KELUAR'
  sumber: string | null
  divisi: string | null
  keterangan: string
  jumlah: number
  metode: string
  tgl_transaksi: string
  input_by: { id: number; name: string } | null
  rab: { id: number; kategori_id: number; musim: number; kategori: { id: number; nama: string } | null } | null
}

interface KasTableProps {
  entries: KasEntry[]
}

const METODE_SHORT: Record<string, string> = {
  CASH:          'Tunai',
  TRANSFER_BCA:  'BCA',
  TRANSFER_LAIN: 'Transfer',
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

function formatTgl(str: string): string {
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function KasTable({ entries }: KasTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-on-surface-variant text-center py-8">
          Belum ada transaksi untuk filter ini.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Tanggal', 'Keterangan', 'Sumber/Divisi', 'RAB', 'Metode', 'Jumlah'].map((h) => (
                <th key={h} className="text-left pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant whitespace-nowrap">
                  {formatTgl(e.tgl_transaksi)}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface max-w-xs truncate">
                  {e.keterangan}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant">
                  {e.sumber ?? e.divisi ?? '—'}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant">
                  {e.rab?.kategori ? (
                    <span className="text-xs bg-surface-high px-1.5 py-0.5 rounded font-medium">
                      {e.rab.kategori.nama}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-2.5 pr-4 font-body text-on-surface-variant">
                  {METODE_SHORT[e.metode] ?? e.metode}
                </td>
                <td className={`py-2.5 font-display font-semibold whitespace-nowrap ${
                  e.tipe === 'MASUK' ? 'text-[#15803d]' : 'text-error'
                }`}>
                  {e.tipe === 'KELUAR' ? '−' : '+'}{rupiah(e.jumlah)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
