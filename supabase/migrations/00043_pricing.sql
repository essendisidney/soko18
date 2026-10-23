-- K0 pricing (docs/KUTANA_NEXT.md). Shelf prices are VAT-inclusive.
--   gold_day           KES 39   new: Gold for 24 hours ("Friday night pass")
--   gold_week_student  KES 99   new: verified students only (server-checked via requires_campus);
--                               replaces Comrade Gold (comrade_week 49, comrade_month 199)
--   platinum_month     KES 1,299 (was 999). Members who already bought keep their period:
--                               plans never auto-renew, so nobody is charged the new price unasked.
-- Unchanged: gold_week 149, gold_month 499, boosts 99/399, super likes 49/199, incognito 299.
-- Other markets keep their draft prices (set by local buying power, never FX conversion).

insert into public.products (sku, title, line, amount_kes, kind, plan, days, quantity, bonus_super_likes, bonus_boosts, is_active, sort_order, requires_campus)
values
  ('gold_day', 'Gold · 24 hours', 'Unlimited likes and see who likes you, for one night out.', 39, 'plan', 'gold', 1, 1, 0, 0, true, 5, false),
  ('gold_week_student', 'Student Gold · 7 days', 'Gold at a student price, 3 Super Likes. Verified students only.', 99, 'plan', 'gold', 7, 1, 3, 0, true, 12, true)
on conflict (sku) do update set
  title = excluded.title,
  line = excluded.line,
  amount_kes = excluded.amount_kes,
  kind = excluded.kind,
  plan = excluded.plan,
  days = excluded.days,
  quantity = excluded.quantity,
  bonus_super_likes = excluded.bonus_super_likes,
  bonus_boosts = excluded.bonus_boosts,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  requires_campus = excluded.requires_campus;

update public.products set amount_kes = 1299 where sku = 'platinum_month';

-- Comrade Gold is retired. The rows stay (old transactions point at them) but can't be bought.
update public.products set is_active = false where sku in ('comrade_week', 'comrade_month');
delete from public.product_prices where sku in ('comrade_week', 'comrade_month');

insert into public.product_prices (sku, country_code, currency, amount) values
  ('gold_day', 'KE', 'KES', 39),
  ('gold_week_student', 'KE', 'KES', 99),
  ('platinum_month', 'KE', 'KES', 1299)
on conflict (sku, country_code) do update set amount = excluded.amount, currency = excluded.currency;
