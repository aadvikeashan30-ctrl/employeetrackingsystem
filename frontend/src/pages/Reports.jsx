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
      const res = view === 'weekly' ? await getWeeklySummary() : await getMonthlySummary(selectedYear, selectedMonth);
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-16 h-16 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Reports</h2>
          <p className="text-gray-500 text-sm mt-0.5">Hours and analytics</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-white/5 rounded-xl p-1">
          <button onClick={() => setView('weekly')} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${view === 'weekly' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:text-white'}`}>Week</button>
          <button onClick={() => setView('monthly')} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${view === 'monthly' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:text-white'}`}>Month</button>
        </div>
        {view === 'monthly' && (
          <div className="flex items-center space-x-2">
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {months.map((m, i) => <option key={i} value={i + 1} className="bg-[#1a1a3e]">{m}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#1a1a3e]">{y}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card glass"><TrendingUp className="h-5 w-5 text-indigo-400 mb-3" /><p className="text-2xl font-bold text-white">{totalHours.toFixed(1)}<span className="text-sm text-gray-500 ml-1">h</span></p><p className="text-[11px] text-gray-500 mt-1">Total Hours</p></div>
        <div className="stat-card glass"><Calendar className="h-5 w-5 text-emerald-400 mb-3" /><p className="text-2xl font-bold text-white">{avgDays}</p><p className="text-[11px] text-gray-500 mt-1">Avg Days</p></div>
        <div className="stat-card glass"><Clock className="h-5 w-5 text-violet-400 mb-3" /><p className="text-2xl font-bold text-white">{avgHours}<span className="text-sm text-gray-500 ml-1">h</span></p><p className="text-[11px] text-gray-500 mt-1">Avg/Person</p></div>
        <div className="stat-card glass"><Users className="h-5 w-5 text-amber-400 mb-3" /><p className="text-2xl font-bold text-white">{data.length}</p><p className="text-[11px] text-gray-500 mt-1">Team</p></div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BarChart3 className="h-5 w-5 text-indigo-400" />
          <h3 className="font-bold text-white text-sm">Hours by Employee</h3>
        </div>
        {data.length > 0 ? (
          <div className="space-y-3">
            {data.map((emp, idx) => (
              <div key={emp.employee_id} className="flex items-center space-x-4">
                <div className="w-24 text-xs font-medium text-gray-400 truncate flex-shrink-0">{emp.name}</div>
                <div className="flex-1 bg-white/5 rounded-full h-7 overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ${idx === 0 ? 'bg-gradient-to-r from-indigo-600 to-violet-600' : idx === 1 ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : idx === 2 ? 'bg-gradient-to-r from-amber-600 to-orange-600' : 'bg-gradient-to-r from-gray-600 to-gray-700'}`}
                    style={{ width: `${Math.max((emp.total_hours / maxHours) * 100, 5)}%` }}
                  >
                    <span className="text-[11px] font-bold text-white">{emp.total_hours}h</span>
                  </div>
                </div>
                <span className="text-xs text-gray-600 w-10 text-right">{emp.days_present}d</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <BarChart3 className="h-8 w-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No data for this period</p>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center space-x-3">
          <Award className="h-4 w-4 text-amber-400" />
          <h3 className="font-bold text-white text-sm">Rankings</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">#</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Dept</th>
              <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase">Days</th>
              <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase">Avg</th>
            </tr>
          </thead>
          <tbody>
            {data.map((emp, idx) => (
              <tr key={emp.employee_id} className="table-row">
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold ${idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-gray-500/20 text-gray-400' : idx === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-600'}`}>{idx + 1}</span>
                </td>
                <td className="px-6 py-3 text-sm font-semibold text-white">{emp.name}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{emp.department || '—'}</td>
                <td className="px-6 py-3 text-center text-sm font-bold text-gray-300">{emp.days_present}</td>
                <td className="px-6 py-3 text-center text-sm font-bold text-indigo-400">{emp.total_hours}h</td>
                <td className="px-6 py-3 text-center text-sm text-gray-500">{emp.avg_hours_per_day}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;
