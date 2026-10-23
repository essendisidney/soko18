-- Salamu (K2): its own ledger type. Added alone so the value is committed before 00046 uses it.
alter type public.ledger_type add value if not exists 'salamu';
