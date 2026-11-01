CREATE TABLE ad_tickets(
 id TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL,
 purpose TEXT NOT NULL,
 target TEXT NOT NULL,
 mode TEXT NOT NULL,
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 verified_at TEXT,
 transaction_id TEXT UNIQUE,
 consumed_at TEXT,
 consumption TEXT
);
CREATE INDEX ad_tickets_user_idx ON ad_tickets(user_id,created_at);
