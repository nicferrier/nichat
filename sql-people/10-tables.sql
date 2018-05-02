-- init the table -*- mode: sql -*-

CREATE SEQUENCE IF NOT EXISTS chat_user_id;

CREATE TABLE IF NOT EXISTS chat_user (
"id" integer,
"name" text,
"email" text,
"enabled" boolean
);

SELECT create_or_replace_replication_trigger('chat_user');


CREATE TABLE IF NOT EXISTS user_password (
"id" integer,
"password" text
);


SELECT create_or_replace_replication_trigger('user_password');


CREATE SEQUENCE IF NOT EXISTS user_photo_id;


CREATE TABLE IF NOT EXISTS user_photo (
"id" integer,
"user_id" integer,
"data" text,
"created" timestamp with time zone,
"profile" boolean
);


SELECT create_or_replace_replication_trigger('user_photo');


CREATE SEQUENCE IF NOT EXISTS user_log_id;


CREATE TABLE IF NOT EXISTS user_log (
"id" integer,
"time" timestamp with time zone,
"action" text,
"data" json
);


SELECT create_or_replace_replication_trigger('user_log');


-- ends here
