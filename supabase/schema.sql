CREATE SCHEMA jag;
REVOKE ALL ON SCHEMA jag FROM PUBLIC,anon,authenticated;
CREATE TABLE jag.source_cache (
	key text PRIMARY KEY NOT NULL,
	value text NOT NULL,
	expires bigint NOT NULL
);

CREATE TABLE jag.friends (
	from_id text NOT NULL,
	to_id text NOT NULL,
	status text DEFAULT 'pending' NOT NULL,
	created text NOT NULL,
	PRIMARY KEY(from_id, to_id)
);

CREATE TABLE jag.practice (
	user_id text NOT NULL,
	id text NOT NULL,
	day text NOT NULL,
	choice integer NOT NULL,
	confidence integer NOT NULL,
	score double precision NOT NULL,
	created text NOT NULL,
	PRIMARY KEY(user_id, id, day)
);

CREATE TABLE jag.predictions (
	user_id text NOT NULL,
	question_id text NOT NULL,
	choice integer NOT NULL,
	confidence integer NOT NULL,
	created text NOT NULL,
	updated text NOT NULL,
	score double precision,
	seen integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(user_id, question_id)
);

CREATE TABLE jag.questions (
	id text PRIMARY KEY NOT NULL,
	day text NOT NULL,
	position integer NOT NULL,
	category text NOT NULL,
	title text NOT NULL,
	context text NOT NULL,
	options text NOT NULL,
	close_at text NOT NULL,
	resolve_at text NOT NULL,
	source text NOT NULL,
	source_url text NOT NULL,
	rule text NOT NULL,
	status text DEFAULT 'open' NOT NULL,
	outcome integer,
	evidence text,
	resolved_at text,
	checked_at text
);

CREATE TABLE jag.app_settings (
	key text PRIMARY KEY NOT NULL,
	value text NOT NULL
);

CREATE TABLE jag.users (
	id text PRIMARY KEY NOT NULL,
	name text NOT NULL,
	code text NOT NULL,
	created text NOT NULL,
	preferences text DEFAULT '{}' NOT NULL,
	onboarded integer DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX users_code_unique ON jag.users (code);
CREATE TABLE jag.accounts(user_id TEXT PRIMARY KEY NOT NULL,username TEXT UNIQUE,password_hash TEXT,created_at TEXT NOT NULL);
CREATE TABLE jag.sessions(token_hash TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL);
CREATE INDEX sessions_user_idx ON jag.sessions(user_id);
CREATE INDEX predictions_question_idx ON jag.predictions(question_id);
CREATE INDEX questions_resolution_idx ON jag.questions(status,resolve_at);
CREATE INDEX questions_day_idx ON jag.questions(day,position);
CREATE TABLE jag.auth_limits(key TEXT PRIMARY KEY NOT NULL,count INTEGER NOT NULL,reset_at BIGINT NOT NULL);

ALTER TABLE jag.sessions ADD CONSTRAINT sessions_account_fk FOREIGN KEY(user_id) REFERENCES jag.accounts(user_id) ON DELETE CASCADE;
ALTER TABLE jag.source_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE jag.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE jag.practice ENABLE ROW LEVEL SECURITY;
ALTER TABLE jag.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jag.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jag.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jag.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jag.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jag.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jag.auth_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA jag FROM PUBLIC,anon,authenticated;
