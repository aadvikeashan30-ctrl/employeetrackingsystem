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
    try {
      setLoading(true);
      const res = isToday
        ? await getTodayAttendance()
        : await getAttendanceByDate(selectedDate);
      setAttendance(res.data.attendance);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, [selectedDate]);

  const handleClockIn = async (id) => {
    setActionLoading(id);
    try { await clockIn(id); fetchAttendance(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleClockOut = async (id) => {
    setActionLoading(id);
    try { await clockOut(id); fetchAttendance(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };


  const getStatus = (r) => {
    if (!r.check_in_time) return 'absent';
    if (!r.check_out_time) return 'present';
    return 'left';
  };

  const formatTime = (t) => {
    if (!t) return '—';
    return new Date(t.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (min) => {
    if (!min) return '—';
    return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
  };

  const presentCount = attendance.filter(a => getStatus(a) === 'present').length;
  const leftCount = attendance.filter(a => getStatus(a) === 'left').length;
  const absentCount = attendance.filter(a => getStatus(a) === 'absent').length;
  const totalHours = attendance.reduce((s, a) => s + (a.duration_minutes || 0), 0) / 60;

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
          <h2 className="text-3xl font-bold text-gray-900">Attendance</h2>
          <p className="text-gray-500 mt-1">
            {isToday ? 'Live attendance status' : `Records for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="text-sm border-none focus:ring-0 p-0 text-gray-700"
          />
        </div>
      </div>


      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-5 text-center">
          <UserCheck className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-emerald-700">{presentCount}</p>
          <p className="text-xs font-medium text-emerald-600 mt-1">In Office</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-5 text-center">
          <LogOut className="h-6 w-6 text-gray-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-gray-700">{leftCount}</p>
          <p className="text-xs font-medium text-gray-600 mt-1">Left Office</p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-2xl p-5 text-center">
          <UserX className="h-6 w-6 text-rose-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-rose-700">{absentCount}</p>
          <p className="text-xs font-medium text-rose-600 mt-1">Absent</p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-5 text-center">
          <Timer className="h-6 w-6 text-violet-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-violet-700">{totalHours.toFixed(1)}</p>
          <p className="text-xs font-medium text-violet-600 mt-1">Total Hours</p>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Check In</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Check Out</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Duration</th>
                {isToday && <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Override</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attendance.map((rec) => {
                const status = getStatus(rec);
                return (
                  <tr key={rec.employee_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-bold text-xs">
                              {rec.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          {status === 'present' && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{rec.name}</p>
                          <p className="text-xs text-gray-400">{rec.department || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {status === 'present' && <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full">Working</span>}
                      {status === 'left' && <span className="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-full">Left</span>}
                      {status === 'absent' && <span className="px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-600 rounded-full">Absent</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{formatTime(rec.check_in_time)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{formatTime(rec.check_out_time)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{formatDuration(rec.duration_minutes)}</td>
                    {isToday && (
                      <td className="px-6 py-4 text-right">
                        {status === 'absent' && (
                          <button onClick={() => handleClockIn(rec.employee_id)}
                            disabled={actionLoading === rec.employee_id}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50">
                            <LogIn className="h-3 w-3" /><span>Clock In</span>
                          </button>
                        )}
                        {status === 'present' && (
                          <button onClick={() => handleClockOut(rec.employee_id)}
                            disabled={actionLoading === rec.employee_id}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 disabled:opacity-50">
                            <LogOut className="h-3 w-3" /><span>Clock Out</span>
                          </button>
                        )}
                      </td>
                    )}
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

export default Attendance;
