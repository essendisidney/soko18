-- Pin search_path on helper functions (Supabase advisor 0011).
alter function private.set_updated_at() set search_path = public;
alter function private.forbid_ledger_mutation() set search_path = public;
alter function private.forbid_audit_mutation() set search_path = public;
alter function private.nairobi_today() set search_path = public;
alter function private.forbid_paid_flags_on_insert() set search_path = public;
