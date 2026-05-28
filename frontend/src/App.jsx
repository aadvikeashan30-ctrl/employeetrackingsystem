import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Wifi, Users, Clock, BarChart3, LayoutDashboard, Activity, Monitor } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import ActivityPage from './pages/Activity';

function Sidebar() {
  const location = useLocation();
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/activity', icon: Monitor, label: 'Activity' },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#12122b] border-r border-white/5 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#12122b]"></div>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">TrackPulse</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Office Monitor</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="glass-light rounded-xl p-3">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-gray-400">System Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0f0f23]">
        <Sidebar />
        <main className="ml-64 p-8 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/activity" element={<ActivityPage />} />
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
