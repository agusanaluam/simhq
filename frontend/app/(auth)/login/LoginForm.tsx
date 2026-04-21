'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email:    formData.get('email') as string,
      password: formData.get('password') as string,
      redirect: false,
    })

    if (result?.error) {
      setError('Email atau password salah.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="admin@depot.id"
        required
        autoComplete="email"
      />
      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />

      {error && (
        <p className="text-sm text-error bg-[#fee2e2] px-4 py-2 rounded-md">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full mt-2">
        Masuk
      </Button>
    </form>
  )
}
