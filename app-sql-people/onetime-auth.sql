-- Do the one time auth from the chat system -*- mode: sql -*-

select sess->>'user' as "user"
from session
where sess::jsonb @> ('{"onetime": "'|| $1 || '"}')::jsonb;

-- end
