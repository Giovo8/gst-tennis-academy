# Supabase Database Scripts

Struttura organizzata degli script SQL per GST Tennis Academy.

## 📁 Struttura Directory

```
supabase/
├── migrations/          # Migration scripts in ordine cronologico
│   ├── archive/        # Migration obsolete (riferimento storico)
│   └── 001-021b_*.sql  # Migration attive
├── scripts/
│   ├── fixes/          # Script per fix di bug e problemi
│   └── utilities/      # Script di utilità (test data, verifiche)
└── schema.sql          # Schema completo del database
```

## 🔢 Migration Sequence

Le migration sono numerate sequenzialmente:

- **001-010**: Setup iniziale (tournaments, messaging, profili)
- **011-015**: Feature aggiunte (scoring, confirmations, dashboard features)
- **016-020**: Fix RLS e security
- **021**: Feature finali (promo banner, video lessons)

**Note**: Migrations con suffisso 'b' (es. 006b) sono alternative/addizioni alla migration principale.

## 📝 Schema Files

### Main Schema
- `schema.sql` - Schema completo del database (tabelle, RLS policies, functions)

### Migrations (Active)
Eseguire in ordine numerico:

1. `001_create_tournaments_and_participants.sql` - Tournaments base
2. `002_rls_policies_tournaments.sql` - RLS policies tournaments
3. `003_add_competition_types.sql` - Tipi di competizione
4. `004_tennis_tournament_system.sql` - Sistema tornei completo
5. `005_chat_messaging_system.sql` - Sistema chat
6. `006_announcements_system.sql` - Annunci
7. `006b_create_messages_system.sql` - Sistema messaggi alternativo
8. `007_allow_users_search.sql` - Ricerca utenti
9. `007b_email_system.sql` - Sistema email
10. `008_profile_enhancements.sql` - Miglioramenti profili
11. `008b_tournament_start_notifications.sql` - Notifiche tornei
12. `009_allow_authenticated_create_notifications.sql` - Permessi notifiche
13. `010_simplified_tournament_system.sql` - Semplificazione tornei
14. `011_make_dates_optional.sql` - Date opzionali
15. `012_tournament_matches_bracket_columns.sql` - Colonne bracket
16. `013_tennis_scoring_system.sql` - Sistema punteggio tennis
17. `014_add_booking_confirmation_columns.sql` - Conferme prenotazioni
18. `015_profiles_rls_for_bookings.sql` - RLS profili per prenotazioni
19. `015_dashboard_refactor_features_SAFE.sql` - Features dashboard
20. `016_fix_rls_infinite_recursion.sql` - Fix RLS ricorsione
21. `017_fix_all_remaining_rls.sql` - Fix RLS rimanenti
22. `018_chat_storage.sql` - Storage chat
23. `019_add_email_notifications_preference.sql` - Preferenze email
24. `020_add_user_presence_system.sql` - Sistema presenza utenti
25. `020b_fix_rls_security.sql` - Fix security RLS
26. `021_add_promo_banner_settings.sql` - Impostazioni promo banner
27. `021b_video_lessons.sql` - Video lessons

## 🔧 Scripts di Utilità

### Fixes (`scripts/fixes/`)
Script per correggere problemi specifici:
- `FIX_ALL_RLS_RECURSION.sql` - Fix ricorsione RLS globale
- `FIX_ANNOUNCEMENT_VIEWS.sql` - Fix views annunci
- `FIX_ANNOUNCEMENTS_RLS.sql` - Fix RLS annunci
- `FIX_ARENA_CHALLENGES_FOREIGN_KEYS.sql` - Fix FK arena
- `FIX_ARENA_LEVELS.sql` - Fix livelli arena
- `FIX_ARENA_NO_DRAWS.sql` - Fix pareggi arena
- `FIX_BOOKINGS_ADD_CONFIRMATION_COLUMNS.sql` - Aggiungi colonne conferma
- `FIX_COURSES_POLICY.sql` - Fix policy corsi
- `FIX_PROFILES_RLS_FOR_BOOKINGS.sql` - Fix RLS profili
- `FIX_RLS_INFINITE_RECURSION.sql` - Fix ricorsione RLS
- `FIX_STAFF_RLS.sql` - Fix RLS staff
- `FIX_TOURNAMENTS_SCHEMA.sql` - Fix schema tornei
- `FIX_VIDEO_LESSONS_SCHEMA.sql` - Fix schema video lessons
- `APPLY_ALL_BRACKET_FIXES.sql` - Applica tutti i fix bracket
- `APPLY_DATE_FIX.sql` - Applica fix date
- `APPLY_SCHEMA_FIXES.md` - Documentazione fix schema

### Utilities (`scripts/utilities/`)
Script di supporto e manutenzione:
- `CHECK_AND_FIX_ADMIN_ROLE.sql` - Verifica ruolo admin
- `CHECK_ANNOUNCEMENTS.sql` - Verifica annunci
- `VERIFY_ARENA_STATS_INTEGRITY.sql` - Verifica integrità stats arena
- `INSERT_TEST_TOURNAMENTS.sql` - Inserisci dati test
- `RESET_DATABASE.sql` - ⚠️ Reset completo database (ATTENZIONE!)
- `CREATE_ARENA_CHALLENGES.sql` - Crea tabella arena challenges
- `CREATE_AVATARS_BUCKET.sql` - Crea bucket avatars
- `CREATE_EMAIL_CAMPAIGNS_TABLE.sql` - Crea tabella campagne email
- `ADD_BOOKING_ID_TO_ARENA_CHALLENGES.sql` - Aggiungi booking_id
- `ADD_COACH_NOTES_TABLE.sql` - Aggiungi tabella note coach
- `ADD_COUNTER_PROPOSAL_STATUS.sql` - Aggiungi status controproposta
- `ADD_STAFF_SOCIAL_COLUMNS.sql` - Aggiungi colonne social staff
- `UPDATE_ARENA_CHALLENGES_ADD_MATCH_CONFIG.sql` - Aggiorna config match

## ⚠️ Uso e Best Practices

### Per Migration
1. **MAI modificare migration già eseguite** - Creare sempre nuove migration
2. **Eseguire in ordine** - Le migration sono sequenziali
3. **Backup prima di eseguire** - Sempre fare backup del database
4. **Test in staging** - Testare in ambiente di staging prima di produzione

### Per Fix Scripts
- Leggere attentamente prima di eseguire
- Verificare che il problema esista effettivamente
- Eseguire in orari di basso traffico se possibile

### Per Utility Scripts
- `RESET_DATABASE.sql` è **DISTRUTTIVO** - usare solo in sviluppo
- Scripts di test dati non vanno usati in produzione

## 📚 Riferimenti

- Schema completo: `schema.sql`
- Documentazione database: `../docs/DATABASE.md`
- Best practices: Vedere migrations esistenti come template

## 🔄 Workflow Consigliato

### Nuovo Feature
1. Creare migration nella cartella `migrations/`
2. Numerare sequenzialmente (prossimo numero disponibile)
3. Testare in locale
4. Applicare a staging
5. Verificare funzionamento
6. Applicare a produzione

### Fix Bug
1. Creare script in `scripts/fixes/`
2. Documentare problema e soluzione
3. Testare in locale
4. Eseguire in produzione (con backup)

### Utility/Test
1. Creare script in `scripts/utilities/`
2. Marcare chiaramente se distruttivo
3. Usare solo in ambienti appropriati
