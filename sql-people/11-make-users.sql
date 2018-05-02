-- User creation stuff - creates the user and the password for the user

CREATE OR REPLACE FUNCTION make_user(username text, email text, password text, photo text)
RETURNS INTEGER AS $$
declare new_user_id integer; new_photo_id integer;
begin
    select nextval('chat_user_id') into new_user_id;
    -- make the new user record
    insert into chat_user (id, name, email, enabled)
    values (new_user_id, username, email, true);
    -- insert the password matching the user
    insert into user_password (id, password)
    values (new_user_id, password);
    -- now the photo
    select nextval('user_photo_id') into new_photo_id;
    insert into user_photo (id, user_id, data, created, profile)
    values (new_photo_id, new_user_id, photo, now(), true);
    -- return the user id
    RETURN new_user_id;
end;
$$ LANGUAGE plpgsql;

-- end
