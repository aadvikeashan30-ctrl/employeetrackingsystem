import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, X, Save, HelpCircle, Users } from 'lucide-react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../api';

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '', email: '', department: '', mac_address: '', device_name: ''
  });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await getEmployees();
      setEmployees(res.data.employees);
    } catch (err) {
      setError('Failed to load employees. Is the API server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const resetForm = () => {
    setFormData({ name: '', email: '', department: '', mac_address: '', device_name: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleEdit = (emp) => {
    setFormData({
      name: emp.name,
      email: emp.email || '',
      department: emp.department || '',
      mac_address: emp.mac_address,
      device_name: emp.device_name || ''
    });
    setEditingId(emp.id);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Employee name is required');
      return;
    }
    if (!formData.mac_address.trim()) {
      setError('MAC address is required. See "How to find MAC address" for help.');
      return;
    }

    const macRegex = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;
    if (!macRegex.test(formData.mac_address.trim())) {
      setError('Invalid MAC format. Must be like: a4:83:e7:2b:1f:00 (6 pairs separated by colons)');
      return;
    }

    try {
      if (editingId) {
        await updateEmployee(editingId, formData);
        setSuccess('Employee updated successfully');
      } else {
        const res = await addEmployee(formData);
        setSuccess(res.data.message);
      }
      resetForm();
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Check the MAC address is not already in use.');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from tracking?\n\nTheir attendance history will be preserved but they will no longer be tracked.`)) return;
    try {
      await deleteEmployee(id);
      fetchEmployees();
    } catch (err) {
      setError('Failed to remove employee');
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Employee Registration</h2>
          <p className="text-sm text-gray-500 mt-1">Register employees with their device MAC address for tracking</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center space-x-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm">How to find MAC</span>
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register Employee</span>
          </button>
        </div>
      </div>

      {/* MAC Address Help */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h4 className="font-semibold text-blue-900 mb-3">How to Find a Laptop's MAC Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-blue-800 mb-1">Windows:</p>
              <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                <li>Open Command Prompt</li>
                <li>Type: <code className="bg-blue-100 px-1 rounded">ipconfig /all</code></li>
                <li>Find "Wi-Fi" section</li>
                <li>Copy "Physical Address"</li>
                <li>Replace dashes with colons</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-blue-800 mb-1">macOS:</p>
              <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                <li>Open System Settings</li>
                <li>Go to Network &gt; Wi-Fi</li>
                <li>Click "Details" on your network</li>
                <li>Find "MAC Address" (or Hardware Address)</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-blue-800 mb-1">Linux:</p>
              <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                <li>Open Terminal</li>
                <li>Type: <code className="bg-blue-100 px-1 rounded">ip link show</code></li>
                <li>Find your Wi-Fi interface (wlan0)</li>
                <li>Copy the "link/ether" address</li>
              </ol>
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-600">
            Format: <code className="bg-blue-100 px-1 rounded">aa:bb:cc:dd:ee:ff</code> (6 hex pairs separated by colons, lowercase)
          </p>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Registration Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Employee' : 'Register New Employee'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device MAC Address *</label>
              <input
                type="text"
                value={formData.mac_address}
                onChange={(e) => setFormData({ ...formData, mac_address: e.target.value.toLowerCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="a4:83:e7:2b:1f:00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="rahul@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Engineering, Design, HR"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Device Name (optional)</label>
              <input
                type="text"
                value={formData.device_name}
                onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Rahul's MacBook Pro, HP Pavilion"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 pt-2">
              <button type="button" onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="flex items-center space-x-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Save className="h-4 w-4" />
                <span>{editingId ? 'Update' : 'Register'} Employee</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Registered Employees ({employees.length})</h3>
        </div>

        {employees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-xs">
                            {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{emp.name}</p>
                          {emp.email && <p className="text-xs text-gray-500">{emp.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {emp.department || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {emp.mac_address}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {emp.device_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleEdit(emp)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(emp.id, emp.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No employees registered yet</p>
            <p className="text-sm text-gray-400 mt-1">Click "Register Employee" to add your team members</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Employees;
