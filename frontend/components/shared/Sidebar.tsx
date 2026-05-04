'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  Wallet, Truck, ClipboardList, ClipboardCheck, LogOut, Database, PawPrint, Grid3x3, Receipt, Layers, HandCoins, TrendingUp, UserCheck, MessageSquare, Calculator, Activity, CreditCard, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

type NavGroup = {
  label?: string
  items: NavItem[]
}

const KANDANG_ROLES  = ['SUPER_ADMIN','KEPALA_DEPOT','KANDANG_SAPI_KETUA','KANDANG_SAPI_ANGGOTA','KANDANG_DOMBA_KETUA','KANDANG_DOMBA_ANGGOTA']
const ABSENSI_ONLY   = ['PAKAN_KETUA','PAKAN_ANGGOTA','LOGISTIK_KETUA','LOGISTIK_ANGGOTA','KONSTRUKSI_KETUA','KONSTRUKSI_ANGGOTA']
const DASHBOARD_ROLES = ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA','ADMIN_ANGGOTA','CS_KETUA','CS_ANGGOTA','KEUANGAN',...KANDANG_ROLES.slice(2)]

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: DASHBOARD_ROLES },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { href: '/depot/pos',          label: 'POS Penjualan',    icon: ShoppingCart, roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA','ADMIN_ANGGOTA'] },
      { href: '/depot/transaksi',    label: 'Transaksi',        icon: Receipt,      roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA','ADMIN_ANGGOTA','KEUANGAN'] },
      { href: '/depot/ploting-sapi', label: 'Ploting Slot Sapi',icon: Layers,       roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA','ADMIN_ANGGOTA'] },
      { href: '/depot/pengadaan',    label: 'Pengadaan',        icon: PawPrint,     roles: [...KANDANG_ROLES, 'ADMIN_KETUA', 'CS_KETUA', 'CS_ANGGOTA'] },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { href: '/keuangan',            label: 'Keuangan BIOP',      icon: Wallet,     roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA'] },
      { href: '/keuangan/pendapatan', label: 'Pendapatan & Setoran',icon: TrendingUp, roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA'] },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { href: '/depot/kandang',    label: 'Ploting Kandang', icon: Grid3x3,  roles: KANDANG_ROLES },
      { href: '/laporan/mortalitas',label: 'Mortalitas Hewan',icon: Activity, roles: ['SUPER_ADMIN','KEPALA_DEPOT','KANDANG_SAPI_KETUA','KANDANG_DOMBA_KETUA'] },
      { href: '/pengiriman',       label: 'Pengiriman',      icon: Truck,    roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
    ],
  },
  {
    label: 'Karyawan',
    items: [
      { href: '/absensi',        label: 'Absensi',       icon: ClipboardCheck, roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA','ADMIN_ANGGOTA','CS_KETUA','CS_ANGGOTA','KEUANGAN',...KANDANG_ROLES.slice(2),...ABSENSI_ONLY] },
      { href: '/admin/absensi',  label: 'Rekap Absensi', icon: ClipboardList,  roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA','KEUANGAN'] },
      { href: '/admin/sdm/upah', label: 'Upah Harian',   icon: Calculator,     roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA'] },
      { href: '/sdm/kasbon',     label: 'Kasbon',         icon: CreditCard,     roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA'] },
    ],
  },
  {
    items: [
      { href: '/cs/customer',                  label: 'Database Customer', icon: UserCheck,     roles: ['SUPER_ADMIN','KEPALA_DEPOT','ADMIN_KETUA'] },
      { href: '/admin/wa-log',                 label: 'Log WA',            icon: MessageSquare, roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
      { href: '/admin/users',                  label: 'Manaj. User',       icon: Users,         roles: ['SUPER_ADMIN'] },
      { href: '/admin/master-data',            label: 'Master Data',       icon: Database,      roles: ['SUPER_ADMIN','KEPALA_DEPOT'] },
    ],
  },
]

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const userRole = (session?.user as any)?.role ?? ''
  const [open, setOpen] = useState(false)

  // Close sidebar on route change (mobile navigation)
  useEffect(() => { setOpen(false) }, [pathname])

  const visibleGroups = navGroups
    .map(g => ({ ...g, items: g.items.filter(i => !i.roles || i.roles.includes(userRole)) }))
    .filter(g => g.items.length > 0)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-surface rounded-lg shadow-card border border-surface-high"
        aria-label="Buka menu"
      >
        <Menu className="w-5 h-5 text-on-surface" />
      </button>

      {/* Backdrop (mobile only) */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Base: full height, fixed on mobile / sticky on desktop
          'flex flex-col bg-surface h-screen w-64 flex-shrink-0',
          // Mobile: fixed overlay with slide transition
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible, sticky in flex layout
          'lg:relative lg:translate-x-0 lg:sticky lg:top-0',
        )}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-high flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2779a7, #1e6090)' }}
              >
                <span className="text-white font-display font-bold text-sm">SQ</span>
              </div>
              <div>
                <p className="font-display font-semibold text-sm text-on-surface leading-tight">SIM Qurban</p>
                <p className="text-xs text-on-surface-variant">{(session?.user as any)?.depotId ? 'Depot' : 'Admin Pusat'}</p>
              </div>
            </div>
            {/* Close button — mobile only */}
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden p-1 text-on-surface-variant hover:text-on-surface"
              aria-label="Tutup menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav — scrollable */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {visibleGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-body font-semibold uppercase tracking-widest text-on-surface-variant/60">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors',
                        active
                          ? 'bg-primary text-on-primary font-medium'
                          : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer — fixed at bottom, never scrolled away */}
        <div className="flex-shrink-0 px-3 py-4 border-t border-surface-high">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-body font-medium text-on-surface truncate">{session?.user?.name}</p>
            <p className="text-xs text-on-surface-variant">{userRole.replace(/_/g, ' ')}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-tertiary hover:bg-[#fee2e2] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  )
}
