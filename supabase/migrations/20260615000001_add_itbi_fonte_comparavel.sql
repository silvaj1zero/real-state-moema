-- Adiciona 'itbi' ao enum fonte_comparavel.
-- Permite que a ingestão ITBI (engine acm-imobiliario / luciana-borba) marque
-- vendas reais da Prefeitura com fonte semanticamente correta, em vez de reusar
-- 'cartorio'. Implementa a origem de dados do cron epic7_itbi_monthly /
-- trigger_itbi_snapshot. Idempotente.
--
-- PG 15+ (Supabase): ADD VALUE pode rodar em migration; o novo valor só pode ser
-- USADO após o commit desta migration (não no mesmo statement).

ALTER TYPE fonte_comparavel ADD VALUE IF NOT EXISTS 'itbi';
