import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './components/AuthPage'
import { Dashboard } from './components/Dashboard'
import { WizardLayout } from './components/wizard/WizardLayout'
import { RegistroIntegrante } from './components/RegistroIntegrante'
import { FichaCierre } from './components/FichaCierre'
import { fetchMyIntegrante } from './lib/api'

type Route = 'dashboard' | 'nueva-salida' | 'nuevo-integrante' | 'nueva-cierre' | 'nuevo-integrante-standalone'

function getQueryParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name)
}

const Spinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3 text-slate-500">
      <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">Cargando...</p>
    </div>
  </div>
)

export default function App() {
  const { user, token, isLoading, loginWithCredentials, register, logout } = useAuth()
  const [route, setRoute] = useState<Route>('dashboard')
  const [integranteChecked, setIntegranteChecked] = useState(false)
  const [hasIntegrante, setHasIntegrante] = useState(false)

  const isAuthenticated = !!(user && token)

  useEffect(() => {
    if (!isAuthenticated) {
      setIntegranteChecked(false)
      setHasIntegrante(false)
      return
    }
    fetchMyIntegrante()
      .then(result => { setHasIntegrante(result !== null); setIntegranteChecked(true) })
      .catch(() => { setHasIntegrante(false); setIntegranteChecked(true) })
  }, [isAuthenticated])

  const verifiedParam = getQueryParam('verified')
  const resetToken = getQueryParam('reset')

  if (isLoading || (isAuthenticated && !integranteChecked)) {
    return <Spinner />
  }

  if (!isAuthenticated) {
    return (
      <AuthPage
        onLogin={loginWithCredentials}
        onRegister={register}
        isLoading={isLoading}
        verifiedStatus={verifiedParam === '1' ? 'success' : verifiedParam === 'error' ? 'error' : undefined}
        resetToken={resetToken ?? undefined}
      />
    )
  }

  if ((route === 'nueva-salida' || route === 'nuevo-integrante') && user) {
    return (
      <>
        <div className={route === 'nueva-salida' ? undefined : 'hidden'}>
          <WizardLayout
            user={user}
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

  if (route === 'nuevo-integrante-standalone') {
    return (
      <RegistroIntegrante
        onBack={() => setRoute('dashboard')}
        defaultEmail={!hasIntegrante ? user?.email : undefined}
        onComplete={!hasIntegrante ? () => { setHasIntegrante(true); setRoute('dashboard') } : undefined}
      />
    )
  }

  if (route === 'nueva-cierre' && user) {
    return (
      <FichaCierre
        user={user}
        onDone={() => setRoute('dashboard')}
        onCancel={() => setRoute('dashboard')}
      />
    )
  }

  return (
    <Dashboard
      user={user!}
      locked={!hasIntegrante}
      onNewSalida={() => setRoute('nueva-salida')}
      onNewCierre={() => setRoute('nueva-cierre')}
      onNewIntegrante={() => setRoute('nuevo-integrante-standalone')}
      onLogout={logout}
    />
  )
}
