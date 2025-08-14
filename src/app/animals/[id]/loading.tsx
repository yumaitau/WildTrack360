export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="h-10 w-40 bg-muted/50 animate-pulse rounded-md"></div>
        </div>
        
        <main>
          <div className="bg-card rounded-lg shadow-lg mb-8 overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 h-64 bg-muted/30 animate-pulse"></div>
              <div className="md:w-2/3 p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-primary/10 rounded-full w-24"></div>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="h-12 bg-muted rounded w-48"></div>
                  </div>
                  <div className="h-6 bg-muted/70 rounded w-32"></div>
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="h-6 bg-muted/50 rounded w-36"></div>
                    <div className="h-6 bg-muted/50 rounded w-44"></div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <div className="h-10 bg-muted/50 rounded w-28"></div>
                    <div className="h-10 bg-primary/20 rounded w-32"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-card rounded-lg shadow p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded w-40 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-20 bg-muted/30 rounded"></div>
                    <div className="h-20 bg-muted/30 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-lg shadow p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded w-32 mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted/30 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-card rounded-lg shadow p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded w-24 mb-4"></div>
                  <div className="h-48 bg-muted/30 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}