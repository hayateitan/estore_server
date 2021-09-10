DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `select_messages`(IN `user1` VARCHAR(200), IN `user2` VARCHAR(200))
select * 
from Messages 
where 
	(trim(fromm) = user1 and trim(too) = user2)
    OR
    (trim(fromm) = user2 and trim(too) = user1)$$
DELIMITER ;
