// Supabase-gegevens. De publishable key mag openbaar zijn:
// de gegevens zijn alleen bereikbaar na inloggen (Row Level Security).
// Zet hier NOOIT de secret / service_role key neer.
export const SUPABASE_URL = 'https://nucdjrjuqjpuexsjejeh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_D1Qk7ASjYZnDoVXEKkxolQ_ZTsApH20';

// Openingstijden
export const OPEN_DAGEN = [2, 3, 4, 5, 6];   // 0 = zondag … 6 = zaterdag → di t/m za
export const DAG_START = 8 * 60;             // 08:00 in minuten
export const DAG_EIND = 17 * 60 + 30;        // 17:30 in minuten
export const BLOK = 15;                      // minuten per blok
