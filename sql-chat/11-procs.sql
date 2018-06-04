-- procs for chat

CREATE OR REPLACE FUNCTION makeChat (json)
RETURNS TEXT
as $$
declare
  invitees ALIAS FOR $1;
  chatName text;
begin
  select name into chatName
    from chat
    where members::jsonb @> invitees::jsonb;
  if NOT FOUND
  then
    insert into chat (id, name, members) 
    values (
      nextval('chat_id'),
      uuid_in(md5(random()::text || clock_timestamp()::text)::cstring),
      invitees
    )
    returning name into chatName;
  end if;
  return chatName;
end;
$$ LANGUAGE plpgsql;

-- end
