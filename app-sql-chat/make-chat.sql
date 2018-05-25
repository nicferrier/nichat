-- make the chat -*- mode: sql -*-

insert into chat (id, name, members) 
values (
nextval('chat_id'),
uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
$1)
returning name;

-- End
