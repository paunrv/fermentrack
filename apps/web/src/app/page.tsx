export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl">🍺</div>
        <h1 className="text-4xl font-bold text-white">Fermentrack</h1>
        <p className="text-gray-400 text-lg">
          Production operating system for alcohol manufacturers
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
