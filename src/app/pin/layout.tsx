export default function PinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-gray-950">
      <div className="mx-auto max-w-lg px-4 py-8">
        {children}
      </div>
    </div>
  );
}
