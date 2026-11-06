-- =====================================================================
-- HERSTEL vanuit een JSON-export (sql/export.sql)
-- LET OP: dit WIST eerst alle huidige gegevens en zet daarna de export terug.
--
-- 1. Selecteer hieronder de regel met >>> PLAK DE EXPORT HIER <<<
--    en vervang die door de hele inhoud van je .json-bestand.
--    De twee regels met $json$ erboven en eronder blijven staan.
-- 2. Run. Supabase waarschuwt voor "destructive operations": dat klopt hier.
-- =====================================================================
do $$
declare
  j jsonb := $json$
>>> PLAK DE EXPORT HIER <<<
$json$;
  t text;
begin
  alter table afspraken disable trigger afspraak_controle;
  truncate afspraak_behandelingen, afspraken, afwezigheid, sluitingsdagen, klanten, behandelingen, medewerkers restart identity cascade;

  insert into medewerkers            select * from jsonb_populate_recordset(null::medewerkers,            j->'medewerkers');
  insert into behandelingen          select * from jsonb_populate_recordset(null::behandelingen,          j->'behandelingen');
  insert into klanten                select * from jsonb_populate_recordset(null::klanten,                j->'klanten');
  insert into afspraken              select * from jsonb_populate_recordset(null::afspraken,              j->'afspraken');
  insert into afspraak_behandelingen select * from jsonb_populate_recordset(null::afspraak_behandelingen, j->'afspraak_behandelingen');
  insert into afwezigheid            select * from jsonb_populate_recordset(null::afwezigheid,            j->'afwezigheid');
  insert into sluitingsdagen         select * from jsonb_populate_recordset(null::sluitingsdagen,         coalesce(j->'sluitingsdagen', '[]'));

  foreach t in array array['medewerkers','behandelingen','klanten','afspraken','afwezigheid','sluitingsdagen'] loop
    execute format('select setval(pg_get_serial_sequence(%L, ''id''), greatest((select max(id) from %I), 1))', t, t);
  end loop;

  alter table afspraken enable trigger afspraak_controle;
  raise notice 'Herstel klaar: export van %', j->>'export_datum';
end $$;
