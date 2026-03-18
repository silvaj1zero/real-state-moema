import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: true })
  })

  it('should initialize with null user and loading true', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isLoading).toBe(true)
  })

  it('should set user and stop loading', () => {
    const mockUser = { id: 'test-uuid', email: 'luciana@remax.com' } as unknown as import('@supabase/supabase-js').User
    useAuthStore.getState().setUser(mockUser)

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.isLoading).toBe(false)
  })

  it('should clear user on logout', () => {
    const mockUser = { id: 'test-uuid' } as unknown as import('@supabase/supabase-js').User
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().setUser(null)

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isLoading).toBe(false)
  })
})
