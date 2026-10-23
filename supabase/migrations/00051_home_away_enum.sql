-- K4b: ledger types for Home & Away and Coming Home. Added alone so they're committed before 00052 uses them.
alter type public.ledger_type add value if not exists 'home_away';
alter type public.ledger_type add value if not exists 'trip';
