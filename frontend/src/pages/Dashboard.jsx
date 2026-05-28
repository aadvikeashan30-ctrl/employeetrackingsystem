import { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, UserX, Clock, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { getStats, getPresentEmployees, getHealth } from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [present, setPresent] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, presentRes, healthRes] = await Promise.all([
        getStats(),
        getPresentEmployees(),
        getHealth()
      ]);
      setStats(statsRes.data);
      setPresent(presentRes.data.present);
      setHealth(healthRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Cannot connect to server. Make sure the API is running (python app.py)');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15s for live feel
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time office presence</p>
        </div>
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* No employees warning */}
      {stats && stats.total_employees === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">No employees registered yet</p>
              <p className="text-sm text-yellow-700 mt-1">
                Go to the <strong>Employees</strong> tab and register your team members with their laptop MAC addresses.
                The system will then automatically track their presence via Wi-Fi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={stats?.total_employees || 0}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Currently In Office"
          value={stats?.currently_present || 0}
          icon={<UserCheck className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Absent / Not Detected"
          value={stats?.absent_today || 0}
          icon={<UserX className="h-6 w-6" />}
          color="red"
        />
        <StatCard
          title="Avg Hours This Week"
          value={stats?.avg_hours_per_employee || 0}
          suffix="hrs"
          icon={<Clock className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Scanner Status */}
      {health && health.scanner && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${health.scanner.last_scan ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="font-medium text-gray-700">Scanner</span>
            </div>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">
              Last scan: {health.scanner.last_scan || 'Not running yet'}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">
              Scans (24h): {health.scanner.scans_last_24h}
            </span>
          </div>
        </div>
      )}

      {/* Currently Present */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">Currently In Office</h3>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {present.length} connected
            </span>
          </div>
        </div>

        {present.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {present.map((emp) => (
              <div key={emp.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-sm text-gray-500">
                      {emp.department || 'No department'} &bull; {emp.device_name || emp.mac_address}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{emp.duration_display}</p>
                  <p className="text-xs text-gray-500">
                    Since {new Date(emp.check_in_time.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <UserX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No employees currently detected</p>
            <p className="text-sm text-gray-400 mt-1">
              {stats?.total_employees === 0
                ? 'Register employees first, then start the scanner'
                : 'Employees will appear when their devices connect to office Wi-Fi'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, suffix, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {value}{suffix && <span className="text-lg font-normal text-gray-500 ml-1">{suffix}</span>}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
