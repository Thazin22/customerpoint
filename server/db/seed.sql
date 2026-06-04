insert into customers (name, phone, email)
values
  ('Daw Mya', '09900000001', 'mya@example.com'),
  ('Ko Aung', '09900000002', null)
on conflict (phone) do nothing;

insert into point_transactions (customer_id, type, points, purchase_amount, note)
select id, 'earn', 25, 25000, 'Seed purchase'
from customers
where phone = '09900000001'
  and not exists (
    select 1 from point_transactions pt
    where pt.customer_id = customers.id and pt.note = 'Seed purchase'
  );

