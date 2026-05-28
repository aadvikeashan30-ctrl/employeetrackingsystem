import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, Wifi, RefreshCw } from 'lucide-react';
import { getStats, getPresentEmployees } from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [present, setPresent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, presentRes] = await Promise.all([
        getStats(),
        getPresentEmployees()
      ]);
      setStats(statsRes.data);
      setPresent(presentRes.data.present);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time office presence overview
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={stats?.total_employees || 0}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Currently Present"
          value={stats?.currently_present || 0}
          icon={<UserCheck className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Absent Today"
          value={stats?.absent_today || 0}
          icon={<UserX className="h-6 w-6" />}
          color="red"
        />
        <StatCard
          title="Avg Hours/Week"
          value={stats?.avg_hours_per_employee || 0}
          suffix="hrs"
          icon={<Clock className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Currently Present */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">Currently in Office</h3>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {present.length} online
            </span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {present.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {present.map((emp) => (
              <div key={emp.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-sm text-gray-500">{emp.department} • {emp.device_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{emp.duration_display}</p>
                  <p className="text-xs text-gray-500">
                    Since {new Date(emp.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <UserX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No employees currently in office</p>
            <p className="text-sm text-gray-400 mt-1">Employees will appear here when their devices connect to the office Wi-Fi</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, suffix, icon, color }) {
  const colorClasses = {
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
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
