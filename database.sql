-- =====================================================================
-- Kapsalon van de Ven – database
-- Plakken in Supabase > SQL Editor > New query > Run (in één keer)
-- =====================================================================

-- Nodig om dubbele boekingen per medewerker te blokkeren
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Medewerkers
-- ---------------------------------------------------------------------
create table medewerkers (
  id        serial primary key,
  naam      text not null unique,
  kleur     text not null default '#D4AE9E',
  actief    boolean not null default true,
  user_id   uuid unique references auth.users(id) on delete set null  -- koppeling met login
);

-- ---------------------------------------------------------------------
-- Behandelingen (zelf aan te passen in de app)
-- ---------------------------------------------------------------------
create table behandelingen (
  id        serial primary key,
  naam      text not null,
  duur_min  int  not null check (duur_min > 0 and duur_min % 15 = 0),
  volgorde  int  not null default 0,
  actief    boolean not null default true   -- "verwijderen" = op inactief zetten
);

-- ---------------------------------------------------------------------
-- Klanten
-- ---------------------------------------------------------------------
create table klanten (
  id            serial primary key,
  naam          text not null,
  telefoon      text,
  email         text,
  notities      text,
  aangemaakt_op timestamptz not null default now()
);
create index klanten_naam_idx     on klanten (lower(naam));
create index klanten_telefoon_idx on klanten (telefoon);

-- ---------------------------------------------------------------------
-- Afspraken
-- ---------------------------------------------------------------------
create table afspraken (
  id              serial primary key,
  klant_id        int references klanten(id) on delete set null,
  medewerker_id   int not null references medewerkers(id),
  start_tijd      timestamptz not null,
  eind_tijd       timestamptz not null,
  notitie         text,
  geannuleerd     boolean not null default false,
  aangemaakt_door uuid default auth.uid(),
  aangemaakt_op   timestamptz not null default now(),

  constraint eind_na_start check (eind_tijd > start_tijd),
  constraint blokken_van_15 check (
    extract(minute from start_tijd)::int % 15 = 0 and extract(second from start_tijd) = 0 and
    extract(minute from eind_tijd)::int  % 15 = 0 and extract(second from eind_tijd)  = 0
  ),
  -- Geen overlappende (niet-geannuleerde) afspraken per medewerker
  constraint geen_dubbele_boeking exclude using gist (
    medewerker_id with =,
    tstzrange(start_tijd, eind_tijd) with &&
  ) where (not geannuleerd)
);
create index afspraken_start_idx on afspraken (start_tijd);

-- Welke behandelingen bij een afspraak horen (combineren mogelijk)
create table afspraak_behandelingen (
  afspraak_id    int not null references afspraken(id) on delete cascade,
  behandeling_id int not null references behandelingen(id),
  primary key (afspraak_id, behandeling_id)
);

-- ---------------------------------------------------------------------
-- Afwezigheid (vakantie, vrije dag, pauze)
-- ---------------------------------------------------------------------
create table afwezigheid (
  id            serial primary key,
  medewerker_id int not null references medewerkers(id) on delete cascade,
  start_tijd    timestamptz not null,
  eind_tijd     timestamptz not null,
  reden         text,
  constraint afw_eind_na_start check (eind_tijd > start_tijd)
);

-- ---------------------------------------------------------------------
-- Controle: alleen di t/m za, 08:00–17:30 en niet tijdens afwezigheid
-- ---------------------------------------------------------------------
create or replace function controleer_afspraak() returns trigger
language plpgsql as $$
declare
  s timestamp := new.start_tijd at time zone 'Europe/Amsterdam';
  e timestamp := new.eind_tijd  at time zone 'Europe/Amsterdam';
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
  if exists (
    select 1 from afwezigheid a
    where a.medewerker_id = new.medewerker_id
      and tstzrange(a.start_tijd, a.eind_tijd) && tstzrange(new.start_tijd, new.eind_tijd)
  ) then
    raise exception 'Medewerker is op dat moment afwezig';
  end if;
  return new;
end $$;

create trigger afspraak_controle
before insert or update on afspraken
for each row execute function controleer_afspraak();

-- ---------------------------------------------------------------------
-- Beveiliging: alleen ingelogde medewerkers mogen lezen/schrijven
-- ---------------------------------------------------------------------
alter table medewerkers            enable row level security;
alter table behandelingen          enable row level security;
alter table klanten                enable row level security;
alter table afspraken              enable row level security;
alter table afspraak_behandelingen enable row level security;
alter table afwezigheid            enable row level security;

create policy "medewerkers: ingelogd"   on medewerkers            for all to authenticated using (true) with check (true);
create policy "behandelingen: ingelogd" on behandelingen          for all to authenticated using (true) with check (true);
create policy "klanten: ingelogd"       on klanten                for all to authenticated using (true) with check (true);
create policy "afspraken: ingelogd"     on afspraken              for all to authenticated using (true) with check (true);
create policy "afspraak_beh: ingelogd"  on afspraak_behandelingen for all to authenticated using (true) with check (true);
create policy "afwezigheid: ingelogd"   on afwezigheid            for all to authenticated using (true) with check (true);

-- Live bijwerken in de app
alter publication supabase_realtime add table afspraken, afwezigheid;

-- ---------------------------------------------------------------------
-- Startgegevens
-- ---------------------------------------------------------------------
insert into medewerkers (naam, kleur) values
  ('Chantal',  '#E8A598'),
  ('Mariëlle', '#E6CF8F'),
  ('Gerard',   '#7FA3BC');

-- Tijden zijn een startpunt; de medewerkers passen ze zelf aan
insert into behandelingen (naam, duur_min, volgorde) values
  ('Knippen heren',            30, 1),
  ('Knippen 67 plus',          30, 2),
  ('Kinderen t/m 12 jaar',     30, 3),
  ('Kort model',               15, 4),
  ('Wassen, knippen & föhnen', 45, 5),
  ('Baard knippen',            15, 6),
  ('Contouren bijwerken',      15, 7);

-- Toegevoegd na overstap op één salon-account:
alter table afspraken add column if not exists ingepland_door int references medewerkers(id);
