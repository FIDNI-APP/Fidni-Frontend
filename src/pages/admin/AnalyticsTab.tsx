import React, { useState, useEffect } from 'react';
import { Users, Eye, Clock, TrendingDown, Monitor, Chrome, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api/apiClient';

interface AnalyticsStats {
  active_users: number;
  total_sessions: number;
  total_page_views: number;
  avg_session_duration: number;
  bounce_rate: number;
  top_pages: Array<{ path: string; count: number }>;
  top_interactions: Array<{ element_id: string; interaction_type: string; count: number }>;
  device_breakdown: Record<string, number>;
  browser_breakdown: Record<string, number>;
  hourly_traffic: Array<{ hour: string; count: number }>;
}

export const AnalyticsTab: React.FC = () => {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/logs/analytics/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading analytics...</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Users (24h)</p>
              <p className="text-2xl font-bold text-slate-900">{stats.active_users}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Sessions (7d)</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_sessions}</p>
            </div>
            <BarChart3 className="w-10 h-10 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Page Views (7d)</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_page_views}</p>
            </div>
            <Eye className="w-10 h-10 text-violet-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Avg Session (mins)</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(stats.avg_session_duration / 60)}
              </p>
            </div>
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Top Pages (7d)</h3>
          <div className="space-y-3">
            {stats.top_pages.slice(0, 8).map((page, idx) => {
              const maxCount = stats.top_pages[0]?.count || 1;
              const percentage = (page.count / maxCount) * 100;

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 truncate max-w-xs">{page.path}</span>
                    <span className="text-slate-600 font-semibold">{page.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device & Browser Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Devices & Browsers (7d)</h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Devices</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(stats.device_breakdown).map(([device, count]) => (
                  <div key={device} className="bg-slate-50 rounded-lg p-3 text-center">
                    <Monitor className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                    <p className="text-xs text-slate-600 capitalize">{device || 'Unknown'}</p>
                    <p className="text-lg font-bold text-slate-900">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Browsers</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(stats.browser_breakdown).map(([browser, count]) => (
                  <div key={browser} className="bg-slate-50 rounded-lg p-3 text-center">
                    <Chrome className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                    <p className="text-xs text-slate-600 capitalize">{browser || 'Unknown'}</p>
                    <p className="text-lg font-bold text-slate-900">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Chart & Top Interactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Traffic */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Traffic (Last 24h)</h3>
          <div className="flex items-end justify-between h-48 gap-1">
            {stats.hourly_traffic.map((hour, idx) => {
              const maxCount = Math.max(...stats.hourly_traffic.map(h => h.count));
              const height = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center h-full">
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${hour.hour}: ${hour.count} views`}
                    />
                  </div>
                  {idx % 4 === 0 && (
                    <span className="text-xs text-slate-500 mt-1">{hour.hour}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Interactions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Top Interactions (7d)</h3>
          <div className="space-y-2">
            {stats.top_interactions.slice(0, 10).map((interaction, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 truncate max-w-xs">
                      {interaction.element_id || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-500">{interaction.interaction_type}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-600">{interaction.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.bounce_rate.toFixed(1)}%</p>
            <p className="text-sm text-slate-600 mt-1">Bounce Rate</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {(stats.total_page_views / Math.max(stats.total_sessions, 1)).toFixed(1)}
            </p>
            <p className="text-sm text-slate-600 mt-1">Pages per Session</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {(stats.avg_session_duration / 60).toFixed(1)}m
            </p>
            <p className="text-sm text-slate-600 mt-1">Avg Session Duration</p>
          </div>
        </div>
      </div>
    </div>
  );
};
