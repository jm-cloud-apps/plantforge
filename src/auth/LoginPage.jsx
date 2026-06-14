import { useState } from 'react'
import { useAuth } from './AuthProvider.jsx'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err?.message || 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 pt-safe pb-safe">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm animate-rise p-7 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-canopy-600 text-3xl shadow-lg shadow-canopy-600/30">
          🪴
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">PlantForge</h1>
        <p className="mt-1 text-sm text-soil-50/60">Sign in to your plant collection.</p>

        <div className="mt-6 space-y-3 text-left">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email" type="email" autoComplete="username" inputMode="email"
              className="field" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password" type="password" autoComplete="current-password"
              className="field" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
