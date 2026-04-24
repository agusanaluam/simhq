interface PengirimanCardProps {
  id:             number
  nama_penerima:  string
  alamat:         string
  no_hp1:         string
  sesi:           string
  status:         string
  petugas:        { name: string } | null
  onStatusChange: (id: number, status: string) => void
}

const STATUS_NEXT: Record<string, string | null> = {
  DIJADWALKAN:      'DIAMBIL',
  DIAMBIL:          'DALAM_PERJALANAN',
  DALAM_PERJALANAN: 'TERKIRIM',
  TERKIRIM:         null,
}

const STATUS_LABEL: Record<string, string> = {
  DIJADWALKAN:      'Dijadwalkan',
  DIAMBIL:          'Diambil',
  DALAM_PERJALANAN: 'Dalam Perjalanan',
  TERKIRIM:         'Terkirim',
}

const STATUS_COLOR: Record<string, string> = {
  DIJADWALKAN:      'bg-blue-100 text-blue-700',
  DIAMBIL:          'bg-yellow-100 text-yellow-700',
  DALAM_PERJALANAN: 'bg-orange-100 text-orange-700',
  TERKIRIM:         'bg-green-100 text-green-700',
}

const NEXT_LABEL: Record<string, string> = {
  DIJADWALKAN:      '→ Diambil',
  DIAMBIL:          '→ Berangkat',
  DALAM_PERJALANAN: '→ Terkirim',
}

export function PengirimanCard({ id, nama_penerima, alamat, no_hp1, sesi, status, petugas, onStatusChange }: PengirimanCardProps) {
  const nextStatus = STATUS_NEXT[status]

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-900">{nama_penerima}</p>
          <p className="text-sm text-gray-500 mt-0.5">{alamat}</p>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-700'}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <a
          href={`https://wa.me/62${no_hp1.replace(/^0/, '')}`}
          target="_blank" rel="noopener noreferrer"
          className="text-green-600 hover:underline"
        >
          {no_hp1}
        </a>
        {petugas && <span>· Petugas: {petugas.name}</span>}
      </div>
      {nextStatus && (
        <button
          onClick={() => onStatusChange(id, nextStatus)}
          className="w-full py-3 mt-1 bg-primary text-on-primary font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          {NEXT_LABEL[status]}
        </button>
      )}
    </div>
  )
}
