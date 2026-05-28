import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react';
import { getTodayAttendance, clockIn, clockOut } from '../api';

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await getTodayAttendance();
      setAttendance(res.data.attendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleClockIn = async (employeeId) => {
    setActionLoading(employeeId);
    try {
      await clockIn(employeeId);
      fetchAttendance();
    } catch (error) {
      console.error('Error clocking in:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClockOut = async (employeeId) => {
    setActionLoading(employeeId);
    try {
      await clockOut(employeeId);
      fetchAttendance();
    } catch (error) {
      console.error('Error clocking out:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatus = (record) => {
    if (!record.check_in_time) return 'absent';
    if (record.check_in_time && !record.check_out_time) return 'present';
    return 'left';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">In Office</span>;
      case 'left':
        return <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Left</span>;
      case 'absent':
        return <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Absent</span>;
      default:
        return null;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Today's Attendance</h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {attendance.filter(a => getStatus(a) === 'present').length}
          </p>
          <p className="text-sm text-green-600">Currently In</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">
            {attendance.filter(a => getStatus(a) === 'left').length}
          </p>
          <p className="text-sm text-gray-600">Left Office</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-700">
            {attendance.filter(a => getStatus(a) === 'absent').length}
          </p>
          <p className="text-sm text-red-600">Absent</p>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Manual Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.map((record) => {
                const status = getStatus(record);
                return (
                  <tr key={record.employee_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-xs">
                              {record.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          {status === 'present' && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{record.name}</p>
                          <p className="text-xs text-gray-500">{record.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(record.check_in_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(record.check_out_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDuration(record.duration_minutes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {status === 'absent' && (
                          <button
                            onClick={() => handleClockIn(record.employee_id)}
                            disabled={actionLoading === record.employee_id}
                            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            <LogIn className="h-3 w-3" />
                            <span>Clock In</span>
                          </button>
                        )}
                        {status === 'present' && (
                          <button
                            onClick={() => handleClockOut(record.employee_id)}
                            disabled={actionLoading === record.employee_id}
                            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <LogOut className="h-3 w-3" />
                            <span>Clock Out</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {attendance.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No attendance records for today</p>
            <p className="text-sm text-gray-400 mt-1">Records will appear as the scanner detects devices</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Attendance;
