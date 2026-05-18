"""Unit tests for filter_epic7_imobiliario.py.

Uses a synthetic in-memory SQLite fixture that mimics the rictom/cnpj-sqlite
schema shape relevant to the filter (estabelecimento, empresas, socios + code
tables). Tests live offline — no RFB download required.
"""
from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

import pytest

# Make the module importable when running `pytest infrastructure/cnpj-etl/__tests__`
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from filter_epic7_imobiliario import (  # noqa: E402
    CNAES_TARGET,
    SITUACAO_ATIVA,
    UF_TARGET,
    _validate_cnpj_dv,
    build_filtered_db,
)


# ---------- fixtures ----------------------------------------------------------


def _create_minimal_src(path: str) -> None:
    """Create a minimal RFB-shaped sqlite at `path` with seed rows."""
    conn = sqlite3.connect(path)
    try:
        conn.executescript(
            """
            CREATE TABLE cnae               (codigo TEXT, descricao TEXT);
            CREATE TABLE motivo             (codigo TEXT, descricao TEXT);
            CREATE TABLE municipio          (codigo TEXT, descricao TEXT);
            CREATE TABLE natureza_juridica  (codigo TEXT, descricao TEXT);
            CREATE TABLE pais               (codigo TEXT, descricao TEXT);
            CREATE TABLE qualificacao_socio (codigo TEXT, descricao TEXT);
            CREATE TABLE _referencia        (referencia TEXT, valor TEXT);

            CREATE TABLE empresas (
              cnpj_basico TEXT, razao_social TEXT
            );

            CREATE TABLE estabelecimento (
              cnpj_basico TEXT, cnpj_ordem TEXT, cnpj_dv TEXT,
              nome_fantasia TEXT, cnae_fiscal TEXT,
              cnae_fiscal_secundaria TEXT,
              uf TEXT, municipio TEXT,
              situacao_cadastral TEXT, data_situacao_cadastral TEXT
            );

            CREATE TABLE socios (
              cnpj_basico TEXT, nome_socio TEXT, cnpj_cpf_socio TEXT
            );
            """
        )
        # Two SP-active rows matching target CNAE — should pass through
        conn.execute(
            "INSERT INTO empresas VALUES ('11111111', 'Imobiliaria Alpha LTDA')"
        )
        conn.execute(
            "INSERT INTO estabelecimento VALUES "
            "('11111111','0001','55','Alpha Imoveis','6831700','','SP','SAO PAULO','02','20200101')"
        )
        conn.execute(
            "INSERT INTO socios VALUES ('11111111', 'Fulano da Silva', '12345678901')"
        )

        # SP but CNAE not in target list — must be excluded
        conn.execute(
            "INSERT INTO empresas VALUES ('22222222', 'Padaria Beta')"
        )
        conn.execute(
            "INSERT INTO estabelecimento VALUES "
            "('22222222','0001','99','Padaria','1091102','','SP','SAO PAULO','02','20200101')"
        )

        # Target CNAE but UF=RJ — must be excluded
        conn.execute(
            "INSERT INTO empresas VALUES ('33333333', 'Imobiliaria Carioca')"
        )
        conn.execute(
            "INSERT INTO estabelecimento VALUES "
            "('33333333','0001','77','RJ Imoveis','6822500','','RJ','RIO DE JANEIRO','02','20200101')"
        )

        # Target CNAE + SP but inactive — must be excluded
        conn.execute(
            "INSERT INTO empresas VALUES ('44444444', 'Imobiliaria Inativa')"
        )
        conn.execute(
            "INSERT INTO estabelecimento VALUES "
            "('44444444','0001','11','Inativa','6810201','','SP','SAO PAULO','08','20210101')"
        )

        # Multiple establishments same empresa (test joins)
        conn.execute(
            "INSERT INTO empresas VALUES ('55555555', 'Construtora Delta')"
        )
        conn.execute(
            "INSERT INTO estabelecimento VALUES "
            "('55555555','0001','22','Delta Matriz','4120400','','SP','SAO PAULO','02','20190101')"
        )
        conn.execute(
            "INSERT INTO estabelecimento VALUES "
            "('55555555','0002','33','Delta Filial','4120400','','SP','SAO PAULO','02','20210101')"
        )
        conn.commit()
    finally:
        conn.close()


@pytest.fixture()
def src_db(tmp_path: Path) -> str:
    p = tmp_path / "cnpj.db"
    _create_minimal_src(str(p))
    return str(p)


@pytest.fixture()
def dst_path(tmp_path: Path) -> str:
    return str(tmp_path / "cnpj-imobiliario-sp.db")


# ---------- tests -------------------------------------------------------------


class TestCnaeList:
    def test_target_list_has_10_codes(self) -> None:
        assert len(CNAES_TARGET) == 10

    def test_target_list_order_locked(self) -> None:
        # Order matches Story 7.5 AC2 — see filter_epic7_imobiliario.py header
        assert CNAES_TARGET[0] == "6822500"
        assert CNAES_TARGET[-1] == "8130300"

    def test_all_codes_are_7_digit_strings(self) -> None:
        assert all(
            isinstance(c, str) and c.isdigit() and len(c) == 7 for c in CNAES_TARGET
        )

    def test_no_duplicates(self) -> None:
        assert len(set(CNAES_TARGET)) == len(CNAES_TARGET)


class TestConstants:
    def test_uf_is_sp(self) -> None:
        assert UF_TARGET == "SP"

    def test_situacao_is_active(self) -> None:
        assert SITUACAO_ATIVA == "02"


class TestCnpjDvValidator:
    @pytest.mark.parametrize(
        "cnpj,expected",
        [
            ("11444777000161", True),   # canonical valid CNPJ
            ("11222333000181", True),
            ("00000000000000", False),  # all-same digits
            ("12345678000100", False),  # invalid DV
            ("", False),
            ("1144477700016", False),   # 13 digits
            ("abcdefghijklmn", False),
        ],
    )
    def test_dv(self, cnpj: str, expected: bool) -> None:
        assert _validate_cnpj_dv(cnpj) is expected


class TestBuildFilteredDb:
    def test_raises_when_src_missing(self, dst_path: str) -> None:
        with pytest.raises(FileNotFoundError):
            build_filtered_db("/tmp/__nope__/missing.db", dst_path)

    def test_excludes_non_sp(self, src_db: str, dst_path: str) -> None:
        build_filtered_db(src_db, dst_path)
        conn = sqlite3.connect(dst_path)
        try:
            ufs = {row[0] for row in conn.execute("SELECT DISTINCT uf FROM estabelecimento")}
        finally:
            conn.close()
        assert ufs == {"SP"}

    def test_excludes_non_target_cnae(self, src_db: str, dst_path: str) -> None:
        build_filtered_db(src_db, dst_path)
        conn = sqlite3.connect(dst_path)
        try:
            cnaes = {row[0] for row in conn.execute("SELECT DISTINCT cnae_fiscal FROM estabelecimento")}
        finally:
            conn.close()
        assert cnaes.issubset(set(CNAES_TARGET))
        assert "1091102" not in cnaes  # bakery — excluded

    def test_excludes_inactive(self, src_db: str, dst_path: str) -> None:
        build_filtered_db(src_db, dst_path)
        conn = sqlite3.connect(dst_path)
        try:
            sits = {row[0] for row in conn.execute("SELECT DISTINCT situacao_cadastral FROM estabelecimento")}
        finally:
            conn.close()
        assert sits == {"02"}

    def test_keeps_multiple_establishments_per_empresa(
        self, src_db: str, dst_path: str
    ) -> None:
        build_filtered_db(src_db, dst_path)
        conn = sqlite3.connect(dst_path)
        try:
            rows = conn.execute(
                "SELECT cnpj_basico, cnpj_ordem FROM estabelecimento WHERE cnpj_basico='55555555' ORDER BY cnpj_ordem"
            ).fetchall()
        finally:
            conn.close()
        assert rows == [("55555555", "0001"), ("55555555", "0002")]

    def test_empresa_subset_matches_estabelecimento(
        self, src_db: str, dst_path: str
    ) -> None:
        build_filtered_db(src_db, dst_path)
        conn = sqlite3.connect(dst_path)
        try:
            empresa_basicos = {
                row[0] for row in conn.execute("SELECT cnpj_basico FROM empresas")
            }
            estab_basicos = {
                row[0]
                for row in conn.execute("SELECT DISTINCT cnpj_basico FROM estabelecimento")
            }
        finally:
            conn.close()
        assert empresa_basicos == estab_basicos
        # Excluded empresas (22222222 padaria, 33333333 RJ, 44444444 inativa) absent
        assert "22222222" not in empresa_basicos
        assert "33333333" not in empresa_basicos
        assert "44444444" not in empresa_basicos

    def test_counts_returned(self, src_db: str, dst_path: str) -> None:
        counts = build_filtered_db(src_db, dst_path)
        # 1 alpha + 2 delta = 3 estabelecimentos
        assert counts["estabelecimento"] == 3
        # 2 empresas (alpha + delta)
        assert counts["empresas"] == 2

    def test_indexes_created(self, src_db: str, dst_path: str) -> None:
        build_filtered_db(src_db, dst_path)
        conn = sqlite3.connect(dst_path)
        try:
            idx = {
                row[0]
                for row in conn.execute("SELECT name FROM sqlite_master WHERE type='index'")
            }
        finally:
            conn.close()
        for expected in (
            "idx_estab_cnpj",
            "idx_estab_cnae",
            "idx_estab_uf",
            "idx_empresas_basico",
            "idx_socios_basico",
        ):
            assert expected in idx, f"missing index: {expected}"

    def test_overwrites_existing_dst(self, src_db: str, dst_path: str) -> None:
        # Pre-create a junk file at dst to confirm atomic-flip pattern
        Path(dst_path).write_text("junk")
        build_filtered_db(src_db, dst_path)
        # If we got here, the function replaced the junk file with a valid DB
        conn = sqlite3.connect(dst_path)
        try:
            cnt = conn.execute("SELECT count(*) FROM estabelecimento").fetchone()[0]
        finally:
            conn.close()
        assert cnt == 3
