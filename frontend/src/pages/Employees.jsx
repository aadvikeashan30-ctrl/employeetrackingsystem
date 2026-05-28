import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, X, Save, HelpCircle, Users, Search } from 'lucide-react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../api';

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ name:'', email:'', department:'', mac_address:'', device_name:'' });

  const fetchEmployees = async () => {
    try { setLoading(true); const res = await getEmployees(); setEmployees(res.data.employees); }
    catch (e) { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const resetForm = () => { setFormData({name:'',email:'',department:'',mac_address:'',device_name:''}); setEditingId(null); setShowForm(false); setError(''); setSuccess(''); };

  const handleEdit = (emp) => {
    setFormData({ name:emp.name, email:emp.email||'', department:emp.department||'', mac_address:emp.mac_address, device_name:emp.device_name||'' });
    setEditingId(emp.id); setShowForm(true); setError(''); setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!formData.name.trim()) { setError('Name is required'); return; }
    if (!formData.mac_address.trim()) { setError('MAC address is required'); return; }
    if (!/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(formData.mac_address.trim())) { setError('Invalid MAC format. Use: a4:83:e7:2b:1f:00'); return; }
    try {
      if (editingId) { await updateEmployee(editingId, formData); setSuccess('Updated'); }
      else { await addEmployee(formData); setSuccess('Registered successfully'); }
      resetForm(); fetchEmployees();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}"? Their data will be permanently deleted.`)) return;
    try { await deleteEmployee(id); fetchEmployees(); } catch(e) { setError('Delete failed'); }
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase()) ||
    e.mac_address.includes(search.toLowerCase())
  );

  if (loading) {
    return (<div className="flex items-center justify-center h-[60vh]"><div className="w-16 h-16 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Employees</h2>
          <p className="text-gray-500 text-sm mt-0.5">Register & manage tracked devices</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowHelp(!showHelp)} className="btn-ghost flex items-center space-x-2">
            <HelpCircle className="h-4 w-4" /><span>Find MAC</span>
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center space-x-2">
            <UserPlus className="h-4 w-4" /><span>Register</span>
          </button>
        </div>
      </div>

      {/* MAC Help */}
      {showHelp && (
        <div className="glass rounded-2xl p-6 border-indigo-500/20">
          <h4 className="font-bold text-indigo-300 mb-4">How to Find MAC Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-white mb-2">Windows</p>
              <code className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">getmac /v | findstr "Wi-Fi"</code>
              <p className="text-gray-500 text-xs mt-2">Or: ipconfig /all → Physical Address</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">macOS</p>
              <p className="text-gray-500 text-xs">System Settings → Network → Wi-Fi → Details → MAC Address</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Linux</p>
              <code className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">ip link show wlan0</code>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-4">Format: <code className="text-indigo-400">a4:83:e7:2b:1f:00</code> (lowercase, colons). Replace dashes with colons on Windows.</p>
        </div>
      )}

      {success && <div className="glass rounded-xl p-4 border-emerald-500/20"><p className="text-emerald-400 text-sm font-medium">{success}</p></div>}

      {/* Form */}
      {showForm && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-white">{editingId ? 'Edit Employee' : 'Register Employee'}</h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          {error && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"><p className="text-rose-400 text-sm">{error}</p></div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Full Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name:e.target.value})} className="input-dark" placeholder="Employee name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">MAC Address *</label>
              <input type="text" value={formData.mac_address} onChange={e => setFormData({...formData, mac_address:e.target.value.toLowerCase()})} className="input-dark font-mono" placeholder="a4:83:e7:2b:1f:00" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email:e.target.value})} className="input-dark" placeholder="email@company.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Department</label>
              <input type="text" value={formData.department} onChange={e => setFormData({...formData, department:e.target.value})} className="input-dark" placeholder="Engineering, Design..." />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Device Name</label>
              <input type="text" value={formData.device_name} onChange={e => setFormData({...formData, device_name:e.target.value})} className="input-dark" placeholder="MacBook Pro, ThinkPad..." />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 pt-2">
              <button type="button" onClick={resetForm} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary flex items-center space-x-2"><Save className="h-4 w-4" /><span>{editingId ? 'Update' : 'Register'}</span></button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Registered ({employees.length})</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-48" />
          </div>
        </div>

        {filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">MAC</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Device</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id} className="table-row">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{emp.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{emp.name}</p>
                        {emp.email && <p className="text-[11px] text-gray-600">{emp.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-400">{emp.department || '—'}</td>
                  <td className="px-6 py-3.5"><code className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg font-mono">{emp.mac_address}</code></td>
                  <td className="px-6 py-3.5 text-sm text-gray-500">{emp.device_name || '—'}</td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => handleEdit(emp)} className="p-2 text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(emp.id, emp.name)} className="p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-16 text-center">
            <Users className="h-10 w-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">{search ? 'No results' : 'No employees'}</p>
            <p className="text-xs text-gray-600 mt-1">{search ? 'Try different search' : 'Click Register to add team members'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Employees;
