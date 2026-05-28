import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Wifi, Users, Clock, BarChart3, LayoutDashboard } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';

function App() {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
  ];

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2.5 rounded-xl shadow-lg shadow-indigo-200">
                  <Wifi className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Employee Tracker</h1>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Wi-Fi Monitoring System</p>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex items-center space-x-1">
                {navItems.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </header>

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
