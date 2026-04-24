interface HewanCardProps {
  kelas:           string
  jenis:           string
  harga_jual:      number
  jumlah_tersedia: number
  foto_url?:       string | null
  onOrder:         () => void
}

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function HewanCard({ kelas, jenis, harga_jual, jumlah_tersedia, foto_url, onOrder }: HewanCardProps) {
  const habis = jumlah_tersedia === 0

  return (
    <div className={`rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden ${habis ? 'opacity-60' : ''}`}>
      {foto_url ? (
        <img src={foto_url} alt={`${kelas} ${jenis}`} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
          <span className="text-4xl">🐄</span>
        </div>
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-lg text-gray-900">{kelas}</p>
            <p className="text-sm text-gray-500">{jenis}</p>
          </div>
          {habis ? (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">HABIS</span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
              {jumlah_tersedia} tersedia
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">{rupiah(harga_jual)}</p>
        <button
          onClick={onOrder}
          disabled={habis}
          className={`mt-auto w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            habis
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {habis ? 'Stok Habis' : 'Pesan Sekarang'}
        </button>
      </div>
    </div>
  )
}
