-- Organizers can hide a recorded winner (for example, one left behind by a
-- test poll). Hidden wins stay on record and can be shown again, but they no
-- longer flag a restaurant as a previous winner during nominations and voting.

alter table public.winner_history add column hidden_at timestamptz;
