insert into fabric_types (name) values
  ('Malha PV'),
  ('Malha algodão'),
  ('Tecido tricoline algodão'),
  ('Helanquinha'),
  ('Piquet'),
  ('Helanca colegial'),
  ('Brim'),
  ('Jeans'),
  ('Dryfit'),
  ('Malha proteção UV')
on conflict (name) do nothing;

insert into settings (id) values (1)
on conflict (id) do nothing;
