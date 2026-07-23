import { useState } from "react";
import { Users, Building2, FileText, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <p className={`text-xs mt-2 flex items-center gap-1 ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
            <TrendingUp size={12} className={trend < 0 ? "rotate-180" : ""} />
            {Math.abs(trend)}% from last month
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const OverviewSection = ({ stats, recentActivity, loading, complaints = [] }) => {
  const [chartTimeRange, setChartTimeRange] = useState("all");

  // Filter complaints by time range for chart
  const getFilteredStats = () => {
    const now = new Date();
    let filteredComplaints = complaints;
    
    if (chartTimeRange !== "all") {
      const ranges = {
        "1d": 1,
        "7d": 7,
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365,
      };
      const daysAgo = ranges[chartTimeRange] || 365;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      filteredComplaints = complaints.filter(
        (c) => new Date(c.created_at) >= cutoffDate
      );
    }
    
    return {
      submitted: filteredComplaints.filter((c) => c.status === "submitted").length,
      verified: filteredComplaints.filter((c) => c.status === "verified").length,
      inProgress: filteredComplaints.filter((c) => c.status === "in_progress").length,
      backlog: filteredComplaints.filter((c) => c.status === "backlog").length,
      resolved: filteredComplaints.filter((c) => c.status === "resolved").length,
      closed: filteredComplaints.filter((c) => c.status === "closed").length,
      disputed: filteredComplaints.filter((c) => c.status === "disputed").length,
      rejected: filteredComplaints.filter((c) => c.status === "rejected").length,
      total: filteredComplaints.length,
    };
  };

  const filteredStats = getFilteredStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Monitor system activity and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers || 0}
          icon={Users}
          color="bg-blue-500"
          trend={5}
        />
        <StatCard
          title="Departments"
          value={stats.totalDepartments || 0}
          icon={Building2}
          color="bg-green-500"
        />
        <StatCard
          title="Total Feedback"
          value={stats.totalComplaints || 0}
          icon={FileText}
          color="bg-maroon-700"
          trend={12}
        />
        <StatCard
          title="Pending Issues"
          value={stats.pendingComplaints || 0}
          icon={AlertTriangle}
          color="bg-amber-500"
        />
      </div>

      {/* Complaints Trend Area Chart */}
      {complaints.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Feedback</h2>
              <p className="text-sm text-gray-500">Showing feedback statistics by status</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { value: "1d", label: "1D" },
                { value: "7d", label: "7D" },
                { value: "1m", label: "1M" },
                { value: "3m", label: "3M" },
                { value: "6m", label: "6M" },
                { value: "1y", label: "1Y" },
                { value: "all", label: "All" },
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setChartTimeRange(range.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    chartTimeRange === range.value
                      ? "bg-maroon-800 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { name: "Submitted", count: filteredStats.submitted, fill: "#3B82F6" },
                    { name: "Verified", count: filteredStats.verified, fill: "#D4AF37" },
                    { name: "In Progress", count: filteredStats.inProgress, fill: "#F97316" },
                    { name: "Backlog", count: filteredStats.backlog, fill: "#8B5CF6" },
                    { name: "Resolved", count: filteredStats.resolved, fill: "#22C55E" },
                    { name: "Closed", count: filteredStats.closed, fill: "#6B7280" },
                    { name: "Disputed", count: filteredStats.disputed, fill: "#F59E0B" },
                    { name: "Rejected", count: filteredStats.rejected, fill: "#EF4444" },
                  ]}
                  margin={{ left: -20, right: 12, top: 10, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickCount={5}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ 
                      borderRadius: "8px", 
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}
                    formatter={(value, name) => [value, "Count"]}
                  />
                  <Area
                    dataKey="count"
                    type="monotone"
                    fill="#7C2D2D"
                    fillOpacity={0.4}
                    stroke="#7C2D2D"
                    strokeWidth={2}
                    name="Feedback"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="px-6 pb-6 pt-2 border-t border-gray-100">
            <div className="flex w-full items-start gap-2 text-sm">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 leading-none font-medium text-gray-900">
                  Total: {filteredStats.total}{" "}
                  {filteredStats.total === 1 ? "feedback item" : "feedback items"}{" "}
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-gray-500 flex flex-wrap items-center gap-2 leading-none text-xs">
                  <span className="text-blue-600">{filteredStats.submitted} submitted</span> •
                  <span className="text-yellow-600">{filteredStats.verified} verified</span> •
                  <span className="text-orange-600">{filteredStats.inProgress} in progress</span> •
                  <span className="text-purple-600">{filteredStats.backlog} backlog</span> •
                  <span className="text-green-600">{filteredStats.resolved} resolved</span> •
                  <span className="text-gray-600">{filteredStats.closed} closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.action || "System activity"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activity.details || "No details available"}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {activity.created_at
                    ? new Date(activity.created_at).toLocaleDateString()
                    : "Unknown"}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              <Clock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
