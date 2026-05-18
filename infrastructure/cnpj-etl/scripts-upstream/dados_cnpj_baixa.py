"""dados_cnpj_baixa.py — STUB / pin pointer.

This file MUST be replaced verbatim with the upstream rictom/cnpj-sqlite script
at the exact commit SHA pinned in the Dockerfile (ARG RICTOM_SHA).

Reason for stub-only commit:
  - The upstream MIT script is the canonical RFB downloader (PROPFIND WebDAV +
    parfive). Vendoring its source code into THIS repo couples our git history
    to the maintainer's history. Instead, we materialize it at image-build
    time via the `make refresh-upstream` helper (see README).
  - The pinned SHA in the Dockerfile is the source of truth for which upstream
    version is in production.

To populate locally:
    cd infrastructure/cnpj-etl
    make refresh-upstream RICTOM_SHA=<sha-from-Dockerfile>

This file intentionally exits non-zero if executed in stub form — protects
against silent no-op runs.
"""
import sys

UPSTREAM = "https://github.com/rictom/cnpj-sqlite"
PIN_SHA_NOTE = "see Dockerfile ARG RICTOM_SHA"

if __name__ == "__main__":  # pragma: no cover
    sys.stderr.write(
        f"dados_cnpj_baixa.py is a stub. Materialize from {UPSTREAM} ({PIN_SHA_NOTE})\n"
    )
    sys.exit(70)
