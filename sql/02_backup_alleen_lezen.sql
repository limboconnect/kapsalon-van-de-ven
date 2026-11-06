-- =====================================================================
-- Back-upaccount alleen-lezen maken
-- Plakken in een LEEG venster van de SQL Editor (New query) > Run
-- =====================================================================

-- Accounts die alleen mogen lezen
create or replace function public.mag_schrijven()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') not in ('backup@synology.nl');
$$;

do $$
declare
  t text;
  oud text;
begin
  foreach t in array array['medewerkers','behandelingen','klanten','afspraken','afspraak_behandelingen','afwezigheid'] loop
    -- oude "alles mag"-regel verwijderen
    oud := case t when 'afspraak_behandelingen' then 'afspraak_beh: ingelogd' else t || ': ingelogd' end;
    execute format('drop policy if exists %I on public.%I', oud, t);
    execute format('drop policy if exists %I on public.%I', t || ': lezen', t);
    execute format('drop policy if exists %I on public.%I', t || ': toevoegen', t);
    execute format('drop policy if exists %I on public.%I', t || ': wijzigen', t);
    execute format('drop policy if exists %I on public.%I', t || ': verwijderen', t);

    -- nieuwe regels
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || ': lezen', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.mag_schrijven())', t || ': toevoegen', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.mag_schrijven()) with check (public.mag_schrijven())', t || ': wijzigen', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.mag_schrijven())', t || ': verwijderen', t);
  end loop;
end $$;

-- Controle: per tabel 4 regels (lezen, toevoegen, wijzigen, verwijderen)
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
