import { useState, useEffect } from 'react';
import { Monitor, MousePointer, Keyboard, Clock, Zap, Globe, AppWindow, Camera, Eye, TrendingUp, AlertTriangle } from 'lucide-react';
import { getActivityToday, getEmployeeActivity, getActivityTimeline, getEmployeeScreenshots, getScreenshot } from '../api';

function Activity() {
  const [activities, setActivities] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detail, setDetail] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [viewingScreenshot, setViewingScreenshot] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await getActivityToday();
      setActivities(res.data.activity);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchDetail = async (empId) => {
    setSelectedEmployee(empId);
    try {
      const [actRes, tlRes, ssRes] = await Promise.all([
        getEmployeeActivity(empId),
        getActivityTimeline(empId),
        getEmployeeScreenshots(empId)
      ]);
      setDetail(actRes.data);
      setTimeline(tlRes.data.timeline);
      setScreenshots(ssRes.data.screenshots);
    } catch (e) { console.error(e); }
  };

  const viewScreenshot = async (ssId) => {
    try {
      const res = await getScreenshot(ssId);
      setViewingScreenshot(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); const i = setInterval(fetchAll, 30000); return () => clearInterval(i); }, []);

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    if (score >= 25) return 'text-orange-400';
    return 'text-rose-400';
  };

  const getScoreBg = (score) => {
    if (score >= 75) return 'from-emerald-500/20 to-emerald-500/5';
    if (score >= 50) return 'from-amber-500/20 to-amber-500/5';
    if (score >= 25) return 'from-orange-500/20 to-orange-500/5';
    return 'from-rose-500/20 to-rose-500/5';
  };

  const getLevelBadge = (level) => {
    const map = {
      high: 'bg-emerald-500/20 text-emerald-400',
      medium: 'bg-amber-500/20 text-amber-400',
      low: 'bg-orange-500/20 text-orange-400',
      idle: 'bg-rose-500/20 text-rose-400'
    };
    return map[level] || map.idle;
  };

  if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="w-16 h-16 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div></div>);

  // Detail view
  if (selectedEmployee && detail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => { setSelectedEmployee(null); setDetail(null); }} className="btn-ghost">&larr; Back</button>
            <div>
              <h2 className="text-2xl font-bold text-white">{detail.employee?.name}</h2>
              <p className="text-gray-500 text-sm">{detail.employee?.department} &bull; Live Activity Monitor</p>
            </div>
          </div>
          <div className={`text-4xl font-black ${getScoreColor(detail.productivity_score)}`}>
            {detail.productivity_score}%
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="glass rounded-xl p-4 text-center"><MousePointer className="h-4 w-4 text-blue-400 mx-auto mb-1.5" /><p className="text-xl font-bold text-white">{detail.total_clicks || 0}</p><p className="text-[10px] text-gray-500">Clicks</p></div>
          <div className="glass rounded-xl p-4 text-center"><Keyboard className="h-4 w-4 text-violet-400 mx-auto mb-1.5" /><p className="text-xl font-bold text-white">{detail.total_keystrokes || 0}</p><p className="text-[10px] text-gray-500">Keystrokes</p></div>
          <div className="glass rounded-xl p-4 text-center"><Clock className="h-4 w-4 text-rose-400 mx-auto mb-1.5" /><p className="text-xl font-bold text-white">{Math.round((detail.total_idle_seconds || 0) / 60)}m</p><p className="text-[10px] text-gray-500">Idle Time</p></div>
          <div className="glass rounded-xl p-4 text-center"><Globe className="h-4 w-4 text-emerald-400 mx-auto mb-1.5" /><p className="text-xl font-bold text-white">{(detail.recent_urls || []).length}</p><p className="text-[10px] text-gray-500">Sites Visited</p></div>
          <div className="glass rounded-xl p-4 text-center"><AppWindow className="h-4 w-4 text-amber-400 mx-auto mb-1.5" /><p className="text-xl font-bold text-white">{(detail.top_apps || []).length}</p><p className="text-[10px] text-gray-500">Apps Used</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Apps */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center space-x-2"><AppWindow className="h-4 w-4 text-indigo-400" /><h3 className="font-bold text-white text-sm">Application Usage</h3></div>
            <div className="p-5 space-y-3">
              {(detail.top_apps || []).length > 0 ? detail.top_apps.map((app, i) => {
                const maxSec = detail.top_apps[0]?.duration_seconds || 1;
                return (
                  <div key={i} className="flex items-center space-x-3">
                    <span className="w-28 text-xs text-gray-400 truncate">{app.app_name}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full flex items-center justify-end pr-2" style={{width: `${Math.max((app.duration_seconds/maxSec)*100, 8)}%`}}>
                        <span className="text-[9px] font-bold text-white">{Math.round(app.duration_seconds/60)}m</span>
                      </div>
                    </div>
                  </div>
                );
              }) : <p className="text-gray-600 text-sm text-center py-4">No app data yet</p>}
            </div>
          </div>

          {/* Recent URLs */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center space-x-2"><Globe className="h-4 w-4 text-emerald-400" /><h3 className="font-bold text-white text-sm">Browsing Activity</h3></div>
            <div className="divide-y divide-white/5 max-h-64 overflow-y-auto scrollbar-hide">
              {(detail.recent_urls || []).length > 0 ? detail.recent_urls.map((url, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Globe className="h-3 w-3 text-gray-600 flex-shrink-0" />
                    <span className="text-xs text-gray-300 truncate">{url.page_title}</span>
                  </div>
                  <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">{url.visit_time}</span>
                </div>
              )) : <p className="text-gray-600 text-sm text-center py-8">No browsing data</p>}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center space-x-2"><TrendingUp className="h-4 w-4 text-violet-400" /><h3 className="font-bold text-white text-sm">Activity Timeline</h3></div>
          {timeline.length > 0 ? (
            <div className="p-5">
              <div className="flex items-end space-x-1 h-24">
                {timeline.map((t, i) => {
                  const h = t.activity_level === 'high' ? '100%' : t.activity_level === 'medium' ? '66%' : t.activity_level === 'low' ? '33%' : '10%';
                  const c = t.activity_level === 'high' ? 'bg-emerald-500' : t.activity_level === 'medium' ? 'bg-amber-500' : t.activity_level === 'low' ? 'bg-orange-500' : 'bg-rose-500/50';
                  return <div key={i} className={`flex-1 ${c} rounded-t-sm transition-all duration-300 min-w-[3px]`} style={{height: h}} title={`${t.active_app} - ${t.activity_level}`}></div>;
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-gray-600">{timeline[0]?.timestamp?.split('T')[1]?.slice(0,5) || ''}</span>
                <span className="text-[10px] text-gray-600">{timeline[timeline.length-1]?.timestamp?.split('T')[1]?.slice(0,5) || ''}</span>
              </div>
            </div>
          ) : <p className="text-gray-600 text-sm text-center py-8">No timeline data</p>}
        </div>

        {/* Screenshots */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center space-x-2"><Camera className="h-4 w-4 text-blue-400" /><h3 className="font-bold text-white text-sm">Screenshots ({screenshots.length})</h3></div>
          {screenshots.length > 0 ? (
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              {screenshots.map(ss => (
                <button key={ss.id} onClick={() => viewScreenshot(ss.id)} className="bg-white/5 rounded-xl p-3 text-center hover:bg-white/10 transition-colors">
                  <Camera className="h-6 w-6 text-gray-500 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-500">{new Date(ss.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </button>
              ))}
            </div>
          ) : <p className="text-gray-600 text-sm text-center py-8">No screenshots captured</p>}
        </div>

        {/* Screenshot Modal */}
        {viewingScreenshot && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8" onClick={() => setViewingScreenshot(null)}>
            <div className="max-w-4xl w-full">
              <img src={`data:image/jpeg;base64,${viewingScreenshot.screenshot_data}`} alt="Screenshot" className="w-full rounded-2xl shadow-2xl" />
              <p className="text-center text-gray-400 text-sm mt-3">{new Date(viewingScreenshot.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main activity overview
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-white">Activity Monitor</h2><p className="text-gray-500 text-sm mt-0.5">Real-time productivity tracking</p></div>
        <button onClick={fetchAll} className="btn-primary flex items-center space-x-2"><Eye className="h-4 w-4" /><span>Refresh</span></button>
      </div>

      {activities.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Monitor className="h-12 w-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No activity data yet</p>
          <p className="text-xs text-gray-600 mt-2">Install the monitoring agent on employee laptops to start tracking. See backend/agent/README.md</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map(emp => (
            <button key={emp.employee_id} onClick={() => fetchDetail(emp.employee_id)} className="glass rounded-2xl p-5 text-left hover:bg-white/[0.04] transition-all hover:scale-[1.02] group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{emp.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{emp.name}</p>
                    <p className="text-[11px] text-gray-600">{emp.department || 'Team'}</p>
                  </div>
                </div>
                <div className={`text-2xl font-black ${getScoreColor(emp.productivity_score)}`}>
                  {emp.productivity_score}<span className="text-xs">%</span>
                </div>
              </div>

              {/* Score bar */}
              <div className="w-full bg-white/5 rounded-full h-2 mb-4 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${getScoreBg(emp.productivity_score)}`} style={{width: `${emp.productivity_score}%`}}></div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-sm font-bold text-white">{emp.total_clicks || 0}</p><p className="text-[9px] text-gray-600">Clicks</p></div>
                <div><p className="text-sm font-bold text-white">{emp.total_keystrokes || 0}</p><p className="text-[9px] text-gray-600">Keys</p></div>
                <div><p className="text-sm font-bold text-white">{Math.round((emp.total_idle_seconds||0)/60)}m</p><p className="text-[9px] text-gray-600">Idle</p></div>
              </div>

              {emp.latest && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 truncate flex-1">{emp.latest.active_app}</span>
                  <span className={`badge ${getLevelBadge(emp.latest.activity_level)}`}>{emp.latest.activity_level}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Activity;
