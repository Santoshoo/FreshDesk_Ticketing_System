import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import dashboardApi from '../services/dashboardApi.js';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/index.jsx';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [sumRes, trendRes] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getTrend(null, 14),
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (trendRes.success) setTrend(trendRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Service Desk Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational metrics calculated dynamically from the MySQL database.
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-2xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Summary Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Total Logged Tickets</span>
                  <span className="font-bold text-slate-900">{summary.total}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Open Tickets</span>
                  <span className="font-bold text-emerald-600">{summary.open}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Pending Resolution</span>
                  <span className="font-bold text-amber-600">{summary.pending}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Resolved Tickets</span>
                  <span className="font-bold text-blue-600">{summary.resolved}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600">Closed Tickets</span>
                  <span className="font-bold text-rose-600">{summary.closed}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Loading metrics...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            <div className="text-3xl font-extrabold text-blue-600">
              {summary && summary.total > 0
                ? `${Math.round(((summary.resolved + summary.closed) / summary.total) * 100)}%`
                : '0%'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Resolved or Closed vs Total</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
