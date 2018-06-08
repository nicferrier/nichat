-- Is Eliza on for this chat and this identity?

SELECT is_on, identity
FROM eliza_chat
WHERE chat_id = (SELECT id
                 FROM chat
                 WHERE name = $1);

-- End
