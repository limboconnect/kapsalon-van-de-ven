-- =====================================================================
-- Sluitingsdagen (feestdagen, salonvakantie)
-- Plakken in een LEEG venster van de SQL Editor (New query) > Run
-- =====================================================================

create table if not exists public.sluitingsdagen (
  id           serial primary key,
  van          date not null,
  tot          date not null,
  omschrijving text,
  gesloten     boolean not null default true,   -- false = "toch open"
  constraint sluit_tot_na_van check (tot >= van)
);

alter table public.sluitingsdagen enable row level security;

drop policy if exists "sluitingsdagen: lezen"       on public.sluitingsdagen;
drop policy if exists "sluitingsdagen: toevoegen"   on public.sluitingsdagen;
drop policy if exists "sluitingsdagen: wijzigen"    on public.sluitingsdagen;
drop policy if exists "sluitingsdagen: verwijderen" on public.sluitingsdagen;
create policy "sluitingsdagen: lezen"       on public.sluitingsdagen for select to authenticated using (true);
create policy "sluitingsdagen: toevoegen"   on public.sluitingsdagen for insert to authenticated with check (public.mag_schrijven());
create policy "sluitingsdagen: wijzigen"    on public.sluitingsdagen for update to authenticated using (public.mag_schrijven()) with check (public.mag_schrijven());
create policy "sluitingsdagen: verwijderen" on public.sluitingsdagen for delete to authenticated using (public.mag_schrijven());

-- Controle bij afspraken uitbreiden met sluitingsdagen
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

-- Live bijwerken in de app (foutmelding "already member" mag je negeren)
do $$ begin
  alter publication supabase_realtime add table public.sluitingsdagen;
exception when duplicate_object then null;
end $$;
