'use client'

import { useSession } from 'next-auth/react'

interface RoleGuardProps {
  roles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role ?? ''

  if (!roles.includes(userRole)) return <>{fallback}</>
  return <>{children}</>
}
