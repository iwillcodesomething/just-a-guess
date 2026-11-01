CREATE TABLE jag.ad_tickets(
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
CREATE INDEX ad_tickets_user_idx ON jag.ad_tickets(user_id,created_at);

ALTER TABLE jag.ad_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jag.ad_tickets FROM PUBLIC,anon,authenticated;
