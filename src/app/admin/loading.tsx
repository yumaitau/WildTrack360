export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="h-8 w-36 bg-primary/20 animate-pulse rounded"></div>
          <div className="h-10 w-36 bg-muted/50 animate-pulse rounded"></div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          <div className="h-11 bg-muted/30 animate-pulse rounded-lg w-full"></div>
          <div className="bg-card rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-muted/70 rounded w-1/4 mb-6"></div>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <div className="h-10 bg-muted/30 rounded flex-1"></div>
                  <div className="h-10 bg-primary/20 rounded w-32"></div>
                </div>
                <div className="border rounded-md">
                  <div className="p-4 bg-muted/10">
                    <div className="h-5 bg-muted/30 rounded w-32 mb-1"></div>
                  </div>
                  <div className="divide-y">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="h-5 bg-muted/30 rounded w-48"></div>
                          <div className="flex gap-2">
                            <div className="h-8 w-8 bg-muted/20 rounded"></div>
                            <div className="h-8 w-8 bg-muted/20 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}