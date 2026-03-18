import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterStore } from './filters'

describe('useFilterStore', () => {
  beforeEach(() => {
    useFilterStore.setState({
      activeStatuses: new Set(['nao_visitado', 'mapeado', 'em_prospeccao', 'concluido']),
    })
  })

  it('should show all statuses by default', () => {
    const store = useFilterStore.getState()
    expect(store.isVisible('nao_visitado')).toBe(true)
    expect(store.isVisible('mapeado')).toBe(true)
    expect(store.isVisible('em_prospeccao')).toBe(true)
    expect(store.isVisible('concluido')).toBe(true)
  })

  it('should toggle status visibility', () => {
    useFilterStore.getState().toggleStatus('nao_visitado')
    expect(useFilterStore.getState().isVisible('nao_visitado')).toBe(false)
    expect(useFilterStore.getState().isVisible('mapeado')).toBe(true)
  })

  it('should not allow removing last visible status', () => {
    // Remove all except one
    useFilterStore.getState().toggleStatus('nao_visitado')
    useFilterStore.getState().toggleStatus('mapeado')
    useFilterStore.getState().toggleStatus('em_prospeccao')
    // Try to remove the last one
    useFilterStore.getState().toggleStatus('concluido')
    expect(useFilterStore.getState().isVisible('concluido')).toBe(true)
  })

  it('should restore all on showAll', () => {
    useFilterStore.getState().toggleStatus('nao_visitado')
    useFilterStore.getState().toggleStatus('mapeado')
    useFilterStore.getState().showAll()
    expect(useFilterStore.getState().isVisible('nao_visitado')).toBe(true)
    expect(useFilterStore.getState().isVisible('mapeado')).toBe(true)
  })
})
