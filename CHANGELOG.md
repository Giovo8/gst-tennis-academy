# Changelog

All notable changes to GST Tennis Academy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-12-29

### Changed
- **Footer Redesign**: Simplified and centered footer layout
  - Removed multi-column grid layout
  - Centered all content vertically
  - Kept logo, tagline, social icons, and "Lavora con noi" link
  - Removed "Fatto con ❤️ per il tennis" text
  - Removed contact info cards (Location, Contatti, Orari)
  
- **Dashboard Components**: Restored all dashboards to original dark theme
  - Reverted from white sidebar layout to dark glassmorphism design
  - Admin, Maestro, and Atleta dashboards use original StatCard and DashboardLinkCard components
  - Maintained gradient backgrounds, backdrop-blur effects, and cyan accent color (#7de3ff)

- **Staff Management**:
  - Fixed TypeScript types: changed `StaffMember.id` from `number` to `string` (UUID compatibility)
  - Changed `editingId` type from `number | null` to `string | null`
  - Enhanced error logging in handleSave function

- **UI Polish**:
  - Added explicit `text-center` class to section badges (StaffSection, NewsSection)
  - Removed duplicate "Incontra il team" heading from StaffSection
  - Applied dark glassmorphism styling to Facebook social feed
  - Fixed social feed container sizing to match iframe width (500px)

### Fixed
- **TypeScript Errors**: 
  - Removed invalid `coach` role from DashboardSidebar roleLabels (only valid roles: atleta, maestro, gestore, admin)
  - All TypeScript compilation errors resolved

### Added
- **Database Migration**: Created `FIX_STAFF_RLS.sql` with Row Level Security policies for staff table
  - SELECT policy for public access
  - INSERT, UPDATE, DELETE policies for admin and gestore roles
  - Awaiting execution in Supabase dashboard

### Documentation
- Updated CHANGELOG.md with recent changes
- All code changes properly documented

## [1.2.0] - 2025-12-29

### Added
- **Mobile Optimization**: Complete responsive design for smartphone devices
  - Touch-friendly buttons (min 44x44px) across all pages
  - Responsive grids: single/double column on mobile, multiple on desktop
  - Mobile-first padding: px-4 on mobile, scaling on larger screens
  - Scrollable modals: max-h-[90vh] with overflow-y-auto
  - Responsive text sizing: proper scaling from mobile to desktop

- **User Management Enhancements**:
  - List layout for user management (more scalable than grid)
  - Inline user info with pipe separators (Name | Email | Date)
  - New button color scheme: slate (details), amber (reset), red (delete)
  - Full profile update via API with service role bypass

### Changed
- **API Architecture**: Admin operations now use service role via API endpoints
  - `/api/users` (GET): Fetch users bypassing RLS for booking/enrollment
  - `/api/admin/users` (PATCH): Update complete user profiles
  - Authentication via Bearer token pattern
  
- **Tournament Detail Page**: Complete UI redesign
  - Modern gradient hero header with badges
  - Info cards grid with icons (Calendar, Users, Zap)
  - Role-based action buttons
  - Responsive layout with backdrop-blur effects

- **UI Components**:
  - BookingCalendar: Athletes and coaches loaded via API
  - ManualEnrollment: Fixed modal rendering with React Portal
  - User cards: Compact single-line format for better scalability

### Fixed
- **Modal Rendering**: ManualEnrollment now uses React Portal for proper overlay
- **RLS Bypass**: Athlete/coach dropdowns now load via API with service role
- **User Profile Save**: Fixed modifications not saving due to RLS restrictions
- **Duplicate Functions**: Removed duplicate PATCH function in admin API
- **Console Cleanup**: Removed 15+ debug console.log statements

### Optimized
- **Code Cleanup**: 
  - Removed temporary documentation files (FIX_AVVIA_TORNEO.md)
  - Cleaned debug logging from BookingCalendar and user management
  - Verified no unused imports
  
- **Documentation**:
  - Updated DATABASE.md with current schema (20 tables, all fields)
  - Updated API.md with 40+ endpoints and service role patterns
  - Added mobile optimization notes

## [1.1.0] - 2025-12-28

### Added

#### Sistema Tornei Semplificato
- **3 Tipi di Torneo Supportati**:
  - Eliminazione Diretta (tabellone classico a eliminazione)
  - Girone + Eliminazione (fase a gironi seguita da tabellone finale)
  - Campionato Round-Robin (tutti contro tutti)
- **Componenti UI Nuovi**:
  - SimpleTournamentCreator: wizard in 3 step per creazione tornei
  - TournamentManager: gestione unificata di tutti i tipi di torneo
  - EliminationBracketView: visualizzazione tabellone eliminazione diretta
  - GroupStageView: gestione gironi con classifiche e partite
  - ChampionshipStandingsView: classifica completa per campionati
- **API Endpoints Completi**:
  - POST /api/tournaments/create: creazione tornei con validazione
  - POST /api/tournaments/[id]/start: avvio torneo con assegnazione gironi
  - GET/POST /api/tournaments/[id]/group-matches: gestione partite gironi
  - PUT /api/tournaments/matches/[matchId]: aggiornamento risultati
- **Database**:
  - Nuove tabelle: tournament_groups, tournament_matches
  - Funzioni helper: create_tournament_groups, assign_participants_to_groups, calculate_group_standings
  - Trigger automatici: update_match_stats per aggiornamento statistiche
  - Migrazione 010: simplified_tournament_system.sql
- **Documentazione**:
  - TOURNAMENT_SYSTEM.md: documentazione completa con esempi
  - Script SQL di fix: FIX_TOURNAMENTS_SCHEMA.sql
  - Guide di applicazione: APPLY_SCHEMA_FIXES.md

### Changed

#### Schema Database Aggiornato
- Rinominate colonne: starts_at → start_date, ends_at → end_date
- Rimossa colonna obsoleta: created_by (non più necessaria)
- Aggiunte colonne per tornei: tournament_type, num_groups, teams_per_group, teams_advancing, current_phase
- Statistiche partecipanti: campo stats JSONB con tracking automatico

### Fixed
- Risolto errore "competition_type column not found"
- Corretta gestione colori nei componenti tornei (cyan invece di amber)
- Migliorata validazione numero partecipanti per eliminazione diretta

## [1.0.0] - 2024-12-28

### Added

#### Phase 33-34: SEO, Documentation & Final Polish
- **SEO Infrastructure**: Complete metadata system with structured data
  - defaultMetadata with Open Graph and Twitter Card support
  - JSON-LD schemas for Organization, Course, and Event types
  - Italian locale optimization (it_IT)
  - Social media preview images (1200x630 OG image)
  - Robots meta tags with Google-specific directives
- **Documentation**: Comprehensive README and CHANGELOG
  - Complete installation guide with prerequisites
  - Step-by-step Supabase and Resend configuration
  - 8 migration files execution order
  - Environment variables documentation
  - Testing guide with coverage baseline
  - Deployment checklist for Vercel
  - Project structure overview with file descriptions
  - Contributing guidelines with commit conventions
  - Security best practices (RLS, JWT, rate limiting)
- **System Metrics**: Documented all platform capabilities
  - 8 SQL migrations, 15+ tables, 3 stored functions
  - 11 HTML email templates, 4 email categories
  - 30+ athlete statistics metrics
  - 5 user roles with granular permissions

#### Phase 30: Testing Infrastructure (Previous)
- **Jest Setup**: Complete testing framework with Next.js integration
  - jest.config.js with coverage thresholds (10% baseline)
  - jest.setup.js with global mocks (Supabase, Next.js router, window.alert)
  - Test scripts in package.json (test, test:watch, test:coverage)
- **Component Tests**: 19 tests passing across 4 test suites
  - Navbar component (render test)
  - BookingCalendar component (render with mocked Supabase)
  - ProfileEditor component (7 tests: loading, data display, navigation, readonly email)
  - AthleteStatsView component (10 tests: loading, empty state, stats display, calculations)
- **Testing Libraries**:
  - @testing-library/react 15.0.7
  - @testing-library/jest-dom 6.9.1
  - @testing-library/user-event 14.6.1

#### Phase 27-29: Profile Enhancement System (Previous)
- **Database**: Migration 008 with 11 new profile fields
  - Bio, birth date, secondary phone, emergency contact JSONB
  - Skill level enum (principiante/intermedio/avanzato/agonista/professionista)
  - Preferred times array, tennis stats JSONB
  - Profile completion percentage with auto-calculation function
  - Location, website URL, social media JSONB
- **Athlete Statistics**: New athlete_stats table with 30+ columns
  - Match statistics (total, won, lost, win rate)
  - Set and game differentials
  - Service stats (aces, double faults, first serve percentage)
  - Return stats (break points won/total, return games)
  - Point quality (winners, unforced errors)
  - Streaks tracking (longest, current, best victory)
  - Activity counts (bookings, lessons, tournaments)
- **ProfileEditor Component**: Multi-step form with 4 sections
  - Info Personali, Contatti, Tennis preferences, Bio & Social
  - Progress bar with completion percentage display
  - Responsive design with step navigation
- **AthleteStatsView Component**: Tennis statistics dashboard
  - Overview cards (matches, win rate, sets, streaks)
  - Service and return statistics with progress bars
  - Point quality analysis with SVG charts
  - Activity summary and best victory display

#### Phase 23-26: Email System (Previous)
- Complete email infrastructure with Resend integration
- 11 HTML email templates with GST branding
- Email automation with triggers and webhooks
- Admin dashboard with analytics and monitoring

#### Phase 19-22: Announcements System (Previous)
- Admin announcements with priority levels
- Partner board for sponsors
- Role-based visibility

#### Phase 15-18: Chat System (Previous)
- Real-time chat with Supabase Realtime
- Unread message notifications
- Conversation management

#### Phase 11-14: Tennis Tournaments (Previous)
- Tournament creation and management
- Group stage and knockout bracket
- Tennis scoring (sets, games, tie-breaks)
- Real-time standings

#### Phase 1-10: Core Infrastructure (Previous)
- Next.js 16.1.1 with App Router
- Supabase authentication and database
- Role-based access control (5 roles)
- Booking system with calendar
- Responsive UI with Tailwind CSS 4

### Changed

- Replaced basic metadata with comprehensive SEO-optimized metadata
- Enhanced README from basic feature list to complete documentation
- Updated CHANGELOG to follow Keep a Changelog format
- Improved project structure documentation

### Fixed

- Fixed metadata base URL for proper Open Graph image resolution
- Corrected Italian locale format (it_IT)
- Enhanced social media preview compatibility

### Security

- Row Level Security (RLS) policies on all tables
- Profile completion calculation via database function
- Auto-sync athlete stats from tournament results with trigger
- Email unsubscribe management with user preferences
- JWT-based authentication with Supabase Auth
- CRON_SECRET for scheduler endpoint protection

## [0.9.0] - 2024-12-20

### Added

- Email system with Resend integration
- 11 HTML email templates
- Email automation and scheduling
- Email analytics dashboard

## [0.8.0] - 2024-12-15

### Added

- Announcements system
- Partner board
- Admin announcement manager

## [0.7.0] - 2024-12-10

### Added

- Real-time chat system
- Supabase Realtime integration
- Chat notifications

## [0.6.0] - 2024-12-05

### Added

- Tournament system with tennis scoring
- Group stage and knockout bracket
- Tournament registration and standings

## [0.5.0] - 2024-11-30

### Added

- Booking calendar
- Court reservation system
- Lesson booking (individual and group)

## [0.4.0] - 2024-11-25

### Added

- Role-based dashboards
- Admin user management
- Course and program management

## [0.3.0] - 2024-11-20

### Added

- Authentication system with Supabase
- User profiles with roles
- Landing page with dynamic sections

## [0.2.0] - 2024-11-15

### Added

- Next.js 16.1.1 setup
- Tailwind CSS 4 configuration
- TypeScript strict mode

## [0.1.0] - 2024-11-10

### Added

- Initial project structure
- Supabase integration
- Basic routing setup

---

## Upcoming Features

### Phase 35: Production Deployment
- Deployment checklist with environment verification
- Database migrations on production Supabase
- Monitoring and error tracking setup (Sentry)
- Smoke testing of critical user flows
- Performance monitoring with Vercel Analytics

---

For a detailed history of changes, see [commit history](https://github.com/your-username/gst-tennis-academy/commits/main).
