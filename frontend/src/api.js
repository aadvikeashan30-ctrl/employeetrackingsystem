import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Employees
export const getEmployees = () => api.get('/employees');
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const addEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

// Live Status
export const getStats = () => api.get('/stats');
export const getPresentEmployees = () => api.get('/attendance/present');
export const getHealth = () => api.get('/health');

// Attendance
export const getTodayAttendance = () => api.get('/attendance/today');
export const getAttendanceByDate = (date) => api.get(`/attendance/date/${date}`);
export const getAttendanceRange = (start, end) => api.get(`/attendance/range?start=${start}&end=${end}`);

// Manual Override
export const clockIn = (employeeId) => api.post(`/attendance/clockin/${employeeId}`);
export const clockOut = (employeeId) => api.post(`/attendance/clockout/${employeeId}`);

// Reports
export const getWeeklySummary = () => api.get('/summary/weekly');
export const getMonthlySummary = (year, month) => api.get(`/summary/monthly?year=${year}&month=${month}`);

export default api;
