"""dados_cnpj_para_sqlite.py — STUB / pin pointer.

Mirror of dados_cnpj_baixa.py rationale. Materialized at image-build via
`make refresh-upstream`. SHA pinned in Dockerfile.
"""
import sys

UPSTREAM = "https://github.com/rictom/cnpj-sqlite"
PIN_SHA_NOTE = "see Dockerfile ARG RICTOM_SHA"

if __name__ == "__main__":  # pragma: no cover
    sys.stderr.write(
        f"dados_cnpj_para_sqlite.py is a stub. Materialize from {UPSTREAM} ({PIN_SHA_NOTE})\n"
    )
    sys.exit(70)
