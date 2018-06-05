-- add a message

INSERT INTO message (
  "id",
  "chatname", "from", "to", "msg",
  "when"
)
VALUES (
  nextval('message_id'),
  $1, $2, $3, $4,
  now()
);

-- end
