'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1.5rem',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Something went wrong</h2>
          <p style={{ color: '#666', textAlign: 'center', maxWidth: '28rem' }}>
            An unexpected error occurred. Please try again. If the problem persists,
            contact support.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: '#0f172a',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
