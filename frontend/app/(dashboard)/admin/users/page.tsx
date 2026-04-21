'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/ui/StatusChip'
import { RoleGuard } from '@/components/shared/RoleGuard'
import api from '@/lib/api'

interface User {
  id: number
  name: string
  email: string
  role: string
  divisi: string | null
  is_active: boolean
  depot: { id: number; nama: string } | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/users')
      .then((res) => setUsers(res.data.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <RoleGuard
      roles={['SUPER_ADMIN']}
      fallback={<p className="text-on-surface-variant">Akses ditolak.</p>}
    >
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-on-surface">Manajemen User</h1>
            <p className="text-sm text-on-surface-variant mt-1">Kelola akun dan role pengguna</p>
          </div>
          <Button>+ Tambah User</Button>
        </div>

        <Card>
          {loading ? (
            <p className="text-on-surface-variant text-sm">Memuat data...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">Nama</th>
                    <th className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">Role</th>
                    <th className="pb-3 pr-4 text-xs uppercase tracking-widest text-on-surface-variant font-body">Depot</th>
                    <th className="pb-3 text-xs uppercase tracking-widest text-on-surface-variant font-body">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr key={user.id} className={i % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low'}>
                      <td className="py-3 pr-4">
                        <p className="font-body font-medium text-on-surface">{user.name}</p>
                        <p className="text-xs text-on-surface-variant">{user.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-on-surface-variant font-body">
                        {user.role.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 pr-4 text-on-surface-variant font-body">
                        {user.depot?.nama ?? '—'}
                      </td>
                      <td className="py-3">
                        <StatusChip status={user.is_active ? 'AKTIF' : 'NONAKTIF'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center text-on-surface-variant py-8 text-sm">Belum ada user.</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </RoleGuard>
  )
}
