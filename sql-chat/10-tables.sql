-- init the tables -*- mode: sql -*-

CREATE SEQUENCE IF NOT EXISTS chat_id;

CREATE TABLE IF NOT EXISTS chat (
"id" integer, -- should probably be a string
"name" text,
"members" json
);

SELECT create_or_replace_replication_trigger('chat');


-- Messages are the things that we send each other

CREATE SEQUENCE IF NOT EXISTS message_id;

CREATE TABLE IF NOT EXISTS message (
"id" INTEGER,
"chatname" TEXT,
"from" TEXT,
"to" TEXT,
"when" TIMESTAMP WITH TIME ZONE,
"msg" json
);

SELECT create_or_replace_replication_trigger('message');


-- Artifacts are things like photos in chats

CREATE SEQUENCE IF NOT EXISTS artifact_id;

CREATE TABLE IF NOT EXISTS artifact (
"id" INTEGER,
"filename" text,
"data" text,
"created" TIMESTAMP WITH TIME ZONE
);


SELECT create_or_replace_replication_trigger('artifact');


-- Eliza talks on chats if you want her to

CREATE SEQUENCE IF NOT EXISTS eliza_chat_id;

CREATE TABLE IF NOT EXISTS eliza_chat (
"id" INTEGER,
"chat_id" INTEGER,
"identity" text,
"is_on" BOOLEAN
);

CREATE UNIQUE INDEX IF NOT EXISTS eliza_chat_ids_identities
ON eliza_chat (chat_id, identity);

SELECT create_or_replace_replication_trigger('artifact');

-- end
