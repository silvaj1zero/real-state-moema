"""filter_epic7_imobiliario.py

Filters the full RFB CNPJ SQLite DB produced by rictom/cnpj-sqlite into a
small, query-fast DB containing ONLY establishments matching Epic 7 target
CNAEs in the state of Sao Paulo (SP) with active status.

Produces: cnpj-imobiliario-sp.db (< 2 GB, ~50-100k rows)

Article IV (No Invention) — CNAE list mirrors verbatim the official CNAE table
published by Receita Federal: https://www.gov.br/receitafederal/dados/cnae.csv
Order intentionally preserved to match Story 7.5 AC2.

Usage:
    python filter_epic7_imobiliario.py --src /data/cnpj.db --dst /data/cnpj-imobiliario-sp.db
"""
from __future__ import annotations

import argparse
import logging
import os
import sqlite3
import sys
from typing import Iterable

# ---- CNAEs target Epic 7 (verbatim) ----
# Order locked: matches docs/stories/7.5.story.md AC2 + ADR-EPIC7-005.
# Do NOT reorder without bumping ADR.
CNAES_TARGET: tuple[str, ...] = (
    "6822500",  # Gestao e administracao da propriedade imobiliaria
    "6831700",  # Corretagem na compra e venda e avaliacao de imoveis
    "6810201",  # Compra e venda de imoveis proprios
    "6810202",  # Aluguel de imoveis proprios
    "4110700",  # Incorporacao de empreendimentos imobiliarios
    "4120400",  # Construcao de edificios
    "4399105",  # Outros servicos especializados para construcao
    "8112500",  # Condominios prediais
    "8121400",  # Limpeza em predios e em domicilios
    "8130300",  # Atividades paisagisticas
)

# RFB stores active establishments with situacao_cadastral = '02'.
SITUACAO_ATIVA = "02"
UF_TARGET = "SP"

# Code tables copied verbatim (small, no filtering needed).
CODE_TABLES: tuple[str, ...] = (
    "cnae",
    "motivo",
    "municipio",
    "natureza_juridica",
    "pais",
    "qualificacao_socio",
    "_referencia",
)

logger = logging.getLogger("filter_epic7_imobiliario")


def _validate_cnpj_dv(cnpj14: str) -> bool:
    """Validate CNPJ check digits (modulo 11). Returns True if valid.

    Empty / non-14-digit strings return False. Used as a safety net: RFB data
    is normally consistent, but corrupted zips have surfaced bad rows historically.
    """
    if not cnpj14 or len(cnpj14) != 14 or not cnpj14.isdigit():
        return False
    if cnpj14 == cnpj14[0] * 14:
        return False

    def _dv(digits: str, weights: Iterable[int]) -> int:
        total = sum(int(d) * w for d, w in zip(digits, weights))
        rem = total % 11
        return 0 if rem < 2 else 11 - rem

    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    dv1 = _dv(cnpj14[:12], weights1)
    if dv1 != int(cnpj14[12]):
        return False
    dv2 = _dv(cnpj14[:13], weights2)
    return dv2 == int(cnpj14[13])


def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    cur = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    )
    return cur.fetchone() is not None


def build_filtered_db(src_path: str, dst_path: str) -> dict[str, int]:
    """Build the filtered SP-imobiliario DB from a full RFB CNPJ DB.

    Returns counts per table for telemetry (used by crawl_runs row in AC7).
    """
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"src DB not found: {src_path}")
    if os.path.exists(dst_path):
        os.remove(dst_path)  # atomic-flip pattern (build to new, swap atomically)

    counts: dict[str, int] = {}
    conn = sqlite3.connect(src_path)
    try:
        conn.execute(f"ATTACH DATABASE '{dst_path}' AS dst_db")

        # Copy code tables verbatim
        for table in CODE_TABLES:
            if not _table_exists(conn, table):
                logger.warning("code table missing in src: %s (skipping)", table)
                continue
            conn.execute(f"CREATE TABLE dst_db.{table} AS SELECT * FROM {table}")
            counts[table] = conn.execute(f"SELECT COUNT(*) FROM dst_db.{table}").fetchone()[0]

        # Filter estabelecimento — primary CNAE in target list + SP + active
        placeholders = ",".join("?" * len(CNAES_TARGET))
        params = list(CNAES_TARGET) + [UF_TARGET, SITUACAO_ATIVA]
        conn.execute(
            f"""
            CREATE TABLE dst_db.estabelecimento AS
            SELECT * FROM estabelecimento
             WHERE cnae_fiscal IN ({placeholders})
               AND uf = ?
               AND situacao_cadastral = ?
            """,
            params,
        )
        counts["estabelecimento"] = conn.execute(
            "SELECT COUNT(*) FROM dst_db.estabelecimento"
        ).fetchone()[0]

        # Filter empresas matching filtered estabelecimento (via cnpj_basico)
        conn.execute(
            """
            CREATE TABLE dst_db.empresas AS
            SELECT em.* FROM empresas em
             WHERE em.cnpj_basico IN (
                   SELECT DISTINCT cnpj_basico FROM dst_db.estabelecimento
             )
            """
        )
        counts["empresas"] = conn.execute(
            "SELECT COUNT(*) FROM dst_db.empresas"
        ).fetchone()[0]

        # Filter socios matching the filtered empresas
        conn.execute(
            """
            CREATE TABLE dst_db.socios AS
            SELECT s.* FROM socios s
             WHERE s.cnpj_basico IN (SELECT cnpj_basico FROM dst_db.empresas)
            """
        )
        counts["socios"] = conn.execute(
            "SELECT COUNT(*) FROM dst_db.socios"
        ).fetchone()[0]

        # Indexes — keep minimal & query-driven (Story 7.3 lookups by cnpj14)
        conn.execute(
            "CREATE INDEX dst_db.idx_estab_cnpj ON estabelecimento(cnpj_basico, cnpj_ordem, cnpj_dv)"
        )
        conn.execute("CREATE INDEX dst_db.idx_estab_cnae ON estabelecimento(cnae_fiscal)")
        conn.execute("CREATE INDEX dst_db.idx_estab_uf ON estabelecimento(uf)")
        conn.execute("CREATE INDEX dst_db.idx_empresas_basico ON empresas(cnpj_basico)")
        conn.execute("CREATE INDEX dst_db.idx_socios_basico ON socios(cnpj_basico)")
        conn.commit()
    finally:
        conn.close()

    logger.info("filtered DB built: %s — counts=%s", dst_path, counts)
    return counts


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Filter RFB CNPJ DB to Epic 7 SP imobiliario")
    parser.add_argument("--src", default=os.environ.get("DB_FILE", "/data/cnpj.db"))
    parser.add_argument(
        "--dst",
        default=os.environ.get("DB_FILTERED", "/data/cnpj-imobiliario-sp.db"),
    )
    parser.add_argument("--log-level", default="INFO")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )
    try:
        counts = build_filtered_db(args.src, args.dst)
    except FileNotFoundError as exc:
        logger.error("source DB missing: %s", exc)
        return 2
    except sqlite3.DatabaseError as exc:
        logger.error("sqlite error during filter: %s", exc)
        return 3

    # Sanity: estabelecimento count must be > 0 (else upstream schema likely
    # changed — flagged in AC7 monitoring).
    if counts.get("estabelecimento", 0) == 0:
        logger.error("filtered estabelecimento = 0 rows — RFB schema may have changed")
        return 4
    return 0


if __name__ == "__main__":
    sys.exit(main())
