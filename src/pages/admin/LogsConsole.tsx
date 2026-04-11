import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  TrendingUp,
  Filter,
  Search,
  RefreshCw,
  XCircle,
  Eye,
  AlertOctagon,
  BarChart3
} from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { AnalyticsTab } from './AnalyticsTab';

interface ErrorLog {
  id: number;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  message: string;
  exception_type: string;
  traceback: string;
  endpoint: string;
  method: string;
  user_email: string | null;
  ip_address: string;
  count: number;
  first_seen: string;
  last_seen: string;
  request_data: any;
}

interface ErrorStats {
  total_errors: number;
  new_errors: number;
  critical_errors: number;
  errors_today: number;
  errors_by_severity: Record<string, number>;
  errors_by_endpoint: Array<{ endpoint: string; count: number }>;
  recent_errors: ErrorLog[];
}

const getSeverityConfig = (severity: string) => {
  switch (severity) {
    case 'critical':
      return { icon: AlertOctagon, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    case 'error':
      return { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    case 'warning':
      return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    case 'info':
      return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    default:
      return { icon: Info, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'new':
      return { color: 'text-red-700', bg: 'bg-red-100' };
    case 'investigating':
      return { color: 'text-amber-700', bg: 'bg-amber-100' };
    case 'resolved':
      return { color: 'text-emerald-700', bg: 'bg-emerald-100' };
    case 'ignored':
      return { color: 'text-slate-700', bg: 'bg-slate-100' };
    default:
      return { color: 'text-slate-700', bg: 'bg-slate-100' };
  }
};

export const LogsConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'errors' | 'analytics'>('analytics');
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStats = async () => {
    try {
      const response = await api.get('/logs/errors/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchErrors = async () => {
    try {
      setLoading(true);
      let url = '/logs/errors/';
      const params = new URLSearchParams();

      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get(url);
      setErrors(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveError = async (errorId: number, notes?: string) => {
    try {
      await api.post(`/logs/errors/${errorId}/resolve/`, { notes });
      fetchErrors();
      fetchStats();
      setSelectedError(null);
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  };

  const ignoreError = async (errorId: number) => {
    try {
      await api.post(`/logs/errors/${errorId}/ignore/`);
      fetchErrors();
      fetchStats();
      setSelectedError(null);
    } catch (error) {
      console.error('Failed to ignore error:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchErrors();
  }, [filterSeverity, filterStatus, searchTerm]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Logs Console</h1>
        <p className="text-slate-600">Monitor errors, analytics, and system events</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'errors'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Errors
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' ? (
        <AnalyticsTab />
      ) : (
        <>
          {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Errors</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total_errors}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-slate-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-red-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">New Errors</p>
                <p className="text-2xl font-bold text-red-600">{stats.new_errors}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-orange-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Critical</p>
                <p className="text-2xl font-bold text-orange-600">{stats.critical_errors}</p>
              </div>
              <AlertOctagon className="w-10 h-10 text-orange-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-blue-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Today</p>
                <p className="text-2xl font-bold text-blue-600">{stats.errors_today}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>

          <div className="flex-1 flex items-center gap-2 max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search errors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <button
            onClick={() => { fetchErrors(); fetchStats(); }}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Count</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Seen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {errors.map((error) => {
                const severityConfig = getSeverityConfig(error.severity);
                const statusConfig = getStatusConfig(error.status);
                const SeverityIcon = severityConfig.icon;

                return (
                  <tr key={error.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${severityConfig.bg}`}>
                        <SeverityIcon className={`w-3.5 h-3.5 ${severityConfig.color}`} />
                        <span className={`text-xs font-semibold ${severityConfig.color}`}>
                          {error.severity.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                        {error.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900 font-medium truncate max-w-md">{error.message}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{error.exception_type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-600">{error.method} {error.endpoint}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900">{error.count}x</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600">
                        {new Date(error.last_seen).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedError(error)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedError.exception_type}</h2>
                  <p className="text-slate-600">{selectedError.message}</p>
                </div>
                <button
                  onClick={() => setSelectedError(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Endpoint:</span>
                    <span className="ml-2 font-mono">{selectedError.method} {selectedError.endpoint}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Count:</span>
                    <span className="ml-2 font-semibold">{selectedError.count}x</span>
                  </div>
                  <div>
                    <span className="text-slate-600">User:</span>
                    <span className="ml-2">{selectedError.user_email || 'Anonymous'}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">IP:</span>
                    <span className="ml-2 font-mono">{selectedError.ip_address}</span>
                  </div>
                </div>
              </div>

              {selectedError.traceback && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Traceback</h3>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {selectedError.traceback}
                  </pre>
                </div>
              )}

              {selectedError.request_data && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Request Data</h3>
                  <pre className="bg-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedError.request_data, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => resolveError(selectedError.id)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Mark Resolved
                </button>
                <button
                  onClick={() => ignoreError(selectedError.id)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700"
                >
                  Ignore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
