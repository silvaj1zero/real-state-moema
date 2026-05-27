# Inventory — Crawlee TS Self-Hosted Stack

**Snapshot:** 2026-05-14

## Compute — Hetzner CPX31

| Field | Value |
|---|---|
| Vendor | Hetzner Cloud |
| Plan | CPX31 |
| Specs | 4 vCPU AMD · 8 GB RAM · 160 GB NVMe · 20 TB egress EU |
| Price | **€16.49/mo** (pre-2026-04-01) · adjustments raise it toward €21–24/mo |
| Source | https://www.hetzner.com/cloud/regular-performance |

## Proxy — IPRoyal Residential

| Field | Value |
|---|---|
| Unit price (entry) | **$7/GB** pay-as-you-go |
| Committed volume | scales to **$1.75/GB** at high volume |
| Model | non-expiring traffic, no monthly minimum |
| Source | https://iproyal.com/pricing/residential-proxies/ |

## Scheduler

Native options:
- `node-cron` in-process
- systemd timers
- BullMQ (Redis)
- **Supabase `pg_cron` + Edge Function trigger** (recommended — already in stack)

## Observability

Recommended: Sentry (already used in project) + pino logs aggregated via Better Stack or Grafana Cloud.

## Anti-bot stack

Crawlee built-in `fingerprint-injector` + `got-scraping` + Playwright stealth + IPRoyal residential rotation. For DataDome-protected sites (e.g. ImovelWeb) Camoufox (patched Firefox) is the documented fallback.

## Operational realities

- **Setup**: 3–5 engineer-days (Docker compose, CI, secrets, alerting).
- **Maintenance**: ~4–8 h/mês (deps, proxy retune, selector fixes).
- **Engineer cost in BR**: R$ 800–1.200/dia mid-senior.

## Sources

- https://www.hetzner.com/cloud/regular-performance
- https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- https://iproyal.com/pricing/residential-proxies/
- https://use-apify.com/blog/iproyal-pricing-plans-2026
- https://use-apify.com/blog/self-hosting-web-scrapers-guide
- https://supabase.com/docs/guides/cron
