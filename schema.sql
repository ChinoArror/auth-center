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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE apps (
    app_id TEXT PRIMARY KEY,
    app_name TEXT NOT NULL,
    callback_url TEXT NOT NULL,
    secret_key TEXT NOT NULL,
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
