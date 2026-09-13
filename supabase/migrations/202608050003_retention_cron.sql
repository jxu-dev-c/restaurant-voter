-- Anonymize lightweight voter identifiers 90 days after a poll closes.

create extension if not exists pg_cron;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'restaurant-voter-anonymize-closed-polls'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'restaurant-voter-anonymize-closed-polls',
    '15 3 * * *',
    'select public.anonymize_closed_poll_voters();'
  );
end;
$$;

revoke usage on schema cron from anon, authenticated;

