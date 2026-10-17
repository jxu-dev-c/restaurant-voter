-- An organizer may end a poll before voting opens. That poll closes with no
-- result, which is recorded as its own outcome. The value is added alone
-- because a new enum value cannot be used in the transaction that adds it.
alter type public.poll_outcome_status add value if not exists 'cancelled';
