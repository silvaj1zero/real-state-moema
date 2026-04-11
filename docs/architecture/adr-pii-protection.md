# ADR: PII Field Naming — telefone_encrypted → telefone

**Date:** 2026-04-11
**Status:** Accepted
**Context:** Audit PV Finding F2 (CRITICAL)

## Context

Os campos `telefone_encrypted` e `email_encrypted` nas tabelas `leads`, `informantes`, `frog_contacts` e `referrals` armazenam dados em **plain text** apesar do sufixo `_encrypted`. O nome mente sobre o conteudo — uma auditoria de seguranca por nomes de campo aprovaria o sistema incorretamente.

## Decision

**Renomear campos** para remover o sufixo `_encrypted`:
- `telefone_encrypted` → `telefone`
- `email_encrypted` → `email`
- `parceiro_telefone_encrypted` → `parceiro_telefone`

Criptografia real via pgcrypto sera implementada em v2 quando o sistema tiver dados de producao. Nesse momento, os campos serao convertidos para BYTEA e as funcoes de encrypt/decrypt serao adicionadas.

## Alternatives Considered

1. **Implementar pgcrypto agora** — Rejeitado: projeto em fase MVP/demo, complexidade desnecessaria neste momento, performance hit em queries com decrypt.
2. **Manter nomes atuais** — Rejeitado: campo que mente e pior que campo sem protecao. Viola principio de honestidade no schema.

## Consequences

- Campos agora refletem honestamente seu conteudo (plain text)
- Nenhuma protecao criptografica real — aceito para MVP
- Quando pgcrypto for implementado (v2), campos serao renomeados novamente ou convertidos para BYTEA
- Todos os TODOs de pgcrypto removidos do codebase
