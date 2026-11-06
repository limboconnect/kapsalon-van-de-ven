-- =====================================================================
-- Export van alle gegevens als SQL-tekst (voor Notepad++)
-- Uitvoeren in de SQL Editor; de uitkomst is één tekstvak.
-- Die tekst kan later in de SQL Editor worden geplakt om alles terug te zetten.
-- =====================================================================
select
  '-- Export Kapsalon van de Ven, ' || to_char(now() at time zone 'Europe/Amsterdam', 'YYYY-MM-DD HH24:MI') || E'\n'
  || '-- LET OP: terugzetten wist eerst alle huidige gegevens!' || E'\n'
  || 'begin;' || E'\n'
  || 'alter table afspraken disable trigger afspraak_controle;' || E'\n'
  || 'truncate afspraak_behandelingen, afspraken, afwezigheid, sluitingsdagen, klanten, behandelingen, medewerkers restart identity cascade;' || E'\n'
  || string_agg(regel, E'\n' order by nr) || E'\n'
  || 'alter table afspraken enable trigger afspraak_controle;' || E'\n'
  || 'commit;' as export
from (
  select 1 as nr, format('insert into medewerkers select * from json_populate_recordset(null::medewerkers, %L);', coalesce(json_agg(t order by id), '[]')) as regel from medewerkers t
  union all select 2, format('insert into behandelingen select * from json_populate_recordset(null::behandelingen, %L);', coalesce(json_agg(t order by id), '[]')) from behandelingen t
  union all select 3, format('insert into klanten select * from json_populate_recordset(null::klanten, %L);', coalesce(json_agg(t order by id), '[]')) from klanten t
  union all select 4, format('insert into afspraken select * from json_populate_recordset(null::afspraken, %L);', coalesce(json_agg(t order by id), '[]')) from afspraken t
  union all select 5, format('insert into afspraak_behandelingen select * from json_populate_recordset(null::afspraak_behandelingen, %L);', coalesce(json_agg(t), '[]')) from afspraak_behandelingen t
  union all select 6, format('insert into afwezigheid select * from json_populate_recordset(null::afwezigheid, %L);', coalesce(json_agg(t order by id), '[]')) from afwezigheid t
  union all select 7, format('insert into sluitingsdagen select * from json_populate_recordset(null::sluitingsdagen, %L);', coalesce(json_agg(t order by id), '[]')) from sluitingsdagen t
  union all select 8, string_agg(format('select setval(pg_get_serial_sequence(%L, ''id''), greatest((select max(id) from %I), 1));', tbl, tbl), E'\n')
    from unnest(array['medewerkers','behandelingen','klanten','afspraken','afwezigheid','sluitingsdagen']) as tbl
) x;
