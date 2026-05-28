import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, Wifi, RefreshCw, AlertCircle, TrendingUp, Timer, Zap, ArrowUpRight, Signal } from 'lucide-react';
import { getStats, getPresentEmployees, getHealth, getTodayAttendance, getWeeklySummary } from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [present, setPresent] = useState([]);
  const [health, setHealth] = useState(null);
  const [todayRecords, setTodayRecords] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      setRefreshing(true);
      const [statsRes, presentRes, healthRes, todayRes, weeklyRes] = await Promise.all([
        getStats(), getPresentEmployees(), getHealth(), getTodayAttendance(), getWeeklySummary()
      ]);
      setStats(statsRes.data);
      setPresent(presentRes.data.present);
      setHealth(healthRes.data);
      setTodayRecords(todayRes.data.attendance);
      setWeeklySummary(weeklyRes.data.summary);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Cannot connect to API server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => { fetchData(); };

  if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="relative"><div className="w-16 h-16 rounded-full border-2 border-indigo-500/20"></div><div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div></div></div>);

  if (error) return (<div className="glass rounded-2xl p-12 text-center"><AlertCircle className="h-14 w-14 text-red-400 mx-auto mb-4" /><p className="text-red-300 font-semibold text-lg">{error}</p><p className="text-gray-500 text-sm mt-2">Make sure backend is running: python app.py</p><button onClick={handleRefresh} className="btn-primary mt-6">Retry Connection</button></div>);

  const totalCount = stats?.total_employees || 0;
  const presentCount = stats?.currently_present || 0;
  const absentCount = stats?.absent_today || 0;
  const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const todayHours = todayRecords.reduce((s, r) => s + (r.duration_minutes || 0), 0) / 60;
  const topPerformers = [...weeklySummary].sort((a, b) => b.total_hours - a.total_hours).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-white">Dashboard</h2><p className="text-gray-500 text-sm mt-0.5">Real-time office monitoring</p></div>
        <div className="flex items-center space-x-3">
          {lastUpdated && <span className="text-xs text-gray-500 glass-light px-3 py-1.5 rounded-lg">{lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={handleRefresh} disabled={refreshing} className="btn-primary flex items-center space-x-2 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /><span>{refreshing ? 'Refreshing...' : 'Refresh'}</span></button>
        </div>
      </div>

      {totalCount === 0 && (<div className="glass rounded-2xl p-5 border-amber-500/20"><div className="flex items-center space-x-3"><AlertCircle className="h-5 w-5 text-amber-400" /><p className="text-amber-200 text-sm font-medium">No employees registered. Go to Employees tab to add your team.</p></div></div>)}

      {health && (<div className="glass rounded-2xl p-4"><div className="flex items-center justify-between"><div className="flex items-center space-x-4"><div className="flex items-center space-x-2"><div className={`w-2 h-2 rounded-full ${health.scanner?.last_scan ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div><span className="text-sm font-medium text-gray-300">Scanner</span></div><div className="w-px h-4 bg-white/10"></div><span className="text-xs text-gray-500">Last: {health.scanner?.last_scan ? new Date(health.scanner.last_scan.replace(' ','T')).toLocaleTimeString() : 'Not running'}</span><div className="w-px h-4 bg-white/10"></div><span className="text-xs text-gray-500">{health.scanner?.scans_last_24h || 0} scans (24h)</span></div><div className="flex items-center space-x-2 text-emerald-400"><Signal className="h-4 w-4" /><span className="text-sm font-bold">{rate}%</span></div></div></div>)}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card glass card-glow"><div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-2xl"></div><div className="relative"><div className="flex items-center justify-between mb-4"><div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center"><Users className="h-5 w-5 text-blue-400" /></div><ArrowUpRight className="h-4 w-4 text-gray-600" /></div><p className="text-3xl font-bold text-white">{totalCount}</p><p className="text-xs text-gray-500 mt-1">Total Team</p></div></div>
        <div className="stat-card glass card-glow"><div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-2xl"></div><div className="relative"><div className="flex items-center justify-between mb-4"><div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center"><UserCheck className="h-5 w-5 text-emerald-400" /></div><span className="text-xs font-bold text-emerald-400">{rate}%</span></div><p className="text-3xl font-bold text-white">{presentCount}</p><p className="text-xs text-gray-500 mt-1">In Office</p></div></div>
        <div className="stat-card glass card-glow"><div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-2xl"></div><div className="relative"><div className="flex items-center justify-between mb-4"><div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center"><UserX className="h-5 w-5 text-rose-400" /></div></div><p className="text-3xl font-bold text-white">{absentCount}</p><p className="text-xs text-gray-500 mt-1">Absent</p></div></div>
        <div className="stat-card glass card-glow"><div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-2xl"></div><div className="relative"><div className="flex items-center justify-between mb-4"><div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center"><Timer className="h-5 w-5 text-violet-400" /></div></div><p className="text-3xl font-bold text-white">{todayHours.toFixed(1)}<span className="text-lg text-gray-500 ml-1">h</span></p><p className="text-xs text-gray-500 mt-1">Hours Today</p></div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between"><div className="flex items-center space-x-3"><div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center"><Wifi className="h-4 w-4 text-emerald-400" /></div><h3 className="font-bold text-white">Live Presence</h3></div><span className="badge bg-emerald-500/20 text-emerald-400">{present.length} online</span></div>
          {present.length > 0 ? (<div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto scrollbar-hide">{present.map((emp) => (<div key={emp.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"><div className="flex items-center space-x-4"><div className="relative"><div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center"><span className="text-white font-bold text-sm">{emp.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</span></div><div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#12122b] rounded-full"></div></div><div><p className="font-semibold text-white text-sm">{emp.name}</p><p className="text-xs text-gray-500">{emp.department||'Team'} &bull; {emp.device_name||emp.mac_address}</p></div></div><div className="text-right"><p className="text-sm font-bold text-indigo-400">{emp.duration_display}</p><p className="text-[11px] text-gray-600">Since {new Date(emp.check_in_time.replace(' ','T')).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p></div></div>))}</div>) : (<div className="px-6 py-16 text-center"><div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4"><Wifi className="h-7 w-7 text-gray-600" /></div><p className="text-gray-400 font-medium">No one detected</p><p className="text-xs text-gray-600 mt-1">Devices appear when connected to office Wi-Fi</p></div>)}
        </div>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5"><div className="flex items-center space-x-3"><div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center"><TrendingUp className="h-4 w-4 text-violet-400" /></div><div><h3 className="font-bold text-white text-sm">This Week</h3><p className="text-[11px] text-gray-600">Top performers</p></div></div></div>
          {topPerformers.length > 0 ? (<div className="divide-y divide-white/5">{topPerformers.map((emp,idx) => (<div key={emp.employee_id} className="px-6 py-3.5 flex items-center justify-between"><div className="flex items-center space-x-3"><div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${idx===0?'bg-amber-500/20 text-amber-400':idx===1?'bg-gray-500/20 text-gray-400':idx===2?'bg-orange-500/20 text-orange-400':'bg-white/5 text-gray-600'}`}>{idx+1}</div><div><p className="text-sm font-medium text-gray-200">{emp.name}</p><p className="text-[11px] text-gray-600">{emp.days_present}d present</p></div></div><span className="text-sm font-bold text-violet-400">{emp.total_hours}h</span></div>))}</div>) : (<div className="px-6 py-12 text-center"><Zap className="h-6 w-6 text-gray-700 mx-auto mb-2" /><p className="text-xs text-gray-600">No data yet</p></div>)}
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex items-center space-x-3"><div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center"><Clock className="h-4 w-4 text-indigo-400" /></div><div><h3 className="font-bold text-white text-sm">Today&apos;s Activity</h3><p className="text-[11px] text-gray-600">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p></div></div>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-white/5"><th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Employee</th><th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">In</th><th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Out</th><th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Hours</th></tr></thead><tbody>{todayRecords.map((rec)=>{const isP=rec.check_in_time&&!rec.check_out_time;const isL=rec.check_in_time&&rec.check_out_time;const hrs=rec.duration_minutes?(rec.duration_minutes/60).toFixed(1):null;return(<tr key={rec.employee_id} className="table-row"><td className="px-6 py-3.5"><div className="flex items-center space-x-3"><div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center"><span className="text-indigo-400 font-bold text-[11px]">{rec.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</span></div><span className="text-sm font-medium text-gray-200">{rec.name}</span></div></td><td className="px-6 py-3.5">{isP&&<span className="badge bg-emerald-500/20 text-emerald-400">Working</span>}{isL&&<span className="badge bg-gray-500/20 text-gray-400">Left</span>}{!rec.check_in_time&&<span className="badge bg-rose-500/20 text-rose-400">Absent</span>}</td><td className="px-6 py-3.5 text-sm text-gray-400">{rec.check_in_time?new Date(rec.check_in_time.replace(' ','T')).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—'}</td><td className="px-6 py-3.5 text-sm text-gray-400">{rec.check_out_time?new Date(rec.check_out_time.replace(' ','T')).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—'}</td><td className="px-6 py-3.5">{hrs?<span className="text-sm font-bold text-indigo-400">{hrs}h</span>:isP?<span className="text-xs text-emerald-400 font-medium">Active</span>:<span className="text-gray-600">—</span>}</td></tr>);})}</tbody></table></div>
        {todayRecords.length===0&&<div className="px-6 py-12 text-center"><Clock className="h-8 w-8 text-gray-700 mx-auto mb-2"/><p className="text-gray-500 text-sm">No activity today</p></div>}
      </div>
    </div>
  );
}

export default Dashboard;
