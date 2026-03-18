// IndexedDB wrapper for offline data storage
// Story 1.6: Suporte Offline e Sincronização

const DB_NAME = 'remax-moema-offline'
const DB_VERSION = 1

interface PendingMutation {
  id: string
  table: string
  operation: 'insert' | 'update' | 'delete'
  data: Record<string, unknown>
  created_at: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      // Store for cached buildings
      if (!db.objectStoreNames.contains('buildings')) {
        db.createObjectStore('buildings', { keyPath: 'id' })
      }
      // Store for pending mutations (offline queue)
      if (!db.objectStoreNames.contains('mutations')) {
        const store = db.createObjectStore('mutations', { keyPath: 'id' })
        store.createIndex('by_created', 'created_at')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Cache buildings locally
export async function cacheBuildingsLocally(buildings: any[]): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('buildings', 'readwrite')
  const store = tx.objectStore('buildings')

  for (const b of buildings) {
    store.put(b)
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Get cached buildings (for offline use)
export async function getCachedBuildings(): Promise<any[]> {
  const db = await openDB()
  const tx = db.transaction('buildings', 'readonly')
  const store = tx.objectStore('buildings')

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Queue a mutation for sync later
export async function queueMutation(mutation: Omit<PendingMutation, 'id' | 'created_at'>): Promise<string> {
  const db = await openDB()
  const tx = db.transaction('mutations', 'readwrite')
  const store = tx.objectStore('mutations')

  const id = crypto.randomUUID()
  const entry: PendingMutation = {
    ...mutation,
    id,
    created_at: new Date().toISOString(),
  }

  store.put(entry)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

// Get all pending mutations (FIFO order)
export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await openDB()
  const tx = db.transaction('mutations', 'readonly')
  const store = tx.objectStore('mutations')
  const index = store.index('by_created')

  return new Promise((resolve, reject) => {
    const request = index.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Remove synced mutation
export async function removeMutation(id: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction('mutations', 'readwrite')
  tx.objectStore('mutations').delete(id)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Count pending mutations
export async function getPendingCount(): Promise<number> {
  const db = await openDB()
  const tx = db.transaction('mutations', 'readonly')
  const store = tx.objectStore('mutations')

  return new Promise((resolve, reject) => {
    const request = store.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
