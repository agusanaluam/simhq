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

export default async function KatalogPage({ searchParams }: PageProps) {
  const params  = await searchParams
  const depotId = params.depot ?? ''

  if (!depotId || isNaN(Number(depotId))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Link katalog tidak valid. Silakan gunakan link yang benar.</p>
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
