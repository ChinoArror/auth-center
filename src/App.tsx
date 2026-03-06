import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, LayoutGrid, KeyRound, LogOut, CheckCircle2, XCircle, Plus, Trash2, Shield, Settings, Activity, BarChart3, PieChart, Clock, ExternalLink, Github } from 'lucide-react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import UserProfile from './UserProfile';
import ChangePassword from './ChangePassword';
import SsoBinding from './SsoBinding';

const API_BASE = ''; // Base URL for the worker (empty string to use the current origin)

function Dashboard() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLogged, setIsLogged] = useState(false);
  const [authHeader, setAuthHeader] = useState('');
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Stats state
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // SSO Session Flow State
  const [ssoMode, setSsoMode] = useState(false);
  const [ssoAppId, setSsoAppId] = useState('');
  const [ssoRedirect, setSsoRedirect] = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState('');

  // Check login state & Auto SSO Trigger
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get('redirect');
    const appId = searchParams.get('app_id') || searchParams.get('client_id');

    if (redirect && appId) {
      setSsoMode(true);
      setSsoAppId(appId);
      setSsoRedirect(redirect);
      setSsoLoading(true);
      checkSsoSession(appId, redirect);
    }

    const saved = localStorage.getItem('sso_admin_auth');
    if (saved) {
      setAuthHeader(saved);
      setIsLogged(true);
    }

    // Check for github errors
    const errorParam = searchParams.get('error');
    if (errorParam === 'github_not_bound') {
      alert('This GitHub account is not linked to any user.');
    } else if (errorParam === 'account_paused') {
      alert('Your account is paused.');
    }
  }, []);

  const checkSsoSession = async (appId: string, redirect: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/session`);
      if (res.ok) {
        const data = await res.json();
        if (data.active) {
          const verifyRes = await fetch(`${API_BASE}/api/verify?app_id=${appId}`, {
            headers: { 'Authorization': `Bearer ${data.token}` }
          });
          if (verifyRes.ok) {
            await fetch(`${API_BASE}/api/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ app_id: appId, uuid: data.user.uuid, event_type: 'sso_auto_login', duration_seconds: 0 })
            });
            window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'}token=${data.token}`;
            return;
          } else {
            setSsoError('You do not have permission to access this app.');
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
    setSsoLoading(false);
  };

  useEffect(() => {
    if (isLogged) {
      fetchUsers();
      fetchApps();
      fetchPermissions();
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

  const handleSsoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSsoError('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      if (!res.ok) {
        setSsoError(data.error || 'Login failed');
        return;
      }

      const verifyRes = await fetch(`${API_BASE}/api/verify?app_id=${ssoAppId}`, {
        headers: { 'Authorization': `Bearer ${data.token}` }
      });
      if (verifyRes.ok) {
        await fetch(`${API_BASE}/api/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app_id: ssoAppId, uuid: data.uuid, event_type: 'login_success', duration_seconds: 0 })
        });
        window.location.href = `${ssoRedirect}${ssoRedirect.includes('?') ? '&' : '?'}token=${data.token}`;
      } else {
        setSsoError('You do not have permission to access this app.');
      }
    } catch (err: any) {
      setSsoError(err.message);
    }
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

  const fetchPermissions = async () => {
    const res = await authFetch('/admin/permissions');
    if (res.ok) setPermissions(await res.json());
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const query = `
        query getAnalytics($accountTag: String!) {
          viewer {
            accounts(filter: {accountTag: $accountTag}) {
              analyticsEngineEventsAdaptiveGroups(
                filter: { dataset: "auth-center", datetime_geq: "2024-01-01T00:00:00Z" },
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
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await authFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(fd.entries()))
    });
    if (res.ok) { fetchUsers(); form.reset(); }
  };

  /* ----- Apps API Actions ----- */
  const createApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await authFetch('/admin/apps', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(fd.entries()))
    });
    if (res.ok) { fetchApps(); form.reset(); }
  };

  const deleteApp = async (appId: string) => {
    if (!confirm('Are you sure?')) return;
    const res = await authFetch(`/admin/apps/${appId}`, { method: 'DELETE' });
    if (res.ok) fetchApps();
  };

  /* ----- Permissions API Actions ----- */
  const togglePermission = async (uuid: string, app_id: string, currentlyHasAccess: boolean) => {
    const res = await authFetch('/admin/permissions', {
      method: currentlyHasAccess ? 'DELETE' : 'POST',
      body: JSON.stringify({ uuid, app_id })
    });
    if (res.ok) fetchPermissions();
  };

  if (ssoMode) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-fuchsia-900 to-indigo-950 flex items-center justify-center p-4 overflow-hidden z-50">
        <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none"></div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-black/40 backdrop-blur-xl border border-purple-400/30 p-8 rounded-3xl shadow-2xl shadow-purple-900/50 w-full max-w-md ring-1 ring-white/10 relative z-10"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">Single Sign-On</h2>
          <p className="text-purple-300/80 text-center mb-8 font-medium">Continue to {ssoAppId}</p>

          {ssoLoading ? (
            <div className="flex justify-center py-6"><Activity className="w-8 h-8 text-purple-400 animate-spin" /></div>
          ) : (
            <form onSubmit={handleSsoLogin} className="space-y-4">
              {ssoError && <div className="bg-red-500/20 text-red-300 p-3 rounded-xl border border-red-500/30 text-sm text-center">{ssoError}</div>}
              <div>
                <input
                  type="text" required placeholder="User Account"
                  className="w-full bg-white/5 border border-purple-500/30 text-purple-200 placeholder-purple-300/50 font-medium rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:ring-2 focus:border-transparent focus:ring-purple-500 transition-all duration-300 shadow-inner"
                  value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                />
              </div>
              <div>
                <input
                  type="password" required placeholder="Password"
                  className="w-full bg-white/5 border border-purple-500/30 text-purple-200 placeholder-purple-300/50 font-medium rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:ring-2 focus:border-transparent focus:ring-purple-500 transition-all duration-300 shadow-inner"
                  value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-600 text-white font-bold text-lg rounded-xl px-4 py-3 shadow-lg shadow-purple-500/20 transition-all mt-4 border border-white/10"
              >
                Log In & Continue
              </motion.button>

              <div className="flex items-center space-x-3 my-4 opacity-40">
                <div className="flex-1 h-px bg-white"></div>
                <span className="text-xs font-semibold uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white"></div>
              </div>

              <motion.a
                href={`${API_BASE}/api/github/login?app_redirect=${encodeURIComponent(ssoRedirect)}&app_id=${ssoAppId}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 bg-[#171515] hover:bg-[#201e1e] text-white font-bold text-lg rounded-xl px-4 py-3 shadow-lg shadow-black/20 transition-all border border-white/10"
              >
                <Github className="w-6 h-6" />
                Continue with Github
              </motion.a>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  if (!isLogged) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-fuchsia-900 to-indigo-950 flex items-center justify-center p-4 overflow-hidden z-50">
        <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none"></div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-black/20 backdrop-blur-xl border border-purple-400/30 p-8 rounded-3xl shadow-2xl shadow-purple-900/50 w-full max-w-md ring-1 ring-white/10 relative z-10"
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
    <div className="fixed inset-0 overflow-hidden bg-[#0B0F19] text-white flex flex-col md:flex-row shadow-[0_0_0_100vmax_#0B0F19]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar */}
      <motion.aside
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full md:w-72 bg-white/5 backdrop-blur-3xl border-b md:border-b-0 md:border-r border-white/10 flex flex-col z-10 relative flex-shrink-0"
      >
        <div className="p-4 md:p-8 md:pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg shadow-purple-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Auth Center
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.a
              href={`${API_BASE}/api/github/login?admin_bind=admin`}
              target="_blank" rel="noreferrer"
              className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-colors"
              title="Bind GitHub for Admin"
            >
              <Github className="w-5 h-5" />
            </motion.a>
            <motion.button onClick={handleLogout} className="md:hidden text-red-400 p-2 hover:bg-red-500/20 rounded-xl" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <nav className="flex md:flex-col overflow-x-auto px-4 pb-2 md:mt-8 space-x-2 md:space-x-0 md:space-y-2 w-full no-scrollbar">
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
              className={`flex-shrink-0 flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3.5 rounded-2xl transition-all duration-300 font-medium ${activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-200 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                : 'text-gray-400 hover:text-white border border-transparent'
                }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-purple-400' : ''}`} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </motion.button>
          ))}
        </nav>

        <div className="hidden md:block p-4 mt-auto mb-4">
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
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto overflow-x-hidden z-10 relative">
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
                              <Link to={`/@${u.username}`} className="font-semibold text-lg hover:underline text-purple-300 transition-colors flex items-center gap-1">
                                {u.name} <ExternalLink className="w-4 h-4 opacity-50" />
                              </Link>
                              <span className={`px-3 py-1 text-xs rounded-full font-medium ${u.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                                {u.status.toUpperCase()}
                              </span>
                            </div>
                            <Link to={`/@${u.username}`} className="text-sm text-white/40 mt-1 hover:text-purple-300 hover:underline transition-colors block">
                              @{u.username} • Exp: {u.cookie_expiry_days} days
                            </Link>
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
              <div>
                <header className="mb-8 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md">
                  <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Permissions Matrix</h1>
                  <p className="text-blue-200/60">Grant or revoke user access to specific external apps.</p>
                </header>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 overflow-x-auto shadow-xl">
                  {users.length === 0 || apps.length === 0 ? (
                    <div className="text-center py-10 text-white/50">You need to create at least one user and one application first.</div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="p-4 border-b border-white/10 text-purple-300 font-semibold sticky left-0 bg-[#0c101a] z-10 w-1/4">User</th>
                          {apps.map(app => (
                            <th key={app.app_id} className="p-4 border-b border-white/10 text-emerald-300 font-semibold text-center w-32 border-l border-white/5">
                              <div className="text-sm truncate w-full" title={app.app_name}>{app.app_name}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <motion.tr
                            key={user.uuid}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="hover:bg-white/5 transition-colors group"
                          >
                            <td className="p-4 border-b border-white/5 font-medium sticky left-0 bg-[#0c101a] group-hover:bg-[#121825] transition-colors z-10">
                              <div className="flex flex-col">
                                <span>{user.name}</span>
                                <span className="text-xs text-white/40 font-mono">@{user.username}</span>
                              </div>
                            </td>
                            {apps.map(app => {
                              const hasAccess = permissions.some(p => p.uuid === user.uuid && p.app_id === app.app_id);
                              return (
                                <td key={`${user.uuid}-${app.app_id}`} className="p-4 border-b border-white/5 text-center border-l border-white/5">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    onClick={() => togglePermission(user.uuid, app.app_id, hasAccess)}
                                    className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all ${hasAccess
                                      ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:bg-emerald-500/30 ring-1 ring-emerald-500/50'
                                      : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50 ring-1 ring-white/10'
                                      }`}
                                  >
                                    {hasAccess ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5 opacity-40" />}
                                  </motion.button>
                                </td>
                              );
                            })}
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  )}
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

export default function App() {
  const location = useLocation();
  const isProfileMatch = location.pathname.match(/^\/@([^/]+)\/?$/);

  if (isProfileMatch) {
    // Return UserProfile, but we need to modify UserProfile to accept username prop or params.
    // Wait, UserProfile reads from useParams(). So rendering it directly will fail to read username.
    // Or we can just render the profile inside a route:
    return (
      <Routes>
        <Route path={location.pathname} element={<UserProfile usernameOverride={decodeURIComponent(isProfileMatch[1])} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/:uuid/change-password" element={<ChangePassword />} />
      <Route path="/:uuid/sso-binding" element={<SsoBinding />} />
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  );
}
