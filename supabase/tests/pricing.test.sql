begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- K0 prices (docs/KUTANA_NEXT.md), as the database enforces them at checkout.
select is((select amount::int from public.product_prices where sku = 'gold_day' and country_code = 'KE'), 39, 'Gold day pass is KES 39');
select is((select days from public.products where sku = 'gold_day'), 1, 'and lasts one day');
select is((select amount::int from public.product_prices where sku = 'gold_week_student' and country_code = 'KE'), 99, 'Student Gold week is KES 99');
select ok((select requires_campus from public.products where sku = 'gold_week_student'), 'and needs a verified campus');
select is((select amount::int from public.product_prices where sku = 'platinum_month' and country_code = 'KE'), 1299, 'Platinum is KES 1,299');
select is((select count(*)::int from public.products where sku like 'comrade_%' and is_active), 0, 'Comrade Gold can no longer be bought');

select * from finish();
rollback;
