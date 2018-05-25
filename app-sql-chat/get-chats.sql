-- get the chats -*- mode: sql -*-

select "name"
from chat
where members::jsonb ? $1;

-- Ends here
