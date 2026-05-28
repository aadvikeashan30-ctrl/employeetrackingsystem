import { useState, useEffect } from 'react';
import { BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { getWeeklySummary, getMonthlySummary } from '../api';

function Reports() {
  const [view, setView] = useState('weekly');
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchWeekly = async () => {
    try {
      setLoading(true);
      const res = await getWeeklySummary();
      setWeeklySummary(res.data.summary);
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthly = async () => {
    try {
      setLoading(true);
      const res = await getMonthlySummary(selectedYear, selectedMonth);
      setMonthlySummary(res.data.summary);
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'weekly') {
      fetchWeekly();
    } else {
      fetchMonthly();
    }
  }, [view, selectedYear, selectedMonth]);

  const data = view === 'weekly' ? weeklySummary : monthlySummary;

  // Find max hours for bar chart scaling
  const maxHours = Math.max(...data.map(d => d.total_hours), 1);

  if (loading) {
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
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Working hours summary and attendance analytics</p>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('weekly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setView('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Month/Year selector for monthly view */}
          {view === 'monthly' && (
            <div className="flex items-center space-x-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {months.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Total Hours</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data.reduce((sum, d) => sum + d.total_hours, 0).toFixed(1)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Avg Days Present</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data.length > 0
              ? (data.reduce((sum, d) => sum + d.days_present, 0) / data.length).toFixed(1)
              : '0'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Avg Hours/Employee</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data.length > 0
              ? (data.reduce((sum, d) => sum + d.total_hours, 0) / data.length).toFixed(1)
              : '0'}
          </p>
        </div>
      </div>

      {/* Bar Chart (Simple CSS-based) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Working Hours by Employee</h3>
        
        {data.length > 0 ? (
          <div className="space-y-4">
            {data.map((emp) => (
              <div key={emp.employee_id} className="flex items-center space-x-4">
                <div className="w-32 text-sm font-medium text-gray-700 truncate flex-shrink-0">
                  {emp.name}
                </div>
                <div className="flex-1 flex items-center space-x-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((emp.total_hours / maxHours) * 100, 2)}%` }}
                    >
                      {emp.total_hours > 0 && (
                        <span className="text-xs font-medium text-white">
                          {emp.total_hours}h
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-20 text-right flex-shrink-0">
                    <span className="text-sm text-gray-600">{emp.days_present}d</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No data available for this period</p>
          </div>
        )}
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days Present</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Hours/Day</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emp.department || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-medium text-gray-900">{emp.days_present}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-semibold text-blue-600">{emp.total_hours}h</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                    {emp.avg_hours_per_day}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Reports;
