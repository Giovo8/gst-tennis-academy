/**
 * Manual Testing Guide for Tournament System
 * Complete testing scenarios for all tournament types and features
 */

# Tournament System - Manual Testing Guide

## Prerequisites
- Login as different role types: admin, gestore, maestro, atleta
- Have at least 8 test users for full tournament testing
- Clear test data before each major test run

---

## Test Scenario 1: Eliminazione Diretta (Direct Elimination)

### Setup
1. Login as **admin** or **gestore**
2. Navigate to Dashboard → Tornei

### Create Tournament
- [ ] Click "Nuovo Torneo"
- [ ] Fill in Step 1:
  - Title: "Test Eliminazione Diretta"
  - Description: "Test tournament"
  - Start Date: Today
  - Max Participants: 8
  - Type: "Eliminazione Diretta"
  - Best Of: 3
- [ ] Complete all 3 steps and create tournament
- [ ] Verify tournament appears in list with "Aperto" status

### Enrollment
- [ ] Login as **atleta** (different users)
- [ ] Navigate to Dashboard → Tornei
- [ ] Click "Iscriviti" on the test tournament
- [ ] Repeat for 8 different users
- [ ] Verify "Posti completi" shows when full

### Start Tournament
- [ ] Login as **admin**/**gestore**
- [ ] Click "Gestisci" on the tournament
- [ ] Click "Genera Tabellone"
- [ ] Verify bracket is generated with 7 matches (4+2+1)
- [ ] Verify all participants are seeded
- [ ] Check status changed to "In Corso"

### Play Matches
- [ ] Navigate to Round 1
- [ ] For each match:
  - [ ] Click "Inserisci Punteggio"
  - [ ] Enter set scores (e.g., 6-4, 6-3)
  - [ ] Save and verify winner advances
- [ ] Complete all Round 1 matches
- [ ] Verify Round 2 (semifinals) populated with winners
- [ ] Complete semifinals
- [ ] Play final match

### Completion
- [ ] Verify tournament status changes to "Completato"
- [ ] Check winner is displayed
- [ ] Verify all match results are saved

**Expected Results:**
✓ 8 participants → 7 matches total
✓ Winner progresses through rounds automatically
✓ Final winner declared
✓ All scores saved correctly

---

## Test Scenario 2: Girone + Eliminazione (Groups + Knockout)

### Setup
1. Login as **admin** or **gestore**
2. Create new tournament

### Create Tournament
- [ ] Title: "Test Girone Eliminazione"
- [ ] Type: "Girone + Eliminazione"
- [ ] Max Participants: 8
- [ ] Best Of: 3
- [ ] Create tournament

### Enrollment
- [ ] Enroll 8 participants (same as Scenario 1)

### Generate Groups
- [ ] Click "Gestisci" on tournament
- [ ] Click "Genera Gironi"
- [ ] Select "2 Gironi"
- [ ] Verify 2 groups created with 4 participants each
- [ ] Verify round-robin matches generated per group

### Group Stage
- [ ] Navigate to "Fase Gironi" tab
- [ ] Play all matches in Group A:
  - [ ] Match 1 vs 2: Enter scores
  - [ ] Match 1 vs 3: Enter scores
  - [ ] Match 1 vs 4: Enter scores
  - [ ] Match 2 vs 3: Enter scores
  - [ ] Match 2 vs 4: Enter scores
  - [ ] Match 3 vs 4: Enter scores
- [ ] Repeat for Group B
- [ ] Verify standings update automatically
- [ ] Check points, set diff, game diff calculated correctly

### Advance to Knockout
- [ ] Click "Avanza alla Fase a Eliminazione"
- [ ] Verify top 2 from each group advance
- [ ] Verify seeded bracket: 1A vs 2B, 1B vs 2A
- [ ] Check phase changed to "knockout"

### Knockout Stage
- [ ] Play semifinals
- [ ] Play final
- [ ] Verify winner declared

**Expected Results:**
✓ Groups distribute participants evenly
✓ Round-robin in each group works
✓ Standings calculated correctly
✓ Top 2 advance with proper seeding
✓ Knockout phase works as elimination

---

## Test Scenario 3: Campionato (Championship Round-Robin)

### Setup
1. Login as **admin** or **gestore**
2. Create championship tournament

### Create Tournament
- [ ] Title: "Test Campionato"
- [ ] Type: "Campionato"
- [ ] Max Participants: 6
- [ ] Best Of: 3

### Enrollment
- [ ] Enroll 6 participants

### Generate Calendar
- [ ] Click "Genera Calendario"
- [ ] Verify 15 matches created (6*5/2)
- [ ] Verify matches distributed across giornate (rounds)
- [ ] Check no participant plays twice in same giornata

### Play Matches
- [ ] Filter by "Giornata 1"
- [ ] Play all matches in giornata 1
- [ ] Verify standings update after each match
- [ ] Check points awarded (3 for win, 0 for loss)
- [ ] Verify set diff and game diff calculated

### Complete Championship
- [ ] Play all 15 matches
- [ ] Verify final standings
- [ ] Check winner has most points
- [ ] Verify tiebreakers (set diff, game diff) applied correctly

**Expected Results:**
✓ All-vs-all calendar generated
✓ Fair distribution across giornate
✓ Standings update in real-time
✓ Correct point system (3 pts per win)
✓ Tiebreakers work correctly

---

## Test Scenario 4: Role-Based Access

### Admin Role
- [ ] Login as **admin**
- [ ] Access Dashboard → Tornei
- [ ] Verify can:
  - [ ] Create tournaments
  - [ ] View statistics
  - [ ] Delete tournaments
  - [ ] Manage all tournaments
  - [ ] View reports section
  - [ ] Access user management

### Gestore Role
- [ ] Login as **gestore**
- [ ] Verify same access as admin for tournaments
- [ ] Verify can:
  - [ ] Create tournaments
  - [ ] View statistics
  - [ ] Delete tournaments
  - [ ] Manage tournaments
  - [ ] View reports

### Maestro Role
- [ ] Login as **maestro**
- [ ] Verify can:
  - [ ] View all tournaments (read-only)
  - [ ] See statistics cards
  - [ ] Filter by status
  - [ ] Click "Visualizza" to view details
- [ ] Verify CANNOT:
  - [ ] Create tournaments
  - [ ] Edit tournaments
  - [ ] Delete tournaments
  - [ ] Enroll in tournaments
  - [ ] Manage matches

### Atleta Role
- [ ] Login as **atleta**
- [ ] Verify can see:
  - [ ] "I Miei Match" section with personal matches
  - [ ] "Tornei a cui Partecipo" with enrolled tournaments
  - [ ] "Tornei Disponibili" with open tournaments
- [ ] Verify can:
  - [ ] Enroll in open tournaments
  - [ ] View match schedules
  - [ ] See opponent names and scores
- [ ] Verify CANNOT:
  - [ ] Create tournaments
  - [ ] Manage tournaments
  - [ ] Enter scores (admin only)

**Expected Results:**
✓ Each role has appropriate permissions
✓ Admin and Gestore have identical tournament features
✓ Maestro is completely read-only
✓ Atleta focuses on enrollment and viewing own matches

---

## Test Scenario 5: Statistics and Reports

### Admin/Gestore Dashboard
- [ ] Navigate to Dashboard → Tornei
- [ ] Verify "Statistiche" section shows:
  - [ ] Total tournaments
  - [ ] Active tournaments
  - [ ] Completed tournaments
  - [ ] Total participants
  - [ ] Distribution by type
- [ ] Click "Statistiche e Report Avanzati" toggle
- [ ] Verify report panel opens

### Reports Tabs
- [ ] **Panoramica Tab:**
  - [ ] Overview stats (tournaments, players, matches, sets)
  - [ ] Top 3 sections: Most Tournaments Won, Highest Win Rate, Most Active
  - [ ] Verify data is accurate
- [ ] **Classifiche Tab:**
  - [ ] Top 50 player rankings table
  - [ ] Verify columns: Rank, Player, Tournaments, Wins, Matches, Win Rate, Sets, Games
  - [ ] Check sorting (by tournaments won → win rate → matches won)
  - [ ] Verify medals 🥇🥈🥉 for top 3
- [ ] **Tornei Tab:**
  - [ ] All tournaments list
  - [ ] Verify completion rate progress bars
  - [ ] Check match counts (completed/total)

### Public Rankings Page
- [ ] Navigate to `/classifiche` (public page)
- [ ] Verify displays:
  - [ ] Overview stats cards
  - [ ] Podium with top 3 players (visual medals)
  - [ ] Full rankings table
  - [ ] Correct statistics for each player

**Expected Results:**
✓ Statistics calculate correctly from database
✓ Rankings ordered properly
✓ Win rates calculated accurately
✓ Set/game differences shown correctly
✓ Public page accessible without auth

---

## Test Scenario 6: Tennis Scoring Validation

### Best-of-3 Matches
- [ ] Create match in best-of-3 tournament
- [ ] Try to enter scores:
  - [ ] Valid: 6-4, 6-3 (winner 2-0)
  - [ ] Valid: 6-4, 3-6, 6-2 (winner 2-1)
  - [ ] Valid: 7-6, 6-4 (with tie-break)
  - [ ] Invalid: More than 3 sets
- [ ] Verify winner determined correctly

### Best-of-5 Matches
- [ ] Create match in best-of-5 tournament
- [ ] Try to enter scores:
  - [ ] Valid: 6-4, 6-3, 6-2 (winner 3-0)
  - [ ] Valid: 6-4, 4-6, 6-3, 4-6, 6-2 (winner 3-2)
  - [ ] Invalid: More than 5 sets
- [ ] Verify winner needs 3 sets

### Score Validation
- [ ] Test edge cases:
  - [ ] Tie-break: 7-6 is valid
  - [ ] Normal set: Must be at least 6 games
  - [ ] Two-game margin: 6-4, 7-5, etc.
  - [ ] Extended sets: 7-5, 8-6, etc.

**Expected Results:**
✓ Best-of-3 accepts maximum 3 sets
✓ Best-of-5 accepts maximum 5 sets
✓ Winner correctly determined
✓ Tie-breaks handled properly
✓ Invalid scores rejected

---

## Test Scenario 7: Error Handling

### Insufficient Participants
- [ ] Create tournament with max 8
- [ ] Enroll only 3 participants
- [ ] Try to start tournament
- [ ] Verify error: "Numero minimo di partecipanti non raggiunto"

### Duplicate Bracket Generation
- [ ] Start tournament and generate bracket
- [ ] Try to generate bracket again
- [ ] Verify error: "Tabellone già generato"

### Invalid Score Entry
- [ ] Try to enter scores for completed match
- [ ] Try to enter scores without authentication
- [ ] Try to enter invalid set scores
- [ ] Verify appropriate error messages

### Tournament Full
- [ ] Create tournament with max 8
- [ ] Enroll 8 participants
- [ ] Try to enroll 9th participant
- [ ] Verify "Posti completi" message

**Expected Results:**
✓ All errors handled gracefully
✓ Clear error messages shown
✓ No crashes or undefined behavior
✓ User redirected appropriately

---

## Test Scenario 8: UI/UX Validation

### Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify all components responsive
- [ ] Check tables scroll horizontally on mobile

### Loading States
- [ ] Verify loading spinners show during:
  - [ ] Tournament list fetch
  - [ ] Bracket generation
  - [ ] Score submission
  - [ ] Statistics loading

### Success Feedback
- [ ] Verify success messages for:
  - [ ] Tournament created
  - [ ] Enrollment successful
  - [ ] Bracket generated
  - [ ] Score saved
  - [ ] Tournament completed

### Navigation
- [ ] Test all internal links work
- [ ] Verify back buttons function
- [ ] Check breadcrumb navigation
- [ ] Test tab switching

**Expected Results:**
✓ Clean, professional UI
✓ Smooth animations
✓ Clear feedback on actions
✓ No layout shifts or glitches
✓ Accessible on all devices

---

## Bug Report Template

```
**Bug Title:** [Short description]

**Severity:** [Critical / High / Medium / Low]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**


**Actual Result:**


**Environment:**
- Role: [admin/gestore/maestro/atleta]
- Browser: [Chrome/Firefox/Safari]
- Device: [Desktop/Mobile]

**Screenshots:**
[Attach if applicable]

**Additional Notes:**
```

---

## Test Completion Checklist

- [ ] All 3 tournament types tested
- [ ] All 4 user roles tested
- [ ] Statistics and reports validated
- [ ] Tennis scoring validated
- [ ] Error handling confirmed
- [ ] UI/UX tested across devices
- [ ] All bugs documented
- [ ] Regression testing completed
