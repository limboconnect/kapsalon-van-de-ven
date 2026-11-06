-- =====================================================================
-- Export van alle gegevens als JSON-tekst (te openen in Notepad++)
-- Uitvoeren in een LEEG venster van de SQL Editor > Run.
-- Kopieer de inhoud van de kolom "export" en sla op als .json
-- Terugzetten: zie sql/herstel.sql
-- =====================================================================
select jsonb_pretty(jsonb_build_object(
  'export_datum',           to_char(now() at time zone 'Europe/Amsterdam', 'YYYY-MM-DD HH24:MI'),
  'medewerkers',            coalesce((select jsonb_agg(t order by id) from medewerkers t), '[]'),
  'behandelingen',          coalesce((select jsonb_agg(t order by id) from behandelingen t), '[]'),
  'klanten',                coalesce((select jsonb_agg(t order by id) from klanten t), '[]'),
  'afspraken',              coalesce((select jsonb_agg(t order by id) from afspraken t), '[]'),
  'afspraak_behandelingen', coalesce((select jsonb_agg(t) from afspraak_behandelingen t), '[]'),
  'afwezigheid',            coalesce((select jsonb_agg(t order by id) from afwezigheid t), '[]'),
  'sluitingsdagen',         coalesce((select jsonb_agg(t order by id) from sluitingsdagen t), '[]')
)) as export;
