# LunchPick free-tier cost review

Reviewed: 2026-09-11 (America/Halifax). Requirement: no paid plans, payment details, paid overages, or purchases.

## Decision

The additional organizer email service can run at $0 using Resend Free, the existing Supabase Free project, and DNS records on the domain already owned at Cloudflare. Free-tier exhaustion must cause unavailable sign-in emails or paused service, not an upgrade.

This does **not** establish a $0 guarantee for the existing Google Maps integration. Its billing and quota settings need a separate check before expanding usage.

## Fees and relevant limits

| Service | Free allowance | What happens at the limit / constraints |
| --- | --- | --- |
| Resend transactional email | $0/month; 100 emails/day; 3,000/month; 3 sending domains; SMTP included | Free has no paid overages. Daily or monthly quota exhaustion rejects requests. Sent and received mail both count. Use sending only for this app. |
| Supabase Free | 50,000 monthly active users; 500 MB database; 5 GB egress; 1 GB file storage; custom SMTP included | Free projects may pause after one inactive week. Keep the current Free plan; do not enable paid add-ons. |
| Vercel Hobby | $0; 100 GB fast data transfer plus included function/build allowances | Hobby deployments can pause when free usage is exhausted. No upgrade to Pro or trial. Existing account verified as active Hobby. |
| Cloudflare DNS | Authoritative DNS and DNS record management are free | Use a subdomain of the existing domain. No domain purchase, registrar transfer, or paid Cloudflare product is needed. Existing domain renewal is outside this change. |

Sources: [Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing), [Resend quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits), [quota errors](https://resend.com/docs/api-reference/errors), [SMTP support](https://resend.com/pricing), [Supabase pricing](https://supabase.com/pricing), [Vercel plans and exhaustion behavior](https://vercel.com/docs/plans), [Cloudflare DNS](https://www.cloudflare.com/products/dns/).

Resend requires verification of a domain the account owner controls. Its shared testing domain cannot deliver to arbitrary organizers. Use a dedicated email subdomain and add only the requested verification records. No new inbound mailbox is needed. [Domain requirements](https://resend.com/docs/dashboard/domains/introduction)

Only organizers need account emails. Voters continue joining by referral link without accounts, so voter traffic does not itself consume the email quota.

## Existing Google Maps cost exposure

Google Maps, Places, and Routes use paid usage beyond monthly free allowances. Representative current global allowances and the first paid tier are:

| SKU | Free monthly events | First paid tier, USD per 1,000 events |
| --- | ---: | ---: |
| Dynamic Maps | 10,000 | $7 |
| Autocomplete Requests | 10,000 | $2.83 |
| Place Details Enterprise | 1,000 | $20 |
| Place Details Photos | 1,000 | $7 |
| Compute Route Matrix Essentials | 10,000 | $5 |

These are pricing examples, not confirmation of the project's actual billing attribution or current remaining quota. The application requests ratings, prices, photos, maps, and route matrices, so it must not be treated as an IDs-only/free Google integration. The actual Google project and quota controls have not yet been inspected.

A billing budget alert is not a spending cap. A strict $0 promise requires verified enforceable usage controls or disabling/replacing billable features. No changes to existing Google functionality or billing have been made as part of this research. [Google price list](https://developers.google.com/maps/billing-and-pricing/pricing), [cost controls](https://developers.google.com/maps/billing-and-pricing/manage-costs)

## Historical verification

The original rollout verified organizer sign-in, saved centers, poll creation,
duplication, sign-out, and workspace isolation. Deployment identifiers, private
mail-domain configuration, and production record counts have been omitted from
the public report. These historical observations do not establish the current
state or cost of another deployment.
