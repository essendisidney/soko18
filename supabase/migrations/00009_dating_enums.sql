-- Dating pivot, part 1: enum values. Kept separate because Postgres will not
-- use a newly added enum value inside the same transaction that adds it.

alter type public.ledger_type add value if not exists 'gold';
alter type public.ledger_type add value if not exists 'platinum';
alter type public.ledger_type add value if not exists 'super_like';
alter type public.ledger_type add value if not exists 'incognito';

alter type public.like_kind add value if not exists 'super';

alter type public.report_reason add value if not exists 'paid_services';
