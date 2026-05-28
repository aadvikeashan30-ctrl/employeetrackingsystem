import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health
export const getHealth = () => api.get('/health');

// Stats
export const getStats = () => api.get('/stats');

// Employees
export const getEmployees = () => api.get('/employees');
export const addEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// Attendance
export const getPresentEmployees = () => api.get('/attendance/present');
export const getTodayAttendance = () => api.get('/attendance/today');
export const getAttendanceRange = (start, end) => api.get(`/attendance/range?start=${start}&end=${end}`);

// Manual clock in/out
export const clockIn = (employeeId) => api.post(`/attendance/clockin/${employeeId}`);
export const clockOut = (employeeId) => api.post(`/attendance/clockout/${employeeId}`);

// Summaries
export const getWeeklySummary = () => api.get('/summary/weekly');
export const getMonthlySummary = (year, month) => api.get(`/summary/monthly?year=${year}&month=${month}`);

export default api;
