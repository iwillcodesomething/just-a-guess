ALTER TABLE jag.questions ADD COLUMN actual_value DOUBLE PRECISION;
ALTER TABLE jag.explorations ADD COLUMN actual_value DOUBLE PRECISION;
CREATE TABLE jag.result_bonuses(
 user_id TEXT NOT NULL,
 question_id TEXT NOT NULL,
 scope TEXT NOT NULL CHECK(scope IN ('daily','personal')),
 multiplier INTEGER NOT NULL CHECK(multiplier IN (0,1,2,5,10)),
 xp INTEGER NOT NULL CHECK(xp IN (0,10,20,50,100)),
 claimed_at TEXT NOT NULL,
 PRIMARY KEY(user_id,question_id,scope)
);
ALTER TABLE jag.result_bonuses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jag.result_bonuses FROM PUBLIC,anon,authenticated;
