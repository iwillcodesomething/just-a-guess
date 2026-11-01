CREATE TABLE jag.explorations (
 user_id TEXT NOT NULL,
 id TEXT NOT NULL,
 day TEXT NOT NULL,
 slot INTEGER NOT NULL CHECK(slot IN (1,2)),
 category TEXT NOT NULL,
 question TEXT NOT NULL,
 choice INTEGER NOT NULL,
 confidence INTEGER NOT NULL,
 created TEXT NOT NULL,
 close_at TEXT NOT NULL,
 resolve_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open',
 outcome INTEGER,
 score DOUBLE PRECISION,
 evidence TEXT,
 checked_at TEXT,
 resolved_at TEXT,
 seen INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,id),
 UNIQUE(user_id,day,slot)
);
CREATE INDEX explorations_due_idx ON jag.explorations(status,resolve_at);

ALTER TABLE jag.explorations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jag.explorations FROM PUBLIC,anon,authenticated;
