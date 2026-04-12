import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Github, KeyRound, LockKeyhole, MonitorSmartphone, Settings2, UserCircle2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  UserLogoutButton,
  UserPortalLoading,
  UserPortalScaffold,
  formatDateTime,
  useRequiredUserSession,
} from './userPortal';

const ACTIONS = [
  {
    key: 'profile',
    title: 'Edit Profile',
    description: 'Open a dedicated profile settings page for your full name, birthday, and avatar.',
    icon: Settings2,
    href: (uuid: string) => `/${uuid}/edit`,
  },
  {
    key: 'github',
    title: 'Bind GitHub',
    description: 'Connect GitHub to your account using your current signed-in session.',
    icon: Github,
    href: (uuid: string) => `/${uuid}/sso-binding`,
  },
  {
    key: 'passkey',
    title: 'Bind Passkey',
    description: 'Add or manage passkeys without typing your password again.',
    icon: KeyRound,
    href: (uuid: string) => `/${uuid}/passkey`,
  },
  {
    key: 'password',
    title: 'Change Password',
    description: 'Set a new password directly from your authenticated session.',
    icon: LockKeyhole,
    href: (uuid: string) => `/${uuid}/change-password`,
  },
  {
    key: 'sessions',
    title: 'Login Sessions',
    description: 'Review active sessions, device information, apps, and expiry times.',
    icon: MonitorSmartphone,
    href: () => '/session',
  },
];

export default function UserHome() {
  const { uuid } = useParams();
  const { session, loading } = useRequiredUserSession(uuid);

  return (
    <UserPortalScaffold
      title="Account Center"
      description="Use the cards below to open profile settings, linked sign-in methods, password, and active sessions."
      actions={<UserLogoutButton />}
    >
      {loading || !session ? (
        <UserPortalLoading />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="ui-card p-5 md:col-span-2">
              <div className="flex items-start gap-4">
                {session.avatar_url ? (
                  <img src={session.avatar_url} alt={`${session.name || session.username} avatar`} className="h-16 w-16 rounded-full object-cover ring-1 ring-[var(--border)]" />
                ) : (
                  <div className="ui-logo-badge h-16 w-16">
                    <UserCircle2 className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Signed in as</p>
                  <h2 className="mt-2 truncate text-xl font-semibold text-[var(--text-primary)]">{session.name || session.username}</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">@{session.username}</p>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">UUID: <span className="font-mono text-[var(--text-primary)]">{session.uuid}</span></p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Birthday: <span className="text-[var(--text-primary)]">{session.birthday || 'Not set'}</span></p>
                </div>
              </div>
            </div>
            <div className="ui-card-subtle p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Current session</p>
              <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{formatDateTime(session.session?.login_at)}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Expires {formatDateTime(session.session?.expires_at)}
              </p>
              <Link to="/session" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] no-underline">
                View session details
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {ACTIONS.map((action, index) => (
              <motion.div
                key={action.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={action.href(session.uuid)} className="ui-card flex h-full min-h-[172px] flex-col justify-between p-5 no-underline transition-transform duration-150 hover:-translate-y-0.5">
                  <div>
                    <div className="ui-logo-badge h-11 w-11">
                      <action.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{action.title}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{action.description}</p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </UserPortalScaffold>
  );
}
