'use client'

interface ErrorBannerProps {
  error: Error | null | unknown
  onRetry: () => void
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  if (!error) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg mx-4">
      <div className="flex items-center gap-2 min-w-0">
        <svg
          className="size-4 text-red-500 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <p className="text-sm text-red-700">
          Erro ao carregar dados. Verifique sua conexão.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 text-sm font-medium text-red-600 hover:text-red-800 transition-colors whitespace-nowrap"
      >
        Tentar novamente
      </button>
    </div>
  )
}
