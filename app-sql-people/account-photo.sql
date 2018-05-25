select data
from chat_user u, user_photo p 
where p.user_id = u.id 
and u.enabled=true 
and u.email=$1;
