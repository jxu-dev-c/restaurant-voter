# Security policy

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/jxu-dev-c/restaurant-voter/security/advisories/new)
to report suspected vulnerabilities. If the private form is unavailable, open an
issue requesting a private contact channel without including vulnerability details.
Do not publish exploit details or credentials in a public issue.

Include the affected commit or version, prerequisites, reproduction steps using
synthetic data, expected impact, and a suggested fix if available. Remove tokens,
personal information, and real referral links from evidence. Test only on an
instance you control.

## Maintenance scope

Security fixes target the latest code on `main`; older releases do not have a
separate backport commitment. This is a community project with no guaranteed
response time. Publishing source does not certify a deployment as secure.

## Deployment boundaries

- Supabase secret/service-role keys and signing secrets must stay on the server.
- Organizer authorization comes from a verified session and a server-managed team
  allowlist. Browser roles must not gain direct access to poll tables or RPCs.
- Referral links are bearer access grants. Anyone receiving a valid link can join.
- Voter identity depends on browser cookies. Clearing cookies or using another
  browser can create another ballot; this is not a verified-identity voting system.
- Google browser keys require appropriate referrer/API restrictions. Public code
  and a publishable Supabase key do not replace server authorization or quotas.

Use separate credentials and databases for local, preview, and production
environments. Review dependency advisories and the release guide before deployment.
