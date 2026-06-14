import { Routes, Route, NavLink, useLocation, Link } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider.jsx'
import LoginPage from './auth/LoginPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PlantList from './pages/PlantList.jsx'
import PlantDetail from './pages/PlantDetail.jsx'
import PlantForm from './pages/PlantForm.jsx'
import Settings from './pages/Settings.jsx'

function BottomNav() {
  const tab = ({ isActive }) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${
      isActive ? 'text-canopy-400' : 'text-soil-50/55'
    }`
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-soil-900/90 backdrop-blur pb-safe">
      <div className="mx-auto flex max-w-xl items-stretch">
        <NavLink to="/" end className={tab}>
          <span className="text-xl">🏠</span>
          Home
        </NavLink>
        <NavLink to="/plants" className={tab}>
          <span className="text-xl">🌿</span>
          Plants
        </NavLink>
        {/* Center add button */}
        <Link
          to="/plants/new"
          className="relative -mt-5 flex w-16 flex-col items-center"
          aria-label="Add plant"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-canopy-600 text-3xl text-white shadow-lg shadow-canopy-600/40 active:scale-95">
            +
          </span>
        </Link>
        <NavLink to="/settings" className={tab}>
          <span className="text-xl">⚙️</span>
          Settings
        </NavLink>
        <NavLink to="/about" className={tab}>
          <span className="text-xl">🪴</span>
          About
        </NavLink>
      </div>
    </nav>
  )
}

function Shell({ children }) {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-xl pb-28 pt-safe">
      <div className="px-4">{children}</div>
      <BottomNav />
    </div>
  )
}

function About() {
  return (
    <div className="animate-rise space-y-3 py-6">
      <h1 className="text-2xl font-bold text-white">🪴 PlantForge</h1>
      <p className="text-soil-50/70">A little inventory for your plants — track watering, repotting and fertilizing, keep a photo and notes for each one, and see what needs attention on the home screen.</p>
      <p className="text-sm text-soil-50/50">Tip: in Safari, tap Share → “Add to Home Screen” for an app icon.</p>
    </div>
  )
}

export default function App() {
  const { ready, needsAuth, isAuthenticated } = useAuth()
  const { pathname } = useLocation()

  if (!ready) {
    return <div className="grid min-h-[100dvh] place-items-center text-soil-50/50">Loading…</div>
  }

  if (needsAuth && !isAuthenticated) {
    return <LoginPage />
  }

  return (
    <Shell key={pathname}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/plants" element={<PlantList />} />
        <Route path="/plants/new" element={<PlantForm />} />
        <Route path="/plant/:id" element={<PlantDetail />} />
        <Route path="/plant/:id/edit" element={<PlantForm />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  )
}

function NotFound() {
  return (
    <div className="py-16 text-center text-soil-50/60">
      <p className="text-3xl">🍃</p>
      <p className="mt-2">Nothing here.</p>
      <Link to="/" className="mt-4 inline-block text-canopy-400">Back home</Link>
    </div>
  )
}
