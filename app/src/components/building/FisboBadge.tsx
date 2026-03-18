'use client'

interface FisboBadgeProps {
  visible: boolean
}

/**
 * Small red star badge (#DC1431) positioned top-right of map pin.
 * Rendered only when is_fisbo_detected = true.
 * 12x12px as specified in Story 2.10.
 */
export function FisboBadge({ visible }: FisboBadgeProps) {
  if (!visible) return null

  return (
    <div
      className="absolute -top-1 -right-1 flex items-center justify-center z-10"
      style={{ width: 12, height: 12 }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="#DC1431"
        stroke="none"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </div>
  )
}
