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
# shellcheck source=/dev/null
. "$CONF"

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
TOKEN="$(echo "$ANTWOORD" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
if [ -z "$TOKEN" ]; then
  log "FOUT: inloggen mislukt: $(echo "$ANTWOORD" | head -c 300)"
  exit 1
fi

# --- 2. Alle tabellen ophalen (per 1000 rijen) ------------------------
FOUTEN=0
for TABEL in medewerkers behandelingen klanten afspraken afspraak_behandelingen afwezigheid; do
  OFFSET=0
  DEEL=0
  TOTAAL=0
  while :; do
    BESTAND="$DOEL/${TABEL}_$(printf '%03d' $DEEL).json"
    CODE="$(curl -sS -o "$BESTAND" -w '%{http_code}' \
      "$SUPABASE_URL/rest/v1/$TABEL?select=*&limit=1000&offset=$OFFSET" \
      -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN")"
    if [ "$CODE" != "200" ]; then
      log "FOUT: $TABEL (HTTP $CODE): $(head -c 300 "$BESTAND")"
      FOUTEN=$((FOUTEN + 1))
      break
    fi
    # Aantal rijen tellen (aantal objecten op het hoogste niveau)
    AANTAL="$(grep -o '},{' "$BESTAND" | wc -l)"
    if [ "$(head -c 2 "$BESTAND")" = "[]" ]; then
      rm -f "$BESTAND"
      break
    fi
    AANTAL=$((AANTAL + 1))
    TOTAAL=$((TOTAAL + AANTAL))
    [ "$AANTAL" -lt 1000 ] && break
    OFFSET=$((OFFSET + 1000))
    DEEL=$((DEEL + 1))
  done
  log "$TABEL: ca. $TOTAAL rijen"
done

# --- 3. Uitloggen en oude back-ups opruimen ---------------------------
curl -sS -o /dev/null -X POST "$SUPABASE_URL/auth/v1/logout" \
  -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $TOKEN"

find "$BACKUP_MAP" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??' -mtime +"$BEWAAR_DAGEN" -exec rm -rf {} \;

if [ "$FOUTEN" -gt 0 ]; then
  log "KLAAR MET $FOUTEN FOUT(EN) → $DOEL"
  exit 1
fi
log "KLAAR → $DOEL"
