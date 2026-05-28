import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Calendar, UserCheck, UserX, Timer } from 'lucide-react';
import { getTodayAttendance, getAttendanceByDate, clockIn, clockOut } from '../api';

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionLoading, setActionLoading] = useState(null);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const fetchAttendance = async () => {
    try { setLoading(true); const res = isToday ? await getTodayAttendance() : await getAttendanceByDate(selectedDate); setAttendance(res.data.attendance); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAttendance(); }, [selectedDate]);

  const handleClockIn = async (id) => { setActionLoading(id); try { await clockIn(id); fetchAttendance(); } finally { setActionLoading(null); } };
  const handleClockOut = async (id) => { setActionLoading(id); try { await clockOut(id); fetchAttendance(); } finally { setActionLoading(null); } };

  const getStatus = (r) => !r.check_in_time ? 'absent' : !r.check_out_time ? 'present' : 'left';
  const formatTime = (t) => t ? new Date(t.replace(' ','T')).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—';
  const formatDur = (m) => m ? `${Math.floor(m/60)}h ${Math.round(m%60)}m` : '—';

  const presentCount = attendance.filter(a => getStatus(a)==='present').length;
  const leftCount = attendance.filter(a => getStatus(a)==='left').length;
  const absentCount = attendance.filter(a => getStatus(a)==='absent').length;
  const totalHrs = attendance.reduce((s,a) => s + (a.duration_minutes||0), 0) / 60;

  if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="w-16 h-16 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div></div>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Attendance</h2>
          <p className="text-gray-500 text-sm mt-0.5">{isToday ? 'Live status' : new Date(selectedDate+'T00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
        </div>
        <div className="glass-light rounded-xl px-4 py-2 flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="bg-transparent text-sm text-white border-none focus:outline-none" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 text-center"><UserCheck className="h-5 w-5 text-emerald-400 mx-auto mb-2" /><p className="text-2xl font-bold text-white">{presentCount}</p><p className="text-[11px] text-gray-500 mt-1">In Office</p></div>
        <div className="glass rounded-2xl p-5 text-center"><LogOut className="h-5 w-5 text-gray-400 mx-auto mb-2" /><p className="text-2xl font-bold text-white">{leftCount}</p><p className="text-[11px] text-gray-500 mt-1">Left</p></div>
        <div className="glass rounded-2xl p-5 text-center"><UserX className="h-5 w-5 text-rose-400 mx-auto mb-2" /><p className="text-2xl font-bold text-white">{absentCount}</p><p className="text-[11px] text-gray-500 mt-1">Absent</p></div>
        <div className="glass rounded-2xl p-5 text-center"><Timer className="h-5 w-5 text-violet-400 mx-auto mb-2" /><p className="text-2xl font-bold text-white">{totalHrs.toFixed(1)}<span className="text-sm text-gray-500">h</span></p><p className="text-[11px] text-gray-500 mt-1">Total Hours</p></div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Check In</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Check Out</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Duration</th>
              {isToday && <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase">Override</th>}
            </tr>
          </thead>
          <tbody>
            {attendance.map(rec => {
              const st = getStatus(rec);
              return (
                <tr key={rec.employee_id} className="table-row">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{rec.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</span>
                        </div>
                        {st==='present' && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#12122b] rounded-full"></div>}
                      </div>
                      <div><p className="text-sm font-semibold text-white">{rec.name}</p><p className="text-[11px] text-gray-600">{rec.department||''}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    {st==='present' && <span className="badge bg-emerald-500/20 text-emerald-400">Working</span>}
                    {st==='left' && <span className="badge bg-gray-500/20 text-gray-400">Left</span>}
                    {st==='absent' && <span className="badge bg-rose-500/20 text-rose-400">Absent</span>}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">{formatTime(rec.check_in_time)}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">{formatTime(rec.check_out_time)}</td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-indigo-400">{formatDur(rec.duration_minutes)}</td>
                  {isToday && (
                    <td className="px-6 py-3.5 text-right">
                      {st==='absent' && <button onClick={()=>handleClockIn(rec.employee_id)} disabled={actionLoading===rec.employee_id} className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50"><LogIn className="h-3 w-3"/><span>In</span></button>}
                      {st==='present' && <button onClick={()=>handleClockOut(rec.employee_id)} disabled={actionLoading===rec.employee_id} className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 disabled:opacity-50"><LogOut className="h-3 w-3"/><span>Out</span></button>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {attendance.length===0 && (
          <div className="px-6 py-16 text-center"><Clock className="h-10 w-10 text-gray-700 mx-auto mb-3"/><p className="text-gray-400 font-medium">No records</p></div>
        )}
      </div>
    </div>
  );
}

export default Attendance;
