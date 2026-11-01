ALTER TABLE questions ADD COLUMN actual_value REAL;
ALTER TABLE explorations ADD COLUMN actual_value REAL;
CREATE TABLE result_bonuses(
 user_id TEXT NOT NULL,
 question_id TEXT NOT NULL,
 scope TEXT NOT NULL CHECK(scope IN ('daily','personal')),
 multiplier INTEGER NOT NULL CHECK(multiplier IN (0,1,2,5,10)),
 xp INTEGER NOT NULL CHECK(xp IN (0,10,20,50,100)),
 claimed_at TEXT NOT NULL,
 PRIMARY KEY(user_id,question_id,scope)
);
