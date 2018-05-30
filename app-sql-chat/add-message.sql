-- add a message

insert into message (
id,
chatname,
from,
to,
when,
msg)
values (
nextval('message_id'),
$1, $2, $3,
now(),
$4
);

-- end
