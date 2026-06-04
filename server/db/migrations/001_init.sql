create table if not exists customers (
  id bigserial primary key,
  name text not null,
  phone text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists point_transactions (
  id bigserial primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  type text not null check (type in ('earn', 'redeem', 'adjustment')),
  points integer not null check (points <> 0),
  purchase_amount numeric(12, 2),
  redemption_value numeric(12, 2),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_point_transactions_customer_id
  on point_transactions(customer_id);

create index if not exists idx_point_transactions_created_at
  on point_transactions(created_at desc);

create or replace view customer_point_balances as
select
  c.id as customer_id,
  coalesce(sum(pt.points), 0)::integer as balance
from customers c
left join point_transactions pt on pt.customer_id = c.id
group by c.id;

