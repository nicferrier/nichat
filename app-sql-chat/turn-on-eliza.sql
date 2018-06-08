-- Turn on Eliza

INSERT INTO eliza_chat (id, chat_id, identity, is_on)
SELECT nextval('eliza_chat_id'), id, $2, $3
FROM chat
WHERE name = $1
ON CONFLICT (chat_id, identity)
  DO UPDATE SET is_on = $3
  WHERE eliza_chat.identity = $2
    AND eliza_chat.chat_id = (SELECT id FROM chat WHERE name = $1);

-- Ends here
