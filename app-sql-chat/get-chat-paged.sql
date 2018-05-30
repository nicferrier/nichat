-- get the messages for a specific chat

select *
from messages
where chatname = $1
and "when" > $2
order by "when"
limit 100;

-- end
