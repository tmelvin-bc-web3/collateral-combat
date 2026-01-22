'use client';

import { useState, useEffect } from 'react';

interface MetricsData {
  metrics: {
    dau: number;
    totalUsers: number;
    matchesToday: number;
    volumeToday: number;
    feesToday: number;
    activeMatches: number;
    systemStatus: string;
    databaseStatus: string;
    memoryUsage: number;
    activeConnections: number;
    uptime: number;
  };
  generated: string;
}

function MetricCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="bg-black/40 backdrop-blur border border-white/10 rounded-lg p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtext && <div className="text-xs text-gray-500">{subtext}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'healthy' ? 'bg-green-500' : status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color} mr-2`} />
  );
}

export default function MetricsDashboard() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/admin/metrics`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if using JWT
        }
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Not authorized - admin access required');
        }
        throw new Error('Failed to fetch metrics');
      }

      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const formatVolume = (lamports: number) => {
    return `${(lamports / 1e9).toFixed(2)} SOL`;
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-primary p-8">
        <h1 className="text-2xl font-bold text-white mb-8">Metrics Dashboard</h1>
        <div className="text-gray-400">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary p-8">
        <h1 className="text-2xl font-bold text-white mb-8">Metrics Dashboard</h1>
        <div className="text-red-500">{error}</div>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-warning text-black rounded hover:bg-warning/80"
        >
          Retry
        </button>
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div className="min-h-screen bg-primary p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Metrics Dashboard</h1>
          <div className="text-sm text-gray-500">
            Last updated: {data?.generated ? new Date(data.generated).toLocaleTimeString() : '-'}
            <button
              onClick={fetchMetrics}
              className="ml-4 px-3 py-1 bg-white/10 rounded text-white hover:bg-white/20"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
          <div className="flex gap-4 flex-wrap">
            <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2">
              <StatusBadge status={m?.systemStatus || 'unknown'} />
              <span className="text-white">Backend: {m?.systemStatus}</span>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2">
              <StatusBadge status={m?.databaseStatus || 'unknown'} />
              <span className="text-white">Database: {m?.databaseStatus}</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard label="DAU (24h)" value={m?.dau ?? 0} />
          <MetricCard label="Total Users" value={m?.totalUsers ?? 0} />
          <MetricCard label="Matches Today" value={m?.matchesToday ?? 0} />
          <MetricCard label="Active Matches" value={m?.activeMatches ?? 0} />
          <MetricCard label="Volume Today" value={formatVolume(m?.volumeToday ?? 0)} />
          <MetricCard label="Fees Today" value={formatVolume(m?.feesToday ?? 0)} />
          <MetricCard label="Memory Usage" value={`${m?.memoryUsage ?? 0}%`} />
          <MetricCard label="Uptime" value={formatUptime(m?.uptime ?? 0)} />
        </div>

        {/* Connections */}
        <div className="bg-black/40 border border-white/10 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-2">Live Connections</h2>
          <div className="text-3xl font-bold text-warning">{m?.activeConnections ?? 0}</div>
          <div className="text-sm text-gray-400">WebSocket connections</div>
        </div>
      </div>
    </div>
  );
}
