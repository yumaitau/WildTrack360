'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error server-side only — never expose to the user
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground text-center max-w-md">
        An unexpected error occurred. Please try again. If the problem persists,
        contact support.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  )
}
