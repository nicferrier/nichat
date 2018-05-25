-- Session stuff taken from connect-pg-simple/table.sql  -*- mode: sql -*-

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);


-- This is no good, it's not replayable and if we did it on a running server... meh.
-- ALTER TABLE "session"
-- ADD CONSTRAINT "session_pkey"
-- PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- End
