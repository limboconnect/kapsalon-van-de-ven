#!/bin/bash
# =====================================================================
# Kapsalon van de Ven – nachtelijke back-up van Supabase naar de Synology
# Doet tegelijk dienst als "ping", zodat het gratis project niet pauzeert.
#
# Instellingen (e-mail/wachtwoord salon-account) staan in een apart bestand:
#   kapsalon-backup.conf  (naast dit script, alleen leesbaar voor de eigenaar)
# =====================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONF="$SCRIPT_DIR/kapsalon-backup.conf"
[ -f "$CONF" ] || { echo "Config niet gevonden: $CONF"; exit 1; }
# Windows-regeleindes (\r) wegfilteren, voor als de conf in Kladblok is bewerkt
# shellcheck source=/dev/null
. <(tr -d '\r' < "$CONF")

: "${SUPABASE_URL:?}" "${SUPABASE_KEY:?}" "${SALON_EMAIL:?}" "${SALON_WACHTWOORD:?}" "${BACKUP_MAP:?}"
BEWAAR_DAGEN="${BEWAAR_DAGEN:-60}"

DATUM="$(date +%Y-%m-%d)"
DOEL="$BACKUP_MAP/$DATUM"
LOG="$BACKUP_MAP/backup.log"
mkdir -p "$DOEL"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

# --- 1. Inloggen met het salon-account --------------------------------
ANTWOORD="$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$SALON_EMAIL\",\"password\":\"$SALON_WACHTWOORD\"}")"
TOKEN="$(echo "$ANTWOORD" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
if [ -z "$TOKEN" ]; then
  log "FOUT: inloggen mislukt: $(echo "$ANTWOORD" | head -c 300)"
  exit 1
fi

# --- 2. Alle tabellen ophalen (per 1000 rijen) ------------------------
FOUTEN=0
TABELLEN="medewerkers behandelingen klanten afspraken afspraak_behandelingen afwezigheid sluitingsdagen"
KOPPEN="$(mktemp)"
for TABEL in $TABELLEN; do
  OFFSET=0
  DEEL=0
  TOTAAL="?"
  # Pagina's van 1000 rijen ophalen tot er een lege pagina komt
  while [ "$DEEL" -lt 1000 ]; do
    BESTAND="$DOEL/${TABEL}_$(printf '%03d' $DEEL).json"
    CODE="$(curl -sS -o "$BESTAND" -D "$KOPPEN" -w '%{http_code}' \
      "$SUPABASE_URL/rest/v1/$TABEL?select=*&limit=1000&offset=$OFFSET" \
      -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN" -H "Prefer: count=exact")"
    if [ "$CODE" != "200" ] && [ "$CODE" != "206" ]; then
      log "FOUT: $TABEL (HTTP $CODE): $(head -c 300 "$BESTAND")"
      FOUTEN=$((FOUTEN + 1))
      break
    fi
    # Werkelijk aantal rijen volgens de database (Content-Range: 0-999/2504)
    if [ "$DEEL" -eq 0 ]; then
      T="$(tr -d '\r' < "$KOPPEN" | sed -n 's/^[Cc]ontent-[Rr]ange:.*\/\([0-9][0-9]*\).*/\1/p')"
      [ -n "$T" ] && TOTAAL="$T"
    fi
    if [ "$(tr -d ' \n\r\t' < "$BESTAND" | head -c 2)" = "[]" ]; then
      rm -f "$BESTAND"
      break
    fi
    OFFSET=$((OFFSET + 1000))
    DEEL=$((DEEL + 1))
  done
  log "$TABEL: $TOTAAL rijen in $DEEL deel/delen"
done
rm -f "$KOPPEN"

# --- 3. Eén compleet bestand voor herstel (export.json) ----------------
# Zelfde opbouw als sql/export.sql, te gebruiken met sql/herstel.sql
if [ "$FOUTEN" -eq 0 ]; then
  EXPORT="$DOEL/export.json"
  {
    printf '{"export_datum":"%s"' "$(date '+%Y-%m-%d %H:%M')"
    for TABEL in $TABELLEN; do
      printf ',\n"%s":[' "$TABEL"
      EERSTE=1
      for BESTAND in "$DOEL/${TABEL}"_*.json; do
        [ -f "$BESTAND" ] || continue
        # buitenste [ ] weghalen en delen aan elkaar plakken
        INHOUD="$(tr -d '\r' < "$BESTAND" | sed -e '1s/^[[:space:]]*\[//' -e '$s/\][[:space:]]*$//')"
        [ -z "$(echo "$INHOUD" | tr -d '[:space:]')" ] && continue
        [ "$EERSTE" -eq 1 ] || printf ','
        printf '%s' "$INHOUD"
        EERSTE=0
      done
      printf ']'
    done
    printf '}\n'
  } > "$EXPORT"
  log "export.json gemaakt (voor herstel in één keer)"
fi

# --- 4. Uitloggen en oude back-ups opruimen ---------------------------
curl -sS -o /dev/null -X POST "$SUPABASE_URL/auth/v1/logout" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN"

find "$BACKUP_MAP" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??' -mtime +"$BEWAAR_DAGEN" -exec rm -rf {} \;

if [ "$FOUTEN" -gt 0 ]; then
  log "KLAAR MET $FOUTEN FOUT(EN) → $DOEL"
  exit 1
fi
log "KLAAR → $DOEL"
