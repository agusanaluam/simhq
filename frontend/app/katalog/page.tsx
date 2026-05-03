import { redirect } from 'next/navigation'
import { KatalogContent } from './components/KatalogContent'

interface PageProps {
  searchParams: Promise<{ depot?: string }>
}

async function getCatalog(depotId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/katalog?depot=${depotId}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return { data: [], musim: new Date().getFullYear() }
    return res.json()
  } catch {
    return { data: [], musim: new Date().getFullYear() }
  }
}

async function getDepots(): Promise<{ id: number; nama: string }[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/depots`,
      { cache: 'no-store' }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function KatalogPage({ searchParams }: PageProps) {
  const params  = await searchParams
  const depotId = params.depot ?? ''

  // No depot param — resolve automatically
  if (!depotId || isNaN(Number(depotId))) {
    const depots = await getDepots()

    // Single depot → redirect straight in
    if (depots.length === 1) {
      redirect(`/katalog?depot=${depots[0].id}`)
    }

    // Multiple depots → show picker
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Katalog Hewan Qurban</h1>
          <p className="text-sm text-gray-500 mb-6">Pilih depot yang ingin Anda lihat</p>
          <div className="space-y-2">
            {depots.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada depot tersedia.</p>
            ) : depots.map(d => (
              <a
                key={d.id}
                href={`/katalog?depot=${d.id}`}
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
              >
                {d.nama}
              </a>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const catalog = await getCatalog(depotId)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-bold text-gray-900">Katalog Hewan Qurban</h1>
          <p className="text-sm text-gray-500 mt-1">Musim {catalog.musim} — Tersedia sekarang</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <KatalogContent
          items={catalog.data}
          depotId={Number(depotId)}
          musim={catalog.musim}
        />
      </main>
      <footer className="text-center py-8 text-xs text-gray-400">
        © {new Date().getFullYear()} SIM Hewan Qurban
      </footer>
    </div>
  )
}
