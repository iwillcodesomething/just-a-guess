CREATE TABLE accounts(user_id TEXT PRIMARY KEY NOT NULL,username TEXT UNIQUE,password_hash TEXT,created_at TEXT NOT NULL);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX predictions_question_idx ON predictions(question_id);
CREATE INDEX questions_resolution_idx ON questions(status,resolve_at);
CREATE INDEX questions_day_idx ON questions(day,position);
CREATE TABLE auth_limits(key TEXT PRIMARY KEY NOT NULL,count INTEGER NOT NULL,reset_at INTEGER NOT NULL);
