import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, LayoutGrid, KeyRound, LogOut, CheckCircle2, XCircle, Plus, Trash2, Shield, Settings, Activity, BarChart3, PieChart, Clock } from 'lucide-react';

const API_BASE = ''; // Base URL for the worker (empty string to use the current origin)

function App() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLogged, setIsLogged] = useState(false);
  const [authHeader, setAuthHeader] = useState('');

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Stats state
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Check login state
  useEffect(() => {
    const saved = localStorage.getItem('sso_admin_auth');
    if (saved) {
      setAuthHeader(saved);
      setIsLogged(true);
    }
  }, []);

  useEffect(() => {
    if (isLogged) {
      fetchUsers();
      fetchApps();
    }
  }, [isLogged]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const token = btoa(`${credentials.username}:${credentials.password}`);
    const header = `Basic ${token}`;

    // Test login
    fetch(`${API_BASE}/admin/users`, { headers: { 'Authorization': header } })
      .then(res => {
        if (res.ok) {
          localStorage.setItem('sso_admin_auth', header);
          setAuthHeader(header);
          setIsLogged(true);
        } else {
          alert('Invalid credentials');
        }
      }).catch(err => alert('Network error: ' + err.message));
  };

  const handleLogout = () => {
    localStorage.removeItem('sso_admin_auth');
    setAuthHeader('');
    setIsLogged(false);
  };

  const authFetch = async (path: string, options: any = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...options.headers, 'Authorization': authHeader, 'Content-Type': 'application/json' }
    });
    if (res.status === 401) handleLogout();
    return res;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/users');
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/admin/apps');
      if (res.ok) setApps(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const query = `
        query getAnalytics($accountTag: string!) {
          viewer {
            accounts(filter: {accountTag: $accountTag}) {
              analyticsEngineEventsAdaptiveGroups(
                filter: { dataset: "auth-center" },
                limit: 1000
              ) {
                sum {
                  double1
                }
                count
                dimensions {
                  blob1
                  blob3
                  blob5
                  blob6
                }
              }
            }
          }
        }
      `;
      const res = await authFetch('/admin/stats/graphql', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isLogged && activeTab === 'statistics' && !statsData) {
      fetchStats();
    }
  }, [activeTab, isLogged]);

  /* ----- Users API Actions ----- */
  const toggleUserStatus = async (uuid: string, currentStatus: string) => {
    const action = currentStatus === 'active' ? 'pause' : 'continue';
    const res = await authFetch(`/admin/users/${uuid}/${action}`, { method: 'POST' });
    if (res.ok) fetchUsers();
  };

  const deleteUser = async (uuid: string) => {
    if (!confirm('Are you sure?')) return;
    const res = await authFetch(`/admin/users/${uuid}`, { method: 'DELETE' });
    if (res.ok) fetchUsers();
  };

  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await authFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(fd.entries()))
    });
    if (res.ok) { fetchUsers(); e.currentTarget.reset(); }
  };

  /* ----- Apps API Actions ----- */
  const createApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await authFetch('/admin/apps', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(fd.entries()))
    });
    if (res.ok) { fetchApps(); e.currentTarget.reset(); }
  };

  const deleteApp = async (appId: string) => {
    if (!confirm('Are you sure?')) return;
    const res = await authFetch(`/admin/apps/${appId}`, { method: 'DELETE' });
    if (res.ok) fetchApps();
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-fuchsia-900 to-indigo-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-black/20 backdrop-blur-xl border border-purple-400/30 p-8 rounded-3xl shadow-2xl shadow-purple-900/50 w-full max-w-md ring-1 ring-white/10"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-tr from-purple-600 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">SSO Admin</h2>
          <p className="text-purple-300/80 text-center mb-8 font-medium">Authentication required</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text" required placeholder="Username"
                className="w-full bg-white/5 border border-purple-500/30 text-emerald-300 placeholder-purple-300/40 font-medium rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:ring-2 focus:border-transparent focus:ring-emerald-500 transition-all duration-300 shadow-inner"
                value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })}
              />
            </div>
            <div>
              <input
                type="password" required placeholder="Password"
                className="w-full bg-white/5 border border-purple-500/30 text-emerald-300 placeholder-purple-300/40 font-medium rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:ring-2 focus:border-transparent focus:ring-emerald-500 transition-all duration-300 shadow-inner"
                value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 text-white font-bold text-lg rounded-xl px-4 py-3 shadow-lg shadow-emerald-500/20 transition-all mt-4 border border-white/10"
            >
              Secure Login
            </motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }} animate={{ x: 0 }}
        className="w-72 bg-white/5 backdrop-blur-3xl border-r border-white/10 flex flex-col z-10 relative"
      >
        <div className="p-8 pb-4 flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg shadow-purple-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
            Auth Center
          </span>
        </div>

        <nav className="flex-1 px-4 mt-8 space-y-2">
          {[
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'apps', icon: LayoutGrid, label: 'Applications' },
            { id: 'permissions', icon: KeyRound, label: 'Permissions' },
            { id: 'statistics', icon: BarChart3, label: 'Statistics' }
          ].map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-medium ${activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-200 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                : 'text-gray-400 hover:text-white border border-transparent'
                }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-purple-400' : ''}`} />
              {tab.label}
            </motion.button>
          ))}
        </nav>

        <div className="p-4 mb-4">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:text-white hover:bg-red-500/20 transition-all border border-transparent hover:border-red-500/30"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto z-10 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto space-y-8"
          >
            {activeTab === 'users' && (
              <div>
                <header className="mb-8 flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">User Management</h1>
                    <p className="text-blue-200/60">Configure SSO identities and access status.</p>
                  </div>
                </header>

                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Create form */}
                  <div className="lg:col-span-1">
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-3xl shadow-xl hover:shadow-purple-500/10 transition-shadow">
                      <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Plus className="text-purple-400 w-5 h-5" /> New User
                      </h3>
                      <form onSubmit={createUser} className="space-y-4">
                        <input name="username" placeholder="Username" required className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder-white/30" />
                        <input name="name" placeholder="Full Name" required className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder-white/30" />
                        <input name="password" type="password" placeholder="Password" required className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder-white/30" />
                        <input name="cookie_expiry_days" type="number" placeholder="Session Expiry (Days)" defaultValue={7} className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder-white/30 text-white" />
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-xl shadow-lg transition-colors mt-2">
                          Create User
                        </motion.button>
                      </form>
                    </div>
                  </div>

                  {/* Users list */}
                  <div className="lg:col-span-2 space-y-4">
                    {loading ? <div className="text-center py-10 text-white/50 animate-pulse">Loading users...</div> :
                      users.map((u: any) => (
                        <motion.div
                          key={u.uuid}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                          className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex items-center justify-between transition-all group"
                        >
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-lg">{u.name}</h4>
                              <span className={`px-3 py-1 text-xs rounded-full font-medium ${u.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                                {u.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-white/40 mt-1">@{u.username} • Exp: {u.cookie_expiry_days} days</p>
                          </div>

                          <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => toggleUserStatus(u.uuid, u.status)}
                              className={`p-2.5 rounded-xl shadow-lg ${u.status === 'active' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40'}`}
                              title={u.status === 'active' ? 'Pause User' : 'Activate User'}
                            >
                              {u.status === 'active' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => deleteUser(u.uuid)}
                              className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/40 shadow-lg"
                            >
                              <Trash2 className="w-5 h-5" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'apps' && (
              <div>
                <header className="mb-8 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                  <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300">Registered Applications</h1>
                  <p className="text-blue-200/60">Manage OAuth-like clients and verifying entities.</p>
                </header>

                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-3xl shadow-xl hover:shadow-emerald-500/10 transition-shadow">
                      <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Settings className="text-emerald-400 w-5 h-5" /> Register App
                      </h3>
                      <form onSubmit={createApp} className="space-y-4">
                        <input name="app_id" placeholder="App ID (e.g. game-client)" required className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-white/30" />
                        <input name="app_name" placeholder="Display Name" required className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-white/30" />
                        <input name="callback_url" placeholder="Callback URL (Optional)" className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-white/30" />
                        <input name="secret_key" placeholder="App Secret Key" required className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder-white/30" />
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl shadow-lg transition-colors mt-2">
                          Register Application
                        </motion.button>
                      </form>
                    </div>
                  </div>

                  <div className="lg:col-span-2 grid gap-4 grid-cols-1 md:grid-cols-2">
                    {loading ? <div className="text-center py-10 text-white/50 col-span-2 animate-pulse">Loading apps...</div> :
                      apps.map((a: any) => (
                        <motion.div
                          key={a.app_id}
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex flex-col justify-between transition-all group hover:shadow-2xl hover:shadow-emerald-500/10"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                <LayoutGrid className="w-6 h-6" />
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => deleteApp(a.app_id)}
                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                            <h4 className="font-bold text-xl mb-1 text-white">{a.app_name}</h4>
                            <p className="text-xs font-mono text-emerald-300/70 mb-4">{a.app_id}</p>
                            {a.callback_url && <p className="text-sm text-white/50 bg-black/20 p-2 rounded-lg truncate" title={a.callback_url}>{a.callback_url}</p>}
                          </div>
                        </motion.div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center space-y-4">
                  <div className="inline-flex p-5 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-[2rem] border border-white/10 text-blue-300">
                    <KeyRound className="w-12 h-12" />
                  </div>
                  <h2 className="text-2xl font-bold">Permissions Interface</h2>
                  <p className="text-white/50 max-w-sm mx-auto">The APIs support permission assignment, but the advanced matrix view is coming in the next update. Please use API calls for now.</p>
                </div>
              </div>
            )}

            {activeTab === 'statistics' && (() => {
              const events = statsData?.data?.viewer?.accounts?.[0]?.analyticsEngineEventsAdaptiveGroups || [];
              const totalDuration = events.reduce((acc: number, curr: any) => acc + (curr.sum?.double1 || 0), 0);
              const totalEvents = events.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);
              const browsers = events.reduce((acc: any, curr: any) => {
                const b = curr.dimensions?.blob6 || 'Unknown';
                acc[b] = (acc[b] || 0) + curr.count;
                return acc;
              }, {});
              const topBrowser = Object.entries<{ [key: string]: number }>(browsers).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';

              return (
                <div>
                  <header className="mb-8 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">System Statistics</h1>
                        <p className="text-purple-200/60">Usage duration, time distribution, and device metrics via Analytics Engine.</p>
                      </div>
                      <motion.button onClick={fetchStats} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-3 bg-purple-500/20 rounded-xl text-purple-300 hover:bg-purple-500/40 transition-colors">
                        <Activity className={`w-5 h-5 ${loadingStats ? 'animate-spin' : ''}`} />
                      </motion.button>
                    </div>
                  </header>

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-colors">
                      <div className="flex gap-4 items-center mb-2"><Clock className="text-purple-400 w-6 h-6" /> <h3 className="font-semibold text-lg">Total Duration</h3></div>
                      <p className="text-3xl font-bold text-white mb-1">{loadingStats ? '...' : `${Math.round(totalDuration)}s`}</p>
                      <p className="text-sm text-purple-300/50">Combined across all apps</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-colors">
                      <div className="flex gap-4 items-center mb-2"><Activity className="text-blue-400 w-6 h-6" /> <h3 className="font-semibold text-lg">Logged Events</h3></div>
                      <p className="text-3xl font-bold text-white mb-1">{loadingStats ? '...' : totalEvents}</p>
                      <p className="text-sm text-blue-300/50">Total tracking pings received</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-colors">
                      <div className="flex gap-4 items-center mb-2"><PieChart className="text-emerald-400 w-6 h-6" /> <h3 className="font-semibold text-lg">Top Browser</h3></div>
                      <p className="text-3xl font-bold text-white mb-1">{loadingStats ? '...' : topBrowser}</p>
                      <p className="text-sm text-emerald-300/50">Most used by clients</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-black/60 to-purple-900/30 border border-purple-500/20 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><BarChart3 className="w-48 h-48" /></div>
                    <h2 className="text-xl font-bold mb-4 text-purple-300 flex items-center gap-3">Raw Analytics Data Feed</h2>
                    <div className="max-h-64 overflow-y-auto w-full bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-sm text-white/70">
                      <pre>{JSON.stringify(events, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
