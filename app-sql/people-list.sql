select u.id, u.name, p.data 
from chat_user u join user_photo p on u.id=p.user_id 
where u.enabled = true;
