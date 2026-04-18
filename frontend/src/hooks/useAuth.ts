import { useState, useCallback, useEffect } from 'react'
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react'
import type { User, AuthState } from '../types/salida'
import { saveAuth, loadAuth, clearAuth } from '../lib/storage'

interface UseAuthReturn extends AuthState {
  loginAsGuest: () => void
  logout: () => void
}

export function useAuth(): UseAuthReturn {
  const { user: clerkUser, isLoaded: userLoaded } = useUser()
  const { getToken } = useClerkAuth()
  const { signOut } = useClerk()

  // Guest mode state (persisted in localStorage).
  // When a Clerk user is present it takes precedence and guest is ignored.
  const [guestState, setGuestState] = useState<{ isGuest: boolean; user: User | null }>(() => {
    const saved = loadAuth()
    if (saved?.isGuest) return { isGuest: true, user: saved.user }
    return { isGuest: false, user: null }
  })

  const [clerkToken, setClerkToken] = useState<string | null>(null)

  // Fetch Clerk token whenever the authenticated user becomes available, and refresh every 50 min
  useEffect(() => {
    if (!clerkUser) {
      setClerkToken(null)
      return
    }
    const refresh = (): void => {
      getToken()
        .then(setClerkToken)
        .catch(() => setClerkToken(null))
    }
    refresh()
    const interval = setInterval(refresh, 50 * 60 * 1000)
    return () => clearInterval(interval)
  }, [clerkUser, getToken])

  // Persist Clerk token to localStorage so api.ts authHeaders() can read it
  useEffect(() => {
    if (clerkUser && clerkToken) {
      saveAuth({
        user: {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
          name: clerkUser.fullName ?? clerkUser.emailAddresses[0]?.emailAddress ?? clerkUser.id,
        },
        token: clerkToken,
        isGuest: false,
      })
    }
  }, [clerkUser, clerkToken])

  // Persist guest state to localStorage
  useEffect(() => {
    if (guestState.isGuest && guestState.user) {
      saveAuth({ user: guestState.user, token: null, isGuest: true })
    }
  }, [guestState])

  const isLoading = !userLoaded

  // Clerk user takes precedence over guest state
  const isGuest = clerkUser ? false : guestState.isGuest

  // Token is only meaningful when there is a Clerk user
  const token = clerkUser ? clerkToken : null

  // Build a User object compatible with the rest of the app
  const user: User | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        name: clerkUser.fullName ?? clerkUser.emailAddresses[0]?.emailAddress ?? clerkUser.id,
        picture: clerkUser.imageUrl,
        avatar: clerkUser.imageUrl,
      }
    : guestState.user

  const loginAsGuest = useCallback((): void => {
    const guestUser: User = { id: 'guest', name: 'Invitado', email: '' }
    setGuestState({ isGuest: true, user: guestUser })
  }, [])

  const logout = useCallback((): void => {
    clearAuth()
    setGuestState({ isGuest: false, user: null })
    setClerkToken(null)
    if (clerkUser) {
      void signOut()
    }
  }, [clerkUser, signOut])

  return {
    user,
    token,
    isGuest,
    isLoading,
    loginAsGuest,
    logout,
  }
}
