# Gap Analysis — Crawlee TS vs Crawlee Python

## Gaps where Python beats TS (3, all CNPJ-adjacent)

| ID | Gap | Severity | Mitigation |
|---|---|---|---|
| gap-ts-1 | No first-party Lambda docs | low | Wave A targets Hetzner/Cloud Run, not Lambda |
| gap-ts-2 | Needs IPC/DB view to talk to `cnpj-sqlite` | medium | Keep CNPJ in Python container; Supabase materialized views |
| gap-ts-3 | Data-science adjacency requires Python service or JS equivalents | low | ML/calibration lives in Python (Wave B) |

## Gaps where TS beats Python (6, two HIGH-severity at stack level)

| ID | Gap | Severity | Mitigation |
|---|---|---|---|
| gap-py-1 | No `StagehandCrawler` in Python | medium | Wait for port, or hand-tune selectors |
| gap-py-2 | `AdaptivePlaywrightCrawler` less mature in Python | medium | Use Python only on HTTP-friendly sites |
| gap-py-3 | Smaller community + fewer templates + fewer SO answers | medium | Lean on Apify Discord; budget more time |
| **gap-py-4** | **Cannot share TS domain types with Next.js** | **HIGH** | Generate pydantic from shared schema — extra tooling |
| **gap-py-5** | **Two-runtime deploy (CI, images, lifecycle)** | **HIGH** | Confine Python to CNPJ only |
| gap-py-6 | GIL caveat single-process | low | Multi-process pool for CNPJ batch |

## Interpretation

The asymmetry is decisive. Python's wins are **bounded to the CNPJ subsystem**, while TS's wins are **stack-wide structural advantages** (type sharing, single runtime).

**Architectural implication (CONFIRMS Wave 2):**
- All crawlers → Crawlee TS
- CNPJ ETL → isolated Python container with `rictom/cnpj-sqlite`
- Bridge → Supabase materialized views (no in-process IPC)

## Sources

- https://github.com/rictom/cnpj-sqlite
- https://crawlee.dev/python/docs/deployment/aws-lambda
- https://crawlee.dev/blog/scrapy-vs-crawlee
- https://crawlee.dev/blog/crawlee-for-python-v05
- https://crawlee.dev/python/docs/guides/scaling-crawlers
- GitHub API 2026-05-14
