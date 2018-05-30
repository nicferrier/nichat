-- get the messages for a specific chat

select *
from message
where chatname = $1
order by "when"
limit 100;

-- end
