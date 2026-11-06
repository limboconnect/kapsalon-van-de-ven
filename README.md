# Kapsalon van de Ven – Planning

Planningsapp (PWA) voor Kapsalon van de Ven: afspraken voor Chantal, Mariëlle en Gerard
in blokken van 15 minuten, dinsdag t/m zaterdag 08:00–17:30.

- **Frontend:** losse HTML/CSS/JS, geen build-stap, gehost op GitHub Pages
- **Database & login:** Supabase (regels zoals "geen dubbele boekingen" zitten in de database)

## Functies
- Inloggen met één salon-account (blijft ingelogd per apparaat)
- Dagoverzicht met kolom per medewerker, weekoverzicht met weeknummer
- Nieuwe afspraak: klant zoeken/aanmaken, medewerker, één of meer behandelingen,
  vrije tijden worden automatisch berekend, "ingepland door"
- Klantenbestand met bezoekhistorie
- Instellingen: behandelingen (naam, duur, actief) en afwezigheid/vakantie
- Wijzigingen verschijnen direct op alle apparaten (Supabase Realtime)

## Bestanden
| Bestand | Inhoud |
|---|---|
| `index.html` | pagina |
| `style.css` | opmaak |
| `app.js` | alle logica |
| `config.js` | Supabase-adres + publishable key, openingstijden |
| `sw.js`, `manifest.webmanifest`, `icons/` | installeerbaar als app |

## Installeren op telefoon/tablet
Open de site in Chrome (Android) of Safari (iPhone) → menu → **Toevoegen aan startscherm**.
