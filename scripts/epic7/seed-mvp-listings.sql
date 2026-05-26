-- =============================================================================
-- MVP-LOCAL Seed: scraped_listings sintéticos para validar review queue
-- =============================================================================
-- Story: MVP-LOCAL testing (não-produção)
-- Uso: cole no Supabase Dashboard → SQL Editor → Run
-- Cleanup: DELETE FROM scraped_listings WHERE external_id LIKE 'mvp-seed-%';
--
-- Schema real (Epic 3 + 6 + 7):
--   - portal, external_id, url, bairro
--   - nome_anunciante, telefone_anunciante, whatsapp_anunciante, creci_anunciante
--   - classification, classification_confidence, classification_signals, home_flags
--   - preco, area_m2, tipologia, quartos, is_fisbo
-- =============================================================================

BEGIN;

DELETE FROM scraped_listings WHERE external_id LIKE 'mvp-seed-%';

-- 10 FISBO baixa confidence (0.50-0.69) — entram queue default <0.70
INSERT INTO scraped_listings (
  portal, external_id, url, bairro,
  nome_anunciante, telefone_anunciante, whatsapp_anunciante,
  classification, classification_confidence, classification_signals, home_flags,
  preco, area_m2, tipologia, quartos, is_fisbo
) VALUES
  ('outro', 'mvp-seed-fb01', 'https://imoveis.mercadolivre.com.br/MLB-fb01', 'moema', 'Carlos Silva', '11987654001', '11987654001', 'for_sale_by_owner', 0.52, '[{"signal":"phoneDDD","value":"11"},{"signal":"singleListing","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 850000, 72, 'apartamento', 2, true),
  ('outro', 'mvp-seed-fb02', 'https://imoveis.mercadolivre.com.br/MLB-fb02', 'vila-olimpia', 'Mariana Costa', '11987654002', null, 'for_sale_by_owner', 0.58, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 1200000, 95, 'apartamento', 3, true),
  ('outro', 'mvp-seed-fb03', 'https://imoveis.mercadolivre.com.br/MLB-fb03', 'itaim-bibi', 'Ricardo Pereira', null, '11987654003', 'for_sale_by_owner', 0.61, '[{"signal":"singleListing","value":true},{"signal":"namePersonal","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 2500000, 180, 'casa', 4, true),
  ('outro', 'mvp-seed-fb04', 'https://imoveis.mercadolivre.com.br/MLB-fb04', 'moema', 'Ana Beatriz', '11987654004', '11987654004', 'for_sale_by_owner', 0.55, '[{"signal":"phoneDDD","value":"11"}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 950000, 68, 'apartamento', 2, true),
  ('outro', 'mvp-seed-fb05', 'https://imoveis.mercadolivre.com.br/MLB-fb05', 'vila-olimpia', 'Felipe Almeida', '11987654005', null, 'for_sale_by_owner', 0.63, '[{"signal":"singleListing","value":true},{"signal":"phoneDDD","value":"11"}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 1800000, 110, 'apartamento', 3, true),
  ('zap', 'mvp-seed-fb06', 'https://www.zapimoveis.com.br/zap-fb06', 'moema', 'Patrícia Santos', '11987654006', '11987654006', 'for_sale_by_owner', 0.54, '[{"signal":"namePersonal","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 720000, 55, 'apartamento', 2, true),
  ('zap', 'mvp-seed-fb07', 'https://www.zapimoveis.com.br/zap-fb07', 'itaim-bibi', 'Bruno Cardoso', null, '11987654007', 'for_sale_by_owner', 0.59, '[{"signal":"singleListing","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 1400000, 85, 'apartamento', 2, true),
  ('olx', 'mvp-seed-fb08', 'https://www.olx.com.br/olx-fb08', 'moema', 'Juliana Mendes', '11987654008', null, 'for_sale_by_owner', 0.66, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 890000, 62, 'apartamento', 2, true),
  ('vivareal', 'mvp-seed-fb09', 'https://www.vivareal.com.br/vr-fb09', 'itaim-bibi', 'Rodrigo Lima', '11987654009', '11987654009', 'for_sale_by_owner', 0.51, '[{"signal":"phoneDDD","value":"11"}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 3200000, 220, 'cobertura', 4, true),
  ('outro', 'mvp-seed-fb10', 'https://imoveis.mercadolivre.com.br/MLB-fb10', 'vila-olimpia', 'Camila Oliveira', null, '11987654010', 'for_sale_by_owner', 0.68, '[{"signal":"singleListing","value":true},{"signal":"namePersonal","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 1650000, 105, 'apartamento', 3, true);

-- 5 FISBO confidence média (0.70-0.84)
INSERT INTO scraped_listings (
  portal, external_id, url, bairro,
  nome_anunciante, telefone_anunciante, whatsapp_anunciante,
  classification, classification_confidence, classification_signals, home_flags,
  preco, area_m2, tipologia, quartos, is_fisbo
) VALUES
  ('outro', 'mvp-seed-fm01', 'https://imoveis.mercadolivre.com.br/MLB-fm01', 'moema', 'Daniel Rocha', '11987654011', '11987654011', 'for_sale_by_owner', 0.72, '[{"signal":"phoneDDD","value":"11"},{"signal":"singleListing","value":true},{"signal":"namePersonal","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 1100000, 78, 'apartamento', 2, true),
  ('outro', 'mvp-seed-fm02', 'https://imoveis.mercadolivre.com.br/MLB-fm02', 'itaim-bibi', 'Larissa Gomes', null, '11987654012', 'for_sale_by_owner', 0.78, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 2100000, 140, 'apartamento', 3, true),
  ('zap', 'mvp-seed-fm03', 'https://www.zapimoveis.com.br/zap-fm03', 'moema', 'Thiago Martins', '11987654013', null, 'for_sale_by_owner', 0.81, '[{"signal":"singleListing","value":true},{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 980000, 71, 'apartamento', 2, true),
  ('olx', 'mvp-seed-fm04', 'https://www.olx.com.br/olx-fm04', 'vila-olimpia', 'Vanessa Ribeiro', '11987654014', '11987654014', 'for_sale_by_owner', 0.74, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 1450000, 92, 'apartamento', 3, true),
  ('vivareal', 'mvp-seed-fm05', 'https://www.vivareal.com.br/vr-fm05', 'itaim-bibi', 'Gustavo Nunes', '11987654015', null, 'for_sale_by_owner', 0.83, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true},{"signal":"singleListing","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 2800000, 165, 'casa', 4, true);

-- 5 FISBO alta confidence (0.85+) — qualificados
INSERT INTO scraped_listings (
  portal, external_id, url, bairro,
  nome_anunciante, telefone_anunciante, whatsapp_anunciante,
  classification, classification_confidence, classification_signals, home_flags,
  preco, area_m2, tipologia, quartos, is_fisbo
) VALUES
  ('outro', 'mvp-seed-fh01', 'https://imoveis.mercadolivre.com.br/MLB-fh01', 'moema', 'Renata Souza', '11987654016', '11987654016', 'for_sale_by_owner', 0.88, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true},{"signal":"singleListing","value":true},{"signal":"noBrokerKeywords","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 1300000, 82, 'apartamento', 2, true),
  ('zap', 'mvp-seed-fh02', 'https://www.zapimoveis.com.br/zap-fh02', 'itaim-bibi', 'Eduardo Carvalho', '11987654017', null, 'for_sale_by_owner', 0.92, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true},{"signal":"singleListing","value":true},{"signal":"noBrokerKeywords","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 4500000, 285, 'cobertura', 4, true),
  ('olx', 'mvp-seed-fh03', 'https://www.olx.com.br/olx-fh03', 'vila-olimpia', 'Beatriz Fernandes', null, '11987654018', 'for_sale_by_owner', 0.87, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true},{"signal":"singleListing","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 760000, 58, 'apartamento', 1, true),
  ('vivareal', 'mvp-seed-fh04', 'https://www.vivareal.com.br/vr-fh04', 'moema', 'André Barbosa', '11987654019', '11987654019', 'for_sale_by_owner', 0.95, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true},{"signal":"singleListing","value":true},{"signal":"noBrokerKeywords","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 2200000, 125, 'apartamento', 3, true),
  ('outro', 'mvp-seed-fh05', 'https://imoveis.mercadolivre.com.br/MLB-fh05', 'vila-olimpia', 'Letícia Dias', '11987654020', null, 'for_sale_by_owner', 0.89, '[{"signal":"phoneDDD","value":"11"},{"signal":"namePersonal","value":true},{"signal":"singleListing","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":true,"is_pf_disclosed":true,"is_pj_disclosed":false,"has_creci_validated":false}'::jsonb, 1750000, 108, 'apartamento', 3, true);

-- 5 controle: agent/broker/builder
INSERT INTO scraped_listings (
  portal, external_id, url, bairro,
  nome_anunciante, telefone_anunciante, whatsapp_anunciante, creci_anunciante,
  classification, classification_confidence, classification_signals, home_flags,
  preco, area_m2, tipologia, quartos, is_fisbo
) VALUES
  ('zap', 'mvp-seed-ag01', 'https://www.zapimoveis.com.br/zap-ag01', 'moema', 'Imobiliária Premier - João Silva', '1133334001', '11999994001', '189456-F', 'agent', 0.94, '[{"signal":"creciFound","value":"189456-F"}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":false,"is_pf_disclosed":false,"is_pj_disclosed":true,"has_creci_validated":true}'::jsonb, 1200000, 80, 'apartamento', 2, false),
  ('outro', 'mvp-seed-br01', 'https://imoveis.mercadolivre.com.br/MLB-br01', 'itaim-bibi', 'Habitar Imóveis Ltda', '1133334002', '11999994002', null, 'broker', 0.91, '[{"signal":"cnpjFound","value":"12.345.678/0001-90"},{"signal":"brokerKeywords","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":false,"is_pf_disclosed":false,"is_pj_disclosed":true,"has_creci_validated":false}'::jsonb, 1850000, 115, 'apartamento', 3, false),
  ('vivareal', 'mvp-seed-bd01', 'https://www.vivareal.com.br/vr-bd01', 'vila-olimpia', 'Construtora Vista Bela S/A', '1133334003', null, null, 'builder', 0.97, '[{"signal":"cnpjFound","value":"98.765.432/0001-10"},{"signal":"builderKeywords","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":true,"is_fisbo_inferred":false,"is_pf_disclosed":false,"is_pj_disclosed":true,"has_creci_validated":false}'::jsonb, 950000, 68, 'apartamento', 2, false),
  ('olx', 'mvp-seed-ag02', 'https://www.olx.com.br/olx-ag02', 'moema', 'Re/Max Galeria - Luciana Borba', '1133334004', '11999994004', '234567-F', 'agent', 0.96, '[{"signal":"creciFound","value":"234567-F"},{"signal":"agencyKeywords","value":"REMAX"}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":false,"is_pf_disclosed":false,"is_pj_disclosed":true,"has_creci_validated":true}'::jsonb, 1600000, 95, 'apartamento', 2, false),
  ('zap', 'mvp-seed-br02', 'https://www.zapimoveis.com.br/zap-br02', 'itaim-bibi', 'Lopes Imóveis - Filial Moema', '1133334005', '11999994005', null, 'broker', 0.90, '[{"signal":"cnpjFound","value":"05.111.222/0033-44"},{"signal":"brokerKeywords","value":true}]'::jsonb, '{"is_pending":false,"is_contingent":false,"is_new_construction":false,"is_fisbo_inferred":false,"is_pf_disclosed":false,"is_pj_disclosed":true,"has_creci_validated":false}'::jsonb, 2400000, 140, 'apartamento', 3, false);

COMMIT;

-- Verify
SELECT
  classification,
  COUNT(*) AS total,
  ROUND(AVG(classification_confidence)::numeric, 2) AS avg_conf,
  ROUND(MIN(classification_confidence)::numeric, 2) AS min_conf,
  ROUND(MAX(classification_confidence)::numeric, 2) AS max_conf
FROM scraped_listings
WHERE external_id LIKE 'mvp-seed-%'
GROUP BY classification
ORDER BY classification;
