-- get the chats -*- mode: sql -*-

select "name", members
from chat
where members::jsonb ? $1;
-- and members::jsonb  

-- Ends here
