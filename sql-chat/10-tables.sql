-- init the tables -*- mode: sql -*-

CREATE SEQUENCE IF NOT EXISTS chat_id;

CREATE TABLE IF NOT EXISTS chat (
"id" integer, -- should probably be a string
"name" text,
"members" json
);

SELECT create_or_replace_replication_trigger('chat');

-- end
