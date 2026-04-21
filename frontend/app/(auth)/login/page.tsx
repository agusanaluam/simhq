import { Card } from '@/components/ui/Card'
import { LoginForm } from './LoginForm'

export const metadata = { title: 'Login — SIM Hewan Qurban' }

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface-low flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #2779a7, #1e6090)' }}
          >
            <span className="text-white font-display font-bold text-xl">SQ</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-on-surface">
            SIM Hewan Qurban
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Sistem Manajemen Depot Qurban
          </p>
        </div>

        <Card>
          <h2 className="font-display font-semibold text-lg text-on-surface mb-6">
            Masuk ke Akun
          </h2>
          <LoginForm />
        </Card>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          &copy; 2026 SIM Hewan Qurban. Hak cipta dilindungi.
        </p>
      </div>
    </main>
  )
}
