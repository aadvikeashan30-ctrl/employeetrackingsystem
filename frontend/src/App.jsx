import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Wifi, Users, Clock, BarChart3 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Wifi className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Employee Tracker</h1>
                  <p className="text-xs text-gray-500">Live Wi-Fi Attendance System</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <NavLink to="/" end className={({ isActive }) =>
                `flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }>
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/employees" className={({ isActive }) =>
                `flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }>
                <Users className="h-4 w-4" />
                <span>Employees</span>
              </NavLink>
              <NavLink to="/attendance" className={({ isActive }) =>
                `flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }>
                <Clock className="h-4 w-4" />
                <span>Attendance</span>
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) =>
                `flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }>
                <BarChart3 className="h-4 w-4" />
                <span>Reports</span>
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
