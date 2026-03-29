import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, LayoutGrid, KeyRound, LogOut, CheckCircle2, XCircle, Plus, Trash2, Shield, Settings, Activity, BarChart3, PieChart, Clock, ExternalLink, Github, Zap, Globe, Database, Code2, Box, Layers, Cpu, Rocket, Star, Sparkles, Bot, Wifi, Lock, Palette } from 'lucide-react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import UserProfile from './UserProfile';
import ChangePassword from './ChangePassword';
import SsoBinding from './SsoBinding';
import AppDetails from './AppDetails';
import PasskeyManage from './PasskeyManage';
import { startAuthentication } from '@simplewebauthn/browser';

const API_BASE = ''; // Base URL for the worker (empty string to use the current origin)

// Consistent icon picker: same app_id always gets same icon
const APP_ICONS = [Zap, Globe, Database, Code2, Box, Layers, Cpu, Rocket, Star, Sparkles, Bot, Wifi, Lock, Palette, Shield, BarChart3] as const;
function getAppIcon(appId: string) {
  let hash = 0;
  for (let i = 0; i < appId.length; i++) hash = (hash * 31 + appId.charCodeAt(i)) >>> 0;
  return APP_ICONS[hash % APP_ICONS.length];
}

const NUMBER_UNITS = ['', 'K', 'M', 'G', 'T', 'P'];
const ACCESS_EVENT_TYPES = new Set(['page_view', 'login_success', 'sso_auto_login']);
const REGION_LABELS = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

const WORLD_LANDMASSES = [
  'M45 145L54 120L68 101L85 88L101 72L118 63L138 55L160 53L181 57L199 67L214 78L226 94L228 109L223 118L211 121L198 116L182 115L168 122L158 136L144 146L126 157L110 168L92 179L79 187L67 186L57 173L49 157L45 145Z',
  'M209 46L224 37L244 35L263 39L279 49L285 64L280 78L266 84L248 83L229 75L214 60L209 46Z',
  'M198 208L214 206L230 213L245 226L255 243L263 263L265 286L262 310L255 334L244 353L232 363L221 358L216 338L214 316L208 296L201 275L193 255L191 235L194 220L198 208Z',
  'M356 103L367 96L381 92L396 92L410 97L423 105L432 115L434 125L427 132L414 131L402 134L392 141L379 143L366 138L357 128L353 116L356 103Z',
  'M382 151L395 146L410 147L424 154L435 167L442 183L445 201L443 221L438 242L430 262L420 281L408 292L397 289L391 273L389 252L386 231L380 212L374 193L372 176L375 162L382 151Z',
  'M430 93L451 82L476 75L508 71L543 71L577 75L611 83L642 95L666 108L679 122L678 135L667 147L648 152L629 158L611 167L596 181L586 196L574 204L560 208L546 205L534 196L524 183L516 170L504 160L489 154L471 149L454 141L441 128L433 113L430 93Z',
  'M506 166L520 166L536 173L548 185L554 200L554 214L548 227L540 239L536 253L540 267L552 276L569 276L584 270L598 262L612 257L625 260L634 269L638 282L634 291L622 295L607 294L592 290L578 284L566 275L554 263L543 248L531 233L520 219L511 202L506 184L506 166Z',
  'M683 145L692 142L700 148L703 158L700 168L692 175L685 170L682 158L683 145Z',
  'M603 288L619 282L638 280L659 281L678 287L694 297L703 310L702 324L691 334L671 340L649 340L628 334L612 324L603 311L601 298L603 288Z',
  'M446 293L453 297L456 308L454 320L447 328L442 318L443 305L446 293Z',
];

const COUNTRY_COORDINATES: Record<string, { x: number; y: number }> = {
  AR: { x: 249, y: 326 },
  AU: { x: 680, y: 317 },
  BD: { x: 579, y: 205 },
  BE: { x: 403, y: 121 },
  BR: { x: 247, y: 269 },
  CA: { x: 149, y: 92 },
  CH: { x: 413, y: 133 },
  CL: { x: 230, y: 315 },
  CN: { x: 619, y: 164 },
  CO: { x: 206, y: 232 },
  DE: { x: 415, y: 118 },
  EG: { x: 445, y: 181 },
  ES: { x: 389, y: 149 },
  FR: { x: 399, y: 131 },
  GB: { x: 388, y: 105 },
  HK: { x: 631, y: 184 },
  ID: { x: 630, y: 268 },
  IE: { x: 377, y: 108 },
  IN: { x: 558, y: 199 },
  IT: { x: 421, y: 147 },
  JP: { x: 691, y: 158 },
  KR: { x: 659, y: 149 },
  MX: { x: 144, y: 170 },
  MY: { x: 594, y: 247 },
  NG: { x: 420, y: 226 },
  NL: { x: 405, y: 116 },
  NO: { x: 419, y: 81 },
  NZ: { x: 747, y: 344 },
  PH: { x: 646, y: 223 },
  PK: { x: 532, y: 181 },
  PL: { x: 432, y: 119 },
  PT: { x: 378, y: 150 },
  RU: { x: 509, y: 82 },
  SA: { x: 486, y: 188 },
  SE: { x: 431, y: 84 },
  SG: { x: 601, y: 252 },
  TH: { x: 591, y: 223 },
  TR: { x: 462, y: 151 },
  TW: { x: 648, y: 182 },
  UA: { x: 452, y: 125 },
  US: { x: 167, y: 137 },
  VN: { x: 608, y: 217 },
  ZA: { x: 453, y: 327 },
};

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatCompactNumber(value: number | string | null | undefined) {
  const numericValue = typeof value === 'string' ? Number(value) : value ?? 0;
  if (!Number.isFinite(numericValue)) return '0.00';

  let scaledValue = numericValue;
  let unitIndex = 0;
  while (Math.abs(scaledValue) >= 1000 && unitIndex < NUMBER_UNITS.length - 1) {
    scaledValue /= 1000;
    unitIndex += 1;
  }

  let roundedValue = roundToTwo(scaledValue);
  while (Math.abs(roundedValue) >= 1000 && unitIndex < NUMBER_UNITS.length - 1) {
    scaledValue = roundedValue / 1000;
    unitIndex += 1;
    roundedValue = roundToTwo(scaledValue);
  }

  return `${roundedValue.toFixed(2)}${NUMBER_UNITS[unitIndex]}`;
}

function formatPercent(value: number) {
  return `${roundToTwo(value).toFixed(2)}%`;
}

function normalizeAnalyticsPayload(payload: any) {
  return {
    ...payload,
    data: Array.isArray(payload?.data)
      ? payload.data.map((row: Record<string, unknown>) => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, typeof value === 'number' ? roundToTwo(value) : value])
      ))
      : []
  };
}

function isSupportedRegionCode(code: string) {
  return /^[A-Z]{2}$/.test(code) || /^\d{3}$/.test(code);
}

function getRegionLabel(code: string) {
  const normalizedCode = (code || '').toUpperCase();
  if (!normalizedCode || normalizedCode === 'UNKNOWN') return 'Unknown Region';
  if (!isSupportedRegionCode(normalizedCode)) return normalizedCode;
  try {
    return REGION_LABELS?.of(normalizedCode) || normalizedCode;
  } catch {
    return normalizedCode;
  }
}

function WorldActivityMap({ countries, topCountry }: { countries: Array<{ name: string; value: number }>; topCountry: string }) {
  const mappedCountries = countries
    .map((country) => {
      const code = String(country.name || '').toUpperCase();
      const coordinates = COUNTRY_COORDINATES[code];
      return {
        ...country,
        code,
        label: getRegionLabel(code),
        coordinates,
      };
    })
    .filter((country) => country.coordinates)
    .slice(0, 12);

  const hiddenCountries = countries
    .map((country) => {
      const code = String(country.name || '').toUpperCase();
      return {
        ...country,
        code,
        label: getRegionLabel(code),
      };
    })
    .filter((country) => !COUNTRY_COORDINATES[country.code])
    .slice(0, 6);

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 mb-8">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="text-cyan-300 w-5 h-5" />
            Global Visitor Map
          </h3>
          <p className="text-sm text-white/45 mt-2">
            Coastline-level world silhouette with highlighted active visitor regions, led by {getRegionLabel(topCountry)}.
          </p>
        </div>
        <div className="text-sm text-white/35">
          Highlighting the top {mappedCountries.length || countries.length} active regions from the last 30 days.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.9fr)] gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#07111f] overflow-hidden">
          <svg viewBox="0 0 800 400" className="w-full h-full min-h-[300px]">
            <defs>
              <linearGradient id="worldMapBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#081325" />
                <stop offset="100%" stopColor="#0f1f35" />
              </linearGradient>
              <radialGradient id="worldGlow" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
                <stop offset="100%" stopColor="rgba(56,189,248,0)" />
              </radialGradient>
            </defs>

            <rect width="800" height="400" fill="url(#worldMapBg)" />
            <rect width="800" height="400" fill="url(#worldGlow)" />

            {WORLD_LANDMASSES.map((path, index) => (
              <path
                key={index}
                d={path}
                fill="rgba(148, 163, 184, 0.16)"
                stroke="rgba(148, 163, 184, 0.34)"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
            ))}

            {mappedCountries.map((country, index) => {
              const radius = 8 + Math.min(12, Math.log10(country.value + 1) * 5);
              return (
                <g key={country.code}>
                  <circle
                    cx={country.coordinates!.x}
                    cy={country.coordinates!.y}
                    r={radius + 10}
                    fill="rgba(34, 211, 238, 0.10)"
                  />
                  <circle
                    cx={country.coordinates!.x}
                    cy={country.coordinates!.y}
                    r={radius + 4}
                    fill="rgba(34, 211, 238, 0.18)"
                  />
                  <circle
                    cx={country.coordinates!.x}
                    cy={country.coordinates!.y}
                    r={radius}
                    fill={index === 0 ? '#f59e0b' : '#22d3ee'}
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3">
          {mappedCountries.length ? mappedCountries.map((country, index) => (
            <div key={country.code} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-amber-400' : 'bg-cyan-400'}`}></span>
                  <span className="text-white font-medium truncate">{country.label}</span>
                </div>
                <p className="text-xs text-white/35 mt-1">{country.code}</p>
              </div>
              <span className="text-sm font-mono text-white/80">{formatCompactNumber(country.value)}</span>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-white/40">
              No region-level visitor data is available yet.
            </div>
          )}

          {hiddenCountries.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-3">Additional Active Regions</p>
              <div className="flex flex-wrap gap-2">
                {hiddenCountries.map((country) => (
                  <span key={country.code} className="px-3 py-1.5 rounded-full bg-white/5 text-xs text-white/60 border border-white/10">
                    {country.label} · {formatCompactNumber(country.value)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLogged, setIsLogged] = useState(false);
  const [authHeader, setAuthHeader] = useState('');
  const [adminName, setAdminName] = useState('');
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Quota Modal
  const [quotaModal, setQuotaModal] = useState<any>(null);

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
      setAdminName(localStorage.getItem('sso_admin_name') || 'Admin');
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
          localStorage.setItem('sso_admin_name', credentials.username);
          setAuthHeader(header);
          setAdminName(credentials.username);
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

  const handlePasskeyLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setSsoError('');
    try {
      const resp = await fetch(`${API_BASE}/api/passkey/generate-authentication-options`);
      const options = await resp.json();
      if (!resp.ok) throw new Error(options.error || 'Failed to get options');

      const attResp = await startAuthentication({ optionsJSON: options });

      const verifyResp = await fetch(`${API_BASE}/api/passkey/verify-authentication?app_id=${ssoAppId}&app_redirect=${encodeURIComponent(ssoRedirect)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp)
      });
      const data = await verifyResp.json();
      if (verifyResp.ok && data.verified) {
        // Automatically redirect via token in JSON similar to GitHub login but client-side redirect
        if (data.token) {
          window.location.href = `${ssoRedirect}${ssoRedirect.includes('?') ? '&' : '?'}token=${data.token}`;
        }
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (err: any) {
      console.error(err);
      setSsoError(err.message || err.toString() || 'Passkey verification failed');
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
      const res = await authFetch('/admin/stats/usage');
      if (res.ok) {
        const data = normalizeAnalyticsPayload(await res.json());
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
    const body: any = Object.fromEntries(fd.entries());
    body.use_agent_limit = body.use_agent_limit === 'on' ? true : false;

    try {
      const res = await authFetch('/admin/apps', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (res.ok) {
        fetchApps(); form.reset();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to register app: ${errorData.error || res.statusText}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
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

  const parseLimit = (val: FormDataEntryValue | null): number | null => {
    if (!val || (val as string).trim() === '') return null;
    const n = parseInt(val as string, 10);
    return isNaN(n) ? null : n;
  };

  const updateQuota = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const rpm = parseLimit(fd.get('rpm_limit'));
    const rpd = parseLimit(fd.get('rpd_limit'));
    const tokenK = parseLimit(fd.get('daily_token_limit_k'));
    // convert k → raw tokens
    const dailyTokenLimit = tokenK !== null ? tokenK * 1000 : null;

    const res = await authFetch('/admin/permissions/quota', {
      method: 'PUT',
      body: JSON.stringify({
        uuid: quotaModal.uuid,
        app_id: quotaModal.app_id,
        rpm_limit: rpm,
        rpd_limit: rpd,
        daily_token_limit: dailyTokenLimit
      })
    });
    if (res.ok) {
      setQuotaModal(null);
      fetchPermissions();
    } else {
      const errData = await res.json().catch(() => ({}));
      alert('Failed to update quota: ' + (errData.error || res.status));
    }
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
              <motion.button
                type="button"
                onClick={handlePasskeyLogin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-lg rounded-xl px-4 py-3 shadow-lg transition-all border border-indigo-500/30"
              >
                <KeyRound className="w-6 h-6 text-indigo-400" />
                Continue with Passkey
              </motion.button>
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
        <div className="p-4 md:p-8 md:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg shadow-purple-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                Auth Center
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/admin/passkey`}
                className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-colors"
                title="Manage Passkeys for Admin"
              >
                <KeyRound className="w-5 h-5 text-indigo-400" />
              </Link>
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
          {adminName && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 px-1"
            >
              <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-0.5">Welcome back</p>
              <p className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">
                Hi, {adminName} 👋
              </p>
            </motion.div>
          )}
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

                        <label className="flex items-center gap-3 bg-black/30 border border-white/5 p-3 rounded-xl cursor-pointer hover:bg-black/50 transition-colors">
                          <input type="checkbox" name="use_agent_limit" className="w-5 h-5 accent-emerald-500 rounded focus:ring-emerald-500 focus:ring-2 bg-black/50 border-white/10" />
                          <span className="text-sm font-medium text-emerald-300">是否使用agent 用量限制</span>
                        </label>

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
                          <Link to={`/app/${a.app_id}`} className="block h-full">
                            <div className="flex justify-between items-start mb-4">
                              {(() => {
                                const Icon = getAppIcon(a.app_id); return (
                                  <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-300 rounded-xl">
                                    <Icon className="w-6 h-6" />
                                  </div>
                                );
                              })()}
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.preventDefault(); deleteApp(a.app_id); }}
                                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-auto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                            <h4 className="font-bold text-xl mb-1 text-white flex items-center gap-2">
                              {a.app_name}
                              {a.use_agent_limit === 1 && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Limit On</span>}
                            </h4>
                            <p className="text-xs font-mono text-emerald-300/70 mb-4">{a.app_id}</p>
                            {a.callback_url && <p className="text-sm text-white/50 bg-black/20 p-2 rounded-lg truncate" title={a.callback_url}>{a.callback_url}</p>}
                          </Link>
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
                              const perm = permissions.find(p => p.uuid === user.uuid && p.app_id === app.app_id);
                              const hasAccess = !!perm;
                              return (
                                <td key={`${user.uuid}-${app.app_id}`} className="p-4 border-b border-white/5 text-center border-l border-white/5">
                                  <div className="flex items-center justify-center gap-2">
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

                                    {hasAccess && (
                                      <motion.button
                                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                        onClick={() => setQuotaModal({ uuid: user.uuid, app_id: app.app_id, user_name: user.name, app_name: app.app_name, rpm_limit: perm.rpm_limit, rpd_limit: perm.rpd_limit, daily_token_limit: perm.daily_token_limit })}
                                        className="p-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 ring-1 ring-blue-500/50 transition-colors"
                                        title="Configure Limits"
                                      >
                                        <Settings className="w-5 h-5" />
                                      </motion.button>
                                    )}
                                  </div>
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
              const rawData = statsData?.data || [];
              const data = rawData.filter((item: any) => ACCESS_EVENT_TYPES.has(String(item.event_type || '')));

              // 1. KPI Aggregations
              const totalEvents = data.reduce((acc: number, c: any) => acc + (c.events || 0), 0);
              const uniqueUsers = new Set(data.map((c: any) => c.uuid)).size;

              const getTop = (key: string) => {
                const map: any = {};
                data.forEach((c: any) => {
                  const val = c[key] || 'Unknown';
                  map[val] = (map[val] || 0) + (c.events || 0);
                });
                return Object.entries(map).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';
              };

              const topAppId = getTop('app_id');
              const topApp = apps.find(a => a.app_id === topAppId)?.display_name || topAppId;
              const topBrowser = getTop('browser');
              const topCountry = getTop('country');

              // 2. Daily Trends for AreaChart
              const dailyMap: any = {};
              data.forEach((c: any) => {
                const day = c.day || 'N/A';
                if (!dailyMap[day]) dailyMap[day] = { day, visits: 0, users: new Set() };
                dailyMap[day].visits += c.events;
                dailyMap[day].users.add(c.uuid);
              });
              const dailyData = Object.values(dailyMap).map((d: any) => ({
                day: d.day,
                visits: d.visits,
                users: d.users.size
              })).sort((a: any, b: any) => a.day.localeCompare(b.day));

              // 3. Category Data for Pie/Bar Charts
              const getBreakdown = (key: string, limit = 5) => {
                const map: any = {};
                data.forEach((c: any) => {
                  const val = c[key] || 'Unknown';
                  map[val] = (map[val] || 0) + (c.events || 0);
                });
                return Object.entries(map)
                  .map(([name, value]) => ({ name, value }))
                  .sort((a, b: any) => (b.value as number) - (a.value as number))
                  .slice(0, limit);
              };

              const browsersData = getBreakdown('browser');
              const countriesData = getBreakdown('country');
              const mapCountriesData = getBreakdown('country', 12);
              const eventTypeData = getBreakdown('event_type', 3);
              const appsData = getBreakdown('app_id').map(item => ({
                ...item,
                name: apps.find(a => a.app_id === item.name)?.display_name || item.name
              }));

              const COLORS = ['#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

              return (
                <div className="space-y-8 pb-12">
                  <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl mb-4 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="relative">
                      <h1 className="text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
                        <BarChart3 className="text-purple-400 w-8 h-8" />
                        System Analytics
                      </h1>
                      <p className="text-white/50 text-lg">Real-time access analytics overview of your Auth ecosystem.</p>
                      <p className="text-white/30 text-sm mt-3">
                        Metrics below are aggregated from access events only: <span className="text-white/55">page_view</span>, <span className="text-white/55">login_success</span>, and <span className="text-white/55">sso_auto_login</span>. Quota writes are excluded.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {eventTypeData.map((event: any) => (
                          <span key={event.name} className="px-3 py-1.5 rounded-full border border-white/10 bg-black/20 text-xs text-white/60">
                            {event.name}: {formatCompactNumber(event.value)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 relative">
                      <button onClick={fetchStats} className={`p-4 rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 ${loadingStats ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Activity className={`w-6 h-6 ${loadingStats ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </header>

                  {/* KPI Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Total Visits', value: totalEvents, sub: 'Access events counted', icon: Activity, color: 'blue' },
                      { label: 'Unique Visitors', value: uniqueUsers, sub: 'Distinct user IDs', icon: Users, color: 'purple' },
                      { label: 'Top Browser', value: topBrowser, sub: 'Preferred environment', icon: Globe, color: 'emerald' },
                      { label: 'Hot Application', value: topApp, sub: 'Most active access source', icon: Zap, color: 'amber' },
                    ].map((kpi, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                        key={kpi.label} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all cursor-default group"
                      >
                        <div className={`p-3 rounded-2xl bg-${kpi.color}-500/10 text-${kpi.color}-400 w-fit mb-4 group-hover:scale-110 transition-transform`}>
                          <kpi.icon className="w-6 h-6" />
                        </div>
                        <p className="text-white/40 text-sm font-medium mb-1">{kpi.label}</p>
                        <p className="text-3xl font-bold text-white mb-1 truncate">
                          {loadingStats ? '...' : typeof kpi.value === 'number' ? formatCompactNumber(kpi.value) : kpi.value}
                        </p>
                        <p className="text-xs text-white/20">{kpi.sub}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Trends Chart */}
                  <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2"><Clock className="text-purple-400 w-5 h-5" /> Traffic Distribution</h3>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-purple-400"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Visits</span>
                        <span className="flex items-center gap-1.5 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Unique Users</span>
                      </div>
                    </div>
                    <div className="h-[400px] w-full min-w-0 min-h-[400px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
                        <AreaChart data={dailyData}>
                          <defs>
                            <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} /><stop offset="95%" stopColor="#A855F7" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} tickFormatter={(value) => formatCompactNumber(value)} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number | string) => formatCompactNumber(value)}
                          />
                          <Area type="monotone" dataKey="visits" stroke="#A855F7" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={3} />
                          <Area type="monotone" dataKey="users" stroke="#3B82F6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Breakdowns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Apps */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Zap className="text-amber-400 w-5 h-5" /> Activity by Application</h3>
                      <div className="space-y-4">
                        {appsData.map((app: any, i) => (
                          <div key={app.name} className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 font-bold border border-white/5 group-hover:border-purple-500/50 transition-colors">{i + 1}</div>
                            <div className="flex-1">
                              <div className="flex justify-between items-end mb-2">
                                <span className="text-white font-medium">{app.name}</span>
                                <span className="text-white/40 text-sm">{formatCompactNumber(app.value)} events</span>
                              </div>
                              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }} animate={{ width: `${totalEvents > 0 ? (app.value / totalEvents) * 100 : 0}%` }}
                                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Geo / Browser Mix */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center min-w-0">
                        <h3 className="text-lg font-bold text-white mb-6 self-start flex items-center gap-2"><Globe className="text-emerald-400 w-4 h-4" /> Countries</h3>
                        <div className="h-48 w-full min-w-0 min-h-[12rem]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
                            <RePieChart>
                              <Pie data={countriesData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {countriesData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(value: number | string) => formatCompactNumber(value)} />
                            </RePieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 w-full space-y-2">
                          {countriesData.map((c, i) => (
                            <div key={c.name} className="flex justify-between text-xs items-center text-white/70">
                              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div> {getRegionLabel(c.name)}</span>
                              <span className="text-white/30 font-mono">{formatPercent(totalEvents > 0 ? (c.value / totalEvents) * 100 : 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center min-w-0">
                        <h3 className="text-lg font-bold text-white mb-6 self-start flex items-center gap-2"><PieChart className="text-blue-400 w-4 h-4" /> Browsers</h3>
                        <div className="h-48 w-full min-w-0 min-h-[12rem]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
                            <RePieChart>
                              <Pie data={browsersData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {browsersData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(value: number | string) => formatCompactNumber(value)} />
                            </RePieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 w-full space-y-2">
                          {browsersData.map((b, i) => (
                            <div key={b.name} className="flex justify-between text-xs items-center text-white/70">
                              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div> {b.name}</span>
                              <span className="text-white/30 font-mono">{formatPercent(totalEvents > 0 ? (b.value / totalEvents) * 100 : 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <WorldActivityMap countries={mapCountriesData} topCountry={topCountry} />

                  {/* JSON Footer for debugging */}
                  <details className="mt-12 text-white/10 text-xs">
                    <summary className="cursor-pointer hover:text-white/30 transition-colors">Raw Analytics Payload (access events only)</summary>
                    <pre className="p-4 bg-black/40 rounded-3xl border border-white/5 mt-4 overflow-auto max-h-64">
                      {JSON.stringify(rawData, null, 2)}
                    </pre>
                  </details>
                </div>
              )
            })()}
          </motion.div>
        </AnimatePresence>

        {quotaModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button
                onClick={() => setQuotaModal(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold mb-1 text-blue-300">Usage Limits</h2>
              <p className="text-white/50 text-sm mb-6 pb-4 border-b border-white/10">Configure quota for {quotaModal.user_name} on {quotaModal.app_name}</p>

              <form onSubmit={updateQuota} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Requests Per Minute (RPM)</label>
                  <input name="rpm_limit" type="number" defaultValue={quotaModal.rpm_limit ?? ''} placeholder="Unlimited" className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-white/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Requests Per Day (RPD)</label>
                  <input name="rpd_limit" type="number" defaultValue={quotaModal.rpd_limit ?? ''} placeholder="Unlimited" className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-white/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Tokens Per Day (k)</label>
                  <input
                    name="daily_token_limit_k"
                    type="number"
                    defaultValue={quotaModal.daily_token_limit != null ? Math.round(quotaModal.daily_token_limit / 1000) : ''}
                    placeholder="Unlimited"
                    min="0"
                    step="1"
                    className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-white/20"
                  />
                  <p className="text-xs text-white/30 mt-1">Enter in thousands. e.g. 100 = 100k tokens/day</p>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setQuotaModal(null)} className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg transition-colors">Save Quota</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
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
      <Route path="/:uuid/passkey" element={<PasskeyManage />} />
      <Route path="/app/:appId" element={<AppDetails />} />
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  );
}
