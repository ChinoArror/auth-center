DROP TABLE IF EXISTS user_apps;
DROP TABLE IF EXISTS apps;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_plain TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'paused'
    cookie_expiry_days INTEGER NOT NULL DEFAULT 7,
    github_id TEXT UNIQUE,
    birthday TEXT,
    avatar_data TEXT,
    avatar_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE apps (
    app_id TEXT PRIMARY KEY,
    app_name TEXT NOT NULL,
    callback_url TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    use_agent_limit INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_apps (
    uuid TEXT NOT NULL,
    app_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    rpm_limit INTEGER,
    rpd_limit INTEGER,
    daily_token_limit INTEGER,
    used_tokens_today INTEGER DEFAULT 0,
    used_requests_today INTEGER DEFAULT 0,
    last_reset_date TEXT,
    PRIMARY KEY (uuid, app_id),
    FOREIGN KEY (uuid) REFERENCES users(uuid) ON DELETE CASCADE,
    FOREIGN KEY (app_id) REFERENCES apps(app_id) ON DELETE CASCADE
);

CREATE INDEX idx_users_uuid ON users(uuid);
CREATE INDEX idx_users_username ON users(username);

CREATE TABLE passkeys (
    id TEXT PRIMARY KEY,
    uuid TEXT NOT NULL,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL,
    name TEXT DEFAULT 'My Passkey',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_passkeys_uuid ON passkeys(uuid);

CREATE TABLE user_sessions (
    session_id TEXT PRIMARY KEY,
    uuid TEXT NOT NULL,
    username TEXT NOT NULL,
    login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    browser TEXT,
    device_type TEXT,
    app_id TEXT,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uuid) REFERENCES users(uuid) ON DELETE CASCADE
);
CREATE INDEX idx_user_sessions_uuid ON user_sessions(uuid);
CREATE INDEX idx_user_sessions_active ON user_sessions(uuid, revoked_at, expires_at);

CREATE TABLE register_codes (
    code TEXT PRIMARY KEY,
    template_name TEXT,
    config_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unused',
    used_by_uuid TEXT,
    used_by_username TEXT,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_register_codes_status ON register_codes(status);
CREATE INDEX idx_register_codes_created_at ON register_codes(created_at);
