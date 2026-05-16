async function getBatches() {
  try {
    const res = await fetch(
      'http://localhost:3001/api/query/batches?organizationId=org-test-001',
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.batches ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const batches = await getBatches();

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">Production overview</p>
          </div>
          <div className="text-sm text-gray-500">org: test-brewery</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">Active batches</p>
            <p className="text-3xl font-bold text-white mt-1">{batches.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">Total liters in production</p>
            <p className="text-3xl font-bold text-green-400 mt-1">
              {batches
                .reduce((sum: number, b: any) => sum + parseFloat(b.currentLiters), 0)
                .toFixed(1)}L
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">Total losses recorded</p>
            <p className="text-3xl font-bold text-red-400 mt-1">
              {batches
                .reduce((sum: number, b: any) => sum + parseFloat(b.totalLossLiters), 0)
                .toFixed(1)}L
            </p>
          </div>
        </div>

        {/* Batch list */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Batches</h2>
          </div>
          {batches.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No batches yet
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    State
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Initial L
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Current L
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Loss L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {batches.map((batch: any) => (
                  <tr key={batch.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{batch.batchCode}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(batch.startedAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-900/50 text-green-400 border border-green-800">
                        {batch.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">
                      {parseFloat(batch.initialLiters).toFixed(1)}L
                    </td>
                    <td className="px-6 py-4 text-right text-green-400 font-medium">
                      {parseFloat(batch.currentLiters).toFixed(1)}L
                    </td>
                    <td className="px-6 py-4 text-right text-red-400">
                      {parseFloat(batch.totalLossLiters).toFixed(1)}L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
