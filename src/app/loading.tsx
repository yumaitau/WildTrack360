export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-card shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary/20 rounded animate-pulse"></div>
              <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 bg-muted/50 rounded animate-pulse"></div>
              <div className="h-9 w-20 bg-muted/50 rounded animate-pulse"></div>
              <div className="h-9 w-24 bg-muted/50 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Brandmark Logo Section */}
      <div className="flex justify-center py-4">
        <div className="h-40 w-96 bg-muted/20 rounded animate-pulse"></div>
      </div>

      {/* User Summary */}
      <div className="flex flex-col items-center gap-2 mb-2 px-4 text-center">
        <div className="h-6 w-64 bg-muted/50 rounded animate-pulse"></div>
        <div className="h-5 w-48 bg-muted/30 rounded animate-pulse"></div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Quick Actions */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
          <div className="h-6 w-32 bg-muted rounded mb-4 animate-pulse"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg shadow p-4">
              <div className="animate-pulse">
                <div className="h-8 bg-muted/50 rounded w-16 mb-2"></div>
                <div className="h-4 bg-muted/30 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-lg shadow-lg p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded w-40 mb-4"></div>
                <div className="h-64 bg-muted/20 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Animals Table */}
        <div className="bg-card rounded-lg shadow-lg">
          <div className="p-6">
            <div className="h-6 bg-muted rounded w-40 mb-4 animate-pulse"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted/20 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}