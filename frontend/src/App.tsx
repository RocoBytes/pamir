import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './components/AuthPage'
import { Dashboard } from './components/Dashboard'
import { WizardLayout } from './components/wizard/WizardLayout'
import { RegistroIntegrante } from './components/RegistroIntegrante'
import { FichaCierre } from './components/FichaCierre'

type Route = 'dashboard' | 'nueva-salida' | 'nuevo-integrante' | 'nueva-cierre'

export default function App() {
  const { user, token, isGuest, isLoading, loginAsGuest, logout } = useAuth()
  const [route, setRoute] = useState<Route>('dashboard')

  const isAuthenticated = !!(user && (token || isGuest))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <AuthPage onLoginAsGuest={loginAsGuest} isLoading={isLoading} />
    )
  }

  // Keep WizardLayout mounted while creating an integrante so React Hook Form
  // state (including mid-step participantes) is preserved in memory.
  if ((route === 'nueva-salida' || route === 'nuevo-integrante') && user) {
    return (
      <>
        <div className={route === 'nueva-salida' ? undefined : 'hidden'}>
          <WizardLayout
            user={user}
            isGuest={isGuest}
            onDone={() => setRoute('dashboard')}
            onCancel={() => setRoute('dashboard')}
            onCreateIntegrante={() => setRoute('nuevo-integrante')}
          />
        </div>
        {route === 'nuevo-integrante' && (
          <RegistroIntegrante onBack={() => setRoute('nueva-salida')} />
        )}
      </>
    )
  }

  if (route === 'nueva-cierre' && user) {
    return (
      <FichaCierre
        user={user}
        isGuest={isGuest}
        onDone={() => setRoute('dashboard')}
        onCancel={() => setRoute('dashboard')}
      />
    )
  }

  return (
    <Dashboard
      user={user!}
      isGuest={isGuest}
      onNewSalida={() => setRoute('nueva-salida')}
      onNewCierre={() => setRoute('nueva-cierre')}
      onLogout={logout}
    />
  )
}
