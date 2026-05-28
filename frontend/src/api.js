import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export const getHealth = () => api.get('/health');
export const getStats = () => api.get('/stats');
export const getEmployees = () => api.get('/employees');
export const addEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);
export const getPresentEmployees = () => api.get('/attendance/present');
export const getTodayAttendance = () => api.get('/attendance/today');
export const getAttendanceByDate = (date) => api.get(`/attendance/date/${date}`);
export const getAttendanceRange = (start, end) => api.get(`/attendance/range?start=${start}&end=${end}`);
export const clockIn = (id) => api.post(`/attendance/clockin/${id}`);
export const clockOut = (id) => api.post(`/attendance/clockout/${id}`);
export const getWeeklySummary = () => api.get('/summary/weekly');
export const getMonthlySummary = (year, month) => api.get(`/summary/monthly?year=${year}&month=${month}`);

export default api;
