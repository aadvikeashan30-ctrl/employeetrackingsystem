import { useState, useEffect } from 'react';
import { BarChart3, Calendar, TrendingUp, Clock, Users, Award } from 'lucide-react';
import { getWeeklySummary, getMonthlySummary } from '../api';

function Reports() {
  const [view, setView] = useState('weekly');
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = view === 'weekly'
        ? await getWeeklySummary()
        : await getMonthlySummary(selectedYear, selectedMonth);
      setData(res.data.summary);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [view, selectedYear, selectedMonth]);

  const maxHours = Math.max(...data.map(d => d.total_hours), 1);
  const totalHours = data.reduce((s, d) => s + d.total_hours, 0);
  const avgDays = data.length > 0 ? (data.reduce((s, d) => s + d.days_present, 0) / data.length).toFixed(1) : '0';
  const avgHours = data.length > 0 ? (totalHours / data.length).toFixed(1) : '0';


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-500 mt-1">Working hours breakdown and productivity insights</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setView('weekly')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${view === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            This Week
          </button>
          <button onClick={() => setView('monthly')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${view === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            Monthly
          </button>
        </div>
        {view === 'monthly' && (
          <div className="flex items-center space-x-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 text-white">
          <TrendingUp className="h-6 w-6 mb-2 opacity-80" />
          <p className="text-3xl font-bold">{totalHours.toFixed(1)}h</p>
          <p className="text-xs opacity-80 mt-1">Total Hours</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white">
          <Calendar className="h-6 w-6 mb-2 opacity-80" />
          <p className="text-3xl font-bold">{avgDays}</p>
          <p className="text-xs opacity-80 mt-1">Avg Days Present</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl p-5 text-white">
          <Clock className="h-6 w-6 mb-2 opacity-80" />
          <p className="text-3xl font-bold">{avgHours}h</p>
          <p className="text-xs opacity-80 mt-1">Avg Hours/Person</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl p-5 text-white">
          <Users className="h-6 w-6 mb-2 opacity-80" />
          <p className="text-3xl font-bold">{data.length}</p>
          <p className="text-xs opacity-80 mt-1">Team Members</p>
        </div>
      </div>


      {/* Bar Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="font-bold text-gray-900">Hours by Employee</h3>
        </div>

        {data.length > 0 ? (
          <div className="space-y-3">
            {data.map((emp, idx) => (
              <div key={emp.employee_id} className="flex items-center space-x-4">
                <div className="w-28 text-sm font-medium text-gray-700 truncate flex-shrink-0">
                  {emp.name}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ${
                      idx === 0 ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' :
                      idx === 1 ? 'bg-gradient-to-r from-violet-500 to-violet-600' :
                      idx === 2 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                      'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}
                    style={{ width: `${Math.max((emp.total_hours / maxHours) * 100, 5)}%` }}
                  >
                    <span className="text-xs font-bold text-white">{emp.total_hours}h</span>
                  </div>
                </div>
                <div className="w-16 text-right text-xs text-gray-500 flex-shrink-0">
                  {emp.days_present}d
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No data for this period</p>
          </div>
        )}
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center space-x-3">
          <Award className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-gray-900">Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Days</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Total Hours</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Avg/Day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((emp, idx) => (
                <tr key={emp.employee_id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-gray-200 text-gray-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-50 text-gray-400'
                    }`}>{idx + 1}</span>
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-gray-900 text-sm">{emp.name}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{emp.department || '—'}</td>
                  <td className="px-6 py-3.5 text-center font-bold text-gray-700">{emp.days_present}</td>
                  <td className="px-6 py-3.5 text-center font-bold text-indigo-600">{emp.total_hours}h</td>
                  <td className="px-6 py-3.5 text-center text-sm text-gray-600">{emp.avg_hours_per_day}h</td>
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
