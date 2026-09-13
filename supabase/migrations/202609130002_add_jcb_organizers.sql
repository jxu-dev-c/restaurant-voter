-- Reserved migration version: deployment-specific organizer provisioning was
-- removed from the public source to avoid distributing personal information.
-- This version is already applied on the existing deployment. Keeping the same
-- filename/version preserves migration tracking; no database rows are changed.
-- New deployments must add their own organizers as described in README.md.
select 1;
