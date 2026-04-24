import { Sidebar } from '@/components/shared/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-low">
      <Sidebar />
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile top padding — accounts for fixed hamburger button */}
        <div className="lg:hidden h-16" />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
