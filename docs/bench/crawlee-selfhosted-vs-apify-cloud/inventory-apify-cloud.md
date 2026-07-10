# Inventory — Apify Cloud (Managed PaaS)

**Snapshot:** 2026-05-14

## Compute Units (CU)

| Plan | Effective CU price | Notes |
|---|---|---|
| Free | $0.40/CU above $5 monthly credit | $5 free credit |
| Starter | $0.30–0.40/CU | $49/mo base |
| Creator | **$0.20/CU** | $50/mo base, 32 GB mem, 32 concurrent runs |
| Scale | **$0.16/CU** | ~$249/mo base |
| Business | $0.20–0.25/CU custom | enterprise |

**Throughput rule-of-thumb:**
- CheerioCrawler (HTTP) ≈ **3,000 pages / CU**
- Playwright/browser ≈ **300 pages / CU**

Sources: https://use-apify.com/docs/what-is-apify/apify-pricing · https://use-apify.com/docs/what-is-apify/apify-compute-units

## Proxy bundled

| Proxy type | Unit price | Notes |
|---|---|---|
| Residential | **$8/GB** | most expensive |
| Datacenter | $8/GB + $1/IP above 30 IPs | |
| SERPs | $2.5/1000 SERPs | |

## Scheduler & observability

- First-class Actor schedules (cron-style, retries, webhook callbacks)
- Apify Console with logs, datasets, statistics, alerts, integrations (Slack/email)
- 1,500+ Actor marketplace — already includes `brasil-scrapers/quinto-andar-api`

## Anti-bot

- Apify Proxy + fingerprinting (broadly equivalent to Crawlee self-hosted; same Crawlee SDK runs underneath)
- DataDome-protected sites (ImovelWeb) remain hard on either side — both need Camoufox/manual hardening

## Operational realities

- **Setup:** minutes (existing Actor) to hours (custom)
- **Maintenance:** vendor-managed Actor SDK & runtime
- **Lock-in:** Actor packaging is Apify-specific, **but Crawlee code is portable** — exit cost is real but not catastrophic
- **Cost driver:** CU + proxy GB, not seat license

## Sources

- https://apify.com/pricing
- https://use-apify.com/docs/what-is-apify/apify-pricing
- https://use-apify.com/docs/what-is-apify/apify-compute-units
- https://apify.com/pricing/creator-plan
- https://prospeo.io/s/apify-vs-firecrawl
- https://checkthat.ai/brands/apify/pricing
