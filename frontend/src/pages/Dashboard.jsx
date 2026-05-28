import { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, UserX, Clock, Wifi, RefreshCw, AlertCircle, Activity, TrendingUp, Timer } from 'lucide-react';
import { getStats, getPresentEmployees, getHealth, getTodayAttendance, getWeeklySummary } from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [present, setPresent] = useState([]);
  const [health, setHealth] = useState(null);
  const [todayRecords, setTodayRecords] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, presentRes, healthRes, todayRes, weeklyRes] = await Promise.all([
        getStats(),
        getPresentEmployees(),
        getHealth(),
        getTodayAttendance(),
        getWeeklySummary()
      ]);
      setStats(statsRes.data);
      setPresent(presentRes.data.present);
      setHealth(healthRes.data);
      setTodayRecords(todayRes.data.attendance);
      setWeeklySummary(weeklyRes.data.summary);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Cannot connect to server. Is the API running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-700 font-semibold text-lg">{error}</p>
        <button onClick={fetchData} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Retry</button>
      </div>
    );
  }

  const presentCount = stats?.currently_present || 0;
  const totalCount = stats?.total_employees || 0;
  const absentCount = stats?.absent_today || 0;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Calculate today's total hours
  const todayTotalHours = todayRecords.reduce((sum, r) => sum + (r.duration_minutes || 0), 0) / 60;

  // Top performers this week
  const topPerformers = [...weeklySummary].sort((a, b) => b.total_hours - a.total_hours).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Live Dashboard</h2>
          <p className="text-gray-500 mt-1">Real-time office monitoring & analytics</p>
        </div>
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* No employees warning */}
      {totalCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">No employees registered</p>
              <p className="text-sm text-amber-700 mt-1">
                Go to <strong>Employees</strong> tab → Register your team with their MAC addresses → Start the scanner.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Status Bar */}
      {health && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full ${health.scanner?.last_scan ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="font-medium text-sm">Scanner {health.scanner?.last_scan ? 'Active' : 'Offline'}</span>
              </div>
              <span className="text-slate-400">|</span>
              <span className="text-sm text-slate-300">
                Last: {health.scanner?.last_scan ? new Date(health.scanner.last_scan.replace(' ', 'T')).toLocaleTimeString() : 'Never'}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-sm text-slate-300">
                {health.scanner?.scans_last_24h || 0} scans today
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">{attendanceRate}% attendance</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Team"
          value={totalCount}
          subtitle="Registered employees"
          icon={<Users className="h-6 w-6" />}
          gradient="from-blue-500 to-blue-600"
          bgLight="bg-blue-50"
        />
        <StatCard
          title="In Office Now"
          value={presentCount}
          subtitle={`${attendanceRate}% of team`}
          icon={<UserCheck className="h-6 w-6" />}
          gradient="from-emerald-500 to-emerald-600"
          bgLight="bg-emerald-50"
        />
        <StatCard
          title="Absent / Away"
          value={absentCount}
          subtitle="Not detected"
          icon={<UserX className="h-6 w-6" />}
          gradient="from-rose-500 to-rose-600"
          bgLight="bg-rose-50"
        />
        <StatCard
          title="Hours Today"
          value={todayTotalHours.toFixed(1)}
          subtitle="Total logged"
          icon={<Timer className="h-6 w-6" />}
          gradient="from-violet-500 to-violet-600"
          bgLight="bg-violet-50"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Currently Present - Large Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Wifi className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Live Presence</h3>
                <p className="text-xs text-gray-500">Auto-updates every 15 seconds</p>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {present.length} ONLINE
            </span>
          </div>

          {present.length > 0 ? (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {present.map((emp) => (
                <div key={emp.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-11 h-11 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-sm">
                          {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-500">
                        {emp.department || 'Team Member'} &bull; {emp.device_name || emp.mac_address}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600">{emp.duration_display}</p>
                    <p className="text-xs text-gray-400">
                      Since {new Date(emp.check_in_time.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserX className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No one detected in office</p>
              <p className="text-sm text-gray-400 mt-1">Devices will appear when connected to office Wi-Fi</p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Weekly Top Performers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">This Week</h3>
                <p className="text-xs text-gray-500">Top hours logged</p>
              </div>
            </div>
          </div>

          {topPerformers.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {topPerformers.map((emp, idx) => (
                <div key={emp.employee_id} className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-400">{emp.days_present}d present</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-violet-600">{emp.total_hours}h</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No data yet this week</p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Activity Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Today's Activity</h3>
              <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Arrived</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Left</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {todayRecords.map((rec) => {
                const isPresent = rec.check_in_time && !rec.check_out_time;
                const isLeft = rec.check_in_time && rec.check_out_time;
                const hours = rec.duration_minutes ? (rec.duration_minutes / 60).toFixed(1) : null;

                return (
                  <tr key={rec.employee_id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-bold text-xs">
                            {rec.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{rec.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {isPresent && <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">Working</span>}
                      {isLeft && <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">Left</span>}
                      {!rec.check_in_time && <span className="px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-600 rounded-full">Absent</span>}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">
                      {rec.check_in_time ? new Date(rec.check_in_time.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">
                      {rec.check_out_time ? new Date(rec.check_out_time.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      {hours ? (
                        <span className="text-sm font-semibold text-indigo-600">{hours}h</span>
                      ) : isPresent ? (
                        <span className="text-xs text-emerald-600 font-medium">Active</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, gradient, bgLight }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${bgLight}`}>
          <div className={`bg-gradient-to-br ${gradient} p-2 rounded-lg text-white`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
