ALTER TABLE predictions ADD COLUMN edits INTEGER NOT NULL DEFAULT 0 CHECK(edits BETWEEN 0 AND 1);
CREATE TABLE explorations_new (
 user_id TEXT NOT NULL,
 id TEXT NOT NULL,
 day TEXT NOT NULL,
 slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 6),
 category TEXT NOT NULL,
 question TEXT NOT NULL,
 choice INTEGER NOT NULL,
 confidence INTEGER NOT NULL,
 created TEXT NOT NULL,
 close_at TEXT NOT NULL,
 resolve_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open',
 outcome INTEGER,
 score REAL,
 evidence TEXT,
 checked_at TEXT,
 resolved_at TEXT,
 seen INTEGER NOT NULL DEFAULT 0,
 edits INTEGER NOT NULL DEFAULT 0 CHECK(edits BETWEEN 0 AND 1),
 PRIMARY KEY(user_id,id),
 UNIQUE(user_id,day,slot)
);
INSERT INTO explorations_new(user_id,id,day,slot,category,question,choice,confidence,created,close_at,resolve_at,status,outcome,score,evidence,checked_at,resolved_at,seen) SELECT user_id,id,day,slot,category,question,choice,confidence,created,close_at,resolve_at,status,outcome,score,evidence,checked_at,resolved_at,seen FROM explorations;
DROP TABLE explorations;
ALTER TABLE explorations_new RENAME TO explorations;
CREATE INDEX explorations_due_idx ON explorations(status,resolve_at);
UPDATE predictions SET edits=1 WHERE EXISTS(SELECT 1 FROM ad_tickets a WHERE a.user_id=predictions.user_id AND a.purpose='edit' AND a.target='daily/'||predictions.question_id AND a.consumed_at IS NOT NULL);
UPDATE explorations SET edits=1 WHERE EXISTS(SELECT 1 FROM ad_tickets a WHERE a.user_id=explorations.user_id AND a.purpose='edit' AND a.target='personal/'||explorations.id AND a.consumed_at IS NOT NULL);
CREATE TABLE daily_ad_progress(
 user_id TEXT NOT NULL,
 day TEXT NOT NULL,
 bonuses INTEGER NOT NULL DEFAULT 0 CHECK(bonuses BETWEEN 0 AND 3),
 progress INTEGER NOT NULL DEFAULT 0,
 goal INTEGER NOT NULL CHECK(goal BETWEEN 1 AND 3),
 completed INTEGER NOT NULL DEFAULT 0 CHECK(completed BETWEEN 0 AND 9),
 CHECK(progress>=0 AND progress<goal),
 PRIMARY KEY(user_id,day)
);
