-- =====================================================================
-- Klanten verwijderen mogelijk maken (versie 2026.11.08-4)
-- Plak dit in een LEEG venster van de Supabase SQL Editor en klik Run.
--
-- Waarom: bij het verwijderen van een klant blijven oude afspraken staan
-- zonder naam. De controle op afspraken keek dan opnieuw naar openingstijden,
-- sluitingsdagen en afwezigheid, en kon daardoor het verwijderen blokkeren.
-- Nu wordt alleen gecontroleerd als de tijd of de kapper verandert.
-- =====================================================================

create or replace function public.controleer_afspraak() returns trigger
language plpgsql as $$
declare
  s timestamp := new.start_tijd at time zone 'Europe/Amsterdam';
  e timestamp := new.eind_tijd  at time zone 'Europe/Amsterdam';
  reden text;
begin
  if new.geannuleerd then
    return new;
  end if;
  -- Tijd en kapper niet gewijzigd (bv. klant verwijderd, notitie aangepast): niet opnieuw controleren
  if tg_op = 'UPDATE' and not old.geannuleerd
     and new.start_tijd = old.start_tijd and new.eind_tijd = old.eind_tijd
     and new.medewerker_id = old.medewerker_id then
    return new;
  end if;
  if extract(isodow from s) not between 2 and 6 then
    raise exception 'De salon is alleen dinsdag t/m zaterdag open';
  end if;
  if s::date <> e::date or s::time < time '08:00' or e::time > time '17:30' then
    raise exception 'Afspraak moet tussen 08:00 en 17:30 vallen';
  end if;
  select coalesce(omschrijving, 'sluitingsdag') into reden
  from public.sluitingsdagen
  where gesloten and s::date between van and tot
  limit 1;
  if found then
    raise exception 'De salon is gesloten op deze dag (%)', reden;
  end if;
  if exists (
    select 1 from public.afwezigheid a
    where a.medewerker_id = new.medewerker_id
      and tstzrange(a.start_tijd, a.eind_tijd) && tstzrange(new.start_tijd, new.eind_tijd)
  ) then
    raise exception 'Medewerker is op dat moment afwezig';
  end if;
  return new;
end $$;
