import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email:    credentials.email,
              password: credentials.password,
            }),
          })

          if (!res.ok) return null

          const data = await res.json()

          return {
            id:       String(data.user.id),
            name:     data.user.name,
            email:    data.user.email,
            role:     data.user.role,
            depotId:  data.user.depot_id,
            token:    data.token,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role     = (user as any).role
        token.depotId  = (user as any).depotId
        token.apiToken = (user as any).token
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role     = token.role
        ;(session.user as any).depotId = token.depotId
        ;(session.user as any).token   = token.apiToken
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60,
  },
})
