export default function PinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary-foreground">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="text-lg font-headline font-semibold text-foreground">WildTrack360</span>
        </div>
        {children}
      </div>
    </div>
  );
}
