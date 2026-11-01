ALTER TABLE jag.predictions ADD COLUMN edits INTEGER NOT NULL DEFAULT 0 CHECK(edits BETWEEN 0 AND 1);
ALTER TABLE jag.explorations ADD COLUMN edits INTEGER NOT NULL DEFAULT 0 CHECK(edits BETWEEN 0 AND 1);
ALTER TABLE jag.explorations DROP CONSTRAINT explorations_slot_check;
ALTER TABLE jag.explorations ADD CONSTRAINT explorations_slot_check CHECK(slot BETWEEN 1 AND 6);
UPDATE jag.predictions SET edits=1 WHERE EXISTS(SELECT 1 FROM jag.ad_tickets a WHERE a.user_id=predictions.user_id AND a.purpose='edit' AND a.target='daily/'||predictions.question_id AND a.consumed_at IS NOT NULL);
UPDATE jag.explorations SET edits=1 WHERE EXISTS(SELECT 1 FROM jag.ad_tickets a WHERE a.user_id=explorations.user_id AND a.purpose='edit' AND a.target='personal/'||explorations.id AND a.consumed_at IS NOT NULL);
CREATE TABLE jag.daily_ad_progress(
 user_id TEXT NOT NULL,
 day TEXT NOT NULL,
 bonuses INTEGER NOT NULL DEFAULT 0 CHECK(bonuses BETWEEN 0 AND 3),
 progress INTEGER NOT NULL DEFAULT 0,
 goal INTEGER NOT NULL CHECK(goal BETWEEN 1 AND 3),
 completed INTEGER NOT NULL DEFAULT 0 CHECK(completed BETWEEN 0 AND 9),
 CHECK(progress>=0 AND progress<goal),
 PRIMARY KEY(user_id,day)
);
ALTER TABLE jag.daily_ad_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jag.daily_ad_progress FROM PUBLIC,anon,authenticated;
