import { useState, useEffect } from 'react';
import { BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { getWeeklySummary, getMonthlySummary } from '../api';

function Reports() {
  const [view, setView] = useState('weekly');
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];


  const fetchData = async () => {
    try {
      setLoading(true);
      const res = view === 'weekly'
        ? await getWeeklySummary()
        : await getMonthlySummary(selectedYear, selectedMonth);
      setData(res.data.summary);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [view, selectedYear, selectedMonth]);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Working hours breakdown</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('weekly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
            This Week
          </button>
          <button onClick={() => setView('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
            Monthly
          </button>
        </div>
        {view === 'monthly' && (
          <div className="flex items-center space-x-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>


      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Total Hours</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data.reduce((s, d) => s + d.total_hours, 0).toFixed(1)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Avg Days Present</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data.length > 0 ? (data.reduce((s, d) => s + d.days_present, 0) / data.length).toFixed(1) : '0'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Avg Hours/Employee</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {data.length > 0 ? (data.reduce((s, d) => s + d.total_hours, 0) / data.length).toFixed(1) : '0'}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Hours by Employee</h3>
        {data.length > 0 ? (
          <div className="space-y-4">
            {data.map((emp) => (
              <div key={emp.employee_id} className="flex items-center space-x-4">
                <div className="w-32 text-sm font-medium text-gray-700 truncate flex-shrink-0">{emp.name}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.max((emp.total_hours / maxHours) * 100, 3)}%` }}>
                    {emp.total_hours > 0 && <span className="text-xs font-medium text-white">{emp.total_hours}h</span>}
                  </div>
                </div>
                <div className="w-16 text-right text-sm text-gray-600">{emp.days_present}d</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No data for this period</p>
          </div>
        )}
      </div>


      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Days Present</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg/Day</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                  <td className="px-6 py-4 text-center font-medium">{emp.days_present}</td>
                  <td className="px-6 py-4 text-center font-semibold text-blue-600">{emp.total_hours}h</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">{emp.avg_hours_per_day}h</td>
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
