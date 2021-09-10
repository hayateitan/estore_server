DELIMITER $$
CREATE DEFINER=`root`@`localhost` PROCEDURE `commande_detail`(
	id int
)
select u.username, u.email, c.id as commande_id, c.addresse, p.title, p.subtitle, a.price, a.quantity
from user u
inner join commande c
on u.id = c.userid
inner join articles a
on c.id = a.id_commande
inner join product p
on p.id = a.id_product
where c.id = id$$
DELIMITER ;
